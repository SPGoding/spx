import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import * as ip from 'ip'
import { exec, execSync } from 'child_process'
import { getWebCode, getRandomInt, getVersionType, getBeginning, getEnding, StringStringMap, StringFunctionMap, Result } from './util'
import { server as WSServer, connection } from 'websocket'

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
/**
 * All notifications that still aren't read by clients.
 */
const unread: { type: string, value: Result }[] = []

var versions: string[] = []

export const getLatest: StringFunctionMap = {
    article: source => {
        try {
            const json = JSON.parse(source)
            const url = json.result[0].url
            const readable = json.result[0].default_tile.title
            const identity = `https://minecraft.net${url}`
            return { identity, readable }
        } catch (ex) {
            console.error(ex)
            return { identity: lastResults.article, readable: '' }
        }
    },
    question: source => {
        try {
            const tidRegex = /<tbody id="normalthread_(\d+)">/
            const tid = (tidRegex.exec(source) as RegExpExecArray)[1]
            const identity = `http://www.mcbbs.net/thread-${tid}-1-1.html`
            const titleRegex = /class="s xst">(.+?)<\/a>/
            const readable = (titleRegex.exec(
                source.slice(source.indexOf('normalthread_'))) as RegExpExecArray)[1]
            return { identity, readable }
        } catch (ex) {
            console.error(ex)
            return { identity: lastResults.question, readable: '' }
        }
    },
    version: source => {
        try {
            const json: {
                latest: { snapshot: string, release: string },
                versions: [{ id: string, [key: string]: any }]
            } = JSON.parse(source)
            const latest: string = json.latest.snapshot
            versions = json.versions.map(v => v.id)
            return { identity: latest, readable: latest }
        } catch (ex) {
            console.error(ex)
            return { identity: lastResults.version, readable: '' }
        }
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
                // Deal with additional information.
                if (type === 'article') {
                    const urlsrcPath = path.join(__dirname, '../ref/urlsrc.txt')
                    const bbcsrcPath = path.join(__dirname, '../ref/bbssrc.txt')
                    const cwd = path.join(__dirname, '../ref/')
                    const urlsrc = await getWebCode(latest.identity)
                    await fs.promises.writeFile(urlsrcPath, urlsrc, { encoding: 'utf8' })
                    execSync('python3 mcArticleConvert.py', { encoding: 'utf8', cwd })
                    latest.addition = await fs.promises.readFile(bbcsrcPath, { encoding: 'utf8' })
                } else if (type === 'version') {
                    const versionType = getVersionType(latest.identity)
                    const beginning = getBeginning(versionType, latest.identity, versions)
                    const ending = getEnding(versionType)
                    const addition = { beginning, ending }
                    latest.addition = addition
                }
                notice(type, latest)
                unread.push({ type, value: latest })
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
        const value = await fs.promises.readFile(
            '/sys/class/thermal/thermal_zone0/temp',
            { encoding: 'utf8' }
        )
        if (parseInt(value) >= 70000) {
            exec('sudo shutdown -P now')
        }
        notice('cpu', { identity: value, readable: `${parseInt(value) / 1000}℃` })
    } catch (ex) {
        console.error(ex)
    }
}
//#endregion

//#region Notice
const connections: connection[] = []
const httpPort = 80
const wsPort = getRandomInt(49152, 65535)

const httpServer = http.createServer(async (req, res) => {
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
}).listen(httpPort)
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
    if (unread.length > 0) {
        for (const i of unread) {
            connection.sendUTF(JSON.stringify(i))
        }
    }

    connection.on('message', data => {
        switch (data.utf8Data) {
            case 'read':
                unread.splice(0, unread.length)
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
