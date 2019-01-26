import * as assert from 'power-assert'
import * as fs from 'fs'
import * as path from 'path'
import { describe, it } from 'mocha'
import { getLatest, StringStringMap } from '../index'

const testData: StringStringMap = {
    article: fs.readFileSync(path.join(__dirname, './data/article.json'), { encoding: 'utf8' }),
    question: fs.readFileSync(path.join(__dirname, './data/question.html'), { encoding: 'utf8' }),
    version: fs.readFileSync(path.join(__dirname, './data/version.json'), { encoding: 'utf8' })
}

describe('getLatest tests', () => {
    it('article() should return the latest article', () => {
        const result = getLatest.article(testData.article)

        assert.strictEqual(result, 'https://minecraft.net/en-us/article/taking-inventory-dead-bush')
    })
    it('question() should return the latest question', () => {
        const result = getLatest.question(testData.question)

        assert.strictEqual(result, 'http://www.mcbbs.net/thread-839982-1-1.html')
    })
    it('version() should return the latest version', () => {
        const result = getLatest.version(testData.version)

        assert.strictEqual(result, '19w04b')
    })
})
