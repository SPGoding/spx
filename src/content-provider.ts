import * as rp from 'request-promise-native'

export interface ContentProvider {
    getContent(): Promise<Content>
}

export interface Content {
    id: string,
    text: string,
    addition?: string
}

export class JsonContentProvider implements ContentProvider {
    constructor(
        private readonly url: string,
        private readonly idGetter: (json: any) => string | Promise<string>,
        private readonly textGetter: (json: any) => string | Promise<string> = idGetter,
        private readonly additionGetter: (json: any) => (string | undefined) | Promise<string | undefined> = (_ => undefined)
    ) { }

    async getContent() {
        try {
            const webCode = await rp(this.url)
            const json = JSON.parse(webCode)
            return {
                id: await this.idGetter(json),
                text: await this.textGetter(json),
                addition: await this.additionGetter(json)
            }
        } catch (ex) {
            throw `Error occurred while getting content: \n${ex.stack}`
        }
    }
}

export class HtmlContentProvider implements ContentProvider {
    constructor(
        protected readonly url: string,
        protected readonly idGetter: (webCode: string) => string | Promise<string>,
        protected readonly textGetter: (webCode: string) => string | Promise<string> = idGetter,
        protected readonly additionGetter: (webCode: string) => (string | undefined) | Promise<string | undefined> = (_ => undefined),
    ) { }

    async getContent() {
        try {
            const webCode = await rp(this.url)
            return {
                id: await this.idGetter(webCode),
                text: await this.textGetter(webCode),
                addition: await this.additionGetter(webCode)
            }
        } catch (ex) {
            throw `Error occurred while getting content: \n${ex.stack}`
        }
    }
}

export class McbbsContentProvider extends HtmlContentProvider {
    constructor(protected readonly url: string) {
        super(
            url,
            webCode => {
                const tidRegex = /<tbody id="normalthread_(\d+)">/
                const tid = (tidRegex.exec(webCode) as RegExpExecArray)[1]
                return `http://www.mcbbs.net/thread-${tid}-1-1.html`
            },
            webCode => {
                const titleRegex = /class="s xst">(.+?)<\/a>/
                return (titleRegex.exec(webCode.slice(webCode.indexOf('normalthread_'))) as RegExpExecArray)[1]
            }
        )
    }

    async getContent() {
        try {
            const webCode = await rp(this.url)
            return {
                id: await this.idGetter(webCode),
                text: await this.textGetter(webCode),
                addition: await this.additionGetter(webCode)
            }
        } catch (ex) {
            throw `Error occurred while getting content: \n${ex.stack}`
        }
    }
}
