import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, MessageAttachment } from 'discord.js'
import fetch from 'node-fetch'
import { ethers } from 'ethers'
import { readFileSync, writeFileSync } from 'fs'

// import { fetchDistributionFromIPFS } from '../utils/ipfs'

const SOURCECRED_ADMINS = process.env.SOURCECRED_ADMINS?.split(', ') || []

// type GnosisTransactionList = {
//   dataDecoded: {
//     parameters: [{ value: string }, { value: string }]
//   }
// }[]

export default {
  data: new SlashCommandBuilder()
    .setName('get-transaction-history')
    .setDescription('Returns a Gnosis Safe transaction history'),
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

      // Fetch transactions from Gnosis
      const gnosisSafeAddress = '0x01D26f8c5cC009868A4BF66E268c17B057fF7A73'
      const daiTokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
      let gnosisTransactions = []
      let transactionsApiUrl =
        'https://safe-transaction.gnosis.io/api/v1/safes/0x01D26f8c5cC009868A4BF66E268c17B057fF7A73/transfers/'

      while (true) {
        const gnosisTransactionsRes = await fetch(transactionsApiUrl)
        if (gnosisTransactionsRes.status !== 200)
          throw 'There was an error fetching the Transactions on the Gnosis Safe, please try again'

        const gnosisTransactionsData = await gnosisTransactionsRes.json()
        const transactions = gnosisTransactionsData.results
          .filter(
            (tx: any) =>
              tx.type === 'ERC20_TRANSFER' &&
              tx.tokenAddress.toLowerCase() === daiTokenAddress.toLowerCase() &&
              ((tx.to.toLowerCase() === gnosisSafeAddress.toLowerCase() &&
                tx.from.toLowerCase() !==
                  gnosisSafeAddress.toLocaleLowerCase()) ||
                (tx.from.toLowerCase() === gnosisSafeAddress.toLowerCase() &&
                  tx.to.toLowerCase() !==
                    gnosisSafeAddress.toLocaleLowerCase()))
          )
          .map((tx: any) => {
            return {
              transactionHash: tx.transactionHash,
              executionDate: tx.executionDate,
              amount:
                tx.to.toLowerCase() === gnosisSafeAddress.toLowerCase()
                  ? Number(ethers.utils.formatEther(tx.value))
                  : -Number(ethers.utils.formatEther(tx.value)),
            }
          })

        gnosisTransactions.push(...transactions)
        if (gnosisTransactionsData.next)
          transactionsApiUrl = gnosisTransactionsData.next
        else break
      }

      const csvInput = [
        'transaction, date, amount',
        ...gnosisTransactions.map(
          (tx) => tx.transactionHash + ',' + tx.executionDate + ',' + tx.amount
        ),
      ].join('\n')

      writeFileSync('./gnosis-safe-transactions.csv', csvInput)

      interaction.editReply({
        content: 'Done',
        files: [
          new MessageAttachment(
            readFileSync('./gnosis-safe-transactions.csv'),
            'gnosis-safe-transactions.csv'
          ),
        ],
      })
    } catch (err) {
      console.log(err)
      interaction.editReply('There was an error fetching information')
    }
  },
}
