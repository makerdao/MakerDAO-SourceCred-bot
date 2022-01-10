import { MessageEmbed } from 'discord.js'

export function verifyDiscourseEmbed(verificationCode: string): MessageEmbed {
  return new MessageEmbed({
    title: 'Verify discourse account',
    description:
      'Process to verify your account to opt-in for SourceCred distributions.',
    color: 16769024,
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
