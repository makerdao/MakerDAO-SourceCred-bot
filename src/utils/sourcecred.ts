import { sourcecred } from 'sourcecred'
import { User } from './ipfs'

interface SCAlias {
  address: string
  description: string
}

interface SCIdentity {
  id: string
  subtype: string
  name: string
  address: string
  aliases: SCAlias[]
}

interface CredGrainViewParticipant {
  active: string
  identity: SCIdentity
  cred: number
  credPerInterval: number[]
  grainEarned: string
  grainEarnedPerInterval: string[]
}

const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN || ''
const [GH_ORG, GH_REPO, GH_BRANCH] = process.env.SOURCECRED_INSTANCE
  ? process.env.SOURCECRED_INSTANCE.split('/')
  : ''
const discourseAddress = (username: string) =>
  `N\u0000sourcecred\u0000discourse\u0000user\u0000https://forum.makerdao.com\u0000${username}\u0000`

const getSCInstance = async () => {
  const instance =
    await sourcecred.instance.readInstance.getRawGithubReadInstance(
      GH_ORG,
      GH_REPO,
      GH_BRANCH
    )

  return instance
}

export const getCredGrainViewParticipants = async (): Promise<
  CredGrainViewParticipant[]
> => {
  const instance = await getSCInstance()
  const credGrainView = await instance.readCredGrainView()
  return credGrainView.participants()
}

export const getLedgerManager = (branch: string): any => {
  const storage = new sourcecred.ledger.storage.GithubStorage({
    apiToken: GITHUB_API_TOKEN,
    repo: `${GH_ORG}/${GH_REPO}`,
    branch,
  })
  const ledgerManager = new sourcecred.ledger.manager.LedgerManager({
    storage,
  })

  return ledgerManager
}

export const setSCPayoutAddressAndActivate = async (
  ledgerManager: any,
  userList: User[]
): Promise<User[]> => {
  await ledgerManager.reloadLedger()
  const ledger = ledgerManager.ledger
  let modifiedUsers: User[] = []

  for (const user of userList) {
    const account = ledger.accountByAddress(discourseAddress(user.discourse))
    if (!account) continue

    // Add wallet address
    if (
      !account.payoutAddresses.size ||
      account.payoutAddresses.values().next().value !== user.address
    )
      ledger.setPayoutAddress(
        account.identity.id, // user identity id
        user.address, // user wallet address
        '1', // Ethereum mainnet chain id
        '0x6b175474e89094c44da98b954eedeac495271d0f' // DAI token address
      )

    // Activate account
    if (!account.active) ledger.activate(account.identity.id)

    modifiedUsers.push(user)
  }

  // Sync changes with remote ledger (GH instance)
  const persistRes = await ledgerManager.persist()
  if (persistRes.error)
    throw `An error occurred when trying to commit the new ledger: ${persistRes.error}`

  return modifiedUsers
}
