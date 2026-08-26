import pb from '@/lib/pocketbase/client'

interface BatchFetchOptions {
  sort?: string
  filter?: string
  expand?: string
}

export async function fetchAllBatched<T = any>(
  collection: string,
  options: BatchFetchOptions = {},
  onFirstBatch?: (items: T[], hasMore: boolean) => void,
): Promise<T[]> {
  const perPage = 500
  const firstPage = await pb.collection(collection).getList<T>(1, perPage, options)

  const allItems = [...firstPage.items] as unknown as T[]

  if (firstPage.totalPages > 1) {
    if (onFirstBatch) {
      onFirstBatch(allItems, true)
    }

    const promises: Promise<any>[] = []
    for (let p = 2; p <= firstPage.totalPages; p++) {
      promises.push(pb.collection(collection).getList<T>(p, perPage, options))
    }

    const pages = await Promise.all(promises)
    for (const page of pages) {
      allItems.push(...(page.items as unknown as T[]))
    }
  }

  return allItems
}
