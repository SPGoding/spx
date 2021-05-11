import * as fs from 'fs-extra'
import * as path from 'path'

export interface ColorCache {
	[id: string]: {
		color: string,
	}
}

export namespace ColorCache {
	export const colorPath = path.join(__dirname, '../colors.json')
	export let colors: ColorCache = {}

	export function load() {
		if (fs.existsSync(colorPath)) {
			colors = fs.readJsonSync(colorPath)
		}
	}

	function sort() {
		const ans: ColorCache = {}
		for (const key of Object.keys(colors).sort()) {
			ans[key] = colors[key]
		}
		colors = ans
	}

	export function save() {
		sort()
		fs.writeFileSync(colorPath, JSON.stringify(colors, undefined, 2), { encoding: 'utf8' })
	}

	export function remove(id: string) {
		delete colors[id]
	}

	export function has(id: string) {
		return id in colors
	}

	export function set(id: string, color: string) {
		colors[id] = { color }
	}

	export function getColor(id: string): string {
		return colors[id].color
	}

	export function getTranslators(): string[] {
		return Object.keys(colors)
	}
}
