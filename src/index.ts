import { ApolloClient, gql, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client'
import fetch from 'cross-fetch'

class HQNowRepoPlugin implements IRepoPluginRepository {
  public RepoName = 'HQ Now'
  public RepoTag = 'hqnow'
  public RepoUrl = 'https://admin.hq-now.com/graphql'
  private client: ApolloClient<NormalizedCacheObject>

  constructor() {
    const cache: InMemoryCache = new InMemoryCache({
      addTypename: false
    })
    this.client = new ApolloClient({
      cache,
      link: new HttpLink({ uri: this.RepoUrl, fetch })
    })
  }

  public methods: IRepoPluginMethods = {
    getList: async (): Promise<ComicInterface[]> => this.methods.search({ search: 'A' }),

    search: async ({ search }): Promise<ComicInterface[]> => {
      const query = {
        query: gql`
          query getHqsByName($search: String!) {
            getHqsByName(name: $search) {
              siteId: id
              name
              synopsis
              status
            }
          }
        `,
        variables: { search }
      }

      try {
        const { data } = await this.client.query(query)
        return new Promise((resolve) => {
          resolve(data.getHqsByName as ComicInterface[])
        })
      } catch (_e) {
        return new Promise((resolve) => {
          resolve([])
        })
      }
    },

    getDetails: async (search): Promise<Partial<ComicInterface>> => {
      const { siteId } = search
      const { data } = await this.client.query({
        query: gql`
          query getHqsById($id: Int!) {
            getHqsById(id: $id) {
              cover: hqCover
              publisher: publisherName
            }
          }
        `,
        variables: { id: Number(siteId) }
      })

      const res = {
        ...data.getHqsById[0],
        siteId: String(siteId),
        type: 'hq'
      }

      return new Promise((resolve) => {
        resolve(res)
      })
    },

    getChapters: async ({ siteId }): Promise<ChapterInterface[]> => {
      const query = {
        query: gql`
          query getChaptersByHqId($id: Int!) {
            getChaptersByHqId(hqId: $id) {
              name
              number
              siteId: id
              pages: pictures {
                filename: image
                path: pictureUrl
              }
            }
          }
        `,
        variables: { id: Number(siteId) }
      }

      const { data } = await this.client.query(query)
      //@ts-ignore
      const res = data.getChaptersByHqId.reduce((acc, chapter) => {
        return [
          ...acc,
          {
            ...chapter,
            siteId: String(siteId),
            offline: false,
            pages: JSON.stringify(chapter.pages)
          }
        ]
      }, []) as ChapterInterface[]

      return new Promise((resolve) => {
        resolve(res)
      })
    }
  }
}

export default HQNowRepoPlugin
