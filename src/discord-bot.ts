import { GuildMember, Message } from 'discord.js'
import { BugCache } from './bug-cache'

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
			const regex = /^\[?(MC-\d+)]?\s*(.*)$/i
			const matchArr = content.match(regex)
			if (matchArr) {
				const id = matchArr[1]
				const desc = matchArr[2]
				BugCache.set(id, desc, member.user.username)
				BugCache.save()
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
