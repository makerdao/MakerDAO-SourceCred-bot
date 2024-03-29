import { SlashCommandBuilder } from '@discordjs/builders'
import {
  CommandInteraction,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
} from 'discord.js'
import fetch from 'node-fetch'
import { isAddress, getAddress } from 'ethers/lib/utils'

import {
  handleDiscourseVerify,
  handleDiscourseCheck,
} from '../utils/discourseVerification'
import { pushUserToNotion } from '../utils/notion'

export default {
  data: new SlashCommandBuilder()
    .setName('opt-in')
    .setDescription('Opt in for SourceCred')
    .addStringOption((option) =>
      option
        .setName('discourse')
        .setDescription('Your Discourse username')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('address')
        .setDescription('Your wallet address')
        .setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true })

      const rawDiscourse = interaction.options.getString('discourse', true)
      const rawAddress = interaction.options.getString('address', true)

      const discourseRes = await fetch(
        `https://forum.makerdao.com/u/${rawDiscourse}.json`
      )
      if (discourseRes.status !== 200) {
        await interaction.editReply('Discourse username not found')
        return
      }
      if (!isAddress(rawAddress)) {
        await interaction.editReply('Invalid wallet address provided')
        return
      }

      const discourseResBody = await discourseRes.json()
      const discourse: string = discourseResBody.user.username
      const address = getAddress(rawAddress)
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

      if (!interactionChannel?.isText() && !interactionChannel?.isThread())
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
            ? 'Discourse username successfully verified, saving user information...'
            : 'Discourse username verification failed, please try again',
          embeds: [],
          components: [],
        })

        if (!isDiscourseVerified) return

        const userSavedStatus = await pushUserToNotion(discourse, address)
        if (userSavedStatus === 201)
          i.editReply('✅ User information successfully saved!')
        else if (userSavedStatus === 409)
          i.editReply(
            '❌ You already opted in for SourceCred, contact SourceCred admins if you wish to update your information'
          )
        else
          i.editReply(
            '❌ There was a problem while trying to save user information, please try again later'
          )
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
          content: 'There was a server error, please try again',
          ephemeral: true,
        })
    }
  },
}
