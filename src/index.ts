import { Client, Intents } from 'discord.js'
import * as fs from 'fs-extra'
import express from 'express'
import * as path from 'path'
import { BugCache } from './cache/bug'
import { ColorCache } from './cache/color'
import { ReviewCache } from './cache/review'
import { DiscordConfig, onInteraction, onMessage, onReactionAdd, onReady } from './discord-bot'
import { TwitterConfig } from './twitter'
import Twitter from 'twitter-lite'

const configPath = path.join(__dirname, './config.json')
let httpPort: number | undefined
let ip: string | undefined
let ownerPassword: string | undefined
let vipPassword: string | undefined

let discordClient: Client | undefined
let discord: DiscordConfig | undefined
let twitterClient: Twitter | undefined
let twitter: TwitterConfig | undefined

(function loadFiles() {
	if (fs.existsSync(configPath)) {
		const config = fs.readJsonSync(configPath)
		ip = config.ip
		httpPort = config.httpPort
		ownerPassword = config.ownerPassword
		vipPassword = config.vipPassword
		discord = config.discord
		twitter = config.twitter
		if (!ip || !httpPort || !ownerPassword || !vipPassword) {
			throw ("Expected 'ip', 'httpPort', 'ownerPassword', and 'vipPassword' in './config.json'.")
		}
	} else {
		ip = 'localhost'
		httpPort = 80
		fs.writeJsonSync(configPath, { ip, httpPort, keyFile: null, certFile: null, password: null }, { encoding: 'utf8' })
		throw 'Please complete the config file.'
	}

	BugCache.load()
	ColorCache.load()
	ReviewCache.load()
})();

(async function launchDiscordBot() {
	try {
		if (discord) {
			discordClient = new Client({
				partials: ['MESSAGE', 'USER'],
				intents: [
					Intents.FLAGS.GUILDS,
					Intents.FLAGS.GUILD_BANS,
					Intents.FLAGS.GUILD_EMOJIS,
					Intents.FLAGS.GUILD_INTEGRATIONS,
					Intents.FLAGS.GUILD_INVITES,
					Intents.FLAGS.GUILD_MESSAGES,
					Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
					Intents.FLAGS.GUILD_MESSAGE_TYPING,
					Intents.FLAGS.GUILD_WEBHOOKS,
				],
			})
			await discordClient.login(discord.token)
			discordClient.once('ready', onReady.bind(undefined, discord, discordClient))
			discordClient.on('interactionCreate', onInteraction.bind(undefined, discord, twitterClient))
			discordClient.on('messageCreate', onMessage.bind(undefined, discord))
			discordClient.on('messageReactionAdd', onReactionAdd.bind(undefined, discord))
			console.info('Discord Bot launched.')
		}
	} catch (e) {
		console.error('[launchDiscordBot]', e)
		process.exit(1)
	}
})();

(async function launchTwitterApp() {
	try {
		if (twitter) {
			twitterClient = new Twitter({
				version: '2',
				extension: false,
				consumer_key: twitter.apiKey,
				consumer_secret: twitter.apiSecretKey,
				bearer_token: twitter.bearerToken,
			})
			console.info('Twitter App connected.')
		}
	} catch (e) {
		console.error('[launchTwitterApp]', e)
		process.exit(1)
	}
})()

const index = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8').replace('%replace_as_server_url%', `${ip}`)
const app = express()
	.get('/bugs', (_req, res) => {
		res.setHeader('Content-Type', 'application/json')
		res.send(JSON.stringify(BugCache.getResolvedBugCache()))
	})
	.get('/colors', (_req, res) => {
		res.setHeader('Content-Type', 'application/json')
		res.send(JSON.stringify(ColorCache.colors))
	})
	.get('/user-script', (_req, res) => {
		res.redirect(302, 'https://raw.githubusercontent.com/SPGoding/spx/main/out/user_script.js')
	})
	.get('/*', (_req, res) => {
		res.setHeader('Content-Type', 'text/html; charset=utf-8')
		res.send(index)
	})

app
	.listen(httpPort, () => {
		console.info(`HTTP server is running at ${ip} (locally listening ${httpPort})`)
	})
	.on('error', e => {
		console.error('[HttpServer] ', e.message)
	})
