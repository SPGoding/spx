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
let interval: number | undefined

let discordClient: Client | undefined
let discord: DiscordConfig | undefined
let twitterClient: Twitter | undefined
let twitter: TwitterConfig | undefined

(function loadFiles() {
	if (fs.existsSync(configPath)) {
		const config = fs.readJsonSync(configPath)
		ip = config.ip
		httpPort = config.httpPort
		interval = config.interval
		ownerPassword = config.ownerPassword
		vipPassword = config.vipPassword
		discord = config.discord
		twitter = config.twitter
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
	ReviewCache.load()
})();

(async function launchDiscordBot() {
	try {
		if (discord) {
			discordClient = new Client({
				partials: ['MESSAGE', 'USER'],
				intents: Intents.NON_PRIVILEGED,
			})
			await discordClient.login(discord.token)
			discordClient.once('ready', onReady.bind(undefined, discord, discordClient))
			discordClient.on('interaction', onInteraction.bind(undefined, discord, twitterClient))
			discordClient.on('message', onMessage.bind(undefined, discord))
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

const app = express()
	.get('/bugs', (_req, res) => {
		res.setHeader('Content-Type', 'application/json')
		res.send(JSON.stringify(BugCache.getResolvedBugCache()))
	})
	.get('/colors', (_req, res) => {
		res.setHeader('Content-Type', 'application/json')
		res.send(JSON.stringify(ColorCache.colors))
	})
	.get('/*', (_req, res) => {
		res.setHeader('Content-Type', 'text/plain')
		res.redirect(302, 'https://raw.githubusercontent.com/SPGoding/spx/main/out/user_script.js')
	})

app
	.listen(httpPort, () => {
		console.info(`HTTP server is running at ${ip} (locally listening ${httpPort})`)
	})
	.on('error', e => {
		console.error('[HttpServer] ', e.message)
	})
