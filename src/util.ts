import http = require('http')
import https = require('https')
import { imageSize } from 'image-size'
import { ISizeCalculationResult } from 'image-size/dist/types/interface'

const nextMainRelease = '1.17'

export type StringStringArrayMap = {
    [key: string]: string[]
}

export type ManifestVersion = { id: string, type: 'snapshot' | 'release', [key: string]: any }

export function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * Math.floor(max - min)) + min
}

export function getVersionType(url: string): VersionType {
    if (url.toLowerCase().includes('pre-release')) {
        return VersionType.PreRelease
    } else if (url.toLowerCase().includes('release-candidate')) {
        return VersionType.ReleaseCandidate
    } else if (url.toLowerCase().includes('snapshot')) {
        return VersionType.Snapshot
    } else if (url.toLowerCase().includes('minecraft java edition')) {
        return VersionType.Release
    } else {
        return VersionType.Normal
    }
}

export function getImageDimensions(imgUrl: string) {
    return new Promise<ISizeCalculationResult>((resolve, reject) => {
        const lib = imgUrl.startsWith('https://') ? https : http
        lib.get(imgUrl, response => {
            const chunks: any[] = []
            response
                .on('data', chunk => {
                    chunks.push(chunk)
                })
                .on('end', () => {
                    try {
                        const buffer = Buffer.concat(chunks)
                        resolve(imageSize(buffer))
                    } catch (e) {
                        console.log('#getImageDimensions', e)
                    }
                })
                .on('error', e => {
                    reject(e)
                })
        })
    })
}

/**
 * Returns the type of the article.
 */
export function getArticleType(html: Document): string {
    try {
        const type = html.getElementsByClassName('article-category__text')[0].textContent as string
        return type.toUpperCase()
    } catch (ex) {
        console.log(`Error occurred #getArticleType: ${ex.stack}`)
    }
    return 'INSIDER'
}

/**
 * 
 * @param type The type of the version.
 * @param version The version.
 * @param versions All released versions. Sorted by released time from new ones to old ones.
 */
export function getBeginning(type: VersionType) {
    switch (type) {
        case VersionType.Snapshot:
            return `[align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]每周快照[/color]是Minecraft Java版的测试机制，主要用于下一个正式版的特性预览。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]然而，每周快照主要用于新特性展示，通常存在大量漏洞。因此对于普通玩家建议仅做[color=Red][b]测试尝鲜[/b][/color]用。在快照中打开存档前请务必[color=Red][b]进行备份[/b][/color]。[b]适用于正式版的Mod不兼容快照，且大多数Mod都不对每周快照提供支持[/b]。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center][color=Red][b]Minecraft ${nextMainRelease} 仍未发布，<版本>为其第<计数器>个预览版。[/b][/color][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFFFCE]
[tr][td][align=center]部分新特性译名仅供新闻预览
请到[url=https://crowdin.com/project/minecraft/zh-CN]Crowdin[/url]讨论游戏正式译名。[/align][/td][/tr]
[/table][/align]

[hr]\n
【如果没有新方块物品等内容，请删去上方待定译名提示框。】\n`
        case VersionType.PreRelease:
            return `[align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]预发布版[/color]是Minecraft Java版的测试机制，如果该版本作为正式版发布，那么预发布版的游戏文件将与启动器推送的正式版完全相同。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]然而，预发布版主要用于服主和Mod制作者的预先体验，如果发现重大漏洞，该预发布版会被新的预发布版代替。因此建议普通玩家[color=Red]持观望态度[/color]。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center][color=Red][b]Minecraft ${nextMainRelease} 仍未发布，<版本>为其第<计数器>个预发布版，第<计数器>个预览版。[/b][/color][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr]
[/table][/align]

[hr]\n`
        case VersionType.ReleaseCandidate:
            return `[align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]候选版[/color]是Minecraft Java版正式版的候选版本，如果发现重大漏洞，该候选版会被新的候选版代替。如果一切正常，该版本将会作为正式版发布。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]候选版已可供普通玩家进行抢鲜体验，但仍需当心可能存在的漏洞。[/color]。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center][color=Red][b]Minecraft ${nextMainRelease} 仍未发布，<版本>为其第<计数器>个候选版，第<计数器>个预览版。[/b][/color][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr]
[/table][/align]

[hr]\n`
        case VersionType.Release:
            return `[align=center][table=80%,#EDFBFF]
[tr][td][align=center][b][color=Red]Minecraft Java版[/color]是指Windows、Mac OS与Linux平台上，使用Java语言开发的Minecraft版本。[/b][/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]正式版[/color]是Minecraft Java版经过一段时间的预览版测试后得到的稳定版本，也是众多材质、Mod与服务器插件会逐渐跟进的版本。官方启动器也会第一时间进行推送。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]建议玩家与服主关注其相关服务端、Mod与插件的更新，[color=red]迎接新的正式版吧！[/color]专注于单人原版游戏的玩家可立即更新，多人游戏玩家请关注您所在服务器的通知。[/align][/td][/tr]
[/b][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr][/table][/align]

[hr]\n`

        case VersionType.Normal:
        default:
            return `\n[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr][/table][/align]
[hr]\n`

    }
}

export function getEnding(type: VersionType) {
    switch (type) {
        case VersionType.Snapshot:
            return `\n[hr]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]正版启动器下载地址[/b][/color][/size][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Windows[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/MinecraftInstaller.msi]https://launcher.mojang.com/download/MinecraftInstaller.msi[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Mac/OSX[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.dmg]https://launcher.mojang.com/download/Minecraft.dmg[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Linux/其他[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.tar.gz]https://launcher.mojang.com/download/Minecraft.tar.gz[/url][/align][/td][/tr]
[/table][/align]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]预览版的下载方式以及运行说明[/b][/color][/size][/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于正版用户[/align][/color][/td][td][align=center]官方启动器是跟进最及时、运行最稳定的启动器，每次启动均会自动检查并下载启动器最新版本。Java版的启动器下载地址在上文已经提供。[/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于非正版用户[/align][/color][/td][td][align=center]非正版用户[b]完全可以[/b]体验预览版本，请于[url=http://www.mcbbs.net/forum.php?mod=viewthread&tid=38297&page=1#pid547821]推荐启动器列表[/url]寻找合适的启动器。目前绝大多数主流启动器都带有游戏下载功能。如有仍疑惑请到[url=http://www.mcbbs.net/forum-qanda-1.html]原版问答[/url]板块提问。[/align][/td][/tr]
[/table][/align]
[align=center][img=416,132]https://attachment.mcbbs.net/data/myattachment/forum/201905/10/183113w1yyttpjz8epq60s.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][url=https://www.mcbbs.net/thread-874677-1-1.html]外部来源以及详细的更新条目追踪[/url][/align][/td][/tr]
[/table][/align]`

        case VersionType.PreRelease:
            return `\n[hr]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]正版启动器下载地址[/b][/color][/size][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Windows[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/MinecraftInstaller.msi]https://launcher.mojang.com/download/MinecraftInstaller.msi[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Mac/OSX[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.dmg]https://launcher.mojang.com/download/Minecraft.dmg[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Linux/其他[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.tar.gz]https://launcher.mojang.com/download/Minecraft.tar.gz[/url][/align][/td][/tr]
[/table][/align]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]预览版的下载方式以及运行说明[/b][/color][/size][/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于正版用户[/align][/color][/td][td][align=center]官方启动器是跟进最及时、运行最稳定的启动器，每次启动均会自动检查并下载启动器最新版本。Java版的启动器下载地址在上文已经提供。[/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于非正版用户[/align][/color][/td][td][align=center]非正版用户[b]完全可以[/b]体验预览版本，请于[url=http://www.mcbbs.net/forum.php?mod=viewthread&tid=38297&page=1#pid547821]推荐启动器列表[/url]寻找合适的启动器。目前绝大多数主流启动器都带有游戏下载功能。如有仍疑惑请到[url=http://www.mcbbs.net/forum-qanda-1.html]原版问答[/url]板块提问。[/align][/td][/tr]
[/table][/align]
[align=center][img=416,132]https://attachment.mcbbs.net/data/myattachment/forum/201905/10/183113w1yyttpjz8epq60s.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][url=https://www.mcbbs.net/thread-874677-1-1.html]外部来源以及详细的更新条目追踪[/url][/align][/td][/tr]
[/table][/align]`

        case VersionType.ReleaseCandidate:
            return `\n[hr]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]正版启动器下载地址[/b][/color][/size][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Windows[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/MinecraftInstaller.msi]https://launcher.mojang.com/download/MinecraftInstaller.msi[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Mac/OSX[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.dmg]https://launcher.mojang.com/download/Minecraft.dmg[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Linux/其他[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.tar.gz]https://launcher.mojang.com/download/Minecraft.tar.gz[/url][/align][/td][/tr]
[/table][/align]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]预览版的下载方式以及运行说明[/b][/color][/size][/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于正版用户[/align][/color][/td][td][align=center]官方启动器是跟进最及时、运行最稳定的启动器，每次启动均会自动检查并下载启动器最新版本。Java版的启动器下载地址在上文已经提供。[/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于非正版用户[/align][/color][/td][td][align=center]非正版用户[b]完全可以[/b]体验预览版本，请于[url=http://www.mcbbs.net/forum.php?mod=viewthread&tid=38297&page=1#pid547821]推荐启动器列表[/url]寻找合适的启动器。目前绝大多数主流启动器都带有游戏下载功能。如有仍疑惑请到[url=http://www.mcbbs.net/forum-qanda-1.html]原版问答[/url]板块提问。[/align][/td][/tr]
[/table][/align]
[align=center][img=416,132]https://attachment.mcbbs.net/data/myattachment/forum/201905/10/183113w1yyttpjz8epq60s.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][url=https://www.mcbbs.net/thread-874677-1-1.html]外部来源以及详细的更新条目追踪[/url][/align][/td][/tr]
[/table][/align]`

        case VersionType.Release:
            return `\n[hr]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]正版启动器下载地址[/b][/color][/size][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Windows[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/MinecraftInstaller.msi]https://launcher.mojang.com/download/MinecraftInstaller.msi[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Mac/OSX[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.dmg]https://launcher.mojang.com/download/Minecraft.dmg[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Linux/其他[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.tar.gz]https://launcher.mojang.com/download/Minecraft.tar.gz[/url][/align][/td][/tr]
[/table][/align]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]正式版的下载方式以及运行说明[/b][/color][/size][/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于正版用户[/align][/color][/td][td][align=center]官方启动器是跟进最及时、运行最稳定的启动器，每次启动均会自动检查并下载启动器最新版本。Java版的启动器下载地址在上文已经提供。[/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于非正版用户[/align][/color][/td][td][align=center]非正版用户也请使用启动器下载游戏，请于[url=http://www.mcbbs.net/forum.php?mod=viewthread&tid=38297&page=1#pid547821]推荐启动器列表[/url]寻找合适的启动器。目前绝大多数主流启动器都带有游戏下载功能。如有仍疑惑请到[url=http://www.mcbbs.net/forum-qanda-1.html]原版问答[/url]板块提问。[/align][/td][/tr]
[/table][/align]
[align=center][img=416,132]https://attachment.mcbbs.net/data/myattachment/forum/201905/10/183113w1yyttpjz8epq60s.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][url=https://www.mcbbs.net/thread-874677-1-1.html]外部来源以及详细的更新条目追踪[/url][/align][/td][/tr]
[/table][/align]`

        case VersionType.Normal:
        default:
            return `\n[hr]

[align=center][img=416,132]https://attachment.mcbbs.net/data/myattachment/forum/201905/10/183113w1yyttpjz8epq60s.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][url=https://www.mcbbs.net/thread-874677-1-1.html]外部来源以及详细的更新条目追踪[/url][/align][/td][/tr]
[/table][/align]`
    }
}

export const enum VersionType {
    Snapshot,
    PreRelease,
    ReleaseCandidate,
    Release,
    Normal
}

const ProfilePictures = new Map<string, string>([
	['Mojang', 'https://attachment.mcbbs.net/data/myattachment/forum/202105/18/124525b5b85bb8ob8t8o0b.jpg'],
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
])

export function getTweet({
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
