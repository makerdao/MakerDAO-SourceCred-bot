import { Client, Intents } from 'discord.js'
require('dotenv').config()

const client = new Client({ intents: [Intents.FLAGS.GUILDS] })

client.once('ready', () => console.log(`Bot started as ${client.user?.tag}`))

client.login(process.env.BOT_TOKEN)
