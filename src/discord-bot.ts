import { ApplicationCommandData, Client as DiscordClient, GuildMember, Interaction, Message, MessageEmbed, MessageReaction, PartialGuildMember, PartialMessage, PartialUser, TextChannel, User, UserResolvable } from 'discord.js'
import { BugCache } from './cache/bug'
import { ColorCache } from './cache/color'
import { ReviewCache } from './cache/review'
import { Version2Client as JiraClient } from 'jira.js'
import type { IssueBean } from 'jira.js/out/version2/models';
import type Twitter from 'twitter-lite'
import { getTweet } from './util'

const jira = new JiraClient({
	host: 'https://bugs.mojang.com',
});

export interface DiscordConfig {
	token: string,
	guild: string,
	channel: string,
	role: string,
	roles?: {
		name: string,
		role: string,
	}[],
}

const MaxSearchCount = 150
const QueryCooldown = 15_000

let lastQueryTime: Date | undefined

export async function onReady(config: DiscordConfig, client: DiscordClient) {
	const data: ApplicationCommandData[] = [
		{
			name: 'approve',
			description: 'Approve the existing translation of a bug.',
			options: [{
				name: 'id',
				type: 'STRING',
				description: 'The ticket key.',
				required: true,
			}],
		},
		{
			name: 'as',
			description: 'Translate as someone.',
			options: [
				{
					name: 'user',
					type: 'USER',
					description: 'The user.',
					required: true,
				},
				{
					name: 'content',
					type: 'STRING',
					description: 'The ticket ID and translated summary with the same format as your translation message.',
					required: true,
				}
			],
		},
		{
			name: 'backup',
			description: 'Back up the bug cache and color cache.',
		},
		{
			name: 'color',
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
					description: 'Set the color of yourself or someone else.',
					options: [
						{
							name: 'value',
							type: 'STRING',
							description: 'A hexadecimal representation of the color.',
							required: true,
						},
						{
							name: 'user',
							type: 'USER',
							description: 'The user. Defaults to yourself.',
							required: false,
						}
					],
				},
			],
		},
		{
			name: 'ping',
			description: 'Ping-pong!',
		},
		{
			name: 'query',
			description: 'Query all fixed, untranslated bugs.',
			options: [{
				name: 'jql',
				type: 'STRING',
				description: 'An optional JQL query.',
			}],
		},
		{
			name: 'tweet',
			description: 'Get the BBCode of a Tweet.',
			options: [
				{
					name: 'dark',
					type: 'SUB_COMMAND',
					description: 'Get the BBCode of a Tweet in Dark Mode.',
					options: [{
						name: 'url',
						type: 'STRING',
						description: 'The URL to a Tweet.',
						required: true,
					}],
				},
				{
					name: 'light',
					type: 'SUB_COMMAND',
					description: 'Get the BBCode of a Tweet in Light Mode.',
					options: [{
						name: 'url',
						type: 'STRING',
						description: 'The URL to a Tweet.',
						required: true,
					}],
				},
			],
		},
	]

	if (config.roles?.length) {
		data.push({
			name: 'join',
			description: 'Join a role.',
			options: config.roles.map(r => ({
				name: r.name,
				type: 'SUB_COMMAND',
				description: `Join the role ${r.name}`,
			}))
		})
	}

	try {
		await client.guilds.cache.get(config.guild)?.commands.set(data)
	} catch (e) {
		console.error('[Discord#onReady] ', e)
	}
}

/**
 * @param color Starting with `#`.
 */
function getColorEmbed(translator: string, color: string) {
	return new MessageEmbed()
		.setTitle(`${translator} 的色图！`)
		.setDescription(`色：\`${color}\``)
		.setColor(color)
		.setThumbnail(`https://colorhexa.com/${color.slice(1)}.png`)
}

export async function onInteraction(config: DiscordConfig, twitterClient: Twitter | undefined, interaction: Interaction) {
	try {
		if (!interaction.isCommand()) {
			return
		}
		const executor = tagToName(interaction.user.tag)
		if (!interaction.member || (
			interaction.channel?.id !== config.channel && !['join', 'ping'].includes( interaction.commandName)
		)) {
			return
		}
		switch (interaction.commandName) {
			case 'approve': {
				const key = interaction.options[0].value as string
				try {
					ReviewCache.approve(key, executor)
					if (ReviewCache.isApproved(key)) {
						ReviewCache.remove(key)
						interaction.reply(`✅ 漏洞 ${key} 的翻译已被 approved。`)
					} else {
						interaction.reply(`☑️ 漏洞 ${key} 的翻译仍需 ${ReviewCache.ApprovalCountRequired - ReviewCache.currentApprovalCount(key)} 个用户 approve。`)
					}
					ReviewCache.save()
				} catch (e) {
					interaction.reply(`❌ 无法 approve ${key} 的翻译：${e}。`)
				}
				break
			}
			case 'as': {
				const translator = tagToName(interaction.options[0].user!.tag)
				const content = interaction.options[1].value as string
				if (ColorCache.has(translator)) {
					await executeCommand({
						content,
						executor: interaction.user,
						translator,
						onOverriding: () => (interaction.replied ? interaction.editReply.bind(interaction) : interaction.reply.bind(interaction))
							(`❓ 以 ${translator} 的身份提交了 \`${content}\`，请确认是否覆盖。`),
						onTranslated: () => (interaction.replied ? interaction.editReply.bind(interaction) : interaction.reply.bind(interaction))
							(`✅ 以 ${translator} 的身份提交了 \`${content}\`。`),
						sendMessage: content => (interaction.channel as TextChannel).send(content),
					})
				} else {
					await interaction.reply(`❌ 名为 ${translator} 的用户从未亲自使用过 SPX。`)
				}
				break
			}
			case 'backup':
				await interaction.reply('💾 Backup', {
					files: [
						BugCache.bugsPath,
						ColorCache.colorPath,
					]
				})
				break
			case 'color':
				switch (interaction.options[0].name) {
					case 'clear': {
						const target = tagToName(interaction.options[0].options![0].user!.tag)
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
						const target = tagToName(interaction.options[0].options![0].user!.tag)
						const color = BugCache.getColorFromTranslator(target)
						await interaction.reply(getColorEmbed(target, color))
						break
					}
					case 'set': {
						let color = (interaction.options[0].options![0].value as string).toLowerCase()
						let target: User | undefined = interaction.options[0].options![1]?.user
						const targetName = target ? tagToName(target.tag) : executor
						if (!color.startsWith('#')) {
							color = `#${color}`
						}
						ColorCache.set(targetName, color)
						const locked = targetName === 'ff98sha' || targetName === 'WuGuangYao'
						if (locked) {
							ColorCache.set('ff98sha', color)
							ColorCache.set('WuGuangYao', color)
						}
						ColorCache.save()
						await interaction.reply(new MessageEmbed()
							.setDescription(`已设置 ${targetName} 的颜色为 ${color}${locked ? '  \n🏳‍🌈 Ff98sha 与 WuGuangYao 已锁。' : ''}`)
							.setColor(color)
							.setThumbnail(`https://colorhexa.com/${color.slice(1)}.png`))
						break
					}
				}
				break
			case 'join': {
				const name = interaction.options[0].name
				const role = config.roles?.find(v => v.name === name)?.role
				if (!role) {
					await interaction.reply(`❌ Unknown role name ${name}.`, { ephemeral: true })
					break
				}
				const rolesManager = interaction.member?.roles
				if (!rolesManager || Array.isArray(rolesManager)) {
					await interaction.reply('❌ Cannot manage your roles.', { ephemeral: true })
					break
				}
				if (rolesManager.cache.has(role)) {
					await interaction.reply(`❌ You already have the role ${name}.`, { ephemeral: true })
					break
				}
				await rolesManager.add(role)
				await interaction.reply(`✅ Joined role ${name}`, { ephemeral: true })
				break
			}
			case 'ping':
				interaction.reply('🏓 Pong!')
				break
			case 'query': {
				await interaction.defer()
				const currentTime = new Date()
				const remainingCooldown = lastQueryTime ? QueryCooldown - (currentTime.getTime() - lastQueryTime.getTime()) : 0
				if (remainingCooldown > 0) {
					interaction.editReply(`❌ 冷却剩余 ${remainingCooldown} 毫秒`)
					break
				}
				lastQueryTime = currentTime

				const jql = (interaction.options?.[0]?.value as string | undefined) || 'project = MC AND fixVersion in unreleasedVersions()'
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
				} else if (issues.length) {
					const sortedTranslators = Array.from(translators.entries()).sort((a, b) => b[1] - a[1])
					await interaction.editReply(new MessageEmbed()
						.setTitle(`🎉 ${issues.length} 个漏洞均已翻译。`)
						.setColor(BugCache.getColorFromTranslator(sortedTranslators[0]?.[0]))
						.addField('打工人', sortedTranslators.map(([translator, _count]) => `**${translator}**`).join('\n'), true)
						.addField('#', sortedTranslators.map(([_translator, count]) => count).join('\n'), true)
						.addField('%', sortedTranslators.map(([_translator, count]) => `${(count / issues.length * 100).toFixed(2)}%`).join('\n'), true)
					)
				} else {
					const responses = [
						'什么也没有搜到。',
						'你来到了没有爱的荒漠。',
						'肆佰〇肆不能被找到。',
						'一个漏洞都没有，本该是一切非常快乐的事情，可是为什么会变成这样呢？',
						'Ssssssssssorry!',
					]
					await interaction.editReply(responses[Math.ceil(Math.random() * responses.length)])
				}
				if (!ReviewCache.isEmpty()) {
					await interaction.webhook.send(new MessageEmbed()
						.setTitle('❗ Review Required')
						.setDescription(
							Object
								.entries(ReviewCache.review)
								.map(([key, { approvers, summary, translator }]) => `[${key}](https://bugs.mojang.com/browse/${key}) 「${summary}」 @${translator} #${approvers.length}`)
								.join('\n')
						)
					)
				}
				break
			}
			case 'tweet': {
				await interaction.defer()
				const currentTime = new Date()
				const remainingCooldown = lastQueryTime ? QueryCooldown - (currentTime.getTime() - lastQueryTime.getTime()) : 0
				if (remainingCooldown > 0) {
					interaction.editReply(`❌ 冷却剩余 ${remainingCooldown} 毫秒`)
					break
				}
				lastQueryTime = currentTime

				if (!twitterClient) {
					await interaction.editReply('❌ Twitter App 未配置。')
					return
				}
				const mode = interaction.options[0].name as 'dark' | 'light'
				const tweetLink = interaction.options[0].options![0].value as string
				const tweetLinkRegex = /^https?:\/\/twitter\.com\/([^/]+)\/status\/(\d+)/i
				const matchResult = tweetLink.match(tweetLinkRegex)
				if (!matchResult) {
					await interaction.editReply(`❌ 输入 \`${tweetLink}\` 不是可被接受的 Tweet 链接。`)
					return
				}
				const tweetId = matchResult[2]
				try {
					const result: {
						data: {
							source: string,
							created_at: string,
							text: string,
							entities?: {
								urls?: { start: number, end: number, url: string, expanded_url: string, display_url: string }[]
							},
							id: string,
							author_id: string,
							lang: string,
						},
						includes: {
							users: { id: string, name: string, username: string }[],
						},
						_headers: {},
					} = await twitterClient.get(`tweets/${tweetId}`, {
						expansions: 'attachments.media_keys,author_id',
						'tweet.fields': 'attachments,author_id,created_at,entities,lang,source,text',
						'user.fields': 'name,username',
					})
					const author = result.includes.users.find(u => u.id === result.data.author_id)!
					const bbcode = getTweet({
						date: new Date(result.data.created_at),
						lang: result.data.lang,
						mode,
						source: result.data.source,
						text: result.data.text,
						translator: executor,
						tweetLink,
						urls: result.data.entities?.urls ?? [],
						userName: author.name,
						userTag: author.username,
					})
					await interaction.editReply(`\`\`\`\n${bbcode}\n\`\`\``)
				} catch (e) {
					await interaction.editReply(`❌ 与 Twitter API 交互出错：\n\`\`\`\n${JSON.stringify(e).slice(0, 500)}\n\`\`\``)
					console.error('[Discord#onInteraction#Twitter]', e)
					return
				}
				break
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
			await executeCommand({
				content: message.content,
				executor: message.member.user,
				translator: tagToName(message.member.user.tag),
				onOverriding: () => message.react('❓'),
				onTranslated: () => message.react('✅'),
				sendMessage: content => message.channel.send(content),
			})
		}
	} catch (e) {
		console.error('[Discord#onMessage] ', e)
	}
}

const overrideConfirmations = new Map<string, { author: User, translator: string, content: string, prompt: Message, onTranslated: () => Promise<unknown> }>()

async function executeCommand({
	content,
	executor,
	translator,
	onOverriding,
	onTranslated,
	sendMessage,
}: {
	content: string,
	executor: User,
	translator: string,
	onOverriding: () => Promise<unknown>,
	onTranslated: () => Promise<unknown>,
	sendMessage: (content: string | MessageEmbed) => Promise<Message>,
}): Promise<void> {
	content = content.trim()

	const bugRegex = /^([!！?？]*)\s*\[?(MC-\d+)]?\s*(.*)$/i
	const bugMatchArr = content.match(bugRegex)
	if (bugMatchArr) {
		const isForce = !!bugMatchArr[1]?.match(/[!！]/)
		const needsReview = !!bugMatchArr[1]?.match(/[?？]/)
		const id = bugMatchArr[2]
		const desc = markdownToBbcode(bugMatchArr[3])
		const existingOne = BugCache.getSummary(id)
		if (existingOne && !isForce) {
			const [, prompt] = await Promise.all([
				onOverriding(),
				sendMessage(`❓ ${id} 已被翻译为「${existingOne}」。${desc ? '确认覆盖？' : '确认删除？'}`),
			])
			await Promise.all([
				prompt.react('⚪'),
				prompt.react('❌')
			])
			overrideConfirmations.set(prompt.id, { author: executor, translator, content, prompt, onTranslated })
		} else {
			BugCache.set(id, desc, translator)
			BugCache.save()
			await onTranslated()
			if (!ColorCache.has(translator)) {
				const color = BugCache.getColorFromTranslator(translator)
				ColorCache.set(translator, color)
				await sendMessage(getColorEmbed(translator, color).setTitle(`为 ${translator} 自动生成了色图！`))
			}
			if (needsReview) {
				ReviewCache.set(id, {
					approvers: [],
					summary: desc,
					translator,
				})
			} else {
				ReviewCache.remove(id)
			}
			ReviewCache.save()
		}
	} else if (content.toLowerCase().startsWith('!spx ')) {
		await sendMessage('给爷用 Slash Command 啦')
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
		if (!result.issues || result.total === 0) {
			return []
		}
		ans.push(...result.issues ?? [])
		totalCount += result.issues?.length ?? 0

		if (totalCount >= Math.min(result.total ?? 0, MaxSearchCount)) {
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
			const { author, content, prompt, translator, onTranslated } = overrideConfirmations.get(reaction.message.id)!
			if (user.id !== author.id) {
				return await prompt.edit(`${prompt.content}\n不准 ${tagToName(user.tag)} 为 ${tagToName(author.tag)} 做决定.spg`)
			}
			if (reaction.emoji.name === '⚪') {
				await executeCommand({
					content: `!${content}`,
					executor: author,
					translator,
					onOverriding: async () => { /* This should never get called. */ },
					onTranslated,
					sendMessage: content => reaction.message.channel.send(content),
				})
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
