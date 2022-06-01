import { MessageEmbed } from 'discord.js'

interface Cred {
  total: number
  thisWeek: number
  lastWeek: number
  thisMonth: number
}

interface Grain {
  total: number
  lastWeek: number
  thisMonth: number
}

export function verifyDiscourseEmbed(verificationCode: string): MessageEmbed {
  return new MessageEmbed({
    title: 'Verify discourse account',
    description:
      'Process to verify your account to opt-in or opt-out for SourceCred distributions.',
    color: '#1AAB9B',
    fields: [
      {
        name: '1. Change your discourse name',
        value: `Go to your account preferences, after that, change your 'Name' field temporarily into this: \`${verificationCode}\` and finally click 'Save Changes' (You can change your name back after the verification process ends).`,
      },
      {
        name: '2. Complete the verification',
        value: `Confirm the previous step by clicking on the Confirm button below`,
      },
    ],
    timestamp: new Date(),
    footer: {
      text: 'makerdao.sourcecred.io',
    },
  })
}

export function credEmbed(
  username: string,
  cred: Cred,
  grain: Grain
): MessageEmbed {
  return new MessageEmbed({
    title: `${username} - Cred and Grain`,
    description: `Recent cred and grain information for user ${username}`,
    color: '#1AAB9B',
    fields: [
      {
        name: 'Total cred',
        value: cred.total.toLocaleString('en-US'),
      },
      {
        name: 'This week',
        value: cred.thisWeek.toLocaleString('en-US'),
        inline: true,
      },
      {
        name: 'Last week',
        value: cred.lastWeek.toLocaleString('en-US'),
        inline: true,
      },
      {
        name: 'This month',
        value: cred.thisMonth.toLocaleString('en-US'),
        inline: true,
      },
      {
        name: 'Total grain',
        value: `${grain.total.toLocaleString('en-US')} DAI`,
      },
      {
        name: 'Last week',
        value: `${grain.lastWeek.toLocaleString('en-US')} DAI`,
        inline: true,
      },
      {
        name: 'This month',
        value: `${grain.thisMonth.toLocaleString('en-US')} DAI`,
        inline: true,
      },
    ],
    timestamp: new Date(),
    footer: {
      text: 'makerdao.sourcecred.io',
    },
  })
}

export function infoEmbed(): MessageEmbed {
  return new MessageEmbed({
    title: 'SourceCred bot information',
    description: 'Information about available SourceCred commands.',
    color: '#1AAB9B',
    fields: [
      {
        name: '/info',
        value: 'Information about available SourceCred commands',
      },
      {
        name: '/fetch-cred [user]',
        value:
          'Fetches cred and grain information for specified Discourse username',
      },
      {
        name: '/opt-in [discourse] [address]',
        value:
          'Allows users to opt in for SC distributions. Checks Discourse account ownership and pushes [discourse] username and wallet [address] to Notion to be eventually synced to the SC instance',
      },
      {
        name: '/opt-out [discourse]',
        value:
          'Allows users to opt out of SC distributions. Checks Discourse account ownership and pushes [discourse] username to Notion to be eventually deactivated on the SC instance',
      },
    ],
    timestamp: new Date(),
    footer: {
      text: 'makerdao.sourcecred.io',
    },
  })
}

export function adminInfoEmbed(): MessageEmbed {
  return new MessageEmbed({
    title: 'SourceCred bot admin information',
    description: 'Information about available SourceCred admin commands.',
    color: '#1AAB9B',
    fields: [
      {
        name: '/payments-csv [threshold]',
        value:
          'Generates SC payments CSV file filtering by users who have accumulated an amount greater than or equal to the [threshold] passed',
      },
      {
        name: '/onboard-users',
        value:
          'Adds wallet addresses into users SC identities and activates user accounts in the SC instance',
      },
      {
        name: '/burn-grain [branch-name]',
        value:
          'Transfers grain from SC instance users accounts to the Dai Redemptions account after payments have been made (branch-name: name of the GitHub branch created on the `/onboard-users` command)',
      },
    ],
    timestamp: new Date(),
    footer: {
      text: 'makerdao.sourcecred.io',
    },
  })
}
