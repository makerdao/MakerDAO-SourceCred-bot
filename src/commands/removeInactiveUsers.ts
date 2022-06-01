import { SlashCommandBuilder } from '@discordjs/builders'
import {
  CommandInteraction,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
} from 'discord.js'

import {
  fetchInactiveUsersFromNotion,
  removeUserFromNotion,
} from '../utils/notion'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []

export default {
  data: new SlashCommandBuilder()
    .setName('remove-inactive-users')
    .setDescription('Admin only command: Remove inactive users from the DB'),
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

      const inactiveUserList = await fetchInactiveUsersFromNotion()

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
        content: `You are attempting to remove the following users from the DB, do you want to proceed? \n\`\`\`name, last modified\n${inactiveUserList
          .map((user) => user.name + ', ' + user.lastModified)
          .join('\n')}\`\`\``,
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
            'Command cancelled, users will not be removed from the DB'
          )
          return
        } else {
          await i.followUp('Removing users from the DB, please wait...')

          try {
            for (const user of inactiveUserList) {
              const userRemoveStatus = await removeUserFromNotion(user.id)
              if (userRemoveStatus !== 200) throw 'Notion error'
              await new Promise((r) => setTimeout(r, 500))
            }

            await i.followUp('✅ Users successfully removed from the DB')
          } catch (notionErr) {
            console.log(notionErr)
            await i.followUp(
              '❌ There was an issue trying to remove users from the DB, please check the logs'
            )
          }
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
          content: 'There was a server error, please try again',
          ephemeral: true,
        })
    }
  },
}
