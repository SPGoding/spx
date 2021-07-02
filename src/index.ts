import { Client, Intents } from 'discord.js'
import * as fs from 'fs-extra'
import express from 'express'
import * as path from 'path'
import rp from 'request-promise-native'
import { BugCache } from './cache/bug'
import { ColorCache } from './cache/color'
import { ReviewCache } from './cache/review'
import { DiscordConfig, onInteraction, onMessage, onReactionAdd, onReady } from './discord-bot'
import { JSDOM } from 'jsdom'
import { getArticleType, getBeginning, getEnding, getTweet, getVersionType, TweetLinkRegex } from './util'
import { convertFeedbackArticleToBBCode, convertMCArticleToBBCode } from './converter'
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
			console.log('Discord Bot launched.')
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
			console.log('Twitter App connected.')
		}
	} catch (e) {
		console.error('[launchTwitterApp]', e)
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
		const { mode } = req.query
		const { url, translator } = req.params
		try {
			const isMinecraftBlog = url.match(/^https:\/\/www\.minecraft\.net\/(?:en-us|zh-hans)\/article\//)
			const isFeedback = url.match(/^https:\/\/feedback\.minecraft\.net\/hc\/en-us\/articles\//)
			const isTweet = url.match(TweetLinkRegex)
			const validMode = mode === 'light' || mode === 'dark'
			if (isMinecraftBlog) {
				console.log(url)
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
				//fs.writeFile('./output.txt', bbcode)
				res.setHeader('Content-Type', 'application/json')
				res.send(JSON.stringify({ bbcode, url }))
			} else if (isFeedback) {
				const src = await rp(url)
				const html = new JSDOM(src).window.document
				let bbcode = await convertFeedbackArticleToBBCode(html, url, translator)
				//fs.writeFile('./output.txt', bbcode)
				res.setHeader('Content-Type', 'application/json')
				res.send(JSON.stringify({ bbcode, url }))
			} else if (twitterClient && isTweet && validMode) {
				const bbcode = await getTweet(twitterClient, mode as 'dark' | 'light', url, translator)
				res.setHeader('Content-Type', 'application/json')
				res.send(JSON.stringify({ bbcode, url }))
			} else {
				res.setHeader('Content-Type', 'text/plain')
				res.status(500).send('Neither a Minecraft.net blog URL nor a Tweet link')
			}
		} catch (e) {
			console.error('[convert] ', e)
			res.setHeader('Content-Type', 'text/plain')
			res.status(500).send(e)
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
