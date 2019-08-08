/*
 * @author SPGoding
 */

const config = {
    translator: 'SPGoding'
}

let url = '',
    title = ''

export function convertMCAriticleToBBCode(html: Document, articleUrl: string) {
    url = articleUrl
    title = html.title.split(' | ').slice(0, -1).join(' | ')

    const heroImage = getHeroImage(html)
    const content = getContent(html)

    const ans = `${heroImage}\n${content}`

    return ans
}

/**
 * Get the hero image (head image) of an article as the form of a BBCode string.
 * @param html An HTML Document.
 */
export function getHeroImage(html: Document) {
    const img = html.getElementsByClassName('article-head__image')[0] as HTMLImageElement
    const src = img.src
    const ans = `[postbg]bg3.png[/postbg][align=center][img=1200,513]${resolveUrl(src)}[/img][/align]`

    return ans
}

/**
 * Get the content of an article as the form of a BBCode string.
 * @param html An HTML Document.
 */
export function getContent(html: Document) {
    const rootDiv = html.getElementsByClassName('article-body')[0] as HTMLElement
    let ans = converters.rescure(rootDiv)

    // Get the server URL if it exists.
    const serverUrls = ans.match(/(https:\/\/launcher.mojang.com\/.+\/server.jar)/)
    let serverUrl = ''
    if (serverUrls) {
        serverUrl = serverUrls[0]
    }
    // Remove the text after '【作者：xxx，发布日期：xxx，译者：xxx】'
    ans = ans.slice(0, ans.lastIndexOf('】') + 1)
    // Remove 'GET THE SNAPSHOT' for releasing
    const index = ans.lastIndexOf('[color=Gray]GET THE SNAPSHOT[/color][/b][/size]')
    if (index !== -1) {
        ans = ans.slice(0, index)
    }
    // Add spaces between texts and '[x'.
    ans = ans.replace(/([a-zA-Z0-9\-\.\_])(\[[A-Za-z])/g, '$1 $2')
    // Add spaces between '[/x]' and texts.
    ans = ans.replace(/(\[\/[^\]]+?\])([a-zA-Z0-9\-\.\_])/g, '$1 $2')
    // Append the server URL if it exists.
    if (serverUrl) {
        ans += `\n[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]官方服务端下载地址[/b][/color][/size][/align][/td][/tr]
[tr][td][align=center][url=${serverUrl}]Minecraft server.jar[/url][/align][/td][/tr]
[/table][/align]`
    }

    return ans
}

export const converters = {
    /**
     * Converts a ChildNode to a BBCode string according to the type of the node.
     */
    convert: (node: ChildNode): string => {
        switch (node.nodeName) {
            case 'A':
                return converters.a(node as HTMLAnchorElement)
            case 'B':
            case 'STRONG':
                return converters.strong(node as HTMLElement)
            case 'BR':
                return converters.br()
            case 'CODE':
                return converters.code(node as HTMLElement)
            case 'DIV':
                return converters.div(node as HTMLElement)
            case 'DD':
                return converters.dd(node as HTMLElement)
            case 'DL':
                return converters.dl(node as HTMLElement)
            case 'DT':
                return converters.dt(node as HTMLElement)
            case 'EM':
                return converters.em(node as HTMLElement)
            case 'H1':
                return converters.h1(node as HTMLElement)
            case 'H2':
                return converters.h2(node as HTMLElement)
            case 'H3':
                return converters.h3(node as HTMLElement)
            case 'IMG':
                return converters.img(node as HTMLImageElement)
            case 'LI':
                return converters.li(node as HTMLElement)
            case 'OL':
                return converters.ol(node as HTMLElement)
            case 'P':
                return converters.p(node as HTMLElement)
            case 'SPAN':
                return converters.span(node as HTMLElement)
            case 'TBODY':
                return converters.tbody(node as HTMLElement)
            case 'TD':
                return converters.td(node as HTMLElement)
            case 'TR':
                return converters.tr(node as HTMLElement)
            case 'UL':
                return converters.ul(node as HTMLElement)
            case '#text':
                return ((node as Text).textContent as string)
                    .replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
            default:
                return node.textContent ? node.textContent : ''
            // throw `Unknown type: '${node.nodeName}'.`
        }
    },
    /**
     * Convert child nodes of an HTMLElement to a BBCode string.
     */
    rescure: (ele: HTMLElement) => {
        let ans = ''

        ele.childNodes.forEach(child => {
            ans += converters.convert(child)
        })

        ans = removeLastLinebreak(ans)

        return ans
    },
    a: (anchor: HTMLAnchorElement) => {
        const url = resolveUrl(anchor.href)
        let ans
        if (url) {
            ans = `[url=${url}][color=#008000]${converters.rescure(anchor)}[/color][/url]`
        } else {
            ans = converters.rescure(anchor)
        }

        return ans
    },
    br: () => {
        const ans = '\n'

        return ans
    },
    code: (ele: HTMLElement) => {
        const prefix = "[backcolor=White][font=Monaco,Consolas,'Lucida Console','Courier New',serif]"
        const suffix = '[/font][/backcolor]'

        const ans = `${prefix}${converters.rescure(ele)}${suffix}`

        return ans
    },
    div: (ele: HTMLElement) => {
        let ans = converters.rescure(ele)

        if (ele.classList.contains('text-center')) {
            ans = `[align=center]${ans}[/align]`
        } else if (ele.classList.contains('article-image-carousel__caption')) {
            // Image description
            ans = `[align=center][b]${ans}[/b][/align]`
        } if (ele.classList.contains('article-social')) {
            // End of the content.
            ans = ''
        }

        return ans
    },
    dt: (ele: HTMLElement) => {
        const ans = `${converters.rescure(ele)}：`

        return ans
    },
    dl: (ele: HTMLElement) => {
        // The final <dd> after converted will contains an ending comma '，'
        // So I don't add any comma before '译者'.
        const ans = `\n【原文：[url=${url}]${title}[/url]】\n【${converters.rescure(ele)}译者：${config.translator}】`

        return ans
    },
    dd: (ele: HTMLElement) => {
        let ans = converters.rescure(ele)

        if (ele.classList.contains('pubDate')) {
            // `pubDate` is like '2019-03-08T10:00:00.876+0000'.
            // Use `.slice(0, 10)` to get '2019-03-08'.
            const date = ele.attributes.getNamedItem('data-value')
            if (date) {
                ans = date.value.slice(0, 10)
            }
        }

        ans += '，'

        return ans
    },
    em: (ele: HTMLElement) => {
        const ans = `[i]${converters.rescure(ele)}[/i]`

        return ans
    },
    h1: (ele: HTMLElement) => {
        const prefix = '[size=6][b]'
        const suffix = '[/b][/size]'
        const inner = converters.rescure(ele)
        const ans = `\n[color=Gray]${inner}[/color]${suffix}\n${replaceHalfToFull(`${prefix}${inner}${suffix}`)}\n`

        return ans
    },
    h2: (ele: HTMLElement) => {
        const prefix = '[size=5][b]'
        const suffix = '[/b][/size]'
        const inner = converters.rescure(ele)
        const ans = `\n[color=Gray]${inner}[/color]${suffix}\n${replaceHalfToFull(`${prefix}${inner}${suffix}`)}\n`

        return ans
    },
    h3: (ele: HTMLElement) => {
        const prefix = '[size=4][b]'
        const suffix = '[/b][/size]'
        const inner = converters.rescure(ele)
        const ans = `\n[color=Gray]${inner}[/color]${suffix}\n${replaceHalfToFull(`${prefix}${inner}${suffix}`)}\n`

        return ans
    },
    img: (img: HTMLImageElement) => {
        let ans = `\n[align=center][img]${resolveUrl(img.src)}[/img][/align]\n`
        if (img.alt === 'Author image') {
            ans = ''
        }
        return ans
    },
    li: (ele: HTMLElement) => {
        const inner = converters.rescure(ele)
        const ans = `[*][color=Gray]${inner}[/color]\n[*]${replaceHalfToFull(inner)}\n`

        return ans
    },
    ol: (ele: HTMLElement) => {
        const inner = converters.rescure(ele)
        const ans = `\n[list=1]\n${inner}[/list]\n`

        return ans
    },
    p: (ele: HTMLElement) => {
        const inner = converters.rescure(ele)
        let ans = `\n[color=Gray]${inner}[/color]\n${replaceHalfToFull(inner)}\n`

        if (ele.classList.contains('lead')) {
            ans = `[size=4][b][color=Gray]${inner}[/color][/b][/size]\n[size=4][b]${replaceHalfToFull(inner)}[/b][/size]\n`
        }

        return ans
    },
    span: (ele: HTMLElement) => {
        const prefix = "[backcolor=White][font=Monaco,Consolas,'Lucida Console','Courier New',serif]"
        const suffix = '[/font][/backcolor]'
        const ans = converters.rescure(ele)

        if (ele.classList.contains('bedrock-server')) {
            // Is inline code.
            return `${prefix}${ans}${suffix}`
        }

        return ans
    },
    strong: (ele: HTMLElement) => {
        const ans = `[b]${converters.rescure(ele)}[/b]`

        return ans
    },
    tbody: (ele: HTMLElement) => {
        // The `NodeName` of `HTMLTableElement` and `HTMLTableSectionElement` are all 'TBODY'.
        // So I use `ele.childNodes[0]` to skip `HTMLTableSectionElement`.
        const ans = `\n[table]\n${converters.rescure(ele.childNodes[0] as HTMLElement)}[/table]\n`

        return ans
    },
    td: (ele: HTMLElement) => {
        const ans = `[td]${converters.rescure(ele)}[/td]`

        return ans
    },
    tr: (ele: HTMLElement) => {
        const ans = `[tr]${converters.rescure(ele)}[/tr]\n`

        return ans
    },
    ul: (ele: HTMLElement) => {
        const inner = converters.rescure(ele)
        const ans = `\n[list]\n${inner}[/list]\n`

        return ans
    }
}

/**
 * Replace all half-shape characters to full-shape characters.
 */
export function replaceHalfToFull(input: string) {
    const mappings = [
        [/,\s?/g, '，'],
        [/!\s?/g, '！'],
        [/\.\s?/g, '。'],
        [/\?\s?/g, '？']
    ]

    const quoteArrays = [
        ['「', '」', '"'],
        ['『', '』', "'"]
    ]

    for (const mapping of mappings) {
        input = input.replace(mapping[0], mapping[1] as string)
    }

    for (const quoteArray of quoteArrays) {
        const splited = input.split(new RegExp(quoteArray[2], 'g'))
        input = ''
        for (let i = 0; i < splited.length - 1; i++) {
            const element = splited[i]
            input += element + quoteArray[i % 2]
        }
        input += splited[splited.length - 1]
    }

    return input
}

/**
 * Resolve relative URLs.
 */
export function resolveUrl(url: string) {
    if (url[0] === '/') {
        return `https://www.minecraft.net${url}`
    } else {
        return url
    }
}

function removeLastLinebreak(str: string) {
    if (str.slice(-1) === '\n') {
        return str.slice(0, -1)
    }
    return str
}
