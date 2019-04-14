import * as fs from 'fs-extra'
import * as path from 'path'
import * as http from 'http'
import * as ip from 'ip'
import { exec } from 'child_process'
import {
    getWebCode,
    getRandomInt,
    getVersionType,
    getBeginning,
    getEnding,
    StringStringMap,
    Result,
    getLatest,
    getArticleType
} from './util'
import { convertMCAriticleToBBCode } from './converter'
import { server as WSServer, connection } from 'websocket'
import { JSDOM } from 'jsdom'

//#region Detection
const urls: StringStringMap = {
    article:
        'https://www.minecraft.net/content/minecraft-net/_jcr_content.articles.grid?tileselection=auto&tagsPath=minecraft:article/insider,minecraft:article/news&propResPath=/content/minecraft-net/language-masters/zh-hans/jcr:content/root/generic-container/par/grid&offset=0&count=2000&pageSize=20&tag=ALL&lang=/content/minecraft-net/language-masters/zh-hans',
    question: 'http://www.mcbbs.net/forum-qanda-1.html',
    version: 'https://launchermeta.mojang.com/mc/game/version_manifest.json'
}
const lastResults: StringStringMap = {
    article: '',
    question: '',
    version: ''
}
/**
 * All notifications that still aren't read by clients.
 */
const notifications: { type: string; value: Result }[] = []

const versions: string[] = []

setInterval(main, 10000)

async function main() {
    try {
        for (const type of ['version', 'article', 'question']) {
            const webCode = await getWebCode(urls[type])
            const latest = getLatest[type](webCode, lastResults[type], versions)
            const last = lastResults[type]
            lastResults[type] = latest.identity

            let text = ''
            if (!last) {
                text = `Initialized ${type}: ${latest.identity}.`
            } else if (last !== latest.identity) {
                text = `Detected new ${type}: ${latest.identity}.`
            }
            if (text) {
                console.log(text)
                // Deal with additional information.
                if (type === 'article') {
                    const src = await getWebCode(latest.identity)
                    const html = new JSDOM(src).window.document
                    let addition = convertMCAriticleToBBCode(html)
                    const articleType = getArticleType(html)
                    if (articleType === 'News') {
                        const version = lastResults.version
                        const versionType = getVersionType(version)
                        const beginning = getBeginning(versionType, version, versions)
                        const ending = getEnding(versionType)
                        addition = beginning + addition + ending
                    }
                    latest.addition = addition
                }
                notice(type, latest)
                notifications.push({ type, value: latest })
            }
        }
    } catch (ex) {
        console.error(ex)
    }
}

if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
    setInterval(getCpuTemperature, 1000)
}

async function getCpuTemperature() {
    try {
        const value = await fs.promises.readFile('/sys/class/thermal/thermal_zone0/temp', { encoding: 'utf8' })
        if (parseInt(value) >= 70000) {
            exec('sudo shutdown -P now')
        }
        notice('cpu', { identity: value, readable: `${parseInt(value) / 1000}℃` })
    } catch (ex) {
        console.error(ex)
    }
}
//#endregion

//#region Notification
const connections: connection[] = []
const httpPort = 80
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
            let html = await fs.promises.readFile(path.join(__dirname, '../index.html'), { encoding: 'utf8' })
            html = html.replace(/%replace_as_ws_url%/g, `${ip.address('public', 'ipv4')}:${wsPort}`)
            res.end(html)
        } catch (e) {
            console.error(e)
        }
    })
    .listen(httpPort)
console.log(`HTTP server is running at ${ip.address('public', 'ipv4')}:${httpPort}`)
httpServer.on('error', e => {
    console.error(e.message)
})

const wsServer = new WSServer({ httpServer: http.createServer().listen(wsPort) })
console.log(`WebSocket server is running at ${ip.address('public', 'ipv4')}:${wsPort}`)
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

    connection.on('message', data => {
        switch (data.utf8Data) {
            case 'read':
                notifications.splice(0, notifications.length)
                notice('read', { identity: '', readable: '' })
                console.log('Marked as read.')
                break
            case 'shutdown':
                console.log('Client asked to shutdown.')
                exec('sudo shutdown -P now')
                break
            case 'restart':
                console.log('Client asked to restart.')
                exec('sudo shutdown -r now')
                break
            default:
                console.error(`Unknown client request: ${data.utf8Data}.`)
                break
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
