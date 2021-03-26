import * as fs from 'fs-extra'
import * as path from 'path'
import { ColorCache } from './color-cache'

export interface BugCache {
	[id: string]: {
		summary: string,
		translator?: string,
		date: string,
	}
}

export namespace BugCache {
	export const bugsPath = path.join(__dirname, './bugs.json')
	export let bugs: BugCache = {}

	export function load() {
		if (fs.existsSync(bugsPath)) {
			bugs = fs.readJsonSync(bugsPath)
		}
	}

	function sort() {
		const ans: BugCache = {}
		for (const key of Object.keys(bugs).sort((a, b) => parseInt(a.slice(3)) - parseInt(b.slice(3)))) {
			ans[key] = bugs[key]
		}
		bugs = ans
	}

	export function save() {
		sort()
		fs.writeFileSync(bugsPath, JSON.stringify(bugs, undefined, 2), { encoding: 'utf8' })
	}

	export function remove(id: string) {
		delete bugs[id]
	}

	export function has(id: string) {
		return id in bugs && bugs[id].summary
	}

	export function set(id: string, summary: string, translator?: string, date = new Date().toUTCString()) {
		bugs[id] = { summary, translator, date }
	}

	export function getSummary(id: string): string | undefined {
		return bugs[id]?.summary
	}

	export function getTranslator(id: string): string | undefined {
		return bugs[id]?.translator
	}

	export function getColor(id: string): string {
		return getColorFromTranslator(bugs[id]?.translator)
	}

	// https://stackoverflow.com/a/3426956
	export function getColorFromTranslator(translator: string | undefined): string {
		if (!translator) {
			return '#388d40'
		} else if (ColorCache.has(translator)) {
			return ColorCache.getColor(translator)
		} else {
			const color = (hashCode(translator) & 0x00FFFFFF).toString(16)
			const hexColor = `#${'00000'.slice(0, 6 - color.length)}${color}`
			ColorCache.set(translator, hexColor)
			return hexColor
		}
	}

	// https://stackoverflow.com/a/3426956
	function hashCode(str: string): number {
		let hash = 0
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash)
		}
		return hash
	}
}
