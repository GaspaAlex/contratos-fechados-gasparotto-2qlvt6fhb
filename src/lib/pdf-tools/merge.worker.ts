import { mergePdfsSequentially, type MergePdfFilePayload } from './pdf-merger'
import type { MergeProgressUpdate } from './pdf-validator'

export type WorkerInMessage =
  | {
      type: 'START_MERGE'
      files: MergePdfFilePayload[]
      allowSignedDocuments?: boolean
    }
  | {
      type: 'CANCEL'
    }

export type WorkerOutMessage =
  | {
      type: 'PROGRESS'
      progress: MergeProgressUpdate
    }
  | {
      type: 'SUCCESS'
      mergedBuffer: ArrayBuffer
      pageCount: number
    }
  | {
      type: 'ERROR'
      error: string
      errorCode?: string
      failingFile?: string
    }

let isCancelled = false

self.addEventListener('message', async (event: MessageEvent<WorkerInMessage>) => {
  const data = event.data
  if (!data) return

  if (data.type === 'CANCEL') {
    isCancelled = true
    return
  }

  if (data.type === 'START_MERGE') {
    isCancelled = false
    const files = data.files
    const allowSignedDocuments = Boolean(data.allowSignedDocuments)

    try {
      const result = await mergePdfsSequentially({
        files,
        allowSignedDocuments,
        onProgress: (progress) => {
          self.postMessage({
            type: 'PROGRESS',
            progress,
          } satisfies WorkerOutMessage)
        },
        checkCancelled: () => isCancelled,
      })

      if (result.success && result.mergedBuffer) {
        // Enviar buffer transferível
        const post = self.postMessage as unknown as (
          msg: unknown,
          transfer?: Transferable[],
        ) => void
        post(
          {
            type: 'SUCCESS',
            mergedBuffer: result.mergedBuffer,
            pageCount: result.pageCount ?? 0,
          } satisfies WorkerOutMessage,
          [result.mergedBuffer],
        )
      } else {
        self.postMessage({
          type: 'ERROR',
          error: result.error || 'Ocorreu uma falha inesperada durante a união dos arquivos.',
          errorCode: result.errorCode,
          failingFile: result.failingFile,
        } satisfies WorkerOutMessage)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      self.postMessage({
        type: 'ERROR',
        error: `Erro no processamento interno do Worker: ${message}`,
        errorCode: 'GENERIC_ERROR',
      } satisfies WorkerOutMessage)
    }
  }
})
