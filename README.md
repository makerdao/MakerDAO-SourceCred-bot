# MakerDAO SourceCred bot

Discord bot to automate SourceCred instance interactions

## Available commands

### Public commands

- `/sc-cred [user]`: fetches cred and grain information for specified Discourse username
- `/sc-opt-in [discourse] [address]`: allows users to opt in for SC distributions. Checks Discourse account ownership and pushes username and wallet address to IPFS to be eventually synced to the SC instance
  - discourse: discourse username
  - address: wallet address

### Admin only commands

- `/sc-payments-csv [threshold]`: generates SC payments CSV file filtering by users who have accumulated an amount greater than or equal to the threshold passed (generated CSV file is compatible with Gnosis Safe CSV Airdrop app)
- `/sc-onboard`: fetches user list from IPFS, creates a new branch on GitHub repo, adds wallet addresses into users SC identities and activates user accounts in the SC instance. Returns the name of the new GitHub branch created
- `/sc-burn-grain [branch-name]`: transfers grain from SC instance users accounts to the burn grain account
  - branch-name: name of the GitHub branch created on the `/sc-onboard` command

## How to set up

1. Copy the contents of the `.env.sample` file into a new `.env` file, changing the values to your own.
   - `BOT_TOKEN`: Discord bot token, check [this guide](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token) to know how to create a Discord Bot and obtain a token
   - `CLIENT_ID`: Discord Bot ID
   - `GUILD_ID`: Discord server ID
   - `SOURCECRED_INSTANCE`: Path to your SourceCred instance (e.g. sourcecred/makerdao-cred/gh-pages)
   - `PINATA_AUTHORIZATION_TOKEN`: Pinata API key in the form of a Bearer token. This application uses Pinata as the IPFS pinning service. Check [Pinata docs](https://docs.pinata.cloud/#your-api-keys) for information on how to get the API key
   - `SOURCECRED_ADMINS`: Discord ID list of users with admin permissions to the SC instance in the formats `'123456789'` or `'123456789, 987654321, 456789123, ...'`
   - `GITHUB_API_TOKEN`: GitHub personal access token needed to create branches and copy the ledger from one branch to another in the SC instance's GitHub repo. Check [GitHub docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) for information on how to create one
   - `GH_NAME`: Name for GitHub commits
   - `GH_EMAIL`: Email for GitHub commits
2. Change the variables in [src/constants/index.ts](src/constants/index.ts) to those that apply for you.
   - `TOKEN_CONTRACT`: Address of the token used for SourceCred grain payments
   - `DAI_REDEMPTIONS_ACCOUNT_ID`: ID of the SourceCred instance account set up to receive grain transfers
3. Deploy the bot and invite it to your Discord server.
