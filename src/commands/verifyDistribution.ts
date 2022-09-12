import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import fetch from 'node-fetch'

import { fetchDistributionFromIPFS } from '../utils/ipfs'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []

type GnosisTransactionList = {
  dataDecoded: {
    parameters: [{ value: string }, { value: string }]
  }
}[]

export default {
  data: new SlashCommandBuilder()
    .setName('verify-distribution')
    .setDescription(
      'Verifies a Gnosis Safe distribution with the latest distribution on IPFS'
    )
    .addStringOption((option) =>
      option
        .setName('tx-hash')
        .setDescription('Hash of the transaction on the Gnosis Safe')
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName('delegate')
        .setDescription('Whether or not it is a delegate distribution')
        .setRequired(false)
    ),
  async execute(interaction: CommandInteraction) {
    try {
      if (!SOURCECRED_ADMINS.includes(interaction.user.id)) {
        await interaction.reply({
          content: 'Error: this command is only available for admins',
          ephemeral: true,
        })
        return
      }

      await interaction.deferReply()
      const txHash = interaction.options.getString('tx-hash', true)

      // Fetch distribution from Gnosis
      const gnosisDistributionRes = await fetch(
        `https://safe-transaction.gnosis.io/api/v1/multisig-transactions/${txHash}`
      )

      if (gnosisDistributionRes.status !== 200)
        throw 'There was an error fetching the Distribution on the Gnosis Safe, make sure the transaction hash is correct'

      const gnosisDistribution = await gnosisDistributionRes.json()
      const gnosisTransactionList: GnosisTransactionList =
        gnosisDistribution.dataDecoded.parameters[0].valueDecoded

      const gnosisData = gnosisTransactionList.map(
        ({ dataDecoded: { parameters } }) => ({
          address: parameters[0].value,
          amount: parameters[1].value,
        })
      )

      // Fetch distribution from IPFS
      const delegateOption = interaction.options.getBoolean('delegate', false)
      const ipfsData = await fetchDistributionFromIPFS(delegateOption || false)

      // Compare data
      if (gnosisData.length !== ipfsData.length) {
        interaction.editReply(
          'Both distributions are incompatible since they have different amount of transactions ⚠️'
        )
        return
      }

      const distributionsAreEqual = gnosisData.every(
        (tx, index) =>
          tx.address === ipfsData[index].address &&
          tx.amount === ipfsData[index].amount
      )

      if (distributionsAreEqual)
        interaction.editReply('IPFS and Gnosis distributions are equal ✅')
      else
        interaction.editReply('IPFS and Gnosis distributions are NOT equal ❌')
    } catch (err) {
      console.log(err)
      interaction.editReply('There was an error fetching information')
    }
  },
}
