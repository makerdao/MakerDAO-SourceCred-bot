import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

import { fetchUsersFromIPFS, removeUsersFromIPFS } from '../utils/ipfs'
import {
  getLedgerManager,
  setSCPayoutAddressAndActivate,
} from '../utils/sourcecred'
import { copyLedgerFromGHPages, createOptInPullRequest } from '../utils/github'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []

export default {
  data: new SlashCommandBuilder()
    .setName('sc-onboard')
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
      const modifiedUsers = await setSCPayoutAddressAndActivate(
        ledgerManager,
        userInformationList
      )
      const optInPullRequestURL = await createOptInPullRequest(newBranchName)

      await interaction.editReply(
        `Users successfully activated, PR: ${optInPullRequestURL}
        \`\`\`${modifiedUsers.map((u) => `- ${u.discourse}`).join('\n')}\`\`\``
      )

      try {
        await removeUsersFromIPFS(modifiedUsers)
        await interaction.followUp({
          content: 'Modified users successfully removed from IPFS',
          ephemeral: true,
        })
      } catch (ipfsErr) {
        console.log(ipfsErr)
        await interaction.followUp({
          content:
            'There was an issue trying to remove users from IPFS, please check the logs',
          ephemeral: true,
        })
      }
    } catch (err) {
      console.log(err)
      if (typeof err === 'string') interaction.editReply(err)
      else
        interaction.editReply('There was an internal error, please try again')
    }
  },
}
