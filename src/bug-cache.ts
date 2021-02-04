import * as fs from 'fs-extra'
import * as path from 'path'

export interface BugCache {
	[id: string]: {
		summary: string,
		translator?: string,
		date: number,
	}
}

export namespace BugCache {
	export const bugsPath = path.join(__dirname, './bugs.json')
	export const bugs: BugCache = {}

	export function load() {
		if (fs.existsSync(bugsPath)) {
			const result = fs.readJsonSync(bugsPath)
			for (const key in result) {
				bugs[key] = result[key]
			}
		}
	}

	export function save() {
		fs.writeFileSync(bugsPath, JSON.stringify(bugs, undefined, 2), { encoding: 'utf8' })
	}

	export function remove(id: string) {
		delete bugs[id]
	}

	export function set(id: string, summary: string, translator?: string, date = new Date().getTime()) {
		bugs[id] = { summary, translator, date }
	}

	export function getSummary(id: string) {
		return bugs[id]?.summary
	}

	// https://stackoverflow.com/a/3426956
	export function getColor(id: string): string {
		const translator = bugs[id].translator
		if (!translator) {
			return '#388d40'
		} else {
			const c = (hashCode(translator) & 0x00FFFFFF).toString(16)
			return `${'00000'.slice(0, 6 - c.length)}${c}`
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
