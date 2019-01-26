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
    [key: string]: (source: string) => string
}

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
export const getLatest: StringFunctionMap = {
    article: source => {
        const json = JSON.parse(source)
        const url = json.result[0].url
        const latest = `https://minecraft.net${url}`
        return latest
    },
    question: source => {
        const regex = /<tbody id="normalthread_(\d+)">/
        const tid = (regex.exec(source) as RegExpExecArray)[1]
        const latest = `http://www.mcbbs.net/thread-${tid}-1-1.html`
        return latest
    },
    version: source => {
        const json = JSON.parse(source)
        const latest = json.latest.snapshot
        return latest
    }
}

setInterval(main, 15000)

async function main() {
    try {
        for (const type of ['article', 'question', 'version']) {
            const webCode = await getWebCode(urls[type])
            const latest = getLatest[type](webCode)
            const last = lastResults[type]
            lastResults[type] = latest

            let text = ''
            if (!last) {
                text = `Initialized ${type}.`
            } else if (last !== latest) {
                text = `Detected new ${type}.`
            }
            if (text) {
                console.log(text)
                alert(type, latest)
            }
        }
    } catch (ex) {
        console.error(ex)
    }
}
//#endregion

//#region Alert
const connections: connection[] = []

http.createServer(async (_, res) => {
    res.setHeader('Content-Type', "text/html;charset='utf-8'")
    let html = await fs.promises.readFile(path.join(__dirname, '../index.html'), { encoding: 'utf8' })
    html = html.replace(/localhost/g, ip.address('public', 'ipv4'))
    res.end(html)
}).listen(80)
console.log(`HTTP server is running at ${ip.address('public', 'ipv4')}:80`)

const wsServer = new WSServer({ httpServer: http.createServer().listen(81) })
wsServer.on('request', request => {
    const connection = request.accept()
    connections.push(connection)
    console.log(`${connection.remoteAddress} connected.`)

    connection.on('close', () => {
        console.log(`${connection.remoteAddress} disconnected.`)
        connections.splice(connections.indexOf(connection), 1)
    })
})

function alert(type: string, value: string) {
    connections.forEach(connection => {
        connection.sendUTF(JSON.stringify({ type, value }))
    })
}
//#endregion
