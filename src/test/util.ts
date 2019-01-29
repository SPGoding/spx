import * as assert from 'power-assert'
import * as fs from 'fs'
import * as path from 'path'
import { describe, it } from 'mocha'
import { getVersionType, getCounts } from '../util'

describe('getVersionType() tests', () => {
    it('Should recognize snapshot', () => {
        const version = '19w04b'

        const result = getVersionType(version)

        assert.strictEqual(result, 'snapshot')
    })
    it('Should recognize pre release', () => {
        const version = '1.13-pre3'

        const result = getVersionType(version)

        assert.strictEqual(result, 'pre_release')
    })
    it('Should recognize release', () => {
        const version = '1.14'

        const result = getVersionType(version)

        assert.strictEqual(result, 'release')
    })
})
describe('getCounts() tests', ()=>{
    it ('Should return counts for snapshot', ()=>{
        const versions = ['19w04b', '19w04a', '1.13.2', '1.13.2-pre2']

        const result = getCounts(versions)

        assert.deepStrictEqual(result, [2, 0])
    })
    it ('Should return counts for pre release', ()=>{
        const versions = ['1.13.2-pre2', '1.13.2-pre1', '18w40b', '18w40a', '1.13.1']

        const result = getCounts(versions)

        assert.deepStrictEqual(result, [4, 2])
    })
})
