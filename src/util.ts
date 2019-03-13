import * as http from 'http'
import * as https from 'https'

const nextMainRelease = '1.14'
const featureList = '[url=https://minecraft-zh.gamepedia.com/1.14]Minecraft 1.14（村庄与掠夺更新）特性列表[/url]'

export type StringStringMap = {
    [key: string]: string
}

export type StringNumberMap = {
    [key: string]: number
}

export type StringFunctionMap = {
    [key: string]: (source: string) => Result
}

export type Result = {
    identity: string,
    readable: string,
    addition?: string | { beginning: string, ending: string }
}

export async function getWebCode(url: string) {
    const isHttps = url.slice(0, 5) === 'https'
    const promise = new Promise<string>((resolve, reject) => {
        const cb = (res: http.IncomingMessage) => {
            var content = ''
            res.setEncoding('utf8')
            res.on('error', e => {
                reject(e.message)
            })
            res.on('data', chunk => {
                content += chunk
            })
            res.on('end', () => {
                resolve(content)
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

export function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * Math.floor(max - min)) + min
}

export function getVersionType(version: string) {
    let versionType: 'snapshot' | 'pre_release' | 'release'
    if (version.match(/^\d\dw\d\d[a-z]$/)) {
        versionType = 'snapshot'
    }
    else if (version.indexOf('pre') !== -1) {
        versionType = 'pre_release'
    }
    else {
        versionType = 'release'
    }
    return versionType
}

/**
 * @returns [ snapCount, preCount ]
 */
export function getCounts(versions: string[]): [number, number] {
    let snapCount = 0
    let preCount = 0

    for (const ver of versions) {
        const type = getVersionType(ver)
        if (type === 'pre_release') {
            preCount += 1
            snapCount += 1
        } else if (type === 'snapshot') {
            snapCount += 1
        } else {
            break
        }
    }

    return [snapCount, preCount]
}

export function convertMCAriticleToBBCode(src: string) {
    return src
}

export function getBeginning(type: 'snapshot' | 'pre_release' | 'release', version: string, versions: string[]) {
    const [snapCount, preCount] = getCounts(versions)
    switch (type) {
        case 'snapshot':
            return `[postbg]bg3.png[/postbg][align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]每周快照[/color]是Minecraft的测试机制，主要用于下一个正式版的特性预览。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]然而，每周快照主要用于新特性展示，通常存在大量漏洞。因此对于普通玩家建议仅做[color=Red][b]测试尝鲜[/b][/color]用。使用测试版打开存档前请[color=Red][b]务必备份[/b][/color]。 [b]适用于正式版的Mod不兼容快照，且大多数Mod都不对每周快照提供支持[/b]。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center][color=Red][b]Minecraft ${nextMainRelease} 仍未发布，${version} 为其第 ${snapCount} 个预览版。[/b][/color][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr]
[/table][/align]

[hr]\n`
        case 'pre_release':
            return `[postbg]bg3.png[/postbg][align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]预发布版[/color]是Minecraft的测试机制，如果该版本作为正式版发布，那么预发布版的游戏文件将与启动器推送的正式版完全相同。[/align][/td][/tr] 
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]然而，预发布版主要用于服主和Mod制作者的预先体验，如果发现致命漏洞，该预发布版会被新的预发布版代替。因此对于普通玩家建议持[color=Red]观望态度[/color]。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center][color=Red][b]Minecraft ${nextMainRelease} 仍未发布，${version} 为其第 ${preCount} 个预发布版，第 ${snapCount} 个预览版。[/b][/color][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr]
[/table][/align]

[hr]\n`
        case 'release':
        default:
            return `[postbg]bg3.png[/postbg][align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]正式版[/color]是Minecraft经过一段时间的预览版测试之后得到的稳定版本，也是众多材质、Mod与服务器插件会逐渐跟进的版本。官方正版登陆器也会第一时间进行推送。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]建议玩家与开服的朋友关注其相关服务端、Mod、插件、与API的更新，[color=red]迎接新的正式版吧！[/color] 专注于单人原版游戏的玩家可立即更新，多人玩家请关注您所在的服务器的通知。[/align][/td][/tr]
[/b][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr][/table][/align]

[hr]\n`
    }
}

export function getEnding(type: 'snapshot' | 'pre_release' | 'release') {
    switch (type) {
        case 'snapshot':
            return `\n[hr]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]正版启动器下载地址[/b][/color][/size][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Windows[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/MinecraftInstaller.msi]https://launcher.mojang.com/download/MinecraftInstaller.msi[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Mac/OSX[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.dmg]https://launcher.mojang.com/download/Minecraft.dmg[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Linux/Other[/align][/color][/td][td][align=center][url=http://s3.amazonaws.com/Minecraft.Download/launcher/Minecraft.jar]http://s3.amazonaws.com/Minecraft.Download/launcher/Minecraft.jar[/url][/align][/td][/tr]
[/table][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][b]关于本次更新的详细内容，请关注稍后 ${featureList} 的更新。[/b][/align][/td][/tr]
[/table][/align]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]预览版的下载方式以及运行说明[/b][/color][/size][/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于正版用户[/align][/color][/td][td][align=center]官方启动器是跟进最及时、运行最稳定的启动器，每次启动均会自动检查并下载启动器最新版本。但由于亚马逊服务器https连接在国内时常不稳定，官方启动器下载游戏可能需要魔法上网。启动器在上文已经提供。适用于全平台。[/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于非正版用户[/align][/color][/td][td][align=center]非正版用户[b]完全可以[/b]体验预览版本，请于[url=http://www.mcbbs.net/forum.php?mod=viewthread&tid=38297&page=1#pid547821]推荐启动器列表[/url]寻找合适的启动器。目前绝大多数主流启动器都带有游戏下载功能。如有仍疑惑请到[url=http://www.mcbbs.net/forum-qanda-1.html]原版问答[/url]板块提问。[/align][/td][/tr]
[/table][/align]
[align=center][img=416,132]http://ww4.sinaimg.cn/large/72dd20cdgw1enwmscntp2j20bk03o0sx.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][b]外部来源以及详细的更新条目追踪[/b]
[spoiler][list]
[*][url=https://minecraft.net/zh-hans/]Minecraft官网[/url]（内容英文）
[*][url=https://twitter.com/jeb_]Jeb的Twitter[/url]（英文，内地需魔法上网）
[*][url=https://twitter.com/Dinnerbone]Dinnerbone的Twitter[/url]（英文，内地需魔法上网）
[*][url=https://twitter.com/_grum]Grum的Twitter[/url]（英文，内地需魔法上网）
[*][url=https://twitter.com/SeargeDP]Searge的Twitter[/url]（英文，内地需魔法上网）
[*][url=http://www.minecraftforum.net]Minecraft官方论坛[/url]（英文）
[*][url=https://feedback.minecraft.net/hc/en-us/categories/115000410252-Knowledge-Base]Minecraft博客[/url]（英文）
[*][url=http://minecraft.gamepedia.com/Version_history/Development_versions]英语 Minecraft Wiki的Version history页面[/url]（英文，更新条目详细，较及时）
[*][url=http://minecraft-zh.gamepedia.com/%E7%89%88%E6%9C%AC%E8%AE%B0%E5%BD%95/%E9%A2%84%E8%A7%88%E7%89%88%E6%9C%AC]中文 Minecraft Wiki的版本记录页面[/url]（中文，更新条目详细）
[/list][/spoiler][/align][/td][/tr]
[/table][/align]`

        case 'pre_release':
            return `\n[hr]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]正版启动器下载地址[/b][/color][/size][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Windows[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/MinecraftInstaller.msi]https://launcher.mojang.com/download/MinecraftInstaller.msi[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Mac/OSX[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.dmg]https://launcher.mojang.com/download/Minecraft.dmg[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Linux/Other[/align][/color][/td][td][align=center][url=http://s3.amazonaws.com/Minecraft.Download/launcher/Minecraft.jar]http://s3.amazonaws.com/Minecraft.Download/launcher/Minecraft.jar[/url][/align][/td][/tr]
[/table][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][b]关于本次更新的详细内容，请关注稍后 ${featureList} 的更新。[/b][/align][/td][/tr]
[/table][/align]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]预览版的下载方式以及运行说明[/b][/color][/size][/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于正版用户[/align][/color][/td][td][align=center]官方启动器是跟进最及时、运行最稳定的启动器，每次启动均会自动检查并下载启动器最新版本。但由于亚马逊服务器https连接在国内时常不稳定，官方启动器下载游戏可能需要魔法上网。启动器在上文已经提供。适用于全平台。[/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于非正版用户[/align][/color][/td][td][align=center]非正版用户[b]完全可以[/b]体验预览版本，请于[url=http://www.mcbbs.net/forum.php?mod=viewthread&tid=38297&page=1#pid547821]推荐启动器列表[/url]寻找合适的启动器。目前绝大多数主流启动器都带有游戏下载功能。如有仍疑惑请到[url=http://www.mcbbs.net/forum-qanda-1.html]原版问答[/url]板块提问。[/align][/td][/tr]
[/table][/align]
[align=center][img=416,132]http://ww4.sinaimg.cn/large/72dd20cdgw1enwmscntp2j20bk03o0sx.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][b]外部来源以及详细的更新条目追踪[/b]
[spoiler][list]
[*][url=https://minecraft.net/zh-hans/]Minecraft官网[/url]（内容英文）
[*][url=https://twitter.com/jeb_]Jeb的Twitter[/url]（英文，内地需魔法上网）
[*][url=https://twitter.com/Dinnerbone]Dinnerbone的Twitter[/url]（英文，内地需魔法上网）
[*][url=https://twitter.com/_grum]Grum的Twitter[/url]（英文，内地需魔法上网）
[*][url=https://twitter.com/SeargeDP]Searge的Twitter[/url]（英文，内地需魔法上网）
[*][url=http://www.minecraftforum.net]Minecraft官方论坛[/url]（英文）
[*][url=https://feedback.minecraft.net/hc/en-us/categories/115000410252-Knowledge-Base]Minecraft博客[/url]（英文）
[*][url=http://minecraft.gamepedia.com/Version_history/Development_versions]英语 Minecraft Wiki的Version history页面[/url]（英文，更新条目详细，较及时）
[*][url=http://minecraft-zh.gamepedia.com/%E7%89%88%E6%9C%AC%E8%AE%B0%E5%BD%95/%E9%A2%84%E8%A7%88%E7%89%88%E6%9C%AC]中文 Minecraft Wiki的版本记录页面[/url]（中文，更新条目详细）
[/list][/spoiler][/align][/td][/tr]
[/table][/align]`

        case 'release':
        default:
            return `\n[hr]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]正版启动器下载地址[/b][/color][/size][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Windows[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/MinecraftInstaller.msi]https://launcher.mojang.com/download/MinecraftInstaller.msi[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Mac/OSX[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.dmg]https://launcher.mojang.com/download/Minecraft.dmg[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Linux/Other[/align][/color][/td][td][align=center][url=http://s3.amazonaws.com/Minecraft.Download/launcher/Minecraft.jar]http://s3.amazonaws.com/Minecraft.Download/launcher/Minecraft.jar[/url][/align][/td][/tr]
[/table][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][b]关于本主要版本号的全部更新内容，请关注稍后 ${featureList} 的更新。[/b][/align][/td][/tr]
[/table][/align]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]正式版的下载方式以及运行说明[/b][/color][/size][/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于正版用户[/align][/color][/td][td][align=center]官方启动器是跟进最及时、运行最稳定的启动器，每次启动均会自动检查并下载启动器最新版本。但由于亚马逊服务器https连接在国内时常不稳定，官方启动器下载游戏可能需要魔法上网。启动器在上文已经提供。适用于全平台。[/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于非正版用户[/align][/color][/td][td][align=center]非正版用户也请使用启动器下载游戏，请于[url=http://www.mcbbs.net/forum.php?mod=viewthread&tid=38297&page=1#pid547821]推荐启动器列表[/url]寻找合适的启动器。目前绝大多数主流启动器都带有游戏下载功能。如有仍疑惑请到[url=http://www.mcbbs.net/forum-qanda-1.html]原版问答[/url]板块提问。[/align][/td][/tr]
[/table][/align]
[align=center][img=416,132]http://ww4.sinaimg.cn/large/72dd20cdgw1enwmscntp2j20bk03o0sx.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][b]外部来源以及详细的更新条目追踪[/b]
[spoiler][list]
[*][url=https://minecraft.net/zh-hans/]Minecraft官网[/url]（内容英文）
[*][url=https://twitter.com/jeb_]Jeb的Twitter[/url]（英文，内地需魔法上网）
[*][url=https://twitter.com/Dinnerbone]Dinnerbone的Twitter[/url]（英文，内地需魔法上网）
[*][url=https://twitter.com/_grum]Grum的Twitter[/url]（英文，内地需魔法上网）
[*][url=https://twitter.com/SeargeDP]Searge的Twitter[/url]（英文，内地需魔法上网）
[*][url=http://www.minecraftforum.net]Minecraft官方论坛[/url]（英文）
[*][url=https://feedback.minecraft.net/hc/en-us/categories/115000410252-Knowledge-Base]Minecraft博客[/url]（英文）
[*][url=https://minecraft.gamepedia.com/Java_Edition_version_history]英文Minecraft Wiki的Version History页面[/url]（英文，更新条目详细，较及时）
[*][url=https://minecraft-zh.gamepedia.com/Java%E7%89%88%E7%89%88%E6%9C%AC%E8%AE%B0%E5%BD%95]中文Minecraft Wiki的版本记录页面[/url]（中文，更新条目详细）
[/list][/spoiler][/align][/td][/tr]
[/table][/align]`
    }
}
