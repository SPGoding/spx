import * as fs from 'fs-extra'
import * as path from 'path'

export interface ReviewCache {
	[id: string]: {
		summary: string,
		translator: string,
		approvers: string[],
	}
}

export namespace ReviewCache {
	export const ApprovalCountRequired = 2

	export const reviewPath = path.join(__dirname, '../review.json')
	export let review: ReviewCache = {}

	export function load() {
		if (fs.existsSync(reviewPath)) {
			review = fs.readJsonSync(reviewPath)
		}
	}

	export function save() {
		fs.writeFileSync(reviewPath, JSON.stringify(review, undefined, 2), { encoding: 'utf8' })
	}

	export function remove(id: string) {
		delete review[id]
	}

	export function has(id: string) {
		return id in review
	}

	export function set(id: string, value: ReviewCache[string]) {
		review[id] = value
	}

	/**
	 * @throws {string} The reason for which it fails to approve.
	 */
	export function approve(key: string, approver: string): void {
		if (review[key]) {
			if (review[key].approvers.includes(approver)) {
				throw `${approver} has already approved the translation for ${key}`
			}
			if (review[key].translator === approver) {
				throw `The translater ${approver} themself cannot approve their own translation for ${key}`
			}
			review[key].approvers.push(approver)
		} else {
			throw `${key} doesn't accept reviews`
		}
	}

	export function currentApprovalCount(id: string): number {
		return review[id]?.approvers.length
	}

	export function isApproved(id: string): boolean {
		return currentApprovalCount(id) >= ApprovalCountRequired
	}

	export function isEmpty(): boolean {
		return Object.keys(review).length === 0
	}
}
