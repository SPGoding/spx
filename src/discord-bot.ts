import { GuildMember, Message } from 'discord.js'
import { BugCache } from './bug-cache'
import { ColorCache } from './color-cache'
import { executeBugOrColorCommand } from './util'

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
			const translator = member.user.tag.split('#').slice(0, -1).join('#')
			const commandResult = executeBugOrColorCommand(content, translator)
			if (commandResult) {
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
