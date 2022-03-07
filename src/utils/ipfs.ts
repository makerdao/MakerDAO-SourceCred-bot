import fetch from 'node-fetch'
import FormData from 'form-data'
import axios from 'axios'
import { ReadStream } from 'fs'

const PINATA_AUTHORIZATION_TOKEN = process.env.PINATA_AUTHORIZATION_TOKEN || ''

export const pushUserToIPFS = async (
  discourse: string,
  address: string,
  action: string
): Promise<boolean> => {
  try {
    const body = {
      pinataMetadata: { name: discourse },
      pinataContent: { discourse, address, action },
    }

    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'post',
      body: JSON.stringify(body, null, 2),
      headers: {
        Authorization: PINATA_AUTHORIZATION_TOKEN,
        'Content-Type': 'application/json',
      },
    })

    if (res.status !== 200) return false
    return true
  } catch (err) {
    return false
  }
}

export const pushDistributionToIPFS = async (
  csvFile: ReadStream,
  txtFile: ReadStream
): Promise<boolean> => {
  try {
    const csvFormData = new FormData()
    const txtFormData = new FormData()

    const csvMetadata = JSON.stringify({
      name: 'distribution.csv',
    })
    const txtMetadata = JSON.stringify({
      name: 'distribution.txt',
    })

    csvFormData.append('file', csvFile)
    csvFormData.append('pinataMetadata', csvMetadata)
    txtFormData.append('file', txtFile)
    txtFormData.append('pinataMetadata', txtMetadata)

    await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      csvFormData,
      {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${csvFormData.getBoundary()}`,
          Authorization: PINATA_AUTHORIZATION_TOKEN,
        },
      }
    )

    await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'post',
      headers: {
        Authorization: PINATA_AUTHORIZATION_TOKEN,
        'Content-Type': `multipart/form-data; boundary=${txtFormData.getBoundary()}`,
      },
      body: txtFormData,
    })

    return true
  } catch (err) {
    console.log(err)
    return false
  }
}

type TransactionData = {
  address: string
  amount: string
}

export const fetchDistributionFromIPFS = async (): Promise<
  TransactionData[]
> => {
  const pinListRes = await fetch(
    'https://api.pinata.cloud/data/pinList?status=pinned',
    { headers: { Authorization: PINATA_AUTHORIZATION_TOKEN } }
  )
  const pinListBody = await pinListRes.json()
  const pinHash: string = pinListBody.rows.find(
    (pin: Row) => pin.metadata.name === 'distribution.csv'
  )?.ipfs_pin_hash

  if (!pinHash) throw 'No distribution CSV file was found on IPFS'

  const pinRes = await fetch(`https://gateway.pinata.cloud/ipfs/${pinHash}`)
  const pinBody = await pinRes.text()

  const transactionArray = pinBody.split('\n').slice(1)
  const transactionData: TransactionData[] = transactionArray.map((tx) => {
    const [, , address, rawAmount] = tx.split(',')
    return { address, amount: rawAmount + '000000000000000000' }
  })

  return transactionData
}

export interface User {
  discourse: string
  address: string
  action: string
  ipfsPinHash: string
}

interface PinMetadata {
  name: string
}
interface Row {
  ipfs_pin_hash: string
  metadata: PinMetadata
}

export const fetchUsersFromIPFS = async (): Promise<User[]> => {
  const pinListRes = await fetch(
    'https://api.pinata.cloud/data/pinList?status=pinned',
    { headers: { Authorization: PINATA_AUTHORIZATION_TOKEN } }
  )
  const pinListBody = await pinListRes.json()
  const pinList: string[] = pinListBody.rows
    .filter(
      (pin: Row) =>
        pin.metadata.name !== 'distribution.csv' &&
        pin.metadata.name !== 'distribution.txt'
    )
    .map((pin: Row) => pin.ipfs_pin_hash)
    .reverse()
  let userData: User[] = []

  for (const pin of pinList) {
    const pinRes = await fetch(`https://gateway.pinata.cloud/ipfs/${pin}`)
    const pinBody: { discourse: string; address: string; action: string } =
      await pinRes.json()
    userData.push({
      ...pinBody,
      ipfsPinHash: pin,
    })
  }

  return userData
}

export const removeUsersFromIPFS = async (userList: User[]): Promise<void> => {
  for (const user of userList) {
    await fetch(`https://api.pinata.cloud/pinning/unpin/${user.ipfsPinHash}`, {
      method: 'delete',
      headers: {
        Authorization: PINATA_AUTHORIZATION_TOKEN,
        'Content-Type': 'application/json',
      },
    })
  }
}
