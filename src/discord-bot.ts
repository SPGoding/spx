import { GuildMember, Message, MessageEmbed, MessageReaction, PartialGuildMember, PartialMessage, PartialUser, User, UserResolvable } from 'discord.js'
import { BugCache } from './bug-cache'
import { ColorCache } from './color-cache'
import { Version2Client as JiraClient } from 'jira.js'
import { IssueBean } from 'jira.js/out/version2/models';

const jira = new JiraClient({
	host: 'https://bugs.mojang.com',
});

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
			const translator = tagToName(member.user.tag)
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
	const queryCommand = '!spx query'
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
		await message.react('🌈')
		if (translator === 'ff98sha' || translator === 'WuGuangYao') {
			ColorCache.set('ff98sha', color)
			ColorCache.set('WuGuangYao', color)
			await message.channel.send('🏳‍🌈 ff98sha 与 WuGuangYao 已锁。')
		}
		ColorCache.save()
	} else if (content.trim().toLowerCase() === queryCommand) {
		const result = await jira.issueSearch.searchForIssuesUsingJql({
			jql: 'project = MC AND fixVersion in unreleasedVersions()'
		})
		const issues = result.issues ?? []
		const unknownIssues: IssueBean[] = []
		for (const issue of issues) {
			if (issue.key && !BugCache.has(issue.key)) {
				unknownIssues.push(issue)
			}
		}
		await message.channel.send(new MessageEmbed().addFields(unknownIssues.map(i => ({
			name: `[${i.key}](https://bugs.mojang.com/browse/${i.key})`,
			value: (i.fields as any)?.['summary'] ?? 'Unknown',
			inline: true
		}))))
	}
}

export async function onReactionAdd(_config: DiscordConfig, reaction: MessageReaction, user: User | PartialUser) {
	try {
		user = await ensureUser(user)
		if (overrideConfirmations.has(reaction.message.id)) {
			console.info(`User ${user.tag} added '${reaction.emoji.name}' reaction to a prompt`);
			const { message, prompt, translator } = overrideConfirmations.get(reaction.message.id)!
			if (user.id !== message.author.id) {
				return await prompt.edit(`${prompt.content}\n不准 ${tagToName(user.tag)} 为 ${tagToName(message.author.tag)} 做决定.spg`)
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

async function ensureUser(user: User | PartialUser): Promise<User> {
	if (user.partial) {
		return user.fetch()
	}
	return user
}

function tagToName(tag: string): string {
	return tag.split('#').slice(0, -1).join('#')
}
