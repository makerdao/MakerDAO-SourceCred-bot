import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

import { getCredGrainViewParticipants } from '../utils/sourcecred'
import { credEmbed } from '../embed'
import { weiToEther } from '../utils/helpers'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []
const WHITELISTED_USERS = process.env.WHITELISTED_USERS?.split(', ') || []

export default {
  data: new SlashCommandBuilder()
    .setName('fetch-cred')
    .setDescription('Fetches cred and grain information for specified user')
    .addStringOption((option) =>
      option.setName('user').setDescription('Forum username').setRequired(true)
    ),
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

      await interaction.deferReply({ ephemeral: true })

      const username = interaction.options.getString('user', true)
      const participants = await getCredGrainViewParticipants()
      const user = participants.find((p) =>
        p.identity.aliases.find((alias) =>
          alias.address.toLowerCase().includes(username.toLowerCase())
        )
      )

      if (!user) {
        await interaction.editReply('User not found')
        return
      }

      const cred = {
        total: Math.round(user.cred),
        thisWeek: Math.round(
          user.credPerInterval[user.credPerInterval.length - 1]
        ),
        lastWeek: Math.round(
          user.credPerInterval[user.credPerInterval.length - 2]
        ),
        thisMonth: Math.round(
          user.credPerInterval
            .slice(
              user.credPerInterval.length - 5,
              user.credPerInterval.length - 1
            )
            .reduce((a, b) => a + b)
        ),
      }

      const grain = {
        total: weiToEther(user.grainEarned),
        lastWeek: weiToEther(
          user.grainEarnedPerInterval[user.grainEarnedPerInterval.length - 2]
        ),
        thisMonth: user.grainEarnedPerInterval
          .slice(
            user.grainEarnedPerInterval.length - 5,
            user.grainEarnedPerInterval.length - 1
          )
          .map((grain) => weiToEther(grain))
          .reduce((a, b) => a + b),
      }

      await interaction.editReply({
        embeds: [credEmbed(user.identity.name, cred, grain)],
      })
    } catch (err) {
      console.log(err)
      interaction.editReply('There was an error fetching information')
    }
  },
}
