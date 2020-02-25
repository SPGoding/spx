const nextMainRelease = '1.15'

const AFVersions = ['3D Shareware v1.34']

export type StringStringArrayMap = {
    [key: string]: string[]
}

export type ManifestVersion = { id: string, type: 'snapshot' | 'release', [key: string]: any }

export function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * Math.floor(max - min)) + min
}

export function getVersionType(version: string): 'snapshot' | 'pre_release' | 'release' {
    if (version.toLowerCase().startsWith('pre')) {
        return 'pre_release'
    } else if (version.match(/^\d\dw\d\d[a-z]$/i)) {
        return 'snapshot'
    } else {
        return 'release'
    }
}

/**
 * @returns [ snapCount, preCount ]
 */
export function getCounts(versions: ManifestVersion[], version: string): [number, number] {
    let snapCount = 0
    let preCount = 0

    for (const ver of versions) {
        if (AFVersions.indexOf(ver.id) !== -1) {
            continue
        }
        if (ver.type === 'snapshot') {
            snapCount += 1
            if (ver.id.toLowerCase().indexOf('pre') !== -1) {
                preCount += 1
            }
        } else {
            break
        }
    }

    if (versions[0].id !== version) {
        snapCount += 1
        preCount += 1
    }

    return [snapCount, preCount]
}

/**
 * Returns the type of the article.
 * @returns `NEWS` or `INSIDER`
 */
export function getArticleType(html: Document): 'INSIDER' | 'NEWS' {
    try {
        const type = html.getElementsByClassName('article-category__text')[0].textContent as string
        if (type.toUpperCase() === 'NEWS') {
            return 'NEWS'
        }
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
export function getBeginning(type: 'snapshot' | 'pre_release' | 'release', version: string, versions: ManifestVersion[]) {
    const [snapCount, preCount] = getCounts(versions, version)
    switch (type) {
        case 'snapshot':
            return `[align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]每周快照[/color]是Minecraft Java版的测试机制，主要用于下一个正式版的特性预览。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]然而，每周快照主要用于新特性展示，通常存在大量漏洞。因此对于普通玩家建议仅做[color=Red][b]测试尝鲜[/b][/color]用。在快照中打开存档前请务必[color=Red][b]进行备份[/b][/color]。[b]适用于正式版的Mod不兼容快照，且大多数Mod都不对每周快照提供支持[/b]。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center][color=Red][b]Minecraft ${nextMainRelease} 仍未发布，${version} 为其第 ${snapCount} 个预览版。[/b][/color][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr]
[/table][/align]

[hr]\n`
        case 'pre_release':
            return `[align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]预发布版[/color]是Minecraft Java版的测试机制，如果该版本作为正式版发布，那么预发布版的游戏文件将与启动器推送的正式版完全相同。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]然而，预发布版主要用于服主和Mod制作者的预先体验，如果发现重大漏洞，该预发布版会被新的预发布版代替。因此建议普通玩家[color=Red]持观望态度[/color]。[/align][/td][/tr]
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
[tr][td][color=#D10A0A][align=center]Linux/其他[/align][/color][/td][td][align=center][url=https://launcher.mojang.com/download/Minecraft.tar.gz]https://launcher.mojang.com/download/Minecraft.tar.gz[/url][/align][/td][/tr]
[/table][/align]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]预览版的下载方式以及运行说明[/b][/color][/size][/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于正版用户[/align][/color][/td][td][align=center]官方启动器是跟进最及时、运行最稳定的启动器，每次启动均会自动检查并下载启动器最新版本。Java版的启动器下载地址在上文已经提供。[/align][/td][/tr]
[tr][td=15%][color=#D10A0A][align=center]对于非正版用户[/align][/color][/td][td][align=center]非正版用户[b]完全可以[/b]体验预览版本，请于[url=http://www.mcbbs.net/forum.php?mod=viewthread&tid=38297&page=1#pid547821]推荐启动器列表[/url]寻找合适的启动器。目前绝大多数主流启动器都带有游戏下载功能。如有仍疑惑请到[url=http://www.mcbbs.net/forum-qanda-1.html]原版问答[/url]板块提问。[/align][/td][/tr]
[/table][/align]
[align=center][img=416,132]https://attachment.mcbbs.net/forum/201905/10/183113w1yyttpjz8epq60s.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][b]外部来源以及详细的更新条目追踪[/b]
[spoiler][list]
[*][url=https://minecraft.net/zh-hans/]Minecraft官网[/url]（内容英文）
[*][url=https://twitter.com/jeb_]Jeb的Twitter[/url]（英文）
[*][url=https://twitter.com/Dinnerbone]Dinnerbone的Twitter[/url]（英文）
[*][url=https://twitter.com/_grum]Grum的Twitter[/url]（英文）
[*][url=https://twitter.com/SeargeDP]Searge的Twitter[/url]（英文）
[*][url=https://www.minecraftforum.net]Minecraft官方论坛[/url]（英文）
[*][url=https://feedback.minecraft.net/hc/en-us/categories/115000410252-Knowledge-Base]Minecraft博客[/url]（英文）
[*][url=https://minecraft.gamepedia.com/Java_Edition_version_history/Development_versions]英文Minecraft Wiki的版本记录页面[/url]（英文，更新条目详细，较及时）
[*][url=https://minecraft-zh.gamepedia.com/Java%E7%89%88%E7%89%88%E6%9C%AC%E8%AE%B0%E5%BD%95/%E9%A2%84%E8%A7%88%E7%89%88%E6%9C%AC]中文Minecraft Wiki的版本记录页面[/url]（中文，更新条目详细）
[/list][/spoiler][/align][/td][/tr]
[/table][/align]`

        case 'pre_release':
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
[align=center][img=416,132]https://attachment.mcbbs.net/forum/201905/10/183113w1yyttpjz8epq60s.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][b]外部来源以及详细的更新条目追踪[/b]
[spoiler][list]
[*][url=https://minecraft.net/zh-hans/]Minecraft官网[/url]（内容英文）
[*][url=https://twitter.com/jeb_]Jeb的Twitter[/url]（英文）
[*][url=https://twitter.com/Dinnerbone]Dinnerbone的Twitter[/url]（英文）
[*][url=https://twitter.com/_grum]Grum的Twitter[/url]（英文）
[*][url=https://twitter.com/SeargeDP]Searge的Twitter[/url]（英文）
[*][url=https://www.minecraftforum.net]Minecraft官方论坛[/url]（英文）
[*][url=https://feedback.minecraft.net/hc/en-us/categories/115000410252-Knowledge-Base]Minecraft博客[/url]（英文）
[*][url=https://minecraft.gamepedia.com/Java_Edition_version_history/Development_versions]英文Minecraft Wiki的版本记录页面[/url]（英文，更新条目详细，较及时）
[*][url=https://minecraft-zh.gamepedia.com/Java%E7%89%88%E7%89%88%E6%9C%AC%E8%AE%B0%E5%BD%95/%E9%A2%84%E8%A7%88%E7%89%88%E6%9C%AC]中文Minecraft Wiki的版本记录页面[/url]（中文，更新条目详细）
[/list][/spoiler][/align][/td][/tr]
[/table][/align]`

        case 'release':
        default:
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
[align=center][img=416,132]https://attachment.mcbbs.net/forum/201905/10/183113w1yyttpjz8epq60s.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][b]外部来源以及详细的更新条目追踪[/b]
[spoiler][list]
[*][url=https://minecraft.net/zh-hans/]Minecraft官网[/url]（内容英文）
[*][url=https://twitter.com/jeb_]Jeb的Twitter[/url]（英文）
[*][url=https://twitter.com/Dinnerbone]Dinnerbone的Twitter[/url]（英文）
[*][url=https://twitter.com/_grum]Grum的Twitter[/url]（英文）
[*][url=https://twitter.com/SeargeDP]Searge的Twitter[/url]（英文）
[*][url=https://www.minecraftforum.net]Minecraft官方论坛[/url]（英文）
[*][url=https://feedback.minecraft.net/hc/en-us/categories/115000410252-Knowledge-Base]Minecraft博客[/url]（英文）
[*][url=https://minecraft.gamepedia.com/Java_Edition_version_history]英文Minecraft Wiki的版本记录页面[/url]（英文，更新条目详细，较及时）
[*][url=https://minecraft-zh.gamepedia.com/Java%E7%89%88%E7%89%88%E6%9C%AC%E8%AE%B0%E5%BD%95]中文Minecraft Wiki的版本记录页面[/url]（中文，更新条目详细）
[/list][/spoiler][/align][/td][/tr]
[/table][/align]`
    }
}
