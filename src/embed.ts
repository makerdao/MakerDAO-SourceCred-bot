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
      'Process to verify your account to opt-in for SourceCred distributions.',
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
    description: `Recent cred and cred and grain information for user ${username}`,
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
