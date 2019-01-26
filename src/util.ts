import * as http from 'http'
import * as https from 'https'

export async function getWebCode(url: string) {
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
        }
        else {
            http.get(url, cb)
        }
    })
    return promise
}
