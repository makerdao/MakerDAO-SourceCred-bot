import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { formatEther } from 'ethers/lib/utils'

import { getCredGrainViewParticipants } from '../utils/sourcecred'

const weiToEther = (wei: string): number =>
  +parseFloat(formatEther(wei)).toFixed(2)

export default {
  data: new SlashCommandBuilder()
    .setName('sc-cred')
    .setDescription('Fetches cred for specified user')
    .addStringOption((option) =>
      option
        .setName('user')
        .setDescription('Sourcecred username')
        .setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true })

      const username = interaction.options.getString('user', true)
      const participants = await getCredGrainViewParticipants()
      const user = participants.find((p) =>
        p.identity.aliases.find((alias) => alias.address.includes(username))
      )

      if (!user) await interaction.editReply('User not found')
      else
        await interaction.editReply(`
      ${username}
      Total cred: ${Math.round(user.cred)}
      Cred this week: ${Math.round(
        user.credPerInterval[user.credPerInterval.length - 1]
      )}
      Cred last week: ${Math.round(
        user.credPerInterval[user.credPerInterval.length - 2]
      )}
      Cred this month: ${Math.round(
        user.credPerInterval
          .slice(
            user.credPerInterval.length - 5,
            user.credPerInterval.length - 1
          )
          .reduce((a, b) => a + b)
      )}

      Total grain: ${weiToEther(user.grainEarned)} DAI
      Grain earned last week: ${weiToEther(
        user.grainEarnedPerInterval[user.grainEarnedPerInterval.length - 2]
      )} DAI
      Grain earned this month: ${user.grainEarnedPerInterval
        .slice(
          user.grainEarnedPerInterval.length - 5,
          user.grainEarnedPerInterval.length - 1
        )
        .map((grain) => weiToEther(grain))
        .reduce((a, b) => a + b)} DAI
      `)
    } catch (err) {
      console.log(err)
      interaction.reply('There was an error fetching information')
    }
  },
}
