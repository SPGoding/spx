import { Client, Intents } from 'discord.js'
import * as fs from 'fs-extra'
import * as express from 'express'
import * as path from 'path'
import * as rp from 'request-promise-native'
import { BugCache } from './bug-cache'
import { ColorCache } from './color-cache'
import { DiscordConfig, onMessage, onReactionAdd } from './discord-bot'
import { JSDOM } from 'jsdom'
import { getArticleType, getBeginning, getEnding, getVersionType } from './util'
import { convertMCArticleToBBCode } from './converter'

const configPath = path.join(__dirname, './config.json')
let httpPort: number | undefined
let ip: string | undefined
let ownerPassword: string | undefined
let vipPassword: string | undefined
let interval: number | undefined

let discordClient: Client | undefined
let discord: DiscordConfig | undefined

(function loadFiles() {
	if (fs.existsSync(configPath)) {
		const config = fs.readJsonSync(configPath)
		ip = config.ip
		httpPort = config.httpPort
		interval = config.interval
		ownerPassword = config.ownerPassword
		vipPassword = config.vipPassword
		discord = config.discord
		if (!ip || !httpPort || !interval || !ownerPassword || !vipPassword) {
			throw ("Expected 'ip', 'httpPort', 'interval', 'ownerPassword', and 'vipPassword' in './config.json'.")
		}
	} else {
		ip = 'localhost'
		httpPort = 80
		interval = 20000
		fs.writeJsonSync(configPath, { ip, httpPort, interval, keyFile: null, certFile: null, password: null }, { encoding: 'utf8' })
		throw 'Please complete the config file.'
	}

	BugCache.load()
	ColorCache.load()
})();

(async function launchDiscordBot() {
	try {
		if (discord) {
			discordClient = new Client({
				partials: ['MESSAGE', 'USER'],
				ws: {
					intents: Intents.NON_PRIVILEGED
				}
			})
			await discordClient.login(discord.token)
			discordClient.on('message', onMessage.bind(undefined, discord))
			discordClient.on('messageReactionAdd', onReactionAdd.bind(undefined, discord))
			console.log('Discord bot launched.')
		}
	} catch (e) {
		console.error('[launchDiscordBot]', e)
		process.exit(1)
	}
})()

const index = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8').replace('%replace_as_server_url%', `${ip}`)
const app = express()
	.get('/colors', (_req, res) => {
		res.setHeader('Content-Type', 'application/json')
		res.send(JSON.stringify(ColorCache.colors))
	})
	.get('/convert/:url/:translator', async (req, res) => {
		const { url, translator } = req.params
		try {
			if (url.startsWith('https://www.minecraft.net/en-us/article/') || url.startsWith('https://www.minecraft.net/zh-cn/article/' || url.startsWith('https://feedback.minecraft.net/hc/en-us/articles/'))) {
				const src = await rp(url)
				const html = new JSDOM(src).window.document
				const articleType = getArticleType(html)
				let bbcode = await convertMCArticleToBBCode(html, url, translator, articleType)
				if (articleType === 'NEWS') {
					const versionType = getVersionType(url)
					const beginning = getBeginning(versionType)
					const ending = getEnding(versionType)
					bbcode = `${beginning}${bbcode}${ending}`
				}
				res.setHeader('Content-Type', 'application/json')
				res.send(JSON.stringify({ bbcode, url }))
			} else {
				res.setHeader('Content-Type', 'text/plain')
				res.status(500).send('Not a Minecraft.net blog URL')
			}
		} catch (e) {
			console.error('[convert] ', e)
		}
	})
	.get('/*', (_req, res) => {
		res.send(index)
	})

app
	.listen(httpPort, () => {
		console.log(`HTTP server is running at ${ip} (locally listening ${httpPort})`)
	})
	.on('error', e => {
		console.error('[HttpServer] ', e.message)
	})
