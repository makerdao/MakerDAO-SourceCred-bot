// @ts-ignore
import { sourcecred } from 'sourcecred'
import { User } from './notion'

import { DAI_REDEMPTIONS_ACCOUNT_ID, TOKEN_CONTRACT } from '../constants'

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

interface LedgerAccount {
  balance: string
  paid: string
  identity: SCIdentity
  active: boolean
  mergedIdentityIds: string[]
  payoutAddresses: Map<string, string>
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

export const getLedgerAccounts = async (): Promise<LedgerAccount[]> => {
  const instance = await getSCInstance()
  const ledger = await instance.readLedger()
  return ledger.accounts()
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

export const setSCPayoutAddressAndActivateOrRemove = async (
  ledgerManager: any,
  usersToActivate: User[],
  usersToDeactivate: User[]
): Promise<{ usersActivated: User[]; usersDeactivated: User[] }> => {
  await ledgerManager.reloadLedger()
  const ledger = ledgerManager.ledger
  const usersActivated: User[] = []
  const usersDeactivated: User[] = []

  for (const user of usersToActivate) {
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
        TOKEN_CONTRACT // DAI token address
      )

    // Activate account
    if (!account.active) ledger.activate(account.identity.id)

    usersActivated.push(user)
  }

  for (const user of usersToDeactivate) {
    const account = ledger.accountByAddress(discourseAddress(user.discourse))
    if (!account) continue

    // Remove wallet address
    if (account.payoutAddresses.size)
      ledger.setPayoutAddress(
        account.identity.id, // user identity id
        null, // user wallet address
        '1', // Ethereum mainnet chain id
        TOKEN_CONTRACT // DAI token address
      )

    // Deactivate account
    if (account.active) ledger.deactivate(account.identity.id)

    usersDeactivated.push(user)
  }

  // Sync changes with remote ledger (GH instance)
  const persistRes = await ledgerManager.persist()
  if (persistRes.error)
    throw `An error occurred when trying to commit the new ledger: ${persistRes.error}`

  return {
    usersActivated,
    usersDeactivated,
  }
}

export const burnGrain = async (
  ledgerManager: any,
  grainBurnList: { name: string; amount: string }[]
): Promise<void> => {
  await ledgerManager.reloadLedger()
  const ledger = ledgerManager.ledger

  // Transfer grain from all users in the grainBurnList to the DAI redemptions account
  for (const { name, amount } of grainBurnList) {
    const account = ledger.accountByName(name)
    if (account.active) transferGrain(ledger, account, amount)
    else transferGrainFromInactive(ledger, account, amount)
  }

  // Sync changes with remote ledger (GH instance)
  const persistRes = await ledgerManager.persist()
  if (persistRes.error)
    throw `An error occurred when trying to commit the new ledger: ${persistRes.error}`
}

const transferGrain = (ledger: any, account: LedgerAccount, amount: string) => {
  ledger.transferGrain({
    from: account.identity.id,
    to: DAI_REDEMPTIONS_ACCOUNT_ID,
    amount,
    memo: null,
  })
}

const transferGrainFromInactive = (
  ledger: any,
  account: LedgerAccount,
  amount: string
) => {
  ledger.activate(account.identity.id)
  ledger.transferGrain({
    from: account.identity.id,
    to: DAI_REDEMPTIONS_ACCOUNT_ID,
    amount,
    memo: null,
  })
  ledger.deactivate(account.identity.id)
}
