import { Client, Intents, Collection } from 'discord.js'
import fs from 'fs'
import { extname } from 'path'
require('dotenv').config()

const client = new Client({ intents: [Intents.FLAGS.GUILDS] })

const commandsExt = extname(__filename)
const commandsDir = commandsExt === '.ts' ? './src/commands' : './dist/commands'

const commands: Collection<string, any> = new Collection()
const commandFiles = fs
  .readdirSync(commandsDir)
  .filter((file) => file.endsWith(commandsExt))

for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  commands.set(command.default.data.name, command.default)
}

client.once('ready', () => console.log(`Bot started as ${client.user?.tag}`))

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return

  const command = commands.get(interaction.commandName)
  if (!command) return

  try {
    await command.execute(interaction)
  } catch (err) {
    console.error(err)
    await interaction.reply({
      content: 'There was an error while executing this command',
      ephemeral: true,
    })
  }
})

client.login(process.env.BOT_TOKEN)
