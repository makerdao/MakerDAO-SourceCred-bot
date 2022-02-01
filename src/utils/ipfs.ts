import fetch from 'node-fetch'

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

export interface User {
  discourse: string
  address: string
  action: string
  ipfsPinHash: string
}

interface Row {
  ipfs_pin_hash: string
}

export const fetchUsersFromIPFS = async (): Promise<User[]> => {
  const pinListRes = await fetch(
    'https://api.pinata.cloud/data/pinList?status=pinned',
    { headers: { Authorization: PINATA_AUTHORIZATION_TOKEN } }
  )
  const pinListBody = await pinListRes.json()
  const pinList: string[] = pinListBody.rows
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
