import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

import { infoEmbed } from '../embed'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []
const WHITELISTED_USERS = process.env.WHITELISTED_USERS?.split(', ') || []

export default {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Information about available SourceCred commands'),
  async execute(interaction: CommandInteraction) {
    try {
      if (
        !SOURCECRED_ADMINS.includes(interaction.user.id) &&
        !WHITELISTED_USERS.includes(interaction.user.id)
      ) {
        await interaction.reply({
          content: 'Error: command temporarily available only for testers',
          ephemeral: true,
        })
        return
      }

      await interaction.reply({ embeds: [infoEmbed()] })
    } catch (err) {
      console.log(err)
      interaction.reply('There was an error fetching information')
    }
  },
}
