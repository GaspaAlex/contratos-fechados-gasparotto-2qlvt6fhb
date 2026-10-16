import type { PageRotationMap, RotatePdfProgressUpdate, RotatePdfResult } from './pdf-rotator'
import type { RotateWorkerInMessage, RotateWorkerOutMessage } from './rotate.worker'
import { rotatePdfLocally } from './pdf-rotator'

export interface RotateExecutionClientOptions {
  fileName: string
  buffer: ArrayBuffer
  rotations: PageRotationMap
  allowSignedDocument?: boolean
  onProgress?: (progress: RotatePdfProgressUpdate) => void
  onCancel?: () => void
}

export interface RotateExecutionHandle {
  promise: Promise<RotatePdfResult>
  cancel: () => void
}

/**
 * Executa a rotação de páginas preferencialmente via Web Worker (rotate.worker.ts).
 * Se o navegador não suportar Web Worker ou se houver falha de instanciação,
 * executa de forma assíncrona no thread principal sem travar a interface.
 */
export function executePdfRotate(options: RotateExecutionClientOptions): RotateExecutionHandle {
  const { fileName, buffer, rotations, allowSignedDocument = false, onProgress } = options

  let worker: Worker | null = null
  let isCancelled = false

  const cancel = () => {
    isCancelled = true
    if (worker) {
      try {
        worker.postMessage({ type: 'CANCEL' } satisfies RotateWorkerInMessage)
        worker.terminate()
      } catch {
        // Ignora erro no cancelamento/término
      }
      worker = null
    }
  }

  const promise = new Promise<RotatePdfResult>((resolve) => {
    try {
      worker = new Worker(new URL('./rotate.worker.ts', import.meta.url), {
        type: 'module',
      })

      worker.onmessage = (event: MessageEvent<RotateWorkerOutMessage>) => {
        const msg = event.data
        if (!msg) return

        if (msg.type === 'PROGRESS') {
          if (onProgress && !isCancelled) {
            onProgress(msg.progress)
          }
        } else if (msg.type === 'SUCCESS') {
          if (worker) {
            worker.terminate()
            worker = null
          }
          if (isCancelled) {
            resolve({
              success: false,
              totalOriginalPages: msg.totalOriginalPages,
              totalModifiedPages: 0,
              hasSignedDocument: msg.hasSignedDocument,
              errorCode: 'CANCELLED',
              error: 'Operação cancelada pelo usuário.',
            })
          } else {
            resolve({
              success: true,
              rotatedBuffer: msg.rotatedBuffer,
              fileName: msg.fileName,
              totalOriginalPages: msg.totalOriginalPages,
              totalModifiedPages: msg.totalModifiedPages,
              hasSignedDocument: msg.hasSignedDocument,
            })
          }
        } else if (msg.type === 'ERROR') {
          if (worker) {
            worker.terminate()
            worker = null
          }
          resolve({
            success: false,
            totalOriginalPages: 0,
            totalModifiedPages: 0,
            hasSignedDocument: false,
            error: msg.error,
            errorCode: (msg.errorCode as RotatePdfResult['errorCode']) || 'GENERIC_ERROR',
          })
        }
      }

      worker.onerror = (err) => {
        console.warn('Erro no Web Worker de rotação, executando fallback local:', err)
        if (worker) {
          worker.terminate()
          worker = null
        }
        fallbackLocalRotate(options, () => isCancelled).then(resolve)
      }

      // Envia uma cópia do buffer como transferível
      const slice = buffer.slice(0)
      worker.postMessage(
        {
          type: 'START_ROTATE',
          fileName,
          buffer: slice,
          rotations,
          allowSignedDocument,
        } satisfies RotateWorkerInMessage,
        [slice],
      )
    } catch (workerErr) {
      console.warn('Web Worker não disponível, executando rotação no thread principal:', workerErr)
      fallbackLocalRotate(options, () => isCancelled).then(resolve)
    }
  })

  return {
    promise,
    cancel,
  }
}

/**
 * Fallback assíncrono caso o Web Worker não possa ser instanciado
 */
async function fallbackLocalRotate(
  options: RotateExecutionClientOptions,
  checkCancelled: () => boolean,
): Promise<RotatePdfResult> {
  // Dá um respiro à interface
  await new Promise((r) => setTimeout(r, 10))

  return rotatePdfLocally({
    fileName: options.fileName,
    buffer: options.buffer.slice(0),
    rotations: options.rotations,
    allowSignedDocument: options.allowSignedDocument,
    onProgress: options.onProgress,
    checkCancelled,
  })
}
