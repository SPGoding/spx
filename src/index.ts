import * as fs from 'fs-extra'
import * as https from 'https'
import * as path from 'path'
import * as rp from 'request-promise-native'
import {
    getRandomInt,
    getBeginning,
    getEnding,
    StringStringMap,
    getArticleType,
    ManifestVersion,
    getVersionType
} from './util'
import { convertMCAriticleToBBCode } from './converter'
import { server as WSServer, connection } from 'websocket'
import { JSDOM } from 'jsdom'
import { ContentProvider, JsonContentProvider, McbbsContentProvider, Content } from './content-provider'

//#region Detection
const lastResults: StringStringMap = {}

const providers: { [key: string]: ContentProvider } = {
    article: new JsonContentProvider(
        'https://www.minecraft.net/content/minecraft-net/_jcr_content.articles.grid?tagsPath=minecraft:article/insider,minecraft:article/news&lang=/content/minecraft-net/language-masters/zh-hans',
        json => `https://www.minecraft.net${json.article_grid[0].article_url}`,
        json => json.article_grid[0].default_tile.title,
        async json => {
            const url = `https://www.minecraft.net${json.article_grid[0].article_url}`
            const src = await rp(url)
            const html = new JSDOM(src).window.document
            let addition = convertMCAriticleToBBCode(html, url)
            const articleType = getArticleType(html)
            if (articleType === 'News') {
                const version = lastResults.version
                const versionType = getVersionType(versions, version)
                const beginning = getBeginning(versionType, version, versions)
                const ending = getEnding(versionType)
                addition = beginning + addition + ending
            }
            return addition
        }
    ),
    vanilla_question: new McbbsContentProvider(
        'https://www.mcbbs.net/forum-qanda-1.html'
    ),
    other_question: new McbbsContentProvider(
        'https://www.mcbbs.net/forum-etcqanda-1.html'
    ),
    gameplay: new McbbsContentProvider(
        'https://www.mcbbs.net/forum.php?mod=forumdisplay&fid=39&filter=author&orderby=dateline'
    ),
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
let ip: string | undefined
let password: string | undefined
let interval: number | undefined
let key: Buffer | undefined
let cert: Buffer | undefined

(function loadConfiguration() {

    if (fs.existsSync(configPath)) {
        const config = fs.readJsonSync(configPath)
        ip = config.ip
        httpPort = config.httpPort
        interval = config.interval
        password = config.password
        key = fs.readFileSync(config.keyFile)
        cert = fs.readFileSync(config.certFile)
        if (!ip || !httpPort || !interval || !key || !cert || !password) {
            throw ("Expected 'httpPort', 'interval', 'ip', 'keyFile', 'certFile' and 'password' in './config.json'.")
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
})()

/**
 * All notifications that still aren't read by clients.
 */
const notifications: { type: string; value: Content }[] = []

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
            } else if (lastResults[key] !== content.id) {
                msg = `Detected new ${key}: ${content.id}.`
            }
            lastResults[key] = content.id
            if (msg) {
                const lastResultsJson = JSON.stringify(lastResults, undefined, 4)
                console.log(msg)
                console.log(lastResultsJson)
                announce(key, content, true)
                notifications.push({ type: key, value: content })
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
const verifiedIps: string[] = []
const wsPort = getRandomInt(49152, 65535)

const httpsServer = https
    .createServer({ key, cert }, async (req, res) => {
        try {
            req.on('error', e => {
                console.error(e.message)
            })
            res.on('error', e => {
                console.error(e.message)
            })
            res.setHeader('Content-Type', "text/html;charset='utf-8'")
            let html = await fs.readFile(path.join(__dirname, '../index.html'), { encoding: 'utf8' })
            html = html.replace(/%replace_as_ws_url%/g, `${ip}:${wsPort}`)
            res.end(html)
        } catch (e) {
            console.error(e)
        }
    })
    .listen(httpPort)
console.log(`HTTPS server is running at ${ip}:${httpPort}`)
httpsServer.on('error', e => {
    console.error(e.message)
})

const wsServer = new WSServer({
    httpServer: https.createServer({ key, cert }).listen(wsPort)
})
console.log(`WebSocket server is running at ${ip}:${wsPort}`)
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
            switch (args[0]) {
                case 'read':
                    if (verifiedIps.indexOf(connection.remoteAddress) !== -1) {
                        notifications.splice(0, notifications.length)
                        announce('read', { id: '', text: '' }, true)
                        console.log('Marked as read.')
                    }
                    break
                case 'request':
                    if (versions.length === 0) {
                        await getVersions()
                    }
                    if (args[1].slice(0, 7) === 'verify ') {
                        const pwd = args[1].slice(7)
                        if (password === pwd) {
                            verifiedIps.push(connection.remoteAddress)
                            connection.sendUTF(JSON.stringify({ type: 'verify', value: { id: '', text: '' } }))
                            console.log(`Verified: ${connection.remoteAddress}.`)
                            if (notifications.length > 0) {
                                for (const i of notifications) {
                                    connection.sendUTF(JSON.stringify(i))
                                }
                            }
                        } else {
                            connection.sendUTF(JSON.stringify({ type: 'error', value: { id: '#', text: 'Wrong password.' } }))
                            connection.close()
                        }
                    } else {
                        try {
                            const uri = args[1].split(' ')[0]
                            const translator = args[1].split(' ')[1] ? args[1].split(' ')[1] : undefined
                            const src = await rp(uri)
                            const html = new JSDOM(src).window.document
                            let bbcode = convertMCAriticleToBBCode(html, uri, translator)
                            const articleType = getArticleType(html)
                            if (articleType === 'News') {
                                const version = lastResults.version
                                const versionType = getVersionType(versions, version)
                                const beginning = getBeginning(versionType, version, versions)
                                const ending = getEnding(versionType)
                                bbcode =
                                    beginning +
                                    bbcode +
                                    ending
                            }
                            const content = {
                                addition: bbcode, id: uri,
                                text: uri.replace('https://www.minecraft.net/zh-hans/article/', '')
                            }
                            await connection.sendUTF(JSON.stringify({ type: 'bbcode', value: content }))
                            if (verifiedIps.indexOf(connection.remoteAddress) === -1) {
                                connection.close()
                            }
                        } catch (e) {
                            connection.sendUTF(JSON.stringify({ type: 'error', value: { id: '#', text: 'Wrong URI.' } }))
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
        verifiedIps.splice(verifiedIps.indexOf(connection.remoteAddress), 1)
    })
})

function announce(type: string, value: Content, forVerified: boolean) {
    connections.forEach(v => {
        if (!forVerified || verifiedIps.indexOf(v.remoteAddress) !== -1) {
            v.sendUTF(JSON.stringify({ type, value }))
        }
    })
}
//#endregion
