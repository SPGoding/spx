import Twitter from 'twitter-lite'
import nodeFetch from 'node-fetch'

const ProfilePictures = new Map<string, string>([
    ['Mojang', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124525b5b85bb8ob8t8o0b.jpg'],
    ['MojangSupport', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124525b5b85bb8ob8t8o0b.jpg'],
    ['MojangStatus', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124525b5b85bb8ob8t8o0b.jpg'],
    ['Minecraft', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124524kfu7hzreleueuexh.jpg'],
    ['henrikkniberg', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124519x0r898zl6gc8gna8.jpg'],
    ['_LadyAgnes', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124515qnwcdnz82vyz9ezs.png'],
    ['kingbdogz', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124523da4of54hl7e3fchn.jpg'],
    ['JasperBoerstra', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124522uk3hbr2gx62pbrfh.jpg'],
    ['adrian_ivl', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124513jppdcsu8lsxllxll.jpg'],
    ['slicedlime', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124528na53pu1444w1pdys.jpg'],
    ['Cojomax99', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124516jgwgrzgerr11g9kn.png'],
    ['Mojang_Ined', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124520dpqpa0fufu0fq0l1.jpg'],
    ['SeargeDP', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124527syfrwsstbvxf8jf0.png'],
    ['Dinnerbone', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124517k1n33zuxaumkakam.jpg'],
    ['Marc_IRL', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/28/104919xl2ac5dihxlqxxdf.jpg'],
    ['Mega_Spud', 'https://attachment.mcbbs.net/data/myattachment/forum/202107/07/230046homkfqlhwvkfqkbh.jpg'],
])

export const TweetLinkRegex = /^https?:\/\/(?:mobile\.)?twitter\.com\/([^/]+)\/status\/(\d+)/i

export async function getTweet(twitterClient: Twitter, mode: 'dark' | 'light', tweetLink: string, translator: string) {
    const matchResult = tweetLink.match(TweetLinkRegex)
    if (!matchResult) {
        throw new Error(`❌ 输入 \`${tweetLink}\` 不是可被接受的 Tweet 链接。不可以这样的！`)
    }
    const tweetId = matchResult[2]
    try {
        const result: {
            data: {
                source: string,
                created_at: string,
                text: string,
                entities?: {
                    urls?: { start: number, end: number, url: string, expanded_url: string, display_url: string }[]
                },
                id: string,
                author_id: string,
                lang: string,
            },
            includes: {
                users: { id: string, name: string, username: string }[],
            },
            _headers: {},
        } = await twitterClient.get(`tweets/${tweetId}`, {
            expansions: 'attachments.media_keys,author_id',
            'tweet.fields': 'attachments,author_id,created_at,entities,lang,source,text',
            'user.fields': 'name,username',
        })
        const author = result.includes.users.find(u => u.id === result.data.author_id)!
        const bbcode = getTweetBbcode({
            date: new Date(result.data.created_at),
            lang: result.data.lang,
            mode,
            source: result.data.source,
            text: result.data.text,
            translator,
            tweetLink,
            urls: result.data.entities?.urls ?? [],
            userName: author.name,
            userTag: author.username,
        })
        return bbcode
    } catch (e) {
        throw new Error(`❌ 与 Twitter API 交互出错：\n\`\`\`\n${e?.toString().slice(0, 127)}\n\`\`\``)
    }
}

export async function fetch(url: string) {
    return nodeFetch(url, {
        headers: [
            ['Host', 'www.minecraft.net'],
            ['User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0 SPX/1.0'],
            ['Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'],
            ['Accept-Language', 'en-US,en;q=0.5'],
            ['Accept-Encoding', 'gzip, deflate, br'],
            ['Referer', 'https://www.minecraft.net/en-us'],
            ['Connection', 'close'],
            ['Upgrade-Insecure-Requests', '1'],
            ['Pragma', 'no-cache'],
            ['Cache-Control', 'no-cache'],
            ['TE', 'Trailers'],
        ],
        timeout: 6_000
    })
}

function getTweetBbcode({
    date,
    lang,
    mode,
    source,
    text,
    translator,
    tweetLink,
    urls,
    userName,
    userTag,
}: {
    date: Date,
    lang: string,
    mode: 'dark' | 'light',
    source: string,
    text: string,
    translator: string,
    tweetLink: string,
    urls: { start: number, end: number, url: string, expanded_url: string, display_url: string }[],
    userName: string,
    userTag: string,
}) {
    const attributeColor = '#5B7083'
    const linkColor = '#1B95E0'
    const backgroundColor = mode === 'dark' ? '#000000' : '#FFFFFF'
    const foregroundColor = mode === 'dark' ? '#D9D9D9' : '#0F1419'
    const dateString = `${date.toLocaleTimeString('zh-cn')} · ${date.toLocaleDateString('zh-cn')} · ${source} · SPX`
    let skippedIndex = 0
    let content = text
    for (const url of urls) {
        const urlBBCode = `[url=${url.expanded_url}][color=${linkColor}]${url.display_url}[/color][/url]`
        content = content.slice(0, skippedIndex + url.start - 1) + urlBBCode + content.slice(skippedIndex + url.end)
        skippedIndex += urlBBCode.length - (url.end - url.start)
    }
    return `[align=center][table=560,${backgroundColor}]
[tr][td][font=-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif][indent]
[float=left][img=44,44]${ProfilePictures.get(userTag) ?? '【TODO：头像】'}[/img][/float][size=15px][b][color=${foregroundColor}]${userName}[/color][/b]
[color=${attributeColor}]@${userTag}[/color][/size]

[color=${foregroundColor}][size=23px]${content}[/size]
[size=15px]由 ${translator} 翻译自${lang.startsWith('en') ? '英语' : ` ${lang}`}[/size]
[size=23px]【插入：译文】[/size][/color][/indent][align=center][img=451,254]【TODO：配图】[/img][/align][indent][size=15px][url=${tweetLink}][color=${attributeColor}]${dateString}[/color][/url][/size][/indent][/font]
[/td][/tr]
[/table][/align]`
}
