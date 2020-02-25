import * as constants from 'constants'
import * as fs from 'fs-extra'
import * as https from 'https'
import * as path from 'path'
import * as rp from 'request-promise-native'
import {
    getRandomInt,
    getBeginning,
    getEnding,
    StringStringArrayMap,
    getArticleType,
    ManifestVersion,
    getVersionType
} from './util'
import { convertMCAriticleToBBCode } from './converter'
import { server as WSServer, connection } from 'websocket'
import { JSDOM } from 'jsdom'
import { ContentProvider, JsonContentProvider, McbbsContentProvider, Content } from './content-provider'

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
const bugsPath = path.join(__dirname, './bugs.json')
export const bugs: { [id: string]: string } = {}
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

    if (fs.existsSync(bugsPath)) {
        const result = fs.readJsonSync(bugsPath)
        for (const key in result) {
            bugs[key] = result[key]
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
    .createServer({
        key, cert,
        secureOptions: constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1
    }, async (req, res) => {
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
            args[1] = args.slice(1).join(', ')
            switch (args[0]) {
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
                                if (notifications.length > 20) {
                                    notifications.splice(0, notifications.length - 20)
                                }
                                for (const i of notifications) {
                                    connection.sendUTF(JSON.stringify(i))
                                }
                            }
                        } else {
                            connection.sendUTF(JSON.stringify({ type: 'error', value: { id: '#', text: 'Wrong password.' } }))
                            connection.close()
                        }
                    } else if (args[1].slice(0, 3) === 'MC-') {
                        if (verifiedIps.includes(connection.remoteAddress)) {
                            const seg = args[1].split(' ')
                            const id = seg[0]
                            const description = seg.slice(1).join(' ')
                            if (description && description.toLowerCase() === 'r') {
                                console.log(`Removed bug ${id}.`)
                                connection.sendUTF(JSON.stringify({ type: 'bug', value: { id: '#', text: `Removed ${id}.` } }))
                                delete bugs[id]
                            } else if (description) {
                                console.log(`Added bug ${id}: ${description}.`)
                                connection.sendUTF(JSON.stringify({ type: 'bug', value: { id: '#', text: `Added ${id}: ${description}.` } }))
                                bugs[id] = description
                            } else {
                                connection.sendUTF(JSON.stringify({ type: 'bug', value: { id: '#', text: `${id}: ${bugs[id]}` } }))
                            }
                            fs.writeFileSync(bugsPath, JSON.stringify(bugs, undefined, 4), { encoding: 'utf8' })
                        } else {
                            connection.close()
                        }
                    } else {
                        try {
                            const uri = args[1].split(' ')[0]
                            const translator = args[1].split(' ')[1] ? args[1].split(' ')[1] : undefined
                            const src = await rp(uri)
                            const html = new JSDOM(src).window.document
                            let bbcode = await convertMCAriticleToBBCode(html, uri, translator, verifiedIps.includes(connection.remoteAddress))
                            const articleType = getArticleType(html)
                            if (articleType === 'NEWS') {
                                const version = lastResults.version[1]
                                const versionType = getVersionType(version)
                                const beginning = getBeginning(versionType, version, versions)
                                const ending = getEnding(versionType)
                                bbcode =
                                    beginning +
                                    bbcode +
                                    ending
                            }
                            const content = {
                                addition: bbcode, id: uri,
                                text: uri.replace('https://www.minecraft.net/en-us/article/', '')
                            }
                            connection.sendUTF(JSON.stringify({ type: 'bbcode', value: content }))
                            if (verifiedIps.indexOf(connection.remoteAddress) === -1) {
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
