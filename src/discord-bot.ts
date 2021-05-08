import { ApplicationCommandData, Client as DiscordClient, GuildMember, Interaction, Message, MessageEmbed, MessageReaction, PartialGuildMember, PartialMessage, PartialUser, User, UserResolvable } from 'discord.js'
import { BugCache } from './bug-cache'
import { ColorCache } from './color-cache'
import { Version2Client as JiraClient } from 'jira.js'
import { IssueBean } from 'jira.js/out/version2/models';

const jira = new JiraClient({
	host: 'https://bugs.mojang.com',
});

export interface DiscordConfig {
	token: string,
	guild: string,
	channel: string,
	role: string,
}

export async function onReady(config: DiscordConfig, client: DiscordClient) {
	const data: ApplicationCommandData[] = [
		{
			name: 'spx',
			description: 'SPX Starto!',
			options: [
				{
					name: 'backup',
					type: 'SUB_COMMAND',
					description: 'Back up the bug cache and color cache.',
				},
				{
					name: 'color',
					type: 'SUB_COMMAND_GROUP',
					description: 'Operate 色图.',
					options: [
						{
							name: 'clear',
							type: 'SUB_COMMAND',
							description: 'Clear the color of someone.',
							options: [{
								name: 'user',
								type: 'USER',
								description: 'The user.',
								required: true,
							}],
						},
						{
							name: 'get',
							type: 'SUB_COMMAND',
							description: 'Get the color of someone.',
							options: [{
								name: 'user',
								type: 'USER',
								description: 'The user.',
								required: true,
							}],
						},
						{
							name: 'set',
							type: 'SUB_COMMAND',
							description: 'Set the color of yourself.',
							options: [{
								name: 'value',
								type: 'STRING',
								description: 'A hexadecimal representation of the color.',
								required: true,
							}],
						},
					],
				},
				{
					name: 'ping',
					type: 'SUB_COMMAND',
					description: 'Ping-pong!',
				},
				{
					name: 'query',
					type: 'SUB_COMMAND',
					description: 'Query all fixed, untranslated bugs.',
					options: [{
						name: 'jql',
						type: 'STRING',
						description: 'An optional JQL query.',
					}],
				},
			],
		},
	]

	try {
		await client.guilds.cache.get(config.guild)?.commands.set(data)
	} catch (e) {
		console.error('[Discord#onReady] ', e)
	}
}

export async function onInteraction(interaction: Interaction) {
	try {
		if (!interaction.isCommand()) {
			return
		}
		if (interaction.commandName === 'spx') {
			const executor = tagToName(interaction.user.tag)
			switch (interaction.options[0].name) {
				case 'backup':
					await interaction.reply('💾 Backup', {
						files: [
							BugCache.bugsPath,
							ColorCache.colorPath,
						]
					})
					break
				case 'color':
					switch (interaction.options[0].options![0].name) {
						case 'clear': {
							const target = tagToName(interaction.options[0].options![0].options![0].user!.tag)
							ColorCache.remove(target)
							ColorCache.save()
							await interaction.reply(new MessageEmbed()
								.setDescription(`已移除 ${target} 的颜色`)
								.setColor('#000000')
								.setThumbnail(`https://colorhexa.com/000000.png`)
							)
							break
						}
						case 'get': {
							const target = tagToName(interaction.options[0].options![0].options![0].user!.tag)
							const hex = BugCache.getColorFromTranslator(target)
							await interaction.reply(new MessageEmbed()
								.setTitle(`${target} 的色图！`)
								.setDescription(`色：\`${hex}\``)
								.setColor(hex)
								.setThumbnail(`https://colorhexa.com/${hex.slice(1)}.png`)
							)
							break
						}
						case 'set': {
							let color = (interaction.options[0].options![0].options![0].value as string).toLowerCase()
							if (!color.startsWith('#')) {
								color = `#${color}`
							}
							ColorCache.set(executor, color)
							const locked = executor === 'ff98sha' || executor === 'WuGuangYao'
							if (locked) {
								ColorCache.set('ff98sha', color)
								ColorCache.set('WuGuangYao', color)
							}
							ColorCache.save()
							await interaction.reply(new MessageEmbed()
								.setDescription(`已设置 ${executor} 的颜色为 ${color}${locked ? '  \n🏳‍🌈 ff98sha 与 WuGuangYao 已锁。' : ''}`)
								.setColor(color)
								.setThumbnail(`https://colorhexa.com/${color.slice(1)}.png`))
							break
						}
					}
					break
				case 'ping':
					interaction.reply('🏓 Pong!')
					break
				case 'query': {
					await interaction.defer()
					const jql = (interaction.options[0].options?.[0]?.value as string | undefined) || 'project = MC AND fixVersion in unreleasedVersions()'
					const issues = await searchIssues(jql)
					const unknownIssues: IssueBean[] = []
					const translators = new Map<string, number>()
					for (const issue of issues) {
						if (issue.key) {
							if (BugCache.has(issue.key)) {
								const translator = BugCache.getTranslator(issue.key)
								if (translator) {
									translators.set(translator, (translators.get(translator) ?? 0) + 1)
								}
							} else {
								unknownIssues.push(issue)
							}
						}
					}
					if (unknownIssues.length) {
						await interaction.editReply(new MessageEmbed()
							.setTitle(`共 ${unknownIssues.length} / ${issues.length} 个未翻译漏洞`)
							.setDescription(unknownIssues.slice(0, 10).map(
								i => `[${i.key}](https://bugs.mojang.com/browse/${i.key}) ${(i.fields as any)?.['summary'] ?? 'N/A'}`
							).join('\n'))
						)
					} else {
						await interaction.editReply(`🎉 ${issues.length} 个漏洞均已翻译。`)
					}
					const sortedTranslators = Array.from(translators.entries()).sort((a, b) => b[1] - a[1])
					await interaction.webhook.send(new MessageEmbed()
						.setTitle('统计')
						.setColor(BugCache.getColorFromTranslator(sortedTranslators[0]?.[0]))
						.addField('打工人', sortedTranslators.map(([translator, _count]) => `**${translator}**`).join('\n'), true)
						.addField('#', sortedTranslators.map(([_translator, count]) => count).join('\n'), true)
						.addField('%', sortedTranslators.map(([_translator, count]) => `${(count / issues.length * 100).toFixed(2)}%`).join('\n'), true)
					)
					break
				}
			}
		}
	} catch (e) {
		console.error('[Discord#onInteraction] ', e)
	}
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
			await executeCommand(message, translator)
		}
	} catch (e) {
		console.error('[Discord#onMessage] ', e)
	}
}

const overrideConfirmations = new Map<string, { message: Message, prompt: Message, translator: string }>()

async function executeCommand(message: Message, translator: string, out = { recursionCount: 12 }): Promise<void> {
	const content = message.content.trim()
	const bugRegex = /^(?:!spx bug )?([!！]|)?\s*\[?(MC-\d+)]?\s*(.*)$/i
	const bugMatchArr = content.match(bugRegex)
	const executeAsCommand = '!spx execute as '
	if (bugMatchArr) {
		const isForce = !!bugMatchArr[1]
		const id = bugMatchArr[2]
		const desc = markdownToBbcode(bugMatchArr[3])
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
			if (!ColorCache.has(translator)) {
				ColorCache.set(translator, BugCache.getColorFromTranslator(translator))
				await message.react('🌈')
			}
		}
	} else if (content.toLowerCase().startsWith(executeAsCommand)) {
		const victim = content.slice(executeAsCommand.length, content.indexOf(' run !spx'))
		const command = content.slice(content.indexOf(' run !spx') + 5)
		message.content = command
		const allTranslators = ColorCache.getTranslators()
		let actualVictims: string[]
		switch (victim) {
			case '@a':
			case '@e':
				actualVictims = allTranslators
				break
			case '@p':
			case '@s':
				actualVictims = [translator]
				break
			case '@r':
				actualVictims = [allTranslators[Math.floor(allTranslators.length * Math.random())]]
				break
			default:
				actualVictims = [victim]
				break
		}
		for (const vic of actualVictims) {
			out.recursionCount -= 1
			if (out.recursionCount < 0) {
				if (out.recursionCount === -1) {
					await message.channel.send(`📚 StackOverflowException`)
				}
				break
			}
			if (ColorCache.has(vic)) {
				await message.channel.send(`💻 正在以 ${vic} 的身份执行 \`${command}\`。`)
				await executeCommand(message, vic, out)
			} else {
				await message.channel.send(`🎃 找不到名为 ${vic} 的用户。您是否是想找「野兽先辈」？`)
			}
		}
	}
}

function markdownToBbcode(value: string): string {
	return value
		.replace(/`([^`]+)`/g, "[backcolor=White][font=Monaco,Consolas,'Lucida Console','Courier New',serif]$1[/font][/backcolor]")
}

async function searchIssues(jql: string) {
	const ans: IssueBean[] = []
	let totalCount = 0
	while (true) {
		const result = await jira.issueSearch.searchForIssuesUsingJqlPost({
			jql,
			fields: ['key', 'summary'],
			maxResults: 50,
			startAt: totalCount,
		})
		if (!result.issues) {
			console.error(`[searchIssues] No issues when totalCount=${totalCount}`)
		}
		ans.push(...result.issues ?? [])
		totalCount += result.issues?.length ?? 0

		if (totalCount >= (result.total ?? 0)) {
			break
		}
	}
	return ans
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
				await executeCommand(message, translator)
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
