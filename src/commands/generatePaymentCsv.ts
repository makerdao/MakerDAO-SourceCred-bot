import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, MessageAttachment } from 'discord.js'
import { parseEther, parseUnits, formatEther } from 'ethers/lib/utils'
import { writeFileSync, readFileSync, createReadStream } from 'fs'

import { getLedgerAccounts } from '../utils/sourcecred'
import {
  TOKEN_TYPE,
  TOKEN_CONTRACT,
  PAYMENTS_CSV_HEADING,
  DAI_REDEMPTIONS_ACCOUNT_ID,
} from '../constants'
import { pushDistributionToIPFS } from '../utils/ipfs'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []
const SOURCECRED_INSTANCE = process.env.SOURCECRED_INSTANCE || ''

export default {
  data: new SlashCommandBuilder()
    .setName('payments-csv')
    .setDescription(
      'Admin only command: Generates SC payments CSV file for threshold specified'
    )
    .addNumberOption((option) =>
      option
        .setName('threshold')
        .setDescription('Minimum amount of DAI accrued')
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
      await interaction.deferReply()

      const threshold = interaction.options.getNumber('threshold', true)
      const THRESHOLD_DAI = parseEther(threshold.toString())
      const ledgerAccounts = await getLedgerAccounts()
      const elligibleAccounts = ledgerAccounts
        .filter(
          (acc) =>
            acc.active &&
            acc.identity.id !== DAI_REDEMPTIONS_ACCOUNT_ID &&
            parseUnits(acc.balance, 'wei').gte(THRESHOLD_DAI)
        )
        .map((acc) => ({
          name: acc.identity.name,
          balance: Math.floor(parseFloat(formatEther(acc.balance))).toString(),
          payoutAddress: acc.payoutAddresses.values().next().value,
        }))
        .filter((acc) => acc.payoutAddress)
        .sort((currentAcc, nextAcc) => +nextAcc.balance - +currentAcc.balance)

      if (!elligibleAccounts.length)
        throw 'No elligible accounts for this distribution'

      const transfersArr = elligibleAccounts.map(
        (acc) =>
          `${TOKEN_TYPE},${TOKEN_CONTRACT},${acc.payoutAddress},${acc.balance}`
      )

      // Generate human readable text file for reference
      writeFileSync(
        './payments.txt',
        `name, amount\n${elligibleAccounts
          .map((acc) => `${acc.name}, ${acc.balance} DAI`)
          .join('\n')}`
      )
      // Generate CSV file for payments
      writeFileSync(
        './payments.csv',
        `${PAYMENTS_CSV_HEADING}\n${transfersArr.join('\n')}`
      )

      const csvFile = createReadStream('./payments.csv')
      const txtFile = createReadStream('./payments.txt')

      const ipfsRes = await pushDistributionToIPFS(csvFile, txtFile)
      if (!ipfsRes)
        throw 'There was an error trying to push distribution to IPFS'

      await interaction.editReply({
        content: `Payments CSV file and human readable text file for reference \nSC instance: ${
          SOURCECRED_INSTANCE || 'error: unable to fetch instance name'
        }`,
        files: [
          new MessageAttachment(readFileSync('./payments.csv'), 'payments.csv'),
          new MessageAttachment(readFileSync('./payments.txt'), 'payments.txt'),
        ],
      })
    } catch (err) {
      console.log(err)
      if (typeof err === 'string') interaction.editReply(err)
      else
        interaction.editReply(
          'There was an error fetching grain balances, please try again'
        )
    }
  },
}
