import { SlashCommandBuilder } from '@discordjs/builders'
import {
  CommandInteraction,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
} from 'discord.js'
import fetch from 'node-fetch'

import {
  handleDiscourseVerify,
  handleDiscourseCheck,
} from '../utils/discourseVerification'
import { updateUserStatus } from '../utils/notion'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []

export default {
  data: new SlashCommandBuilder()
    .setName('opt-out')
    .setDescription('Opt out of SourceCred')
    .addStringOption((option) =>
      option
        .setName('discourse')
        .setDescription('Your Discourse username')
        .setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    try {
      if (!SOURCECRED_ADMINS.includes(interaction.user.id)) {
        await interaction.reply({
          content: 'Error: admin-only command',
          ephemeral: true,
        })
        return
      }

      await interaction.deferReply({ ephemeral: true })

      const rawDiscourse = interaction.options.getString('discourse', true)

      const discourseRes = await fetch(
        `https://forum.makerdao.com/u/${rawDiscourse}.json`
      )
      if (discourseRes.status !== 200) {
        await interaction.editReply('Discourse username not found')
        return
      }

      const discourseResBody = await discourseRes.json()
      const discourse: string = discourseResBody.user.username
      const { verificationCode, verificationEmbed } = handleDiscourseVerify()

      const row = new MessageActionRow().addComponents(
        new MessageButton()
          .setLabel('Account preferences')
          .setStyle('LINK')
          .setURL(
            `https://forum.makerdao.com/u/${discourse}/preferences/account`
          ),
        new MessageButton()
          .setCustomId('confirm')
          .setLabel('Confirm')
          .setStyle('PRIMARY')
      )

      await interaction.editReply({
        embeds: [verificationEmbed],
        components: [row],
      })

      const interactionChannel =
        interaction.channel ||
        (await interaction.client.channels.fetch(interaction.channelId))

      if (!interactionChannel?.isText())
        throw 'There was an error fetching the Discord channel'
      const filter = (i: MessageComponentInteraction) =>
        i.customId === 'confirm' && i.user.id === interaction.user.id
      const collector = interactionChannel.createMessageComponentCollector({
        filter,
        time: 900000,
        max: 1,
      })
      collector.on('collect', async (i) => {
        const isDiscourseVerified = await handleDiscourseCheck(
          verificationCode,
          discourse
        )
        await i.update({
          content: isDiscourseVerified
            ? 'Discourse username successfully verified, updating status on the database...'
            : 'Discourse username verification failed, please try again',
          embeds: [],
          components: [],
        })

        if (!isDiscourseVerified) return

        const userUpdateStatus = await updateUserStatus(
          discourse,
          'Needs opt out'
        )
        if (userUpdateStatus === 200)
          i.editReply(
            '✅ User status successfully updated on the database, you will be opted out on the next SourceCred instance update'
          )
        else if (userUpdateStatus === 404)
          i.editReply('❌ User information was not found on the database')
        else if (userUpdateStatus === 500) {
          i.editReply(
            '❌ There was a problem while trying to update user information on the database, please try again later'
          )
        }
      })
    } catch (err) {
      console.error(err)
      if (typeof err === 'string')
        interaction.editReply({
          content: err,
          embeds: [],
          components: [],
        })
      else
        interaction.reply({
          content: 'There was a server error, please try again later',
          ephemeral: true,
        })
    }
  },
}
