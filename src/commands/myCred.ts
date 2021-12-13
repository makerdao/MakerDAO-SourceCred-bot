import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

export default {
  data: new SlashCommandBuilder()
    .setName('mycred')
    .setDescription('Returns your cred'),
  async execute(interaction: CommandInteraction) {
    await interaction.reply('Pong!')
  },
}
