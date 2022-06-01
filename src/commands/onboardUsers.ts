import { SlashCommandBuilder } from '@discordjs/builders'
import {
  CommandInteraction,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
} from 'discord.js'

import {
  getLedgerManager,
  setSCPayoutAddressAndActivateOrRemove,
} from '../utils/sourcecred'
import { copyLedgerFromGHPages } from '../utils/github'
import { fetchUsersFromNotion, updateUserStatus } from '../utils/notion'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []

export default {
  data: new SlashCommandBuilder()
    .setName('onboard-users')
    .setDescription(
      'Admin only command: activates and/or deactivates user identities in the SourceCred instance'
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

      const usersToActivate = await fetchUsersFromNotion('Needs likes')
      const usersToDeactivate = await fetchUsersFromNotion('Needs opt out')
      if (!usersToActivate.length && !usersToDeactivate.length) {
        await interaction.editReply(
          'There are currently no users waiting for activation or deactivation'
        )
        return
      }

      const newBranchName = await copyLedgerFromGHPages()
      const ledgerManager = getLedgerManager(newBranchName)
      const { usersActivated, usersDeactivated } =
        await setSCPayoutAddressAndActivateOrRemove(
          ledgerManager,
          usersToActivate,
          usersToDeactivate
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
        content: `Users successfully activated and/or deactivated in new branch \`${newBranchName}\`. Attempting to update user statuses on Notion, do you wish to continue?`,
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
            'Command cancelled, user statuses will not be updated on Notion'
          )
          return
        } else {
          await i.followUp('Updating user statuses on Notion, please wait...')

          try {
            for (const user of usersActivated) {
              const userUpdateStatus = await updateUserStatus(
                user.discourse,
                'Confirmed'
              )
              if (userUpdateStatus !== 200) throw 'Notion error'
              await new Promise((r) => setTimeout(r, 500))
            }
            for (const user of usersDeactivated) {
              const userUpdateStatus = await updateUserStatus(
                user.discourse,
                'Opted out'
              )
              if (userUpdateStatus !== 200) throw 'Notion error'
              await new Promise((r) => setTimeout(r, 500))
            }
            await i.followUp(
              "Modified users' statuses successfully updated on Notion"
            )
          } catch (notionErr) {
            console.log(notionErr)
            await i.followUp(
              'There was an issue trying to update user statuses on Notion, please check the logs'
            )
          }
        }
      })
    } catch (err) {
      console.log(err)
      if (typeof err === 'string') interaction.editReply(err)
      else
        interaction.editReply(
          'There was an internal error, please try again later'
        )
    }
  },
}
