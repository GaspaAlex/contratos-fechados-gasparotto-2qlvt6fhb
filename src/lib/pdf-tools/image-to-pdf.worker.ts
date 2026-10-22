import {
  convertImagesToPdfLocally,
  type ImageToPdfFileItem,
  type ImagePageLayout,
  type ImageToPdfProgressUpdate,
} from './image-to-pdf'

export type ImageToPdfWorkerInMessage =
  | {
      type: 'START_CONVERT'
      images: ImageToPdfFileItem[]
      layout: ImagePageLayout
    }
  | {
      type: 'CANCEL'
    }

export type ImageToPdfWorkerOutMessage =
  | {
      type: 'PROGRESS'
      progress: ImageToPdfProgressUpdate
    }
  | {
      type: 'SUCCESS'
      pdfBuffer: ArrayBuffer
      fileName: string
      totalImages: number
      pageCount: number
      layout: ImagePageLayout
    }
  | {
      type: 'ERROR'
      error: string
      errorCode?: string
      failingImageName?: string
    }

let isCancelled = false

self.addEventListener('message', async (event: MessageEvent<ImageToPdfWorkerInMessage>) => {
  const data = event.data
  if (!data) return

  if (data.type === 'CANCEL') {
    isCancelled = true
    return
  }

  if (data.type === 'START_CONVERT') {
    isCancelled = false
    const { images, layout } = data

    try {
      const result = await convertImagesToPdfLocally({
        images,
        layout,
        onProgress: (progress) => {
          self.postMessage({
            type: 'PROGRESS',
            progress,
          } satisfies ImageToPdfWorkerOutMessage)
        },
        checkCancelled: () => isCancelled,
      })

      if (result.success && result.pdfBuffer) {
        const transferables: Transferable[] = [result.pdfBuffer]

        const post = self.postMessage as unknown as (
          msg: unknown,
          transfer?: Transferable[],
        ) => void

        post(
          {
            type: 'SUCCESS',
            pdfBuffer: result.pdfBuffer,
            fileName: result.fileName || 'imagens-convertidas.pdf',
            totalImages: result.totalImages,
            pageCount: result.pageCount,
            layout: result.layout,
          } satisfies ImageToPdfWorkerOutMessage,
          transferables,
        )
      } else {
        self.postMessage({
          type: 'ERROR',
          error: result.error || 'Ocorreu uma falha ao converter as imagens em PDF.',
          errorCode: result.errorCode,
          failingImageName: result.failingImageName,
        } satisfies ImageToPdfWorkerOutMessage)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      self.postMessage({
        type: 'ERROR',
        error: `Erro no processamento do Worker de imagens para PDF: ${message}`,
        errorCode: 'GENERIC_ERROR',
      } satisfies ImageToPdfWorkerOutMessage)
    }
  }
})
