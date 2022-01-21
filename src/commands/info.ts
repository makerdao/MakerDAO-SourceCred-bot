import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

import { infoEmbed } from '../embed'

export default {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Information about available SourceCred commands'),
  async execute(interaction: CommandInteraction) {
    try {
      await interaction.reply({ embeds: [infoEmbed()] })
    } catch (err) {
      console.log(err)
      interaction.reply('There was an error fetching information')
    }
  },
}
