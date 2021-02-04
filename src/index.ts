import { Client, Intents } from 'discord.js'
import * as fs from 'fs-extra'
import * as http from 'http'
import { JSDOM } from 'jsdom'
import * as path from 'path'
import * as rp from 'request-promise-native'
import { connection, server as WSServer } from 'websocket'
import { BugCache } from './bug-cache'
import { Content, ContentProvider, JsonContentProvider } from './content-provider'
import { convertMCAriticleToBBCode } from './converter'
import { DiscordConfig, onMessage } from './discord-bot'
import { getArticleType, getBeginning, getEnding, getVersionType, ManifestVersion, StringStringArrayMap } from './util'

//#region Detection
const lastResults: StringStringArrayMap = {}

const providers: { [key: string]: ContentProvider } = {
    article: new JsonContentProvider(
        'https://www.minecraft.net/content/minecraft-net/_jcr_content.articles.grid?lang=/content/minecraft-net/language-masters/en-us',
        json => `https://www.minecraft.net${json.article_grid[0].article_url}`,
        json => json.article_grid[0].default_tile.title
    ),
    // gameplay: new McbbsContentProvider(
    //     'https://www.mcbbs.net/forum.php?mod=forumdisplay&fid=39&filter=author&orderby=dateline'
    // ),
    version: new JsonContentProvider(
        'https://launchermeta.mojang.com/mc/game/version_manifest.json',
        json => {
            versions.splice(0)
            versions.push(...json.versions)
            return json.latest.snapshot
        }
    )
}

const configPath = path.join(__dirname, './config.json')
const cachePath = path.join(__dirname, './cache.json')
let httpPort: number | undefined
let wsPort: number | undefined
let ip: string | undefined
let ownerPassword: string | undefined
let vipPassword: string | undefined
let interval: number | undefined

let discordClient: Client | undefined
let discord: DiscordConfig | undefined

(function loadConfiguration() {

    if (fs.existsSync(configPath)) {
        const config = fs.readJsonSync(configPath)
        ip = config.ip
        httpPort = config.httpPort
        wsPort = config.wsPort
        interval = config.interval
        ownerPassword = config.ownerPassword
        vipPassword = config.vipPassword
        discord = config.discord
        if (!ip || !httpPort || !wsPort || !interval || !ownerPassword || !vipPassword) {
            throw ("Expected 'ip', 'httpPort', 'wsPort, 'interval', 'ownerPassword', and 'vipPassword' in './config.json'.")
        }
    } else {
        ip = 'localhost'
        httpPort = 80
        interval = 20000
        fs.writeJsonSync(configPath, { ip, httpPort, interval, keyFile: null, certFile: null, password: null }, { encoding: 'utf8' })
        throw 'Please complete the config file.'
    }

    if (fs.existsSync(cachePath)) {
        const cache = fs.readJsonSync(cachePath)
        for (const key in providers) {
            lastResults[key] = cache[key]
        }
    }

    BugCache.load()
})();

(async function launchDiscordBot() {
    try {
        if (discord) {
            discordClient = new Client({
                partials: ['MESSAGE', 'USER'],
                ws: {
                    intents: Intents.NON_PRIVILEGED
                }
            })
            await discordClient.login(discord.token)
            discordClient.on('message', onMessage.bind(undefined, discord))
            console.log('Discord bot launched.')
        }
    } catch (e) {
        console.error(e)
        process.exit(1)
    }
})()

const versions: ManifestVersion[] = []

setInterval(main, interval)

async function getVersions() {
    await providers.version.getContent()
}

async function main() {
    try {
        if (versions.length === 0) {
            await getVersions()
        }
        for (const key in providers) {
            const provider = providers[key]
            const content = await provider.getContent()
            let msg: string = ''
            if (!lastResults[key]) {
                msg = `Initialized ${key}: ${content.id}.`
                lastResults[key] = [content.id]
            } else if (lastResults[key].indexOf(content.id) === -1) {
                msg = `Detected new ${key}: ${content.id}.`
                lastResults[key].push(content.id)
                if (lastResults[key].length > 3) {
                    lastResults[key].shift()
                }
            }
            if (msg) {
                const lastResultsJson = JSON.stringify(lastResults, undefined, 4)
                console.log(msg)
                console.log(lastResultsJson)
                announce(key, content, true)
                fs.writeFileSync(cachePath, lastResultsJson, { encoding: 'utf8' })
            }
        }
    } catch (ex) {
        console.error(ex)
    }
}
//#endregion

//#region Notification
const connections: connection[] = []
const ownerIps: string[] = []
const vipIps: string[] = []

let html: string

const httpServer = http
    .createServer(async (req, res) => {
        try {
            req.on('error', e => {
                console.error(e.message)
            })
            res.on('error', e => {
                console.error(e.message)
            })
            res.setHeader('Content-Type', "text/html;charset='utf-8'")
            // html = (await fs.readFile(path.join(__dirname, '../index.html'), { encoding: 'utf8' })).replace(/%replace_as_ws_url%/g, `${ip}:${wsPort}`)
            html = html || (await fs.readFile(path.join(__dirname, '../index.html'), { encoding: 'utf8' })).replace(/%replace_as_ws_url%/g, `${ip}/ws/`)
            res.end(html)
        } catch (e) {
            console.error(e)
        }
    })
    .listen(httpPort)
console.log(`HTTP server is running at ${ip} (locally listening ${httpPort})`)
httpServer.on('error', e => {
    console.error(e.message)
})

const wsServer = new WSServer({
    httpServer: http
        .createServer()
        .listen(wsPort)
})
console.log(`WebSocket server is running at ${ip}/ws/ (locally listening ${wsPort})`)
wsServer.on('request', request => {
    const connection = request.accept()

    connection.on('error', ex => {
        console.error(ex.message)
    })

    connections.push(connection)
    console.log(`${connection.remoteAddress} connected.`)

    connection.on('message', async data => {
        if (data.utf8Data) {
            const args = data.utf8Data.split(', ')
            args[1] = args.slice(1).join(', ')
            switch (args[0]) {
                case 'request':
                    if (versions.length === 0) {
                        await getVersions()
                    }
                    if (args[1].slice(0, 7) === 'verify ') {
                        const pwd = args[1].slice(7)
                        if (ownerPassword === pwd) {
                            ownerIps.push(connection.remoteAddress)
                            vipIps.push(connection.remoteAddress)
                            connection.sendUTF(JSON.stringify({ type: 'verify', value: { id: 'owner', text: '' } }))
                            console.log(`Verified owner: ${connection.remoteAddress}.`)
                        } else if (vipPassword === pwd) {
                            vipIps.push(connection.remoteAddress)
                            connection.sendUTF(JSON.stringify({ type: 'verify', value: { id: 'vip', text: '' } }))
                            console.log(`Verified VIP: ${connection.remoteAddress}.`)
                        } else {
                            connection.sendUTF(JSON.stringify({ type: 'error', value: { id: '#', text: 'Wrong password.' } }))
                            connection.close()
                        }
                    } else if (args[1].slice(0, 3) === 'MC-') {
                        if (ownerIps.includes(connection.remoteAddress)) {
                            const seg = args[1].split(' ')
                            const id = seg[0]
                            const description = seg.slice(1).join(' ')
                            if (description && description.toLowerCase() === 'r') {
                                console.log(`Removed bug ${id}.`)
                                connection.sendUTF(JSON.stringify({ type: 'bug', value: { id: '#', text: `Removed ${id}.` } }))
                                BugCache.remove(id)
                            } else if (description) {
                                console.log(`Added bug ${id}: ${description}.`)
                                connection.sendUTF(JSON.stringify({ type: 'bug', value: { id: '#', text: `Added ${id}: ${description}.` } }))
                                BugCache.set(id, description, 'SPGoding')
                            } else {
                                connection.sendUTF(JSON.stringify({ type: 'bug', value: { id: '#', text: `${id}: ${BugCache.getSummary(id)}` } }))
                            }
                            BugCache.save()
                        } else {
                            connection.close()
                        }
                    } else {
                        try {
                            const uri = args[1].split(' ')[0]
                            const translator = args[1].split(' ')[1] ? args[1].split(' ')[1] : undefined
                            const src = await rp(uri)
                            const html = new JSDOM(src).window.document
                            const articleType = getArticleType(html)
                            let bbcode = await convertMCAriticleToBBCode(html, uri, translator, articleType)
                            if (articleType === 'NEWS') {
                                const version = lastResults.version[1]
                                const versionType = getVersionType(version)
                                const beginning = getBeginning(versionType, version, versions)
                                const ending = getEnding(versionType)
                                bbcode = `${beginning}${bbcode}${ending}`
                            }
                            const content = {
                                addition: bbcode, id: uri,
                                text: uri.replace('https://www.minecraft.net/en-us/article/', '')
                            }
                            connection.sendUTF(JSON.stringify({ type: 'bbcode', value: content }))
                            if (!vipIps.includes(connection.remoteAddress)) {
                                connection.close()
                            }
                        } catch (e) {
                            connection.sendUTF(JSON.stringify({ type: 'error', value: { id: '#', text: e.message } }))
                            connection.close()
                        }
                    }
                    break
                default:
                    connection.sendUTF(JSON.stringify({ type: 'error', value: { id: '#', text: 'Unknown request.' } }))
                    connection.close()
                    break
            }
        }
    })

    connection.on('close', () => {
        console.log(`${connection.remoteAddress} disconnected.`)
        connections.splice(connections.indexOf(connection), 1)
        ownerIps.splice(ownerIps.indexOf(connection.remoteAddress), 1)
        vipIps.splice(vipIps.indexOf(connection.remoteAddress), 1)
    })
})

function announce(type: string, value: Content, forVip: boolean) {
    connections.forEach(v => {
        if (!forVip || vipIps.includes(v.remoteAddress)) {
            v.sendUTF(JSON.stringify({ type, value }))
        }
    })
}
//#endregion
