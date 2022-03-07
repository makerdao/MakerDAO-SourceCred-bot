import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []
const SOURCECRED_INSTANCE = process.env.SOURCECRED_INSTANCE || ''

export default {
  data: new SlashCommandBuilder()
    .setName('instance-name')
    .setDescription(
      'Returns the name of the SourceCred instance that is currently being used'
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

      await interaction.reply(
        SOURCECRED_INSTANCE || 'Error: could not fetch SC instance name'
      )
    } catch (err) {
      console.log(err)
      if (typeof err === 'string') interaction.editReply(err)
      else
        interaction.editReply('There was an internal error, please try again')
    }
  },
}
