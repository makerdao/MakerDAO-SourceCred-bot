import { Client } from '@notionhq/client'

const NOTION_AUTHORIZATION_TOKEN = process.env.NOTION_AUTHORIZATION_TOKEN || ''
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || ''

export type User = {
  discourse: string
  address: string
}

type UserPageData = {
  id: string
  name: string
  lastModified: string
}

const notion = new Client({
  auth: NOTION_AUTHORIZATION_TOKEN,
})

export const pushUserToNotion = async (
  discourse: string,
  address: string
): Promise<number> => {
  try {
    const userExists = await checkIfUserExists(discourse)
    if (userExists) return 409

    await notion.pages.create({
      parent: {
        database_id: NOTION_DATABASE_ID,
      },
      properties: {
        Name: {
          title: [
            {
              text: { content: discourse },
            },
          ],
        },
        'Wallet address': {
          rich_text: [
            {
              text: { content: address },
            },
          ],
        },
        'Enable opt-in': {
          rich_text: [
            {
              text: { content: 'Yes - I want to receive DAI.' },
            },
          ],
        },
        Status: {
          type: 'select',
          select: {
            name: 'Needs likes',
          },
        },
      },
    })

    return 201
  } catch (err) {
    console.log(err)
    return 500
  }
}

export const fetchUsersFromNotion = async (status: string): Promise<User[]> => {
  const response = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
    filter: {
      property: 'Status',
      select: {
        equals: status,
      },
    },
  })

  const users: User[] = response.results.map((user) => ({
    // @ts-ignore
    discourse: user.properties.Name.title[0].plain_text,
    // @ts-ignore
    address: user.properties['Wallet address'].rich_text[0].plain_text,
  }))

  return users
}

export const fetchInactiveUsersFromNotion = async (): Promise<
  UserPageData[]
> => {
  const response = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
    filter: {
      and: [
        {
          property: 'Status',
          select: {
            equals: 'Needs likes',
          },
        },
        {
          timestamp: 'last_edited_time',
          last_edited_time: {
            before: new Date(
              Date.now() - 1000 * 60 * 60 * 24 * 30
            ).toISOString(), // Now - 30 days
          },
        },
      ],
    },
  })

  return response.results.map((res) => ({
    id: res.id,
    // @ts-ignore
    name: res.properties.Name.title[0].plain_text,
    lastModified: new Date(
      // @ts-ignore
      res.properties['Latest change'].last_edited_time
    ).toDateString(),
  }))
}

export const removeUserFromNotion = async (id: string): Promise<number> => {
  try {
    await notion.pages.update({
      page_id: id,
      archived: true,
    })

    return 200
  } catch (err) {
    console.log(err)
    return 404
  }
}

export const updateUserStatus = async (
  discourse: string,
  status: string
): Promise<number> => {
  try {
    const dbResponse = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter: {
        property: 'Name',
        rich_text: {
          equals: discourse,
        },
      },
    })

    if (dbResponse.results.length === 0) return 404
    const userId = dbResponse.results[0].id

    const pageUpdateResponse = await notion.pages.update({
      page_id: userId,
      properties: {
        Status: {
          select: {
            name: status,
          },
        },
      },
    })

    if (pageUpdateResponse.id) return 200
    else return 500
  } catch (err) {
    console.log(err)
    return 500
  }
}

const checkIfUserExists = async (username: string): Promise<boolean> => {
  const response = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
    filter: {
      property: 'Name',
      rich_text: {
        equals: username,
      },
    },
  })

  return response.results.length > 0
}
