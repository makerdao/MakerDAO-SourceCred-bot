import { parseEther, formatEther } from 'ethers/lib/utils'

export const formatGrainBurnList = (
  paymentsBuffer: ArrayBuffer
): { name: string; amount: string }[] =>
  paymentsBuffer
    .toString()
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
