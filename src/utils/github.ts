import { Octokit } from 'octokit'

const GH_NAME = process.env.GH_NAME || ''
const GH_EMAIL = process.env.GH_EMAIL || ''
const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN || ''
const [GH_ORG, GH_REPO] = process.env.SOURCECRED_INSTANCE
  ? process.env.SOURCECRED_INSTANCE.split('/')
  : ''
const octokit = new Octokit({ auth: GITHUB_API_TOKEN })

const createBranch = async (): Promise<string> => {
  const date = new Date()
  const branchName = `opt-in-${date.getUTCFullYear()}-${
    date.getUTCMonth() + 1 < 10
      ? `0${date.getUTCMonth() + 1}`
      : date.getUTCMonth() + 1
  }-${date.getUTCDate() < 10 ? `0${date.getUTCDate()}` : date.getUTCDate()}`

  const masterBranch = await octokit.rest.repos.getBranch({
    owner: GH_ORG,
    repo: GH_REPO,
    branch: 'master',
  })
  if (masterBranch.status !== 200)
    throw 'There was an error while fetching GH repo'

  const masterBranchSHA = masterBranch.data.commit.sha

  const newBranch = await octokit.rest.git.createRef({
    owner: GH_ORG,
    repo: GH_REPO,
    ref: `refs/heads/${branchName}`,
    sha: masterBranchSHA,
  })
  if (newBranch.status !== 201)
    throw `There was an error while creating GH repo branch '${branchName}'`

  return branchName
}

const getLedgerFileSHAForBranch = async (
  branchName?: string
): Promise<[string, string]> => {
  const branch = branchName || (await createBranch())

  const branchResponse = await octokit.rest.repos.getBranch({
    owner: GH_ORG,
    repo: GH_REPO,
    branch: branch,
  })
  if (branchResponse.status !== 200)
    throw 'There was an error while fetching GH repo'
  const branchSHA = branchResponse.data.commit.sha

  const branchCommit = await octokit.rest.git.getCommit({
    owner: GH_ORG,
    repo: GH_REPO,
    commit_sha: branchSHA,
  })
  if (branchCommit.status !== 200)
    throw 'There was an error while fetching GH repo commit history'
  const treeSHA = branchCommit.data.tree.sha

  const tree = await octokit.rest.git.getTree({
    owner: GH_ORG,
    repo: GH_REPO,
    tree_sha: treeSHA,
  })
  if (tree.status !== 200)
    throw 'There was an error while fetching GH repo gh-pages branch'
  const dataFolderSHA =
    tree.data.tree.find((tree) => tree.path === 'data' && tree.type === 'tree')
      ?.sha || ''

  const dataFolderTree = await octokit.rest.git.getTree({
    owner: GH_ORG,
    repo: GH_REPO,
    tree_sha: dataFolderSHA,
  })
  if (dataFolderTree.status !== 200)
    throw 'There was an error while fetching GH repo gh-pages branch'
  const ledgerSHA =
    dataFolderTree.data.tree.find(
      (tree) => tree.path === 'ledger.json' && tree.type === 'blob'
    )?.sha || ''

  return [ledgerSHA, branch]
}

export const copyLedgerFromGHPages = async (): Promise<string> => {
  const [ghPagesLedgerSHA] = await getLedgerFileSHAForBranch('gh-pages')
  const [newBranchLedgerSHA, newBranchName] = await getLedgerFileSHAForBranch()

  const ghPagesLedgerFile = await octokit.rest.git.getBlob({
    owner: GH_ORG,
    repo: GH_REPO,
    file_sha: ghPagesLedgerSHA,
  })
  if (ghPagesLedgerFile.status !== 200)
    throw 'There was an error trying to fetch contents of the ledger'
  const ghPagesLedgerFileContent = ghPagesLedgerFile.data.content

  const ledgerCopyRes = await octokit.rest.repos.createOrUpdateFileContents({
    owner: GH_ORG,
    repo: GH_REPO,
    path: 'data/ledger.json',
    message: 'Update ledger from gh-pages branch',
    content: ghPagesLedgerFileContent,
    sha: newBranchLedgerSHA,
    branch: newBranchName,
    committer: {
      name: GH_NAME,
      email: GH_EMAIL,
    },
    author: {
      name: GH_NAME,
      email: GH_EMAIL,
    },
  })
  if (ledgerCopyRes.status !== 200)
    throw 'There was an error trying to copy ledger from gh-pages to new branch'

  return newBranchName
}

export const createOptInPullRequest = async (
  branch: string
): Promise<string> => {
  const prInfo = await octokit.rest.pulls.create({
    owner: GH_ORG,
    repo: GH_REPO,
    title: 'User opt in',
    head: branch,
    base: 'master',
  })

  return prInfo.data.url
}
