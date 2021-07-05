"use strict";
// ==UserScript==
// @author        SPGoding
// @connect       minecraft.net
// @connect       spgoding.com
// @description   Minecraft.net blog article to BBCode converter
// @downloadURL   https://spx.spgoding.com/user-script
// @grant         GM_setClipboard
// @grant         GM_xmlhttpRequest
// @homepage      https://github.com/SPGoding/spx
// @include       https://www.minecraft.net/en-us/article/*
// @include       https://www.minecraft.net/zh-cn/article/*
// @name          SPX
// @version       1.0.2
// ==/UserScript==
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(() => {
    const BugsCenter = 'https://spx.spgoding.com/bugs';
    const NextMainRelease = '1.17.1';
    function main() {
        return __awaiter(this, void 0, void 0, function* () {
            const url = document.location.toString();
            if (url.match(/^https:\/\/www\.minecraft\.net\/(?:en-us|zh-cn)\/article\//)) {
                console.info('[SPX] Activated');
                const button = document.createElement('button');
                button.innerText = 'Copy BBCode';
                button.onclick = () => __awaiter(this, void 0, void 0, function* () {
                    const bbcode = yield convertMCArticleToBBCode(document, url, '// TODO //');
                    GM_setClipboard(bbcode, { type: 'text', mimetype: 'text/plain' });
                    alert('Done!');
                });
                document.body.prepend(button);
            }
        });
    }
    function getBugs() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((rs, rj) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: BugsCenter,
                    fetch: true,
                    nocache: true,
                    timeout: 7000,
                    onload: r => rs(JSON.parse(r.responseText)),
                    onabort: () => rj(new Error('Aborted')),
                    onerror: e => rj(e),
                    ontimeout: () => rj(new Error('Time out')),
                });
            });
        });
    }
    function convertMCArticleToBBCode(html, articleUrl, translator = '？？？') {
        return __awaiter(this, void 0, void 0, function* () {
            const articleType = getArticleType(html);
            const versionType = getVersionType(articleUrl);
            let bugs;
            try {
                bugs = yield getBugs();
            }
            catch (e) {
                bugs = {};
                console.error('[convertMCArticleToBBCode#getBugs]', e);
            }
            const beginning = getBeginning(articleType, versionType);
            const heroImage = getHeroImage(html, articleType);
            const content = yield getContent(html, {
                bugs,
                title: html.title.split(' | ').slice(0, -1).join(' | '),
                translator,
                url: articleUrl,
            });
            const ending = getEnding(articleType, versionType);
            const ans = `${beginning}${heroImage}${content}[/indent][/indent]${ending}`;
            return ans;
        });
    }
    /**
     * Get the hero image (head image) of an article as the form of a BBCode string.
     * @param html An HTML Document.
     */
    function getHeroImage(html, articleType) {
        const category = articleType ? `\n[backcolor=Black][color=White][font="Noto Sans",sans-serif][b]${articleType}[/b][/font][/color][/backcolor][/align]` : '';
        const img = html.getElementsByClassName('article-head__image')[0];
        if (!img) {
            return `[postbg]bg3.png[/postbg]\n\n[align=center]${category}[indent][indent]\n`;
        }
        const src = img.src;
        const ans = `[postbg]bg3.png[/postbg][align=center][img=1200,513]${resolveUrl(src)}[/img]\n${category}[indent][indent]\n`;
        return ans;
    }
    /**
     * Get the content of an article as the form of a BBCode string.
     * @param html An HTML Document.
     */
    function getContent(html, ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const rootDiv = html.getElementsByClassName('article-body')[0];
            let ans = yield converters.recurse(rootDiv, ctx);
            // Get the server URL if it exists.
            const serverUrls = ans.match(/(https:\/\/launcher.mojang.com\/.+\/server.jar)/);
            let serverUrl = '';
            if (serverUrls) {
                serverUrl = serverUrls[0];
            }
            // Remove the text after '】'
            ans = ans.slice(0, ans.lastIndexOf('】') + 1);
            // Remove 'GET THE SNAPSHOT/PRE-RELEASE/RELEASE-CANDIDATE/RELEASE' for releasing
            let index = ans.toLowerCase().lastIndexOf('[size=6][b][color=silver]get the snapshot[/color][/b][/size]');
            if (index === -1) {
                index = ans.toLowerCase().lastIndexOf('[size=6][b][color=silver]get the pre-release[/color][/b][/size]');
            }
            if (index === -1) {
                index = ans.toLowerCase().lastIndexOf('[size=6][b][color=silver]get the release[/color][/b][/size]');
            }
            if (index === -1) {
                index = ans.toLowerCase().lastIndexOf('[size=6][b][color=silver]get the release candidate[/color][/b][/size]');
            }
            if (index !== -1) {
                ans = ans.slice(0, index);
            }
            // Add spaces between texts and '[x'.
            ans = ans.replace(/([a-zA-Z0-9\-\.\_])(\[[A-Za-z])/g, '$1 $2');
            // Add spaces between '[/x]' and texts.
            ans = ans.replace(/(\[\/[^\]]+?\])([a-zA-Z0-9\-\.\_])/g, '$1 $2');
            // Append the server URL if it exists.
            if (serverUrl) {
                ans += `\n[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]官方服务端下载地址[/b][/color][/size][/align][/td][/tr]
[tr][td][align=center][url=${serverUrl}]Minecraft server.jar[/url][/align][/td][/tr]
[/table][/align]`;
            }
            return ans;
        });
    }
    function convertFeedbackArticleToBBCode(html, articleUrl, translator = '？？？') {
        return __awaiter(this, void 0, void 0, function* () {
            const content = yield getFeedbackContent(html, {
                bugs: {},
                title: html.title.slice(0, html.title.lastIndexOf(' &ndash; Minecraft Feedback')),
                translator,
                url: articleUrl,
            });
            const ans = `${content}[/indent][/indent]`;
            return ans;
        });
    }
    /**
     * Get the content of an article as the form of a BBCode string.
     * @param html An HTML Document.
     */
    function getFeedbackContent(html, ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const rootSection = html.getElementsByClassName('article-info')[0];
            let ans = yield converters.recurse(rootSection, ctx);
            // Add spaces between texts and '[x'.
            ans = ans.replace(/([a-zA-Z0-9\-\.\_])(\[[A-Za-z])/g, '$1 $2');
            // Add spaces between '[/x]' and texts.
            ans = ans.replace(/(\[\/[^\]]+?\])([a-zA-Z0-9\-\.\_])/g, '$1 $2');
            return ans;
        });
    }
    const converters = {
        /**
         * Converts a ChildNode to a BBCode string according to the type of the node.
         */
        convert: (node, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            switch (node.nodeName) {
                case 'A':
                    return converters.a(node, ctx);
                case 'B':
                case 'STRONG':
                    return converters.strong(node, ctx);
                case 'BLOCKQUOTE':
                    return converters.blockquote(node, ctx);
                case 'BR':
                    return converters.br();
                case 'CITE':
                    return converters.cite(node, ctx);
                case 'CODE':
                    return converters.code(node, ctx);
                case 'DIV':
                case 'SECTION':
                    return converters.div(node, ctx);
                case 'DD':
                    return converters.dd(node, ctx);
                case 'DL':
                    return converters.dl(node, ctx);
                case 'DT':
                    return converters.dt(node, ctx);
                case 'EM':
                    return converters.em(node, ctx);
                case 'H1':
                    return converters.h1(node, ctx);
                case 'H2':
                    return converters.h2(node, ctx);
                case 'H3':
                    return converters.h3(node, ctx);
                case 'H4':
                    return converters.h4(node, ctx);
                case 'I':
                    return converters.i(node, ctx);
                case 'IMG':
                    return converters.img(node, ctx);
                case 'LI':
                    return converters.li(node, ctx);
                case 'OL':
                    return converters.ol(node, ctx);
                case 'P':
                    return converters.p(node, ctx);
                case 'PICTURE': // TODO: If picture contains important img in the future. Then just attain the last <img> element in the <picture> element.
                    return converters.picture(node, ctx);
                case 'SPAN':
                    return converters.span(node, ctx);
                case 'TABLE':
                    return converters.table(node, ctx);
                case 'TBODY':
                    return converters.tbody(node, ctx);
                case 'TH':
                case 'TD':
                    return converters.td(node, ctx);
                case 'TR':
                    return converters.tr(node, ctx);
                case 'UL':
                    return converters.ul(node, ctx);
                case '#text':
                    if (node) {
                        return node.textContent
                            .replace(/[\n\r\t]+/g, '').replace(/\s{2,}/g, '');
                    }
                    else {
                        return '';
                    }
                case 'BUTTON':
                case 'H5':
                case 'NAV':
                case 'svg':
                case 'SCRIPT':
                    if (node) {
                        return node.textContent ? node.textContent : '';
                    }
                    else {
                        return '';
                    }
                default:
                    console.warn(`Unknown type: '${node.nodeName}'.`);
                    if (node) {
                        return node.textContent ? node.textContent : '';
                    }
                    else {
                        return '';
                    }
            }
        }),
        /**
         * Convert child nodes of an HTMLElement to a BBCode string.
         */
        recurse: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            let ans = '';
            if (!ele) {
                return ans;
            }
            for (const child of Array.from(ele.childNodes)) {
                ans += yield converters.convert(child, ctx);
            }
            ans = removeLastLinebreak(ans);
            return ans;
        }),
        a: (anchor, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const url = resolveUrl(anchor.href);
            let ans;
            if (url) {
                ans = `[url=${url}][color=#388d40]${yield converters.recurse(anchor, ctx)}[/color][/url]`;
            }
            else {
                ans = yield converters.recurse(anchor, ctx);
            }
            return ans;
        }),
        blockquote: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const prefix = '';
            const suffix = '';
            const ans = `${prefix}${yield converters.recurse(ele, ctx)}${suffix}`;
            return ans;
        }),
        br: () => __awaiter(void 0, void 0, void 0, function* () {
            const ans = '\n';
            return ans;
        }),
        cite: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const prefix = '—— ';
            const suffix = '';
            const ans = `${prefix}${yield converters.recurse(ele, ctx)}${suffix}`;
            return ans;
        }),
        code: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const prefix = "[backcolor=White][font=Monaco,Consolas,'Lucida Console','Courier New',serif]";
            const suffix = '[/font][/backcolor]';
            const ans = `${prefix}${yield converters.recurse(ele, Object.assign(Object.assign({}, ctx), { disablePunctuationConverter: true }))}${suffix}`;
            return ans;
        }),
        div: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            let ans = yield converters.recurse(ele, ctx);
            if (ele.classList.contains('text-center')) {
                ans = `[/indent][/indent][align=center]${ans}[/align][indent][indent]\n`;
            }
            else if (ele.classList.contains('article-image-carousel')) {
                // Image carousel.
                /*
                 * <div> .article-image-carousel
                 *   <div> .slick-list
                 *     <div> .slick-track
                 *       * <div> .slick-slide [.slick-cloned]
                 *           <div>
                 *             <div> .slick-slide-carousel
                 *               <img> .article-image-carousel__image
                 *               <div> .article-image-carousel__caption
                 */
                const prefix = `[/indent][/indent][album]\n`;
                const suffix = `\n[/album][indent][indent]\n`;
                const slides = [];
                const findSlides = (ele) => __awaiter(void 0, void 0, void 0, function* () {
                    if (ele.classList.contains('slick-cloned')) {
                        return;
                    }
                    if (ele.nodeName === 'IMG' && ele.classList.contains('article-image-carousel__image')) {
                        slides.push([resolveUrl(ele.src), ' ']);
                    }
                    else if (ele.nodeName === 'DIV' && ele.classList.contains('article-image-carousel__caption')) {
                        if (slides.length > 0) {
                            slides[slides.length - 1][1] = `[b]${(yield converters.recurse(ele, ctx))}[/b]`;
                        }
                    }
                    else {
                        for (const child of Array.from(ele.childNodes)) {
                            if (child.nodeName === 'DIV' || child.nodeName === 'IMG') {
                                yield findSlides(child);
                            }
                        }
                    }
                });
                yield findSlides(ele);
                if (shouldUseAlbum(slides)) {
                    ans = `${prefix}${slides.map(([url, caption]) => `[aimg=${url}]${caption}[/aimg]`).join('\n')}${suffix}`;
                }
                else if (slides.length > 0) {
                    ans = `${slides.map(([url, caption]) => `[/indent][/indent][align=center][img]${url}[/img]\n${caption}`).join('\n')}[/align][indent][indent]\n`;
                }
                else {
                    ans = '';
                }
            }
            else if (ele.classList.contains('video')) {
                // Video.
                ans = '\n[/indent][/indent][align=center]【请将此处替换为含https的视频链接[media]XXX[/media]】[/align][indent][indent]\n';
            }
            else if (ele.classList.contains('quote') || ele.classList.contains('attributed-quote')) {
                ans = `\n[quote]\n${ans}\n[/quote]\n`;
            }
            else if (ele.classList.contains('article-social')) {
                // End of the content.
                ans = '';
            }
            else if (ele.classList.contains('modal')) {
                // Unknown useless content
                ans = '';
            }
            // else if (ele.classList.contains('end-with-block')) {
            //     ans = ans.trimRight() + '[img=16,16]https://ooo.0o0.ooo/2017/01/30/588f60bbaaf78.png[/img]'
            // }
            return ans;
        }),
        dt: (_ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            // const ans = `${converters.rescure(ele)}：`
            // return ans
            return '';
        }),
        dl: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            // The final <dd> after converted will contains an ending comma '，'
            // So I don't add any comma before '译者'.
            const ans = `\n\n${yield converters.recurse(ele, ctx)}\n【本文排版借助了：[url=https://spx.spgoding.com][color=#388d40][u]SPX[/u][/color][/url]】\n\n`;
            return ans;
        }),
        dd: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            let ans = '';
            if (ele.classList.contains('pubDate')) {
                // Published:
                // `pubDate` is like '2019-03-08T10:00:00.876+0000'.
                const date = ele.attributes.getNamedItem('data-value');
                if (date) {
                    ans = `[b]【${ctx.translator} 译自[url=${ctx.url}][color=#388d40][u]官网 ${date.value.slice(0, 4)} 年 ${date.value.slice(5, 7)} 月 ${date.value.slice(8, 10)} 日发布的 ${ctx.title}[/u][/color][/url]；原作者 ${ctx.author}】[/b]`;
                }
                else {
                    ans = `[b]【${ctx.translator} 译自[url=${ctx.url}][color=#388d40][u]官网 哪 年 哪 月 哪 日发布的 ${ctx.title}[/u][/color][/url]】[/b]`;
                }
            }
            else {
                // Written by:
                ctx.author = yield converters.recurse(ele, ctx);
            }
            return ans;
        }),
        em: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const ans = `[i]${yield converters.recurse(ele, ctx)}[/i]`;
            return ans;
        }),
        h1: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const prefix = '[size=6][b]';
            const suffix = '[/b][/size]';
            const inner = yield converters.recurse(ele, ctx);
            const ans = `${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`, ctx)}\n\n`;
            return ans;
        }),
        h2: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const prefix = '[size=5][b]';
            const suffix = '[/b][/size]';
            const inner = yield converters.recurse(ele, ctx);
            const ans = `\n${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`, ctx)}\n\n`;
            return ans;
        }),
        h3: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const prefix = '[size=4][b]';
            const suffix = '[/b][/size]';
            const inner = yield converters.recurse(ele, ctx);
            const ans = `\n${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`, ctx)}\n\n`;
            return ans;
        }),
        h4: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const prefix = '[size=3][b]';
            const suffix = '[/b][/size]';
            const inner = yield converters.recurse(ele, ctx);
            const ans = `\n${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`, ctx)}\n\n`;
            return ans;
        }),
        i: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const ans = `[i]${yield converters.recurse(ele, ctx)}[/i]`;
            return ans;
        }),
        img: (img, _ctx) => __awaiter(void 0, void 0, void 0, function* () {
            if (img.alt === 'Author image') {
                return '';
            }
            let w;
            let h;
            if (img.classList.contains('attributed-quote__image')) { // for in-quote avatar image
                h = 92;
                w = 53;
            }
            else if (img.classList.contains('mr-3')) { // for attributor avatar image
                h = 121;
                w = 82;
            }
            const prefix = w && h ? `[img=${w},${h}]` : '[img]';
            const imgUrl = resolveUrl(img.src);
            let ans;
            if (img.classList.contains('attributed-quote__image') || img.classList.contains('mr-3')) {
                // Attributed quote author avatar.
                ans = `\n[float=left]${prefix}${imgUrl}[/img][/float]`;
            }
            else {
                ans = `\n\n[/indent][/indent][align=center]${prefix}${imgUrl}[/img][/align][indent][indent]\n`;
            }
            return ans;
        }),
        li: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const inner = yield converters.recurse(ele, ctx);
            const ans = `[*][color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color]\n[*]${translateMachinely(translateBugs(inner, ctx), ctx)}\n`;
            return ans;
        }),
        ol: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const inner = yield converters.recurse(ele, ctx);
            const ans = `[list=1]\n${inner}[/list]\n`;
            return ans;
        }),
        p: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const inner = yield converters.recurse(ele, ctx);
            let ans;
            if (ele.classList.contains('lead')) {
                ans = `[size=4][b][size=2][color=Silver]${inner}[/color][/size][/b][/size]\n[size=4][b]${translateMachinely(inner, ctx)}[/b][/size]\n\n`;
            }
            else {
                ans = `[size=2][color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color][/size]\n${translateMachinely(inner, ctx)}\n\n`;
            }
            return ans;
        }),
        picture: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const ans = yield converters.recurse(ele, ctx);
            return ans;
        }),
        span: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const ans = yield converters.recurse(ele, ctx);
            if (ele.classList.contains('bedrock-server')) {
                // Inline code.
                const prefix = "[backcolor=White][font=Monaco,Consolas,serif][color=#7824c5]";
                const suffix = '[/color][/font][/backcolor]';
                return `${prefix}${yield converters.recurse(ele, Object.assign(Object.assign({}, ctx), { disablePunctuationConverter: true }))}${suffix}`;
            }
            else if (ele.classList.contains('strikethrough')) {
                // Strikethrough text.
                const prefix = '[s]';
                const suffix = '[/s]';
                return `${prefix}${ans}${suffix}`;
            }
            return ans;
        }),
        strong: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const ans = `[b]${yield converters.recurse(ele, ctx)}[/b]`;
            return ans;
        }),
        table: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const ans = `\n[table]\n${yield converters.recurse(ele, ctx)}[/table]\n`;
            return ans;
        }),
        tbody: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const ans = yield converters.recurse(ele, ctx);
            return ans;
        }),
        td: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const ans = `[td]${yield converters.recurse(ele, ctx)}[/td]`;
            return ans;
        }),
        tr: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const ans = `[tr]${yield converters.recurse(ele, ctx)}[/tr]\n`;
            return ans;
        }),
        ul: (ele, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            const inner = yield converters.recurse(ele, ctx);
            const ans = `[list]\n${inner}[/list]\n`;
            return ans;
        })
    };
    /**
     * Replace all half-shape characters to full-shape characters.
     */
    function translateMachinely(input, ctx) {
        const mappings = [
            [/Block of the Week: /gi, '本周方块：'],
            [/Taking Inventory: /gi, '背包盘点：'],
            [/Around the Block: /gi, '群系漫游：'],
            [/A Minecraft Java Snapshot/gi, 'Minecraft Java版 快照'],
            [/A Minecraft Java Pre-Release/gi, 'Minecraft Java版 预发布版'],
            [/A Minecraft Java Release Candidate/gi, 'Minecraft Java版 候选版本'],
            [/Minecraft Snapshot /gi, 'Minecraft 快照 '],
            [/Pre-Release /gi, '预发布版 '],
            [/Release Candidate /gi, '候选版本 '],
            [/Image credit:/gi, '图片来源：'],
            [/CC BY:/gi, '知识共享 署名'],
            [/CC BY-NC:/gi, '知识共享 署名-非商业性使用'],
            [/CC BY-ND:/gi, '知识共享 署名-禁止演绎'],
            [/CC BY-SA:/gi, '知识共享 署名-相同方式共享'],
            [/CC BY-NC-ND:/gi, '知识共享 署名-非商业性使用-禁止演绎'],
            [/CC BY-NC-SA:/gi, '知识共享 署名-非商业性使用-相同方式共享'],
            [/Public Domain:/gi, '公有领域'],
            [/The Caves & Cliffs Preview/gi, '洞穴与山崖预览数据包'],
            [/\[size=6\]\[b\]New Features in ([^\r\n]+)\[\/b\]\[\/size\]/gi, '[size=6][b]$1 的新增特性[/b][/size]'],
            [/\[size=6\]\[b\]Changes in ([^\r\n]+)\[\/b\]\[\/size\]/gi, '[size=6][b]$1 的修改内容[/b][/size]'],
            [/\[size=6\]\[b\]Technical changes in ([^\r\n]+)\[\/b\]\[\/size\]/gi, '[size=6][b]$1 的技术性修改[/b][/size]'],
            [/\[size=6\]\[b\]Fixed bugs in ([^\r\n]+)\[\/b\]\[\/size\]/gi, '[size=6][b]$1 修复的漏洞[/b][/size]'],
            [/\[i\]/gi, '[font=楷体]'],
            [/\[\/i\]/g, '[/font]'],
            ...ctx.disablePunctuationConverter ? [] : [
                [/“/g, '[font=楷体]“[/font]'],
                [/”/g, '[font=楷体]”[/font]'],
                [/,( |$)/g, '，'],
                [/!( |$)/g, '！'],
                [/\.\.\.( |$)/g, '…'],
                [/\.( |$)/g, '。'],
                [/\?( |$)/g, '？'],
                [/( |^)\-( |$)/g, ' —— '],
            ],
        ];
        for (const mapping of mappings) {
            input = input.replace(mapping[0], mapping[1]);
        }
        const quoteArrays = [
            ['[font=楷体]“[/font]', '[font=楷体]”[/font]', /"/]
            // ['『', '』', "'"]
        ];
        for (const quoteArray of quoteArrays) {
            const split = input.split(quoteArray[2]);
            input = '';
            for (let i = 0; i < split.length - 1; i++) {
                const element = split[i];
                input += element + quoteArray[i % 2];
            }
            input += split[split.length - 1];
        }
        return input;
    }
    /**
     * Resolve relative URLs.
     */
    function resolveUrl(url) {
        if (url[0] === '/') {
            return `https://www.minecraft.net${url}`;
        }
        else {
            return url;
        }
    }
    function removeLastLinebreak(str) {
        // if (str.slice(-1) === '\n') {
        //     return str.slice(0, -1)
        // }
        return str;
    }
    function translateBugs(str, ctx) {
        if (str.startsWith('[url=https://bugs.mojang.com/browse/MC-')) {
            const id = str.slice(36, str.indexOf(']'));
            const data = ctx.bugs[id];
            if (data) {
                const { summary, color } = data;
                return `[url=https://bugs.mojang.com/browse/${id}][color=${color}][b]${id}[/b][/color][/url]- ${summary}`;
            }
            else {
                return str;
            }
        }
        else {
            return str;
        }
    }
    function shouldUseAlbum(slides) {
        const enableAlbum = true;
        return enableAlbum
            ? slides.length > 1
            : slides.every(([_, caption]) => caption === ' ');
    }
    /**
     * Returns the type of the article.
     */
    function getArticleType(html) {
        var _a, _b, _c;
        try {
            const type = (_c = (_b = (_a = html.getElementsByClassName('article-category__text')) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.textContent) !== null && _c !== void 0 ? _c : '';
            return type.toUpperCase();
        }
        catch (e) {
            console.error('[getArticleType]', e);
        }
        return 'INSIDER';
    }
    function getVersionType(url) {
        if (url.toLowerCase().includes('pre-release')) {
            return 1 /* PreRelease */;
        }
        else if (url.toLowerCase().includes('release-candidate')) {
            return 2 /* ReleaseCandidate */;
        }
        else if (url.toLowerCase().includes('snapshot')) {
            return 0 /* Snapshot */;
        }
        else if (url.toLowerCase().includes('minecraft java edition')) {
            return 3 /* Release */;
        }
        else {
            return 4 /* Normal */;
        }
    }
    function getBeginning(articleType, type) {
        if (articleType.toLowerCase() !== 'news') {
            return '';
        }
        switch (type) {
            case 0 /* Snapshot */:
                return `[align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]每周快照[/color]是Minecraft Java版的测试机制，主要用于下一个正式版的特性预览。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]然而，每周快照主要用于新特性展示，通常存在大量漏洞。因此对于普通玩家建议仅做[color=Red][b]测试尝鲜[/b][/color]用。在快照中打开存档前请务必[color=Red][b]进行备份[/b][/color]。[b]适用于正式版的Mod不兼容快照，且大多数Mod都不对每周快照提供支持[/b]。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center][color=Red][b]Minecraft ${NextMainRelease} 仍未发布，<版本>为其第<计数器>个预览版。[/b][/color][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFFFCE]
[tr][td][align=center]部分新特性译名仅供新闻预览
请到[url=https://crowdin.com/project/minecraft/zh-CN]Crowdin[/url]讨论游戏正式译名。[/align][/td][/tr]
[/table][/align]

[hr]\n
【如果没有新方块物品等内容，请删去上方待定译名提示框。】\n`;
            case 1 /* PreRelease */:
                return `[align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]预发布版[/color]是Minecraft Java版的测试机制，如果该版本作为正式版发布，那么预发布版的游戏文件将与启动器推送的正式版完全相同。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]然而，预发布版主要用于服主和Mod制作者的预先体验，如果发现重大漏洞，该预发布版会被新的预发布版代替。因此建议普通玩家[color=Red]持观望态度[/color]。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center][color=Red][b]Minecraft ${NextMainRelease} 仍未发布，<版本>为其第<计数器>个预发布版，第<计数器>个预览版。[/b][/color][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr]
[/table][/align]

[hr]\n`;
            case 2 /* ReleaseCandidate */:
                return `[align=center][table=80%,#EDFBFF]
[tr][td][align=center][color=red]候选版[/color]是Minecraft Java版正式版的候选版本，如果发现重大漏洞，该候选版会被新的候选版代替。如果一切正常，该版本将会作为正式版发布。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center]候选版已可供普通玩家进行抢鲜体验，但仍需当心可能存在的漏洞。[/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center][color=Red][b]Minecraft ${NextMainRelease} 仍未发布，<版本>为其第<计数器>个候选版，第<计数器>个预览版。[/b][/color][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr]
[/table][/align]

[hr]\n`;
            case 3 /* Release */:
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

[hr]\n`;
            case 4 /* Normal */:
            default:
                return `\n[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr][/table][/align]
[hr]\n`;
        }
    }
    function getEnding(articleType, type) {
        if (articleType.toLowerCase() !== 'news') {
            return '';
        }
        switch (type) {
            case 0 /* Snapshot */:
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
[/table][/align]`;
            case 1 /* PreRelease */:
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
[/table][/align]`;
            case 2 /* ReleaseCandidate */:
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
[/table][/align]`;
            case 3 /* Release */:
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
[/table][/align]`;
            case 4 /* Normal */:
            default:
                return `\n[hr]

[align=center][img=416,132]https://attachment.mcbbs.net/data/myattachment/forum/201905/10/183113w1yyttpjz8epq60s.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][url=https://www.mcbbs.net/thread-874677-1-1.html]外部来源以及详细的更新条目追踪[/url][/align][/td][/tr]
[/table][/align]`;
        }
    }
    main();
})();
//# sourceMappingURL=user_script.js.map