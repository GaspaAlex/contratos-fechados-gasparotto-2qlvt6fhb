import { organizePdfLocally, type OrganizePdfProgressUpdate } from './pdf-organizer'

export type OrganizeWorkerInMessage =
  | {
      type: 'START_ORGANIZE'
      fileName: string
      buffer: ArrayBuffer
      mode?: 'organize' | 'extract'
      excludedPages?: number[]
      selectedPages?: number[]
      pageOrder?: number[]
      allowSignedDocument?: boolean
    }
  | {
      type: 'CANCEL'
    }

export type OrganizeWorkerOutMessage =
  | {
      type: 'PROGRESS'
      progress: OrganizePdfProgressUpdate
    }
  | {
      type: 'SUCCESS'
      organizedBuffer: ArrayBuffer
      fileName: string
      totalOriginalPages: number
      totalExcludedPages: number
      totalRemainingPages: number
      totalSelectedPages?: number
      totalUnselectedPages?: number
      reorderedCount?: number
      isOrderModified?: boolean
      hasSignedDocument: boolean
      mode?: 'organize' | 'extract'
    }
  | {
      type: 'ERROR'
      error: string
      errorCode?: string
    }

let isCancelled = false

self.addEventListener('message', async (event: MessageEvent<OrganizeWorkerInMessage>) => {
  const data = event.data
  if (!data) return

  if (data.type === 'CANCEL') {
    isCancelled = true
    return
  }

  if (data.type === 'START_ORGANIZE') {
    isCancelled = false
    const {
      fileName,
      buffer,
      mode = 'organize',
      excludedPages,
      selectedPages,
      pageOrder,
      allowSignedDocument,
    } = data

    try {
      const result = await organizePdfLocally({
        fileName,
        buffer,
        mode,
        excludedPages,
        selectedPages,
        pageOrder,
        allowSignedDocument,
        onProgress: (progress) => {
          self.postMessage({
            type: 'PROGRESS',
            progress,
          } satisfies OrganizeWorkerOutMessage)
        },
        checkCancelled: () => isCancelled,
      })

      if (result.success && result.organizedBuffer) {
        const transferables: Transferable[] = [result.organizedBuffer]

        const post = self.postMessage as unknown as (
          msg: unknown,
          transfer?: Transferable[],
        ) => void

        post(
          {
            type: 'SUCCESS',
            organizedBuffer: result.organizedBuffer,
            fileName:
              result.fileName ||
              (mode === 'extract' ? 'documento-extraido.pdf' : 'documento-organizado.pdf'),
            totalOriginalPages: result.totalOriginalPages,
            totalExcludedPages: result.totalExcludedPages,
            totalRemainingPages: result.totalRemainingPages,
            totalSelectedPages: result.totalSelectedPages,
            totalUnselectedPages: result.totalUnselectedPages,
            reorderedCount: result.reorderedCount,
            isOrderModified: result.isOrderModified,
            hasSignedDocument: result.hasSignedDocument,
            mode: result.mode,
          } satisfies OrganizeWorkerOutMessage,
          transferables,
        )
      } else {
        self.postMessage({
          type: 'ERROR',
          error: result.error || 'Ocorreu uma falha ao organizar o documento.',
          errorCode: result.errorCode,
        } satisfies OrganizeWorkerOutMessage)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      self.postMessage({
        type: 'ERROR',
        error: `Erro no processamento do Worker de organização: ${message}`,
        errorCode: 'GENERIC_ERROR',
      } satisfies OrganizeWorkerOutMessage)
    }
  }
})
