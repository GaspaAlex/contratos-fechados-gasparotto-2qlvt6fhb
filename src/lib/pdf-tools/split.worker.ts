import {
  splitPdfLocally,
  type SplitMode,
  type PageRange,
  type SplitPdfProgressUpdate,
} from './pdf-splitter'

export type SplitWorkerInMessage =
  | {
      type: 'START_SPLIT'
      fileName: string
      buffer: ArrayBuffer
      mode: SplitMode
      ranges?: PageRange[]
      extractPagesString?: string
      allowSignedDocument?: boolean
    }
  | {
      type: 'CANCEL'
    }

export type SplitWorkerOutMessage =
  | {
      type: 'PROGRESS'
      progress: SplitPdfProgressUpdate
    }
  | {
      type: 'SUCCESS'
      files: Array<{
        name: string
        buffer: ArrayBuffer
        pageCount: number
        sizeBytes: number
      }>
      zipBuffer?: ArrayBuffer
      zipName?: string
      totalOriginalPages: number
      totalPagesProcessed: number
      hasSignedDocument: boolean
    }
  | {
      type: 'ERROR'
      error: string
      errorCode?: string
    }

let isCancelled = false

self.addEventListener('message', async (event: MessageEvent<SplitWorkerInMessage>) => {
  const data = event.data
  if (!data) return

  if (data.type === 'CANCEL') {
    isCancelled = true
    return
  }

  if (data.type === 'START_SPLIT') {
    isCancelled = false
    const { fileName, buffer, mode, ranges, extractPagesString, allowSignedDocument } = data

    try {
      const result = await splitPdfLocally({
        fileName,
        buffer,
        mode,
        ranges,
        extractPagesString,
        allowSignedDocument,
        onProgress: (progress) => {
          self.postMessage({
            type: 'PROGRESS',
            progress,
          } satisfies SplitWorkerOutMessage)
        },
        checkCancelled: () => isCancelled,
      })

      if (result.success) {
        // Coletar buffers transferíveis para não duplicar memória no postMessage
        const transferables: Transferable[] = []
        for (const f of result.files) {
          transferables.push(f.buffer)
        }
        if (result.zipBuffer) {
          transferables.push(result.zipBuffer)
        }

        const post = self.postMessage as unknown as (
          msg: unknown,
          transfer?: Transferable[],
        ) => void

        post(
          {
            type: 'SUCCESS',
            files: result.files,
            zipBuffer: result.zipBuffer,
            zipName: result.zipName,
            totalOriginalPages: result.totalOriginalPages,
            totalPagesProcessed: result.totalPagesProcessed,
            hasSignedDocument: result.hasSignedDocument,
          } satisfies SplitWorkerOutMessage,
          transferables,
        )
      } else {
        self.postMessage({
          type: 'ERROR',
          error: result.error || 'Ocorreu uma falha ao dividir o documento.',
          errorCode: result.errorCode,
        } satisfies SplitWorkerOutMessage)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      self.postMessage({
        type: 'ERROR',
        error: `Erro no processamento do Worker de divisão: ${message}`,
        errorCode: 'GENERIC_ERROR',
      } satisfies SplitWorkerOutMessage)
    }
  }
})
