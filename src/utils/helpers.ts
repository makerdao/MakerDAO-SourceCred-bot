import { parseEther, formatEther } from 'ethers/lib/utils'

export const formatGrainBurnList = (
  paymentsString: string
): { name: string; amount: string }[] =>
  paymentsString
    .split('\n')
    .slice(1)
    .map((acc) => {
      const formattedAcc = acc.slice(0, acc.indexOf(' DAI'))
      const [name, rawAmount] = formattedAcc.split(', ')
      const amount = parseEther(rawAmount).toString()

      return { name, amount }
    })

export const weiToEther = (wei: string): number =>
  +parseFloat(formatEther(wei)).toFixed(2)
