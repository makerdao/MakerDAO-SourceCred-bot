import { SlashCommandBuilder } from '@discordjs/builders'
import {
  CommandInteraction,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
} from 'discord.js'

import { fetchUsersFromIPFS, removeUsersFromIPFS } from '../utils/ipfs'
import {
  getLedgerManager,
  setSCPayoutAddressAndActivateOrRemove,
} from '../utils/sourcecred'
import { copyLedgerFromGHPages } from '../utils/github'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []

export default {
  data: new SlashCommandBuilder()
    .setName('onboard-users')
    .setDescription(
      'Admin only command: activates user identities in the SourceCred instance'
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
      await interaction.deferReply()

      const userInformationList = await fetchUsersFromIPFS()
      if (!userInformationList.length) {
        await interaction.editReply(
          'There are currently no users waiting for activation'
        )
        return
      }

      const newBranchName = await copyLedgerFromGHPages()
      const ledgerManager = getLedgerManager(newBranchName)
      const modifiedUsers = await setSCPayoutAddressAndActivateOrRemove(
        ledgerManager,
        userInformationList
      )

      const row = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('confirm')
          .setLabel('Yes')
          .setStyle('SUCCESS'),
        new MessageButton()
          .setCustomId('reject')
          .setLabel('No')
          .setStyle('DANGER')
      )

      await interaction.editReply({
        content: `Users successfully activated in new branch \`${newBranchName}\`. Attempting to remove activated users from IPFS, do you wish to continue?`,
        components: [row],
      })

      if (!interaction.channel)
        throw 'There was an error fetching the Discord channel'
      const filter = (i: MessageComponentInteraction) =>
        (i.customId === 'confirm' || i.customId === 'reject') &&
        i.user.id === interaction.user.id
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 900000,
        max: 1,
      })

      collector.on('collect', async (i) => {
        await i.update({ components: [] })

        if (i.customId === 'reject') {
          await i.followUp(
            'Command cancelled, users will not be removed from IPFS.'
          )
          return
        } else {
          await i.followUp('Removing users from IPFS, please wait...')

          try {
            await removeUsersFromIPFS(modifiedUsers)
            await i.followUp('Modified users successfully removed from IPFS')
          } catch (ipfsErr) {
            console.log(ipfsErr)
            await i.followUp(
              'There was an issue trying to remove users from IPFS, please check the logs'
            )
          }
        }
      })
    } catch (err) {
      console.log(err)
      if (typeof err === 'string') interaction.editReply(err)
      else
        interaction.editReply('There was an internal error, please try again')
    }
  },
}
