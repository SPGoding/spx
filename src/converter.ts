import * as rp from 'request-promise-native'
import { bugs } from '.'
import { getImageDimensions } from './util'

/*
 * @author SPGoding
 */

const info = {
    translator: '',
    url: '',
    title: '',
    author: ''
}

export async function convertMCAriticleToBBCode(html: Document, articleUrl: string, translator: string = '？？？', articleType: string) {
    info.url = articleUrl
    info.title = html.title.split(' | ').slice(0, -1).join(' | ')
    info.translator = translator

    const heroImage = getHeroImage(html, articleType)
    const content = await getContent(html)

    const ans = `${heroImage}${content}[/indent][/indent]`

    return ans
}

/**
 * Get the hero image (head image) of an article as the form of a BBCode string.
 * @param html An HTML Document.
 */
export function getHeroImage(html: Document, articleType: string = '') {
    const category = articleType ? `[backcolor=Black][color=White][font="Noto Sans",sans-serif][b]${articleType}[/b][/font][/color][/backcolor][/align]` : ''
    const img = html.getElementsByClassName('article-head__image')[0] as HTMLImageElement | undefined
    if (!img) {
        return `[postbg]bg3.png[/postbg]\n\n[align=center]${category}[indent][indent]\n`
    }
    const src = img.src
    const ans = `[postbg]bg3.png[/postbg][align=center][img=1200,513]${resolveUrl(src)}[/img]\n${category}[indent][indent]\n`

    return ans
}

/**
 * Get the content of an article as the form of a BBCode string.
 * @param html An HTML Document.
 */
export async function getContent(html: Document) {
    const rootDiv = html.getElementsByClassName('article-body')[0] as HTMLElement
    let ans = await converters.rescure(rootDiv)

    // Get the server URL if it exists.
    const serverUrls = ans.match(/(https:\/\/launcher.mojang.com\/.+\/server.jar)/)
    let serverUrl = ''
    if (serverUrls) {
        serverUrl = serverUrls[0]
    }
    // Remove the text after '】'
    ans = ans.slice(0, ans.lastIndexOf('】') + 1)
    // Remove 'GET THE SNAPSHOT/PRE-RELEASE/RELEASE' for releasing
    let index = ans.toLowerCase().lastIndexOf('[size=6][b][color=silver]get the snapshot[/color][/b][/size]')
    if (index === -1) {
        index = ans.toLowerCase().lastIndexOf('[size=6][b][color=silver]get the pre-release[/color][/b][/size]')
    }
    if (index === -1) {
        index = ans.toLowerCase().lastIndexOf('[size=6][b][color=silver]get the release[/color][/b][/size]')
    }
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
    convert: async (node: ChildNode): Promise<string> => {
        switch (node.nodeName) {
            case 'A':
                return converters.a(node as HTMLAnchorElement)
            case 'B':
            case 'STRONG':
                return converters.strong(node as HTMLElement)
            case 'BLOCKQUOTE':
                return converters.blockquote(node as HTMLQuoteElement)
            case 'BR':
                return converters.br()
            case 'CITE':
                return converters.cite(node as HTMLElement)
            case 'CODE':
                return converters.code(node as HTMLElement)
            case 'DIV':
            case 'SECTION':
                return converters.div(node as HTMLDivElement)
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
            case 'H4':
                return converters.h4(node as HTMLElement)
            case 'I':
                return converters.i(node as HTMLElement)
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
                if (node) {
                    return ((node as Text).textContent as string)
                        .replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
                } else {
                    return ''
                }
            case 'BUTTON':
            case 'H5':
            case 'NAV':
            case 'PICTURE': // TODO: If picture contains important img in the future. Then just attain the last <img> element in the <picture> element.
            case 'svg':
            case 'SCRIPT':
                if (node) {
                    return node.textContent ? node.textContent : ''
                } else {
                    return ''
                }
            default:
                console.log(`Unknown type: '${node.nodeName}'.`)
                if (node) {
                    return node.textContent ? node.textContent : ''
                } else {
                    return ''
                }
        }
    },
    /**
     * Convert child nodes of an HTMLElement to a BBCode string.
     */
    rescure: async (ele: HTMLElement) => {
        let ans = ''

        for (const child of Array.from(ele.childNodes)) {
            ans += await converters.convert(child)
        }

        ans = removeLastLinebreak(ans)

        return ans
    },
    a: async (anchor: HTMLAnchorElement) => {
        const url = resolveUrl(anchor.href)
        let ans
        if (url) {
            ans = `[url=${url}][color=#388d40]${await converters.rescure(anchor)}[/color][/url]`
        } else {
            ans = await converters.rescure(anchor)
        }

        return ans
    },
    blockquote: async (ele: HTMLQuoteElement) => {
        const prefix = ''
        const suffix = ''
        const ans = `${prefix}${await converters.rescure(ele)}${suffix}`

        return ans
    },
    br: async () => {
        const ans = '\n'

        return ans
    },
    cite: async (ele: HTMLElement) => {
        const prefix = '—— '
        const suffix = ''

        const ans = `${prefix}${await converters.rescure(ele)}${suffix}`

        return ans
    },
    code: async (ele: HTMLElement) => {
        const prefix = "[backcolor=White][font=Monaco,Consolas,'Lucida Console','Courier New',serif]"
        const suffix = '[/font][/backcolor]'

        const ans = `${prefix}${await converters.rescure(ele)}${suffix}`

        return ans
    },
    div: async (ele: HTMLDivElement) => {
        let ans = await converters.rescure(ele)

        if (ele.classList.contains('text-center')) {
            ans = `[/indent][/indent][align=center]${ans}[/align][indent][indent]\n`
        } else if (ele.classList.contains('article-image-carousel__caption')) {
            // Image description
            ans = `[/indent][/indent][align=center][b]${ans.replace(/\n/, '')}[/b][/align][indent][indent]\n`
        } else if (ele.classList.contains('video')) {
            // Video.
            ans = '\n[/indent][/indent][align=center]【请将此处替换为含https的视频链接[media]XXX[/media]】[/align][indent][indent]\n'
        } else if (ele.classList.contains('quote') || ele.classList.contains('attributed-quote')) {
            ans = `\n[quote]\n${ans}\n[/quote]\n`
        } else if (ele.classList.contains('article-social')) {
            // End of the content.
            ans = ''
        }
        //  else if (ele.classList.contains('end-with-block')) {
        //     ans = ans.trimRight() + '[img=16,16]https://ooo.0o0.ooo/2017/01/30/588f60bbaaf78.png[/img]'
        // }

        return ans
    },
    dt: async (_ele: HTMLElement) => {
        // const ans = `${converters.rescure(ele)}：`

        // return ans
        return ''
    },
    dl: async (ele: HTMLElement) => {
        // The final <dd> after converted will contains an ending comma '，'
        // So I don't add any comma before '译者'.
        const ans = `\n\n${await converters.rescure(ele)}\n【本文排版借助了：[url=https://spx.spgoding.com][color=#388d40][u]SPX[/u][/color][/url]】\n`
        return ans
    },
    dd: async (ele: HTMLElement) => {
        let ans = ''

        if (ele.classList.contains('pubDate')) {
            // Published:
            // `pubDate` is like '2019-03-08T10:00:00.876+0000'.
            const date = ele.attributes.getNamedItem('data-value')
            if (date) {
                ans = `[b]【${info.translator} 译自[url=${info.url}][color=#388d40][u]官网 ${date.value.slice(0, 4)} 年 ${date.value.slice(5, 7)} 月 ${date.value.slice(8, 10)} 日发布的 ${info.title}[/u][/color][/url]；原作者 ${info.author}】[/b]`
            } else {
                ans = '[b]【${info.translator} 译自[url=${info.url}][color=#388d40][u]官网 哪 年 哪 月 哪 日发布的 ${info.title}[/u][/color][/url]】[/b]'
            }
        } else {
            // Written by:
            info.author = await converters.rescure(ele)
        }

        return ans
    },
    em: async (ele: HTMLElement) => {
        const ans = `[i]${await converters.rescure(ele)}[/i]`

        return ans
    },
    h1: async (ele: HTMLElement) => {
        const prefix = '[size=6][b]'
        const suffix = '[/b][/size]'
        const inner = await converters.rescure(ele)
        const ans = `${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`)}\n\n`

        return ans
    },
    h2: async (ele: HTMLElement) => {
        const prefix = '[size=5][b]'
        const suffix = '[/b][/size]'
        const inner = await converters.rescure(ele)
        const ans = `\n${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`)}\n\n`

        return ans
    },
    h3: async (ele: HTMLElement) => {
        const prefix = '[size=4][b]'
        const suffix = '[/b][/size]'
        const inner = await converters.rescure(ele)
        const ans = `\n${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`)}\n\n`

        return ans
    },
    h4: async (ele: HTMLElement) => {
        const prefix = '[size=3][b]'
        const suffix = '[/b][/size]'
        const inner = await converters.rescure(ele)
        const ans = `\n${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`)}\n\n`

        return ans
    },
    i: async (ele: HTMLElement) => {
        const ans = `[i]${await converters.rescure(ele)}[/i]`

        return ans
    },
    img: async (img: HTMLImageElement) => {
        if (img.alt === 'Author image') {
            return ''
        }

        let prefix: string | undefined
        const imgUrl = resolveUrl(img.src)

        try {
            const result = await getImageDimensions(imgUrl)
            let w: number | undefined
            let h: number | undefined
            if (result && result.height && result.width) {
                w = result.width
                h = result.height
            } else if (result && result.images && result.images[0].height && result.images[0].width) {
                w = result.images[0].width
                h = result.images[0].height
            }

            if (w && h && img.classList.contains('attributed-quote__image')) {
                const newH = Math.min(h, 92)
                w = Math.round(newH / h * w)
                h = newH
            }

            prefix = w && h ? `[img=${w},${h}]` : '[img]'
        } catch (e) {
            console.error(e)
            console.error(imgUrl)
        }

        if (prefix === undefined) {
            prefix = '[img]'
        }

        let ans: string
        if (img.classList.contains('attributed-quote__image')) {
            // Attributed quote author avatar.
            ans = `\n[float=left]${prefix}${imgUrl}[/img][/float]`
        } else {
            ans = `\n\n[/indent][/indent][align=center]${prefix}${imgUrl}[/img][/align][indent][indent]\n`
        }

        return `${ans}`
    },
    li: async (ele: HTMLElement) => {
        const inner = await converters.rescure(ele)
        const ans = `[*][color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color]\n[*]${translateMachinely(translateBugs(inner))}\n`

        return ans
    },
    ol: async (ele: HTMLElement) => {
        const inner = await converters.rescure(ele)
        const ans = `\n[list=1]\n${inner}[/list]\n`

        return ans
    },
    p: async (ele: HTMLElement) => {
        const inner = await converters.rescure(ele)

        let ans

        if (ele.classList.contains('lead')) {
            ans = `[size=4][b][size=2][color=Silver]${inner}[/color][/size][/b][/size]\n[size=4][b]${translateMachinely(inner)}[/b][/size]\n\n`
        } else {
            ans = `[size=2][color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color][/size]\n${translateMachinely(inner)}\n\n`
        }

        return ans
    },
    span: async (ele: HTMLElement) => {
        const ans = await converters.rescure(ele)

        if (ele.classList.contains('bedrock-server')) {
            // Is inline code.
            const prefix = "[backcolor=White][font=Monaco,Consolas,'Lucida Console','Courier New',serif][color=#7824c5]"
            const suffix = '[/color][/font][/backcolor]'
            return `${prefix}${ans}${suffix}`
        } else if (ele.classList.contains('strikethrough')) {
            // Is strikethrough text.
            const prefix = '[s]'
            const suffix = '[/s]'
            return `${prefix}${ans}${suffix}`
        }

        return ans
    },
    strong: async (ele: HTMLElement) => {
        const ans = `[b]${await converters.rescure(ele)}[/b]`

        return ans
    },
    tbody: async (ele: HTMLElement) => {
        // The `NodeName` of `HTMLTableElement` and `HTMLTableSectionElement` are all 'TBODY'.
        // So I use `ele.childNodes[0]` to skip `HTMLTableSectionElement`.
        const ans = `\n[table]\n${await converters.rescure(ele.childNodes[0] as HTMLElement)}[/table]\n`

        return ans
    },
    td: async (ele: HTMLElement) => {
        const ans = `[td]${await converters.rescure(ele)}[/td]`

        return ans
    },
    tr: async (ele: HTMLElement) => {
        const ans = `[tr]${await converters.rescure(ele)}[/tr]\n`

        return ans
    },
    ul: async (ele: HTMLElement) => {
        const inner = await converters.rescure(ele)
        const ans = `\n[list]\n${inner}[/list]\n`

        return ans
    }
}

/**
 * Replace all half-shape characters to full-shape characters.
 */
export function translateMachinely(input: string) {
    const mappings: [RegExp, string][] = [
        [/Taking Inventory: /gi, '背包盘点：'],
        [/Minecraft Snapshot /gi, 'Minecraft 快照 '],
        [/A Minecraft Java Snapshot/gi, 'Minecraft Java版快照'],
        [/A Minecraft Java Pre-Release/gi, 'Minecraft Java版预发布版'],
        [/Image credit:/gi, '图片来源：'],
        [/CC BY:/gi, '知识共享 署名'],
        [/CC BY-NC:/gi, '知识共享 署名-非商业性使用'],
        [/CC BY-ND:/gi, '知识共享 署名-禁止演绎'],
        [/CC BY-SA:/gi, '知识共享 署名-相同方式共享'],
        [/CC BY-NC-ND:/gi, '知识共享 署名-非商业性使用-禁止演绎'],
        [/CC BY-NC-SA:/gi, '知识共享 署名-非商业性使用-相同方式共享'],
        [/Public Domain:/gi, '公有领域'],
        [/“/g, '[font=楷体,楷体_GB2312]“[/font]'],
        [/”/g, '[font=楷体,楷体_GB2312]”[/font]'],
        [/\[i\]/gi, '[font=楷体,楷体_GB2312]'],
        [/\[\/i\]/g, '[/font]'],
        [/,( |$)/g, '，'],
        [/!( |$)/g, '！'],
        [/\.\.\.( |$)/g, '…'],
        [/\.( |$)/g, '。'],
        [/\?( |$)/g, '？'],
        [/( |^)\-( |$)/g, ' —— ']
    ]

    for (const mapping of mappings) {
        input = input.replace(mapping[0], mapping[1])
    }

    const quoteArrays: [string, string, RegExp][] = [
        ['[font=楷体,楷体_GB2312]“[/font]', '[font=楷体,楷体_GB2312]”[/font]', /"/]
        // ['『', '』', "'"]
    ]

    for (const quoteArray of quoteArrays) {
        const splited = input.split(quoteArray[2])
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
    // if (str.slice(-1) === '\n') {
    //     return str.slice(0, -1)
    // }
    return str
}

function translateBugs(str: string) {
    if (str.startsWith('[url=https://bugs.mojang.com/browse/MC-')) {
        const id = str.slice(36, str.indexOf(']'))
        if (bugs[id]) {
            return `${str.slice(0, str.indexOf('[/color][/url]- ') + 16)}${bugs[id]}`
        } else {
            return str
        }
    } else {
        return str
    }
}
