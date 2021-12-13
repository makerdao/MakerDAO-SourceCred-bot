import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import fs from 'fs'
require('dotenv').config()

const commands: any[] = []
const commandFiles = fs
  .readdirSync('./src/commands')
  .filter((file) => file.endsWith('.ts'))

const clientId = process.env.CLIENT_ID || ''
const guildId = process.env.GUILD_ID || ''
const token = process.env.BOT_TOKEN || ''

for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  commands.push(command.default.data.toJSON())
}

const rest = new REST({ version: '9' }).setToken(token)

const main = async () => {
  try {
    console.log('Started refreshing application (/) commands.')

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    })

    console.log('Successfully reloaded application (/) commands.')
  } catch (err) {
    console.error(err)
  }
}

main()
