import fetch from 'node-fetch'
import { MessageEmbed } from 'discord.js'
import { verifyDiscourseEmbed } from '../embed'

export const handleDiscourseVerify = (): {
  verificationCode: string
  verificationEmbed: MessageEmbed
} => {
  const verificationCode = createVerificationCode()
  const verificationEmbed = verifyDiscourseEmbed(verificationCode)

  return { verificationCode, verificationEmbed }
}

export const handleDiscourseCheck = async (
  verificationCode: string,
  discourseUsername: string
): Promise<boolean> => {
  const discourseRes = await fetch(
    `https://forum.makerdao.com/u/${discourseUsername}.json`
  )
  if (discourseRes.status !== 200)
    throw 'There was a problem fetching Discourse user, please try again'

  const discourseResBody = await discourseRes.json()
  const discourseName: string = discourseResBody.user.name

  return discourseName.trim() === verificationCode
}

// generate random code for user
const createVerificationCode = (): string =>
  Math.random().toString(36).substring(2, 12)
