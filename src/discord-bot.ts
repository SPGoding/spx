import { GuildMember, Message } from 'discord.js'
import { BugCache } from './bug-cache'
import { ColorCache } from './color-cache'

export interface DiscordConfig {
	token: string,
	channel: string,
	role: string
}

export async function onMessage(config: DiscordConfig, message: Message) {
	try {
		message = await ensureMessage(message)

		if (message.channel.id !== config.channel || !message.member) {
			return
		}

		const member = await ensureMember(message.member)
		if (member.roles.cache.has(config.role)) {
			const content = message.content.trim()
			const bugRegex = /^\[?(MC-\d+)]?\s*(.*)$/i
			const bugMatchArr = content.match(bugRegex)
			const colorCommandPrefix = '!spx color '
			const username = member.user.tag.split('#').slice(0, -1).join('#')
			if (bugMatchArr) {
				const id = bugMatchArr[1]
				const desc = bugMatchArr[2]
				BugCache.set(id, desc, username)
				BugCache.save()
				await message.react('✅')
			} else if (content.startsWith(colorCommandPrefix)) {
				let color = content.slice(colorCommandPrefix.length)
				if (!color.startsWith('#')) {
					color = `#${color}`
				}
				ColorCache.set(username, color)
				ColorCache.save()
				await message.react('✅')
			}
		}

	} catch (e) {
		console.error(e)
	}
}

async function ensureMessage(message: Message) {
	if (message.partial) {
		return message.fetch()
	}
	return message
}

async function ensureMember(member: GuildMember) {
	if (member.partial) {
		return member.fetch()
	}
	return member
}
