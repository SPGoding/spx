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
// @include       https://www.minecraft.net/zh-hans/article/*
// @include       https://twitter.com/*/status/*
// @include       https://mobile.twitter.com/*/status/*
// @include       https://feedback.minecraft.net/hc/en-us/articles/*
// @include       https://help.minecraft.net/hc/en-us/articles/*
// @name          SPX
// @version       1.2.2
// ==/UserScript==

/// <reference types="@types/tampermonkey">

type ResolvedBugs = Partial<import('./cache/bug').ResolvedBugCache>

interface Context {
	author?: string,
	bugs: ResolvedBugs,
	disablePunctuationConverter?: boolean,
	inList?: boolean,
	title: string,
	translator: string,
	url: string,
}

interface Tweet {
	date: string,
	source: string,
	text: string,
	tweetLink: string,
	urls: string,
	userName: string,
	userTag: string,
	lang: string
}

(() => {
	// 看不惯，别看。看美国人的脚本去。

	// Minecraft.net START
	const BugsCenter = 'https://spx.spgoding.com/bugs'
	const NextMainRelease = '1.17.1'

	async function minecraftNet() {
		const url = document.location.toString()
		if (url.match(/^https:\/\/www\.minecraft\.net\/(?:[a-z-]+)\/article\//)) {
			console.info('[SPX] Activated')

			const pointerModifier = document.getElementsByClassName('article-attribution-container').item(0) as HTMLDivElement
			pointerModifier.style.pointerEvents = 'inherit'

			const button = document.createElement('button')
			button.classList.add('btn', 'btn-primary', 'btn-sm', 'btn-primary--grow', 'spx-converter-ignored')
			button.innerText = 'Copy BBCode'
			button.onclick = async () => {
				button.innerText = 'Processing...'
				const bbcode = await convertMCArticleToBBCode(document, url, '// TODO //')
				GM_setClipboard(bbcode, { type: 'text', mimetype: 'text/plain' })
				button.innerText = 'Copied BBCode!'
				setTimeout(() => button.innerText = 'Copy BBCode', 5_000)
			}

			const container = document.getElementsByClassName('attribution').item(0) as HTMLDivElement
			container.append(button)
		}
	}

	function feedback() {
		console.info('[SPX] Activated')

		const button = document.createElement('a')
		button.classList.add('navLink')
		button.innerText = 'Copy BBCode'
		button.onclick = async () => {
			button.innerText = 'Processing...'
			const bbcode = await convertFeedbackArticleToBBCode(document, location.href)
			GM_setClipboard(bbcode, { type: 'text', mimetype: 'text/plain' })
			button.innerText = 'Copied BBCode!'
			setTimeout(() => button.innerText = 'Copy BBCode', 5_000)
		}

		document.querySelector('.topNavbar nav')!.append(button)
	}

	function help() {
		console.info('[SPX] Activated')

		const button = document.createElement('a')
		button.classList.add('navLink')
		button.innerText = 'Copy BBCode'
		button.onclick = async () => {
			button.innerText = 'Processing...'
			const bbcode = await convertHelpArticleToBBCode(document, location.href)
			GM_setClipboard(bbcode, { type: 'text', mimetype: 'text/plain' })
			button.innerText = 'Copied BBCode!'
			setTimeout(() => button.innerText = 'Copy BBCode', 5_000)
		}

		const nav = document.createElement('nav')
		nav.classList.add('my-0')
		nav.append(button)

		document.querySelector('.topNavbar .d-flex')!.append(nav)
	}

	async function getBugs(): Promise<ResolvedBugs> {
		return new Promise((rs, rj) => {
			GM_xmlhttpRequest({
				method: 'GET',
				url: BugsCenter,
				fetch: true,
				nocache: true,
				timeout: 7_000,
				onload: r => {
					try {
						rs(JSON.parse(r.responseText))
					} catch (e) {
						rj(e)
					}
				},
				onabort: () => rj(new Error('Aborted')),
				onerror: e => rj(e),
				ontimeout: () => rj(new Error('Time out')),
			})
		})
	}

	async function convertMCArticleToBBCode(html: Document, articleUrl: string, translator: string = '？？？') {
		const articleType = getArticleType(html)
		const versionType = getVersionType(articleUrl)

		let bugs: ResolvedBugs
		try {
			bugs = await getBugs()
		} catch (e) {
			bugs = {}
			console.error('[convertMCArticleToBBCode#getBugs]', e)
		}

		const beginning = getBeginning(articleType, versionType)
		const heroImage = getHeroImage(html, articleType)
		const content = await getContent(html, {
			bugs,
			title: html.title.split(' | ').slice(0, -1).join(' | '),
			translator,
			url: articleUrl,
		})
		const ending = getEnding(articleType, versionType)

		const ans = `${beginning}${heroImage}${content}[/indent][/indent]${ending}`

		return ans
	}

	/**
	 * Get the hero image (head image) of an article as the form of a BBCode string.
	 * @param html An HTML Document.
	 */
	function getHeroImage(html: Document, articleType: string | undefined) {
		const category = articleType ? `\n[backcolor=Black][color=White][font="Noto Sans",sans-serif][b]${articleType}[/b][/font][/color][/backcolor][/align]` : ''
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
	async function getContent(html: Document, ctx: Context) {
		const rootDiv = html.getElementsByClassName('article-body')[0] as HTMLElement
		let ans = await converters.recurse(rootDiv, ctx)

		// Get the server URL if it exists.
		const serverUrls = ans.match(/(https:\/\/launcher.mojang.com\/.+\/server.jar)/)
		let serverUrl = ''
		if (serverUrls) {
			serverUrl = serverUrls[0]
		}
		// Remove the text after '】'
		ans = ans.slice(0, ans.lastIndexOf('】') + 1)
		// Remove 'GET THE SNAPSHOT/PRE-RELEASE/RELEASE-CANDIDATE/RELEASE' for releasing
		let index = ans.toLowerCase().lastIndexOf('[size=6][b][color=silver]get the snapshot[/color][/b][/size]')
		if (index === -1) {
			index = ans.toLowerCase().lastIndexOf('[size=6][b][color=silver]get the pre-release[/color][/b][/size]')
		}
		if (index === -1) {
			index = ans.toLowerCase().lastIndexOf('[size=6][b][color=silver]get the release[/color][/b][/size]')
		}
		if (index === -1) {
			index = ans.toLowerCase().lastIndexOf('[size=6][b][color=silver]get the release candidate[/color][/b][/size]')
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

	async function convertFeedbackArticleToBBCode(html: Document, articleUrl: string, translator: string = '？？？') {
		const title = html.title.slice(0, html.title.lastIndexOf(' – Minecraft Feedback'))
		const ctx = {
			bugs: {},
			title: title,
			translator,
			url: articleUrl,
		}

		let versionType = VersionType.Normal

		if (document.querySelector('[title="Beta Information and Changelogs"]')) {
			versionType = VersionType.BedrockBeta
		} else if (document.querySelector('[title="Release Changelogs"]')) {
			versionType = VersionType.BedrockRelease
		}

		const content = await getFeedbackContent(html, ctx)

		const ans = `${getBeginning('news', versionType)}[size=6][b][color=Silver]${title}[/color][/b][/size]
${translateMachinely(`[size=6][b]${title}[/b][/size]`, ctx)}\n\n${content.replace(
	/\[size=2\]\[color=Silver\]\[b\]PLEASE READ before participating in the Minecraft Beta: \[\/b\]\[\/color\]\[\/size\].*?\[\/list\]/msi,
	'')}[/indent][/indent]\n
[b]【${ctx.translator} 译自[url=${ctx.url}][color=#388d40][u]feedback.minecraft.net 哪 年 哪 月 哪 日发布的 ${ctx.title}[/u][/color][/url]】[/b]
【本文排版借助了：[url=https://spx.spgoding.com][color=#388d40][u]SPX[/u][/color][/url]】\n\n${getEnding('news', versionType)}`

		return ans
	}

	async function convertHelpArticleToBBCode(html: Document, articleUrl: string, translator: string = '？？？') {
		const title = html.title.slice(0, html.title.lastIndexOf(' – Home'))
		const ctx = {
			bugs: {},
			title: title,
			translator,
			url: articleUrl,
		}
		const content = await getHelpContent(html, ctx)

		const ans = `[size=6][b][color=Silver]${title}[/color][/b][/size]
${translateMachinely(`[size=6][b]${title}[/b][/size]`, ctx)}\n\n${content}[/indent][/indent]\n
[b]【${ctx.translator} 译自[url=${ctx.url}][color=#388d40][u]help.minecraft.net 哪 年 哪 月 哪 日发布的 ${ctx.title}[/u][/color][/url]】[/b]
【本文排版借助了：[url=https://spx.spgoding.com][color=#388d40][u]SPX[/u][/color][/url]】\n\n`

		return ans
	}

	/**
	 * Get the content of an article as the form of a BBCode string.
	 * @param html An HTML Document.
	 */
	async function getFeedbackContent(html: Document, ctx: Context) {
		const rootSection = html.getElementsByClassName('article-info')[0] as HTMLElement
		let ans = await converters.recurse(rootSection, ctx)

		// Add spaces between texts and '[x'.
		ans = ans.replace(/([a-zA-Z0-9\-\.\_])(\[[A-Za-z])/g, '$1 $2')
		// Add spaces between '[/x]' and texts.
		ans = ans.replace(/(\[\/[^\]]+?\])([a-zA-Z0-9\-\.\_])/g, '$1 $2')

		return ans
	}

	/**
	 * Get the content of an article as the form of a BBCode string.
	 * @param html An HTML Document.
	 */
	 async function getHelpContent(html: Document, ctx: Context) {
		const rootSection = html.getElementsByClassName('article-body')[0] as HTMLElement // Yep, this is the only difference.
		let ans = await converters.recurse(rootSection, ctx)

		// Add spaces between texts and '[x'.
		ans = ans.replace(/([a-zA-Z0-9\-\.\_])(\[[A-Za-z])/g, '$1 $2')
		// Add spaces between '[/x]' and texts.
		ans = ans.replace(/(\[\/[^\]]+?\])([a-zA-Z0-9\-\.\_])/g, '$1 $2')

		return ans
	}

	const converters = {
		/**
		 * Converts a ChildNode to a BBCode string according to the type of the node.
		 */
		convert: async (node: ChildNode, ctx: Context): Promise<string> => {
			if ((node as HTMLElement).classList?.contains('spx-converter-ignored')) {
				return ''
			}
			switch (node.nodeName) {
				case 'A':
					return converters.a(node as HTMLAnchorElement, ctx)
				case 'B':
				case 'STRONG':
					return converters.strong(node as HTMLElement, ctx)
				case 'BLOCKQUOTE':
					return converters.blockquote(node as HTMLQuoteElement, ctx)
				case 'BR':
					return converters.br()
				case 'CITE':
					return converters.cite(node as HTMLElement, ctx)
				case 'CODE':
					return converters.code(node as HTMLElement, ctx)
				case 'DIV':
				case 'SECTION':
					return converters.div(node as HTMLDivElement, ctx)
				case 'DD':
					return converters.dd(node as HTMLElement, ctx)
				case 'DL':
					return converters.dl(node as HTMLElement, ctx)
				case 'DT':
					return converters.dt(node as HTMLElement, ctx)
				case 'EM':
					return converters.em(node as HTMLElement, ctx)
				case 'H1':
					return converters.h1(node as HTMLElement, ctx)
				case 'H2':
					return converters.h2(node as HTMLElement, ctx)
				case 'H3':
					return converters.h3(node as HTMLElement, ctx)
				case 'H4':
					return converters.h4(node as HTMLElement, ctx)
				case 'I':
					return converters.i(node as HTMLElement, ctx)
				case 'IMG':
					return converters.img(node as HTMLImageElement, ctx)
				case 'LI':
					return converters.li(node as HTMLElement, ctx)
				case 'OL':
					return converters.ol(node as HTMLElement, ctx)
				case 'P':
					return converters.p(node as HTMLElement, ctx)
				case 'PICTURE': // TODO: If picture contains important img in the future. Then just attain the last <img> element in the <picture> element.
					return converters.picture(node as HTMLElement, ctx)
				case 'SPAN':
					return converters.span(node as HTMLElement, ctx)
				case 'TABLE':
					return converters.table(node as HTMLElement, ctx)
				case 'TBODY':
					return converters.tbody(node as HTMLElement, ctx)
				case 'TH':
				case 'TD':
					return converters.td(node as HTMLElement, ctx)
				case 'TR':
					return converters.tr(node as HTMLElement, ctx)
				case 'UL':
					return converters.ul(node as HTMLElement, ctx)
				case '#text':
					if (node) {
						return ((node as Text).textContent as string)
							.replace(/[\n\r\t]+/g, '').replace(/\s{2,}/g, '')
					} else {
						return ''
					}
				case 'BUTTON':
				case 'H5':
				case 'NAV':
				case 'svg':
				case 'SCRIPT':
					if (node) {
						return node.textContent ? node.textContent : ''
					} else {
						return ''
					}
				default:
					console.warn(`Unknown type: '${node.nodeName}'.`)
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
		recurse: async (ele: HTMLElement, ctx: Context) => {
			let ans = ''

			if (!ele) {
				return ans
			}

			for (const child of Array.from(ele.childNodes)) {
				ans += await converters.convert(child, ctx)
			}

			ans = removeLastLinebreak(ans)

			return ans
		},
		a: async (anchor: HTMLAnchorElement, ctx: Context) => {
			const url = resolveUrl(anchor.href)
			let ans
			if (url) {
				ans = `[url=${url}][color=#388d40]${await converters.recurse(anchor, ctx)}[/color][/url]`
			} else {
				ans = await converters.recurse(anchor, ctx)
			}

			return ans
		},
		blockquote: async (ele: HTMLQuoteElement, ctx: Context) => {
			const prefix = ''
			const suffix = ''
			const ans = `${prefix}${await converters.recurse(ele, ctx)}${suffix}`

			return ans
		},
		br: async () => {
			const ans = '\n'

			return ans
		},
		cite: async (ele: HTMLElement, ctx: Context) => {
			const prefix = '—— '
			const suffix = ''

			const ans = `${prefix}${await converters.recurse(ele, ctx)}${suffix}`

			return ans
		},
		code: async (ele: HTMLElement, ctx: Context) => {
			const prefix = "[backcolor=White][font=Monaco,Consolas,'Lucida Console','Courier New',serif]"
			const suffix = '[/font][/backcolor]'

			const ans = `${prefix}${await converters.recurse(ele, { ...ctx, disablePunctuationConverter: true })}${suffix}`

			return ans
		},
		div: async (ele: HTMLDivElement, ctx: Context) => {
			let ans = await converters.recurse(ele, ctx)

			if (ele.classList.contains('text-center')) {
				ans = `[/indent][/indent][align=center]${ans}[/align][indent][indent]\n`
			} else if (ele.classList.contains('article-image-carousel')) {
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
				const prefix = `[/indent][/indent][album]\n`
				const suffix = `\n[/album][indent][indent]\n`
				const slides: [string, string][] = []
				const findSlides = async (ele: HTMLDivElement | HTMLImageElement): Promise<void> => {
					if (ele.classList.contains('slick-cloned')) {
						return
					}
					if (ele.nodeName === 'IMG' && ele.classList.contains('article-image-carousel__image')) {
						slides.push([resolveUrl((ele as HTMLImageElement).src), ' '])
					} else if (ele.nodeName === 'DIV' && ele.classList.contains('article-image-carousel__caption')) {
						if (slides.length > 0) {
							slides[slides.length - 1][1] = `[b]${(await converters.recurse(ele, ctx))}[/b]`
						}
					} else {
						for (const child of Array.from(ele.childNodes)) {
							if (child.nodeName === 'DIV' || child.nodeName === 'IMG') {
								await findSlides(child as HTMLDivElement | HTMLImageElement)
							}
						}
					}
				}
				await findSlides(ele)
				if (shouldUseAlbum(slides)) {
					ans = `${prefix}${slides.map(([url, caption]) => `[aimg=${url}]${caption}[/aimg]`).join('\n')}${suffix}`
				} else if (slides.length > 0) {
					ans = `${slides.map(([url, caption]) => `[/indent][/indent][align=center][img]${url}[/img]\n${caption}`).join('\n')}[/align][indent][indent]\n`
				} else {
					ans = ''
				}
			} else if (ele.classList.contains('video')) {
				// Video.
				ans = '\n[/indent][/indent][align=center]【请将此处替换为含https的视频链接[media]XXX[/media]】[/align][indent][indent]\n'
			} else if (ele.classList.contains('quote') || ele.classList.contains('attributed-quote')) {
				ans = `\n[quote]\n${ans}\n[/quote]\n`
			} else if (ele.classList.contains('article-social')) {
				// End of the content.
				ans = ''
			} else if (ele.classList.contains('modal')) {
				// Unknown useless content
				ans = ''
			}
			// else if (ele.classList.contains('end-with-block')) {
			//     ans = ans.trimRight() + '[img=16,16]https://ooo.0o0.ooo/2017/01/30/588f60bbaaf78.png[/img]'
			// }

			return ans
		},
		dt: async (_ele: HTMLElement, ctx: Context) => {
			// const ans = `${converters.rescure(ele)}：`

			// return ans
			return ''
		},
		dl: async (ele: HTMLElement, ctx: Context) => {
			// The final <dd> after converted will contains an ending comma '，'
			// So I don't add any comma before '译者'.
			const ans = `\n\n${await converters.recurse(ele, ctx)}\n【本文排版借助了：[url=https://spx.spgoding.com][color=#388d40][u]SPX[/u][/color][/url]】\n\n`
			return ans
		},
		dd: async (ele: HTMLElement, ctx: Context) => {
			let ans = ''

			if (ele.classList.contains('pubDate')) {
				// Published:
				// `pubDate` is like '2019-03-08T10:00:00.876+0000'.
				const date = ele.attributes.getNamedItem('data-value')
				if (date) {
					ans = `[b]【${ctx.translator} 译自[url=${ctx.url}][color=#388d40][u]官网 ${date.value.slice(0, 4)} 年 ${date.value.slice(5, 7)} 月 ${date.value.slice(8, 10)} 日发布的 ${ctx.title}[/u][/color][/url]；原作者 ${ctx.author}】[/b]`
				} else {
					ans = `[b]【${ctx.translator} 译自[url=${ctx.url}][color=#388d40][u]官网 哪 年 哪 月 哪 日发布的 ${ctx.title}[/u][/color][/url]】[/b]`
				}
			} else {
				// Written by:
				ctx.author = await converters.recurse(ele, ctx)
			}

			return ans
		},
		em: async (ele: HTMLElement, ctx: Context) => {
			const ans = `[i]${await converters.recurse(ele, ctx)}[/i]`

			return ans
		},
		h1: async (ele: HTMLElement, ctx: Context) => {
			const prefix = '[size=6][b]'
			const suffix = '[/b][/size]'
			const inner = await converters.recurse(ele, ctx)
			const ans = `${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver').replace(/[\n\r]+/g, ' ')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`, ctx).replace(/[\n\r]+/g, ' ')}\n\n`

			return ans
		},
		h2: async (ele: HTMLElement, ctx: Context) => {
			const prefix = '[size=5][b]'
			const suffix = '[/b][/size]'
			const inner = await converters.recurse(ele, ctx)
			const ans = `\n${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver').replace(/[\n\r]+/g, ' ')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`, ctx).replace(/[\n\r]+/g, ' ')}\n\n`

			return ans
		},
		h3: async (ele: HTMLElement, ctx: Context) => {
			const prefix = '[size=4][b]'
			const suffix = '[/b][/size]'
			const inner = await converters.recurse(ele, ctx)
			const ans = `\n${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver').replace(/[\n\r]+/g, ' ')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`, ctx).replace(/[\n\r]+/g, ' ')}\n\n`

			return ans
		},
		h4: async (ele: HTMLElement, ctx: Context) => {
			const prefix = '[size=3][b]'
			const suffix = '[/b][/size]'
			const inner = await converters.recurse(ele, ctx)
			const ans = `\n${prefix}[color=Silver]${inner.replace(/#388d40/g, 'Silver').replace(/[\n\r]+/g, ' ')}[/color]${suffix}\n${translateMachinely(`${prefix}${inner}${suffix}`, ctx).replace(/[\n\r]+/g, ' ')}\n\n`

			return ans
		},
		i: async (ele: HTMLElement, ctx: Context) => {
			const ans = `[i]${await converters.recurse(ele, ctx)}[/i]`

			return ans
		},
		img: async (img: HTMLImageElement, _ctx: Context) => {
			if (img.alt === 'Author image') {
				return ''
			}

			let w: number | undefined
			let h: number | undefined

			if (img.classList.contains('attributed-quote__image')) { // for in-quote avatar image
				h = 92
				w = 53
			} else if (img.classList.contains('mr-3')) { // for attributor avatar image
				h = 121
				w = 82
			}

			const prefix = w && h ? `[img=${w},${h}]` : '[img]'
			const imgUrl = resolveUrl(img.src)

			let ans: string
			if (img.classList.contains('attributed-quote__image') || img.classList.contains('mr-3')) {
				// Attributed quote author avatar.
				ans = `\n[float=left]${prefix}${imgUrl}[/img][/float]`
			} else {
				ans = `\n\n[/indent][/indent][align=center]${prefix}${imgUrl}[/img][/align][indent][indent]\n`
			}

			return ans
		},
		li: async (ele: HTMLElement, ctx: Context) => {
			const inner = await converters.recurse(ele, { ...ctx, inList: true })
			let ans: string
			if (ele.childNodes.length === 1 && (ele.childNodes[0].nodeName === 'OL' || ele.childNodes[0].nodeName === 'UL')) {
				// Nested lists.
				ans = `[*]${translateMachinely(translateBugs(inner, ctx), ctx)}\n`
			} else {
				ans = `[*][color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color]\n[*]${translateMachinely(translateBugs(inner, ctx), ctx)}\n`
			}

			return ans
		},
		ol: async (ele: HTMLElement, ctx: Context) => {
			const inner = await converters.recurse(ele, ctx)
			const ans = `[list=1]\n${inner}[/list]\n`

			return ans
		},
		p: async (ele: HTMLElement, ctx: Context) => {
			const inner = await converters.recurse(ele, ctx)

			let ans

			if (ele.classList.contains('lead')) {
				ans = `[size=4][b][size=2][color=Silver]${inner}[/color][/size][/b][/size]\n[size=4][b]${translateMachinely(inner, ctx)}[/b][/size]\n\n`
			} else {
				if (ctx.inList) {
					ans = inner
				} else {
					ans = `[size=2][color=Silver]${inner.replace(/#388d40/g, 'Silver')}[/color][/size]\n${translateMachinely(inner, ctx)}\n\n`
				}
			}

			return ans
		},
		picture: async (ele: HTMLElement, ctx: Context) => {
			const ans = await converters.recurse(ele, ctx)
			return ans
		},
		span: async (ele: HTMLElement, ctx: Context) => {
			const ans = await converters.recurse(ele, ctx)

			if (ele.classList.contains('bedrock-server')) {
				// Inline code.
				const prefix = "[backcolor=White][font=Monaco,Consolas,serif][color=#7824c5]"
				const suffix = '[/color][/font][/backcolor]'
				return `${prefix}${await converters.recurse(ele, { ...ctx, disablePunctuationConverter: true })}${suffix}`
			} else if (ele.classList.contains('strikethrough')) {
				// Strikethrough text.
				const prefix = '[s]'
				const suffix = '[/s]'
				return `${prefix}${ans}${suffix}`
			}

			return ans
		},
		strong: async (ele: HTMLElement, ctx: Context) => {
			const ans = `[b]${await converters.recurse(ele, ctx)}[/b]`

			return ans
		},
		table: async (ele: HTMLElement, ctx: Context) => {
			const ans = `\n[table]\n${await converters.recurse(ele, ctx)}[/table]\n`

			return ans
		},
		tbody: async (ele: HTMLElement, ctx: Context) => {
			const ans = await converters.recurse(ele, ctx)

			return ans
		},
		td: async (ele: HTMLElement, ctx: Context) => {
			const ans = `[td]${await converters.recurse(ele, ctx)}[/td]`

			return ans
		},
		tr: async (ele: HTMLElement, ctx: Context) => {
			const ans = `[tr]${await converters.recurse(ele, ctx)}[/tr]\n`

			return ans
		},
		ul: async (ele: HTMLElement, ctx: Context) => {
			const inner = await converters.recurse(ele, ctx)
			const ans = `[list]\n${inner}[/list]\n`

			return ans
		}
	}

	/**
	 * Replace all half-shape characters to full-shape characters.
	 */
	function translateMachinely(input: string, ctx: Context) {
		const mappings: [RegExp, string][] = [
			[/Block of the Week: /gi, '本周方块：'],
			[/Taking Inventory: /gi, '背包盘点：'],
			[/Around the Block: /gi, '群系漫游：'],
			[/A Minecraft Java Snapshot/gi, 'Minecraft Java版 快照'],
			[/A Minecraft Java Pre-Release/gi, 'Minecraft Java版 预发布版'],
			[/A Minecraft Java Release Candidate/gi, 'Minecraft Java版 候选版本'],
			[/Minecraft Beta (?:-|——) (.*?) \((.*?)\)/gi, 'Minecarft 基岩版 Beta $1（$2）'],
			[/Minecraft (?:-|——) (.*?) \(Bedrock\)/gi, 'Minecraft 基岩版 $1'],
			[/Minecraft (?:-|——) (.*?) \((.*?) Only\)/gi, 'Minecraft 基岩版 $1（仅$2）'],
			[/Minecraft (?:-|——) (.*?) \((.*?)\)/gi, 'Minecraft 基岩版 $1（仅$2）'],
			[/Caves & Cliffs Experimental Features/gi, '洞穴与山崖实验性特性'],
			[/Marketplace/gi, '市场'],
			[/Data-Driven/gi, '数据驱动'],
			[/Graphical/gi, '图像'],
			[/Player/gi, '玩家'],
			[/Experimental Features/gi, '实验性特性'],
			[/Mobs/gi, '生物'],
			[/Features and Bug Fixes/gi, '特性和漏洞修复'],
			[/Stability and Performance/gi, '稳定性和性能'],
			[/Accessibility/gi, '辅助功能'],
			[/Gameplay/gi, '玩法'],
			[/Items/gi, '物品'],
			[/Blocks/gi, '方块'],
			[/User Interface/gi, '用户界面'],
			[/Commands/gi, '命令'],
			[/Technical Updates/gi, '技术性更新'],
			[/Vanilla Parity/gi, '待同步特性'],
			[/Character Creator/gi, '角色创建器'],
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
			[/The Caves & Cliffs Preview/gi, '洞穴与山崖预览数据包'], // to be deprecated
			[/\[size=6\]\[b\]New Features in ([^\r\n]+)\[\/b\]\[\/size\]/gi, '[size=6][b]$1 的新增特性[/b][/size]'],
			[/\[size=6\]\[b\]Changes in ([^\r\n]+)\[\/b\]\[\/size\]/gi, '[size=6][b]$1 的修改内容[/b][/size]'],
			[/\[size=6\]\[b\]Technical changes in ([^\r\n]+)\[\/b\]\[\/size\]/gi, '[size=6][b]$1 的技术性修改[/b][/size]'],
			[/\[size=6\]\[b\]Fixed bugs in ([^\r\n]+)\[\/b\]\[\/size\]/gi, '[size=6][b]$1 修复的漏洞[/b][/size]'],
			[/\[i\]/gi, '[font=楷体]'],
			[/\[\/i\]/g, '[/font]'],
			...ctx.disablePunctuationConverter ? [] : [
				[/,( |$)/g, '，'],
				[/!( |$)/g, '！'],
				[/\.\.\.( |$)/g, '…'],
				[/\.( |$)/g, '。'],
				[/\?( |$)/g, '？'],
				[/( |^)\-( |$)/g, ' —— '],
			] as [RegExp, string][],
		]

		for (const mapping of mappings) {
			input = input.replace(mapping[0], mapping[1])
		}

		const quoteArrays: [string, string, RegExp][] = [
			['“', '”', /"/]
			// ['『', '』', "'"]
		]

		for (const quoteArray of quoteArrays) {
			const split = input.split(quoteArray[2])
			input = ''
			for (let i = 0; i < split.length - 1; i++) {
				const element = split[i]
				input += element + quoteArray[i % 2]
			}
			input += split[split.length - 1]
		}

		return input
	}

	/**
	 * Resolve relative URLs.
	 */
	function resolveUrl(url: string) {
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

	function translateBugs(str: string, ctx: Context) {
		if (str.startsWith('[url=https://bugs.mojang.com/browse/MC-')) {
			const id = str.slice(36, str.indexOf(']'))
			const data = ctx.bugs[id]
			if (data) {
				const { summary, color } = data
				return `[url=https://bugs.mojang.com/browse/${id}][color=${color}][b]${id}[/b][/color][/url]- ${summary}`
			} else {
				return str
			}
		} else {
			return str
		}
	}

	function shouldUseAlbum(slides: [string, string][]) {
		const enableAlbum = true
		return enableAlbum
			? slides.length > 1
			: slides.every(([_, caption]) => caption === ' ')
	}

	/**
	 * Returns the type of the article.
	 */
	function getArticleType(html: Document): string {
		try {
			const type = html.getElementsByClassName('article-category__text')?.[0]?.textContent ?? ''
			return type.toUpperCase()
		} catch (e) {
			console.error('[getArticleType]', e)
		}
		return 'INSIDER'
	}

	function getVersionType(url: string): VersionType {
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

	function getBeginning(articleType: string, type: VersionType) {
		if (articleType.toLowerCase() !== 'news') {
			return ''
		}
		switch (type) {
			case VersionType.Snapshot:
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
【如果没有新方块物品等内容，请删去上方待定译名提示框。】\n`
			case VersionType.PreRelease:
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

[hr]\n`
			case VersionType.ReleaseCandidate:
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

			case VersionType.BedrockRelease:
				return `[align=center][table=80%,#EDFBFF]
[tr][td][align=center][b][color=Red]Minecraft基岩版[/color]是指包括Minecraft手机版（Android、IOS）、Win10版（VR）、主机版（XboxOne、NS、PS4）在内，使用“基岩引擎”（C++语言）开发的Minecraft统一版本。[/b][/align][/td][/tr]
[/table][/align]
[align=center][table=90%,#FFEBED]
[tr][td][align=center][b][color=red]正式版是[color=DarkRed]Minecraft基岩版[/color]经过一段时间的测试版测试之后得到的稳定版本，也是众多材质、Addon和官方领域服会逐渐跟进的版本。与此同时Google Play、Win10 Store等官方软件商店也会推送此次更新。[/color][/b][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr][/table][/align]

[hr]\n
`

			case VersionType.BedrockBeta:
				return `[align=center][table=80%,#EDFBFF]
[tr][td][align=center][b][color=Red]测试版[/color]是Minecraft基岩版的测试机制，主要用于下一个正式版的特性预览。[/b][/align][/td][/tr]
[/table][/align]
[align=center][table=90%,#FFEBED]
[tr][td][align=center][b]然而，测试版主要用于新特性展示，通常存在大量漏洞。因此对于普通玩家建议仅做[color=red]测试尝鲜[/color]用。使用测试版打开存档前请[color=red]务必备份[/color]。适用于正式版的领域服务器与测试版不兼容。[/b][/align][/td][/tr]
[/table][/align]
[align=center][table=90%,#FFEBED]
[tr][td][align=center][b]如果在测试版中遇到旧版存档无法使用的问题，测试版将允许你将存档上传以供开发团队查找问题。[/b][/align][/td][/tr]
[/table][/align]
[align=center][table=80%,#FFEBED]
[tr][td][align=center][color=Red][b]Minecraft基岩版 <正式版版本号> 仍未发布，<当前版本号>为其第<计数器>个测试版。[/b][/color][/align][/td][/tr]
[/table][/align]
[align=center][table=50%,#EDFBFF]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr]
[/table][/align]

[hr]\n
`

			case VersionType.Normal:
			default:
				return `\n[align=center][table=50%,#FFEBED]
[tr][td][align=center]转载本贴时须要注明[b]原作者[/b]以及[b]本帖地址[/b]。[/align][/td][/tr][/table][/align]
[hr]\n`

		}
	}

	function getEnding(articleType: string, type: VersionType) {
		if (articleType.toLowerCase() !== 'news') {
			return ''
		}
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

			case VersionType.BedrockRelease:
				return `\n[hr]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]正版地址[/b][/color][/size][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Google Play[/align][/color][/td][td][align=center][url=https://play.google.com/store/apps/details?id=com.mojang.minecraftpe]https://play.google.com/store/apps/details?id=com.mojang.minecraftpe[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]Win10 Store[/align][/color][/td][td][align=center][url=https://www.microsoft.com/zh-cn/store/p/minecraft-for-windows-10/9nblggh2jhxj]https://www.microsoft.com/zh-cn/store/p/minecraft-for-windows-10/9nblggh2jhxj[/url][/align][/td][/tr]
[/table][/align]
[align=center][img=416,132]https://attachment.mcbbs.net/data/myattachment/forum/201905/10/183113w1yyttpjz8epq60s.jpg[/img][/align]
[align=center][table=75%,#FFEBED]
[tr][td][align=center][url=https://www.mcbbs.net/thread-874677-1-1.html]外部来源以及详细的更新条目追踪[/url][/align][/td][/tr]
[/table][/align]`

			case VersionType.BedrockBeta:
				return `\n[hr]
[align=center][table=70%,#EDFBFF]
[tr][td=2,1][align=center][size=3][color=#D6D604][b]相关地址[/b][/color][/size][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]谷歌正版[/align][/color][/td][td][align=center][url=https://play.google.com/store/apps/details?id=com.mojang.minecraftpe]https://play.google.com/store/apps/details?id=com.mojang.minecraftpe[/url][/align][/td][/tr]
[tr][td][color=#D10A0A][align=center]基岩版测试组[/align][/color][/td][td][align=center]安卓Google Play：[url=https://play.google.com/apps/testing/com.mojang.minecraftpe]https://play.google.com/apps/testing/com.mojang.minecraftpe[/url][/align][align=center]Win10 Store：[url=https://www.microsoft.com/zh-cn/store/p/xbox-insider-hub/9nblggh68vsk]https://www.microsoft.com/zh-cn/store/p/xbox-insider-hub/9nblggh68vsk[/url][/align][/td][/tr]
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

	const enum VersionType {
		Snapshot,
		PreRelease,
		ReleaseCandidate,
		Release,
		Normal,
		BedrockBeta,
		BedrockRelease
	}

	// Minecraft.net END
	// Twitter START

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

	function getTweetMetadata(): Tweet {
		const tweetMetadata: Tweet = {
			date: '',
			source: '',
			text: '',
			tweetLink: '',
			urls: '',
			userName: '',
			userTag: '',
			lang: '',
		}
		tweetMetadata.userTag = document.querySelector('div[data-testid=tweet] > div:nth-child(2) a div:nth-child(2) span')!.innerHTML.replace('@', '')
		tweetMetadata.userName = document.querySelector('div[data-testid=tweet] > div:nth-child(2) a span span')!.innerHTML
		tweetMetadata.lang = document.querySelector('article div[lang]')!.getAttribute('lang')!

		let texts: string[] = []
		for (const i of document.querySelector('article div[lang]')!.querySelectorAll('span')!) {
			texts.push(i.innerHTML)
		}
		tweetMetadata.text = texts.join('【这里可能有一个链接，请自行检查】')
		tweetMetadata.date = document.querySelector('article div:nth-child(3) div:nth-child(3) div span')!.innerHTML
		tweetMetadata.source = document.querySelector('article div:nth-child(3) div:nth-child(3) a:nth-child(3) span')!.innerHTML
		tweetMetadata.tweetLink = location.href

		return tweetMetadata
	}

	function getTweetBbcode(
    tweet: Tweet,
		mode: 'dark' | 'light') {
    const attributeColor = '#5B7083'
    const backgroundColor = mode === 'dark' ? '#000000' : '#FFFFFF'
    const foregroundColor = mode === 'dark' ? '#D9D9D9' : '#0F1419'
    const dateString = `${tweet.date} · ${tweet.source} · SPX`
    let content = tweet.text
    return `[align=center][table=560,${backgroundColor}]
[tr][td][font=-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif][indent]
[float=left][img=44,44]${ProfilePictures.get(tweet.userTag) ?? '【TODO：头像】'}[/img][/float][size=15px][b][color=${foregroundColor}]${tweet.userName}[/color][/b]
[color=${attributeColor}]@${tweet.userTag}[/color][/size]

[color=${foregroundColor}][size=23px]${content}[/size]
[size=15px]由 【请填写你的用户名】 翻译自${tweet.lang.startsWith('en') ? '英语' : ` ${tweet.lang}`}[/size]
[size=23px]【插入：译文】[/size][/color][/indent][align=center][img=451,254]【TODO：配图】[/img][/align][indent][size=15px][url=${tweet.tweetLink}][color=${attributeColor}]${dateString}[/color][/url][/size][/indent][/font]
[/td][/tr]
[/table][/align]`
	}

	function twitter() {
		console.info('[SPX] Activated')

		const buttonLight = document.createElement('button')
		buttonLight.innerText = 'Copy BBCode (Light)'
		buttonLight.style.width = '100%'
		buttonLight.onclick = async () => {
			buttonLight.innerText = 'Processing...'
			const bbcode = getTweetBbcode(getTweetMetadata(), 'light')
			GM_setClipboard(bbcode, { type: 'text', mimetype: 'text/plain' })
			buttonLight.innerText = 'Copied BBCode!'
			setTimeout(() => buttonLight.innerText = 'Copy BBCode', 5_000)
		}

		const buttonDark = document.createElement('button')
		buttonDark.innerText = 'Copy BBCode (Dark)'
		buttonDark.style.width = '100%'
		buttonDark.onclick = async () => {
			buttonDark.innerText = 'Processing...'
			const bbcode = getTweetBbcode(getTweetMetadata(), 'dark')
			GM_setClipboard(bbcode, { type: 'text', mimetype: 'text/plain' })
			buttonDark.innerText = 'Copied BBCode!'
			setTimeout(() => buttonDark.innerText = 'Copy BBCode', 5_000)
		}

		const checkLoaded = setInterval(() => {
			if (document.querySelector('article div[lang]')! !== null) {
				document.querySelector('article div > div > div > div')!.append(buttonLight)
				document.querySelector('article div > div > div > div')!.append(buttonDark)
				clearInterval(checkLoaded)
			}
		}, 300)
	}

	console.log('[SPX] Current site: ' + location.host)
	switch (location.host) {
		case 'www.minecraft.net':
			minecraftNet()
		break
		case 'twitter.com':
		case 'moble.twitter.com':
			twitter()
		break
		case 'feedback.minecraft.net':
			feedback()
		break
		case 'help.minecraft.net':
			help()
	}
})()
