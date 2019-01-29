import * as assert from 'power-assert'
import * as fs from 'fs'
import * as path from 'path'
import { describe, it } from 'mocha'
import { getLatest } from '../index'
import { StringStringMap } from '../util'

const testData: StringStringMap = {
    article: fs.readFileSync(path.join(__dirname, './data/article.json'), { encoding: 'utf8' }),
    question: fs.readFileSync(path.join(__dirname, './data/question.html'), { encoding: 'utf8' }),
    version: fs.readFileSync(path.join(__dirname, './data/version.json'), { encoding: 'utf8' })
}

describe('getLatest tests', () => {
    it('article() should return the latest article', () => {
        const result = getLatest.article(testData.article)

        assert.deepStrictEqual(result,
            {
                identity: 'https://minecraft.net/en-us/article/taking-inventory-dead-bush',
                readable: 'Taking Inventory: Dead Bush'
            }
        )
    })
    it('question() should return the latest question', () => {
        const result = getLatest.question(testData.question)

        assert.deepStrictEqual(result,
            {
                identity: 'http://www.mcbbs.net/thread-839982-1-1.html',
                readable: '单人-检测到某个或者几个格子内有指定物品则触发指令'
            }
        )
    })
    it('version() should return the latest version', () => {
        const result = getLatest.version(testData.version)

        assert.deepStrictEqual(result, { identity: '19w04b', readable: '19w04b' })
    })
})
