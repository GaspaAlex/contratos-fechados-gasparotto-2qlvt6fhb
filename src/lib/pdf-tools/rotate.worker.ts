import { rotatePdfLocally, type PageRotationMap, type RotatePdfProgressUpdate } from './pdf-rotator'

export type RotateWorkerInMessage =
  | {
      type: 'START_ROTATE'
      fileName: string
      buffer: ArrayBuffer
      rotations: PageRotationMap
      allowSignedDocument?: boolean
    }
  | {
      type: 'CANCEL'
    }

export type RotateWorkerOutMessage =
  | {
      type: 'PROGRESS'
      progress: RotatePdfProgressUpdate
    }
  | {
      type: 'SUCCESS'
      rotatedBuffer: ArrayBuffer
      fileName: string
      totalOriginalPages: number
      totalModifiedPages: number
      hasSignedDocument: boolean
    }
  | {
      type: 'ERROR'
      error: string
      errorCode?: string
    }

let isCancelled = false

self.addEventListener('message', async (event: MessageEvent<RotateWorkerInMessage>) => {
  const data = event.data
  if (!data) return

  if (data.type === 'CANCEL') {
    isCancelled = true
    return
  }

  if (data.type === 'START_ROTATE') {
    isCancelled = false
    const { fileName, buffer, rotations, allowSignedDocument } = data

    try {
      const result = await rotatePdfLocally({
        fileName,
        buffer,
        rotations,
        allowSignedDocument,
        onProgress: (progress) => {
          self.postMessage({
            type: 'PROGRESS',
            progress,
          } satisfies RotateWorkerOutMessage)
        },
        checkCancelled: () => isCancelled,
      })

      if (result.success && result.rotatedBuffer) {
        const transferables: Transferable[] = [result.rotatedBuffer]

        const post = self.postMessage as unknown as (
          msg: unknown,
          transfer?: Transferable[],
        ) => void

        post(
          {
            type: 'SUCCESS',
            rotatedBuffer: result.rotatedBuffer,
            fileName: result.fileName || 'documento-rotacionado.pdf',
            totalOriginalPages: result.totalOriginalPages,
            totalModifiedPages: result.totalModifiedPages,
            hasSignedDocument: result.hasSignedDocument,
          } satisfies RotateWorkerOutMessage,
          transferables,
        )
      } else {
        self.postMessage({
          type: 'ERROR',
          error: result.error || 'Ocorreu uma falha ao rotacionar o documento.',
          errorCode: result.errorCode,
        } satisfies RotateWorkerOutMessage)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      self.postMessage({
        type: 'ERROR',
        error: `Erro no processamento do Worker de rotação: ${message}`,
        errorCode: 'GENERIC_ERROR',
      } satisfies RotateWorkerOutMessage)
    }
  }
})
