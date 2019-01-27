import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import * as ip from 'ip'
import { exec } from 'child_process'
import { getWebCode, getRandomInt } from './util'
import { server as WSServer, connection } from 'websocket'

export type StringStringMap = {
    [key: string]: string
}

type StringFunctionMap = {
    [key: string]: (source: string) => IdentityReadable
}

type IdentityReadable = { identity: string, readable: string }

//#region Detect
const urls: StringStringMap = {
    article: 'https://minecraft.net/en-us/api/tiles/channel/not_set,Community%20content/region/None/category/Insider,News/page/1',
    question: 'http://www.mcbbs.net/forum-qanda-1.html',
    version: 'https://launchermeta.mojang.com/mc/game/version_manifest.json'
}
const lastResults: StringStringMap = {
    article: '',
    question: '',
    version: ''
}
const unread: { type: string, value: IdentityReadable }[] = []

export const getLatest: StringFunctionMap = {
    article: source => {
        const json = JSON.parse(source)
        const url = json.result[0].url
        const readable = json.result[0].default_tile.title
        const latest = `https://minecraft.net${url}`
        return { identity: latest, readable }
    },
    question: source => {
        const tidRegex = /<tbody id="normalthread_(\d+)">/
        const tid = (tidRegex.exec(source) as RegExpExecArray)[1]
        const latest = `http://www.mcbbs.net/thread-${tid}-1-1.html`
        const titleRegex = /class="s xst">(.+?)<\/a>/
        const readable = (titleRegex.exec(
            source.slice(source.indexOf('normalthread_'))) as RegExpExecArray)[1]
        return { identity: latest, readable }
    },
    version: source => {
        const json = JSON.parse(source)
        const latest: string = json.latest.snapshot
        return { identity: latest, readable: latest }
    }
}

setInterval(main, 10000)

async function main() {
    try {
        for (const type of ['article', 'question', 'version']) {
            const webCode = await getWebCode(urls[type])
            const latest = getLatest[type](webCode)
            const last = lastResults[type]
            lastResults[type] = latest.identity

            let text = ''
            if (!last) {
                text = `Initialized ${type}: ${latest.identity} - ${latest.readable}.`
            } else if (last !== latest.identity) {
                text = `Detected new ${type}: ${latest.identity} - ${latest.readable}.`
            }
            if (text) {
                console.log(text)
                alert(type, latest)
                unread.push({ type, value: latest })
            }
        }
    } catch (ex) {
        console.error(ex)
    }
}

setInterval(getCpuTemperature, 1000)

async function getCpuTemperature() {
    try {
        const value = await fs.promises.readFile(
            '/sys/class/thermal/thermal_zone0/temp',
            { encoding: 'utf8' }
        )
        alert('cpu', { identity: value, readable: `${parseInt(value) / 1000}℃` })
    } catch (ex) {
        console.error(ex)
    }
}
//#endregion

//#region Alert
const connections: connection[] = []
const httpPort = 80
const wsPort = getRandomInt(49152, 65535)

const httpServer = http.createServer(async (_, res) => {
    res.setHeader('Content-Type', "text/html;charset='utf-8'")
    let html = await fs.promises.readFile(path.join(__dirname, '../index.html'), { encoding: 'utf8' })
    html = html.replace(/%replace_as_ws_url%/g, `${ip.address('public', 'ipv4')}:${wsPort}`)
    res.end(html)
}).listen(httpPort)
console.log(`HTTP server is running at ${ip.address('public', 'ipv4')}:${httpPort}`)
httpServer.on('error', e => {
    console.error(e.message)
})

const wsServer = new WSServer({ httpServer: http.createServer().listen(wsPort) })
console.log(`WebSocket server is running at ${ip.address('public', 'ipv4')}:${wsPort}`)
wsServer.on('request', request => {
    const connection = request.accept()
    connections.push(connection)
    console.log(`${connection.remoteAddress} connected.`)
    if (unread.length > 0) {
        for (const i of unread) {
            connection.sendUTF(JSON.stringify(i))
        }
    }

    connection.on('message', data => {
        switch (data.utf8Data) {
            case 'read':
                unread.splice(0, unread.length)
                alert('read', { identity: '', readable: '' })
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

function alert(type: string, value: IdentityReadable) {
    connections.forEach(connection => {
        connection.sendUTF(JSON.stringify({ type, value }))
    })
}
//#endregion
