import * as fs from 'fs-extra'
import * as http from 'http'
import * as path from 'path'
import * as rp from 'request-promise-native'
import {
    getRandomInt,
    getBeginning,
    getEnding,
    StringStringMap,
    Result,
    getArticleType,
    ManifestVersion,
    getVersionType
} from './util'
import { convertMCAriticleToBBCode } from './converter'
import { server as WSServer, connection } from 'websocket'
import { JSDOM } from 'jsdom'
import { ContentProvider, JsonContentProvider, HtmlContentProvider, McbbsContentProvider } from './content-provider'

//#region Detection
const lastResults: StringStringMap = {}

const providers: { [key: string]: ContentProvider } = {
    article: new JsonContentProvider(
        'https://www.minecraft.net/content/minecraft-net/_jcr_content.articles.grid?tagsPath=minecraft:article/insider,minecraft:article/news',
        json => `https://www.minecraft.net${json.article_grid[0].article_url}`,
        json => json.article_grid[0].default_tile.title,
        async json => {
            const src = await rp(`https://www.minecraft.net${json.article_grid[0].article_url}`)
            const html = new JSDOM(src).window.document
            let addition = convertMCAriticleToBBCode(html)
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
    qanda: new McbbsContentProvider(
        'http://www.mcbbs.net/forum-qanda-1.html'
    ),
    etcqanda: new McbbsContentProvider(
        'http://www.mcbbs.net/forum-etcqanda-1.html'
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
let interval: number | undefined

(function loadConfiguration() {

    if (fs.existsSync(configPath)) {
        const config = fs.readJsonSync(configPath)
        ip = config.ip
        httpPort = config.httpPort
        interval = config.interval
        if (!ip || !httpPort || !interval) {
            throw ("Expected 'httpPort', 'interval' and 'ip' in './config.json'.")
        }
    } else {
        ip = 'localhost'
        httpPort = 80
        interval = 20000
        fs.writeJsonSync(configPath, { ip, httpPort }, { encoding: 'utf8' })
    }

    if (fs.existsSync(cachePath)) {
        const cache = fs.readJsonSync(cachePath)
        lastResults.article = cache.article
        lastResults.question = cache.question
        lastResults.version = cache.version
    }
})()

/**
 * All notifications that still aren't read by clients.
 */
const notifications: { type: string; value: Result }[] = []

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
            if (msg) {
                console.log(msg)
                lastResults[key] = content.id
                notice(key, content)
                notifications.push({ type: key, value: content })
                await fs.writeJson(cachePath, lastResults, { encoding: 'utf8' })
            }
        }
    } catch (ex) {
        console.error(ex)
    }
}
//#endregion

//#region Notification
const connections: connection[] = []
const wsPort = getRandomInt(49152, 65535)

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
            let html = await fs.readFile(path.join(__dirname, '../index.html'), { encoding: 'utf8' })
            html = html.replace(/%replace_as_ws_url%/g, `${ip}:${wsPort}`)
            res.end(html)
        } catch (e) {
            console.error(e)
        }
    })
    .listen(httpPort)
console.log(`HTTP server is running at ${ip}:${httpPort}`)
httpServer.on('error', e => {
    console.error(e.message)
})

const wsServer = new WSServer({ httpServer: http.createServer().listen(wsPort) })
console.log(`WebSocket server is running at ${ip}:${wsPort}`)
wsServer.on('request', request => {
    const connection = request.accept()

    connection.on('error', ex => {
        console.error(ex.message)
    })

    connections.push(connection)
    console.log(`${connection.remoteAddress} connected.`)
    if (notifications.length > 0) {
        for (const i of notifications) {
            connection.sendUTF(JSON.stringify(i))
        }
    }

    connection.on('message', async data => {
        if (data.utf8Data) {
            const args = data.utf8Data.split(', ')
            switch (args[0]) {
                case 'read':
                    notifications.splice(0, notifications.length)
                    notice('read', { id: '', text: '' })
                    console.log('Marked as read.')
                    break
                case 'bbcode':
                    if (versions.length === 0) {
                        await getVersions()
                    }
                    const src = await rp(args[1])
                    const html = new JSDOM(src).window.document
                    let bbcode = convertMCAriticleToBBCode(html)
                    const articleType = getArticleType(html)
                    if (articleType === 'News') {
                        const version = lastResults.version
                        const versionType = getVersionType(versions, version)
                        const beginning = getBeginning(versionType, version, versions)
                        const ending = getEnding(versionType)
                        bbcode =
                            beginning +
                            bbcode.slice(0, bbcode.lastIndexOf('[size=6][b][color=Gray]GET THE SNAPSHOT[/color][/b][/size]')) +
                            ending
                    }
                    await notice('bbcode', { addition: bbcode, id: '', text: '' })
                    break
                default:
                    console.error(`Unknown client request: ${data.utf8Data}.`)
                    break
            }
        }
    })

    connection.on('close', () => {
        console.log(`${connection.remoteAddress} disconnected.`)
        connections.splice(connections.indexOf(connection), 1)
    })
})

function notice(type: string, value: Result) {
    connections.forEach(connection => {
        connection.sendUTF(JSON.stringify({ type, value }))
    })
}
//#endregion
