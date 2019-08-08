import * as assert from 'power-assert'
import * as fs from 'fs'
import * as path from 'path'
import { describe, it } from 'mocha'
import { getHeroImage, resolveUrl, converters, convertMCAriticleToBBCode, replaceHalfToFull } from '../converter'
import { JSDOM } from 'jsdom'

const testSrc = fs.readFileSync(path.join(__dirname, './data/article.html'), { encoding: 'utf8' })
const testHtml = new JSDOM(testSrc).window.document

describe('converter Tests', () => {
    describe('resolveUrl() Tests', () => {
        it('Should resolve relative url', () => {
            const result = resolveUrl('/foo')

            assert.strictEqual(result, 'https://www.minecraft.net/foo')
        })
        it("Shouldn't resolve absolute url", () => {
            const result = resolveUrl('https://spgoding.com')

            assert.strictEqual(result, 'https://spgoding.com')
        })
    })
    describe('converters Tests', () => {
        it('Should convert <a>', () => {
            const anchor = new JSDOM('<a href="/test" id="test">foo</a>').window
                .document.getElementById('test') as HTMLAnchorElement

            const result = converters.a(anchor)

            assert.strictEqual(result, '[url=https://www.minecraft.net/test]foo[/url]')
        })
        it('Should convert <br>', () => {
            const result = converters.br()

            assert.strictEqual(result, '\n')
        })
        it('Should convert <code>', () => {
            const ele = new JSDOM('<code id="test">foo</code>').window
                .document.getElementById('test') as HTMLElement

            const result = converters.code(ele)

            assert.strictEqual(result,
                "[backcolor=White][font=Monaco,Consolas,'Lucida Console','Courier New',serif]foo[/font][/backcolor]"
            )
        })
        it('Should convert "text-center" <div>', () => {
            const ele = new JSDOM('<div class="text-center" id="test">foo</div>').window
                .document.getElementById('test') as HTMLElement

            const result = converters.div(ele)

            assert.strictEqual(result, '[align=center]foo[/align]')
        })
        it('Should convert <dl>', () => {
            const ele = new JSDOM(`<dl id="test">
            <dt>作者</dt>
            <dd>SPGoding</dd>
            <dt>发布日期</dt>
            <dd class="pubDate" date-value="2019-03-08T10:00:00.876+0000"></dd>
            </dl>`).window
                .document.getElementById('test') as HTMLElement

            const result = converters.dl(ele)

            assert.strictEqual(result,
                '\n【作者：SPGoding，发布日期：2019-03-08，译者：SPGoding】'
            )
        })
        it('Should convert <em>', () => {
            const ele = new JSDOM('<em id="test">foo</em>').window
                .document.getElementById('test') as HTMLElement

            const result = converters.em(ele)

            assert.strictEqual(result, '[i]foo[/i]')
        })
        it('Should convert <h1>', () => {
            const ele = new JSDOM('<h1 id="test">foo</h1>').window
                .document.getElementById('test') as HTMLElement

            const result = converters.h1(ele)

            assert.strictEqual(result, '\n[size=6][b][color=Gray]foo[/color][/b][/size]\n[size=6][b]foo[/b][/size]\n')
        })
        it('Should convert <h2>', () => {
            const ele = new JSDOM('<h2 id="test">foo</h1>').window
                .document.getElementById('test') as HTMLElement

            const result = converters.h2(ele)

            assert.strictEqual(result, '\n[size=5][b][color=Gray]foo[/color][/b][/size]\n[size=5][b]foo[/b][/size]\n')
        })
        it('Should convert <h3>', () => {
            const ele = new JSDOM('<h3 id="test">foo</h1>').window
                .document.getElementById('test') as HTMLElement

            const result = converters.h3(ele)

            assert.strictEqual(result, '\n[size=4][b][color=Gray]foo[/color][/b][/size]\n[size=4][b]foo[/b][/size]\n')
        })
        it('Should convert <img>', () => {
            const img = new JSDOM('<img src="/test.png" id="test"></img>').window
                .document.getElementById('test') as HTMLImageElement

            const result = converters.img(img)

            assert.strictEqual(result, '[img]https://www.minecraft.net/test.png[/img]')
        })
        it('Should convert <ol>', () => {
            const list = new JSDOM('<ol id="test"><li>foo<li>bar</ol>').window
                .document.getElementById('test') as HTMLElement

            const result = converters.ol(list)

            assert.strictEqual(result, `
[list=1]
[*][color=Gray]foo[/color]
[*]foo
[*][color=Gray]bar[/color]
[*]bar[/list]
`)
        })
        it('Should convert <p>', () => {
            const ele = new JSDOM('<p id="test">foo</p>').window
                .document.getElementById('test') as HTMLElement

            const result = converters.p(ele)

            assert.strictEqual(result, '\n[spoiler]foo[/spoiler]foo\n')
        })
        it('Should convert <strong>', () => {
            const ele = new JSDOM('<strong id="test">foo</strong>').window
                .document.getElementById('test') as HTMLElement

            const result = converters.strong(ele)

            assert.strictEqual(result, '[b]foo[/b]')
        })
        it('Should convert <table>', () => {
            const ele = new JSDOM('<table id="test"><tr><td>A1</td><td>A2</td></tr><tr><td>B1</td><td>B2</td></tr></table>').window
                .document.getElementById('test') as HTMLElement

            const result = converters.tbody(ele)

            assert.strictEqual(result, `
[table]
[tr][td]A1[/td][td]A2[/td][/tr]
[tr][td]B1[/td][td]B2[/td][/tr][/table]
`)
        })
        it('Should convert <ul>', () => {
            const ele = new JSDOM('<ul id="test"><li>foo<li>bar</ul>').window
                .document.getElementById('test') as HTMLElement

            const result = converters.ul(ele)

            assert.strictEqual(result, `
[list]
[*][color=Gray]foo[/color]
[*]foo
[*][color=Gray]bar[/color]
[*]bar[/list]
`)
        })
    })
    describe('getHeroImage() Tests', () => {
        it('Should return hero image', () => {
            const result = getHeroImage(testHtml)

            assert.strictEqual(
                result,
                '[postbg]bg3.png[/postbg][align=center][img=1200,513]https://www.minecraft.net/content/dam/minecraft/taking-inventory/snowball/header.jpg[/img][/align]'
            )
        })
    })
    describe.only('replaceHalfToFull() Tests', () => {
        it('Should replace all', () => {
            const result = replaceHalfToFull('interesting, haha, haha!')

            assert.strictEqual(
                result,
                'interesting，haha，haha！'
            )
        })
        it('Should replace quotes', () => {
            const result = replaceHalfToFull(`"'haha'"`)

            assert.strictEqual(
                result,
                '「『haha』」'
            )
        })
    })
    describe.skip('convertMCAriticleToBBCode() Tests', () => {
        it('Should return whole BBCode', () => {
            const result = convertMCAriticleToBBCode(testHtml, '')

            fs.writeFileSync(path.join(__dirname, './data/output.txt'), result)

            assert(true)
        })
    })
})
