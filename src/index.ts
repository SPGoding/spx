import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import * as ip from 'ip'
import { getWebCode } from './util'
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
//#endregion

//#region Alert
const connections: connection[] = []

const httpServer = http.createServer(async (_, res) => {
    res.setHeader('Content-Type', "text/html;charset='utf-8'")
    let html = await fs.promises.readFile(path.join(__dirname, '../index.html'), { encoding: 'utf8' })
    html = html.replace(/localhost/g, ip.address('public', 'ipv4'))
    res.end(html)
}).listen(80)
console.log(`HTTP server is running at ${ip.address('public', 'ipv4')}:80`)
httpServer.on('error', e => {
    console.error(e.message)
})

const wsServer = new WSServer({ httpServer: http.createServer().listen(81) })
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
        if (data.utf8Data === 'read') {
            unread.splice(0, unread.length)
            console.log('Mark as read.')
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
