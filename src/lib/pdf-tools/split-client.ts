import type { SplitMode, PageRange, SplitPdfProgressUpdate, SplitPdfResult } from './pdf-splitter'
import type { SplitWorkerInMessage, SplitWorkerOutMessage } from './split.worker'
import { splitPdfLocally } from './pdf-splitter'

export interface SplitExecutionClientOptions {
  fileName: string
  buffer: ArrayBuffer
  mode: SplitMode
  ranges?: PageRange[]
  extractPagesString?: string
  allowSignedDocument?: boolean
  onProgress?: (progress: SplitPdfProgressUpdate) => void
  onCancel?: () => void
}

export interface SplitExecutionHandle {
  promise: Promise<SplitPdfResult>
  cancel: () => void
}

/**
 * Executa a divisão de PDFs preferencialmente via Web Worker (split.worker.ts).
 * Se o navegador não suportar Web Worker ou se houver falha de instanciação,
 * executa de forma suave e assíncrona no thread principal.
 */
export function executePdfSplit(options: SplitExecutionClientOptions): SplitExecutionHandle {
  const {
    fileName,
    buffer,
    mode,
    ranges,
    extractPagesString,
    allowSignedDocument = false,
    onProgress,
  } = options

  let worker: Worker | null = null
  let isCancelled = false

  const cancel = () => {
    isCancelled = true
    if (worker) {
      try {
        worker.postMessage({ type: 'CANCEL' } satisfies SplitWorkerInMessage)
        worker.terminate()
      } catch {
        // Ignora erro no cancelamento/término
      }
      worker = null
    }
  }

  const promise = new Promise<SplitPdfResult>((resolve) => {
    try {
      worker = new Worker(new URL('./split.worker.ts', import.meta.url), {
        type: 'module',
      })

      worker.onmessage = (event: MessageEvent<SplitWorkerOutMessage>) => {
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
              files: [],
              totalOriginalPages: msg.totalOriginalPages,
              totalPagesProcessed: 0,
              hasSignedDocument: msg.hasSignedDocument,
              errorCode: 'CANCELLED',
              error: 'Operação cancelada pelo usuário.',
            })
          } else {
            resolve({
              success: true,
              files: msg.files,
              zipBuffer: msg.zipBuffer,
              zipName: msg.zipName,
              totalOriginalPages: msg.totalOriginalPages,
              totalPagesProcessed: msg.totalPagesProcessed,
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
            files: [],
            totalOriginalPages: 0,
            totalPagesProcessed: 0,
            hasSignedDocument: false,
            error: msg.error,
            errorCode: (msg.errorCode as SplitPdfResult['errorCode']) || 'GENERIC_ERROR',
          })
        }
      }

      worker.onerror = (err) => {
        console.warn('Erro no Web Worker de divisão, executando fallback local:', err)
        if (worker) {
          worker.terminate()
          worker = null
        }
        fallbackLocalSplit(options, () => isCancelled).then(resolve)
      }

      // Copiar buffer para envio transferível
      const slice = buffer.slice(0)
      worker.postMessage(
        {
          type: 'START_SPLIT',
          fileName,
          buffer: slice,
          mode,
          ranges,
          extractPagesString,
          allowSignedDocument,
        } satisfies SplitWorkerInMessage,
        [slice],
      )
    } catch (workerErr) {
      console.warn('Web Worker não disponível, executando divisão no thread principal:', workerErr)
      fallbackLocalSplit(options, () => isCancelled).then(resolve)
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
async function fallbackLocalSplit(
  options: SplitExecutionClientOptions,
  checkCancelled: () => boolean,
): Promise<SplitPdfResult> {
  // Dá um respiro à interface
  await new Promise((r) => setTimeout(r, 10))

  return splitPdfLocally({
    fileName: options.fileName,
    buffer: options.buffer.slice(0),
    mode: options.mode,
    ranges: options.ranges,
    extractPagesString: options.extractPagesString,
    allowSignedDocument: options.allowSignedDocument,
    onProgress: options.onProgress,
    checkCancelled,
  })
}
