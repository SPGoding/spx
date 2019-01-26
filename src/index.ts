import * as http from 'http'
import * as https from 'https'
import * as say from 'say'

export type StringStringMap = {
    [key: string]: string
}

type StringFunctionMap = {
    [key: string]: (source: string) => string
}

const interval = 15000
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

setInterval(main, interval)


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
                say.speak(text)
            }
        }
    } catch (ex) {
        console.error(ex)
    }
}

async function getWebCode(url: string) {
    const isHttps = url.slice(0, 5) === 'https'
    const promise = new Promise<string>((resolve, reject) => {
        const cb = (res: http.IncomingMessage) => {
            var content = ''

            res.setEncoding('utf8')
            res.on('data', chunk => {
                content += chunk
            })
            res.on('end', () => {
                resolve(content)
            })
            res.on('error', e => {
                reject(e.message)
            })
        }
        if (isHttps) {
            https.get(url, cb)
        } else {
            http.get(url, cb)
        }
    })
    return promise
}
