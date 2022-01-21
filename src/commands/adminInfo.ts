import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

import { adminInfoEmbed } from '../embed'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []

export default {
  data: new SlashCommandBuilder()
    .setName('admin-info')
    .setDescription('Information about available SourceCred admin commands'),
  async execute(interaction: CommandInteraction) {
    try {
      if (!SOURCECRED_ADMINS.includes(interaction.user.id)) {
        await interaction.reply({
          content: 'Error: admin-only command',
          ephemeral: true,
        })
        return
      }

      await interaction.reply({ embeds: [adminInfoEmbed()], ephemeral: true })
    } catch (err) {
      console.log(err)
      interaction.reply({
        content: 'There was an error fetching information',
        ephemeral: true,
      })
    }
  },
}
