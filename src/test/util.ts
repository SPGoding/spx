import * as assert from 'power-assert'
import * as fs from 'fs'
import * as path from 'path'
import { describe, it } from 'mocha'
import { getVersionType, getCounts, getLatest, StringStringMap, ManifestVersion } from '../util'

const testData: StringStringMap = {
    article: fs.readFileSync(path.join(__dirname, './data/article.json'), { encoding: 'utf8' }),
    question: fs.readFileSync(path.join(__dirname, './data/question.html'), { encoding: 'utf8' }),
    version: fs.readFileSync(path.join(__dirname, './data/version.json'), { encoding: 'utf8' })
}

describe('getLatest() tests', () => {
    it('article() should return the latest article', () => {
        const result = getLatest.article(testData.article, 'last article', [])

        assert.deepStrictEqual(result,
            {
                identity: 'https://www.minecraft.net/en-us/article/minecraft-coming-xbox-game-pass',
                readable: 'Minecraft is coming to Xbox Game Pass'
            }
        )
    })
    it('question() should return the latest question', () => {
        const result = getLatest.question(testData.question, 'last article', [])

        assert.deepStrictEqual(result,
            {
                identity: 'http://www.mcbbs.net/thread-839982-1-1.html',
                readable: '单人-检测到某个或者几个格子内有指定物品则触发指令'
            }
        )
    })
    it('version() should return the latest version', () => {
        const result = getLatest.version(testData.version, 'last article', [])

        assert.deepStrictEqual(result, { identity: '19w04b', readable: '19w04b' })
    })
})

describe('getVersionType() tests', () => {
    it('Should recognize snapshots', () => {
        const versions: ManifestVersion[] = [{ id: '19w04b', type: 'snapshot' }]
        const version = '19w04b'

        const result = getVersionType(versions, version)

        assert.strictEqual(result, 'snapshot')
    })
    it('Should recognize pre releases', () => {
        const versions: ManifestVersion[] = [{ id: '1.13-pre3', type: 'snapshot' }]
        const version = '1.13-pre3'

        const result = getVersionType(versions, version)

        assert.strictEqual(result, 'pre_release')
    })
    it('Should recognize releases', () => {
        const versions: ManifestVersion[] = [{ id: '1.14', type: 'release' }]
        const version = '1.14'

        const result = getVersionType(versions, version)

        assert.strictEqual(result, 'release')
    })
})

describe('getCounts() tests', () => {
    it('Should return counts for snapshots', () => {
        const versions: ManifestVersion[] = [
            { id: '19w04b', type: 'snapshot' },
            { id: '19w04a', type: 'snapshot' },
            { id: '1.13.2', type: 'release' },
            { id: '1.13.2-pre2', type: 'snapshot' }
        ]

        const result = getCounts(versions, '19w04b')

        assert.deepStrictEqual(result, [2, 0])
    })
    it('Should return counts for pre releases', () => {
        const versions: ManifestVersion[] = [
            { id: '1.13.2-pre2', type: 'snapshot' },
            { id: '1.13.2-pre1', type: 'snapshot' },
            { id: '18w40b', type: 'snapshot' },
            { id: '18w40a', type: 'snapshot' },
            { id: '1.13.1', type: 'release' }
        ]

        const result = getCounts(versions, '1.13.2-pre2')

        assert.deepStrictEqual(result, [4, 2])
    })
})
