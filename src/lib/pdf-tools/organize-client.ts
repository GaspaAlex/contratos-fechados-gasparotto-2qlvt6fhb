import type {
  OrganizeExecutionOptions,
  OrganizePdfProgressUpdate,
  OrganizePdfResult,
} from './pdf-organizer'
import type { OrganizeWorkerInMessage, OrganizeWorkerOutMessage } from './organize.worker'
import { organizePdfLocally } from './pdf-organizer'

export interface OrganizeExecutionClientOptions {
  fileName: string
  buffer: ArrayBuffer
  excludedPages: number[]
  allowSignedDocument?: boolean
  onProgress?: (progress: OrganizePdfProgressUpdate) => void
  onCancel?: () => void
}

export interface OrganizeExecutionHandle {
  promise: Promise<OrganizePdfResult>
  cancel: () => void
}

/**
 * Executa a exclusão de páginas preferencialmente via Web Worker dedicado (organize.worker.ts).
 * Se o navegador não suportar Web Worker ou se houver falha de instanciação,
 * executa de forma assíncrona no thread principal via fallback local sem travar a interface.
 */
export function executePdfOrganize(
  options: OrganizeExecutionClientOptions,
): OrganizeExecutionHandle {
  const { fileName, buffer, excludedPages, allowSignedDocument = false, onProgress } = options

  let worker: Worker | null = null
  let isCancelled = false

  const cancel = () => {
    isCancelled = true
    if (worker) {
      try {
        worker.postMessage({ type: 'CANCEL' } satisfies OrganizeWorkerInMessage)
        worker.terminate()
      } catch {
        // Ignora erro no cancelamento/término
      }
      worker = null
    }
  }

  const promise = new Promise<OrganizePdfResult>((resolve) => {
    try {
      worker = new Worker(new URL('./organize.worker.ts', import.meta.url), {
        type: 'module',
      })

      worker.onmessage = (event: MessageEvent<OrganizeWorkerOutMessage>) => {
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
              totalExcludedPages: 0,
              totalRemainingPages: msg.totalOriginalPages,
              hasSignedDocument: msg.hasSignedDocument,
              errorCode: 'CANCELLED',
              error: 'Operação cancelada pelo usuário.',
            })
          } else {
            resolve({
              success: true,
              organizedBuffer: msg.organizedBuffer,
              fileName: msg.fileName,
              totalOriginalPages: msg.totalOriginalPages,
              totalExcludedPages: msg.totalExcludedPages,
              totalRemainingPages: msg.totalRemainingPages,
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
            totalExcludedPages: 0,
            totalRemainingPages: 0,
            hasSignedDocument: false,
            error: msg.error,
            errorCode: (msg.errorCode as OrganizePdfResult['errorCode']) || 'GENERIC_ERROR',
          })
        }
      }

      worker.onerror = (err) => {
        console.warn('Erro no Web Worker de organização, executando fallback local:', err)
        if (worker) {
          worker.terminate()
          worker = null
        }
        fallbackLocalOrganize(options, () => isCancelled).then(resolve)
      }

      // Envia uma cópia do buffer como transferível
      const slice = buffer.slice(0)
      worker.postMessage(
        {
          type: 'START_ORGANIZE',
          fileName,
          buffer: slice,
          excludedPages,
          allowSignedDocument,
        } satisfies OrganizeWorkerInMessage,
        [slice],
      )
    } catch (workerErr) {
      console.warn(
        'Web Worker não disponível, executando organização no thread principal:',
        workerErr,
      )
      fallbackLocalOrganize(options, () => isCancelled).then(resolve)
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
async function fallbackLocalOrganize(
  options: OrganizeExecutionClientOptions,
  checkCancelled: () => boolean,
): Promise<OrganizePdfResult> {
  // Dá um respiro à interface
  await new Promise((r) => setTimeout(r, 10))

  return organizePdfLocally({
    fileName: options.fileName,
    buffer: options.buffer.slice(0),
    excludedPages: options.excludedPages,
    allowSignedDocument: options.allowSignedDocument,
    onProgress: options.onProgress,
    checkCancelled,
  })
}
