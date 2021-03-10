import { GuildMember, Message, MessageReaction, PartialGuildMember, PartialMessage, PartialUser, User, UserResolvable } from 'discord.js'
import { BugCache } from './bug-cache'
import { ColorCache } from './color-cache'

export interface DiscordConfig {
	token: string,
	channel: string,
	role: string,
}

export async function onMessage(config: DiscordConfig, message: Message | PartialMessage) {
	try {
		message = await ensureMessage(message)

		if (message.channel.id !== config.channel || !message.member) {
			return
		}

		const member = await ensureMember(message.member)
		if (member.roles.cache.has(config.role)) {
			const translator = member.user.tag.split('#').slice(0, -1).join('#')
			await executeBugOrColorCommand(message, translator)
		}

	} catch (e) {
		console.error(e)
	}
}

const overrideConfirmations = new Map<string, { message: Message, prompt: Message, translator: string }>()

async function executeBugOrColorCommand(message: Message, translator: string): Promise<void> {
	const content = message.content.trim()
	const bugRegex = /^[!！]?\s*\[?(MC-\d+)]?\s*(.*)$/i
	const bugMatchArr = content.match(bugRegex)
	const colorCommandPrefix = '!spx color '
	if (bugMatchArr) {
		const isForce = /^[!！]/.test(content)
		const id = bugMatchArr[1]
		const desc = bugMatchArr[2]
		const existingOne = BugCache.getSummary(id)
		if (existingOne && !isForce) {
			const [, prompt] = await Promise.all([
				message.react('❓'),
				message.channel.send(`❓ ${id} 已被翻译为「${existingOne}」。确认覆盖？`)
			])
			await Promise.all([
				prompt.react('⚪'),
				prompt.react('❌')
			])
			overrideConfirmations.set(prompt.id, { message, prompt, translator })
		} else {
			BugCache.set(id, desc, translator)
			BugCache.save()
			await message.react('✅')
		}
	} else if (content.startsWith(colorCommandPrefix)) {
		let color = content.slice(colorCommandPrefix.length)
		if (!color.startsWith('#')) {
			color = `#${color}`
		}
		ColorCache.set(translator, color)
		ColorCache.save()
		await message.react('🌈')
	}
}

export async function onReactionAdd(_config: DiscordConfig, reaction: MessageReaction, user: User | PartialUser) {
	try {
		if (overrideConfirmations.has(reaction.message.id)) {
			console.info(`User ${user.tag} added '${reaction.emoji.name}' reaction to a prompt`);
			const { message, prompt, translator } = overrideConfirmations.get(reaction.message.id)!
			if (user.id !== message.author.id) {
				return await prompt.edit(`${prompt.content}\n不准 ${user.tag} 为 ${message.author.tag} 做决定.spg`)
			}
			if (reaction.emoji.name === '⚪') {
				message.content = `!${message.content}`
				await executeBugOrColorCommand(message, translator)
			} else if (reaction.emoji.name !== '❌') {
				return
			}
			overrideConfirmations.delete(reaction.message.id)
			await prompt.delete()
		}
	} catch (e) {
		console.error(e)
	}
}

async function ensureMessage(message: Message | PartialMessage): Promise<Message> {
	if (message.partial) {
		return message.fetch()
	}
	return message
}

async function ensureMember(member: GuildMember | PartialGuildMember): Promise<GuildMember> {
	if (member.partial) {
		return member.fetch()
	}
	return member
}
