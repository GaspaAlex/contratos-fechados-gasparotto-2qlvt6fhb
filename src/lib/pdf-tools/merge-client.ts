import type { MergeProgressUpdate } from './pdf-validator'
import type { MergePdfFilePayload, MergePdfResult } from './pdf-merger'
import type { WorkerInMessage, WorkerOutMessage } from './merge.worker'
import { mergePdfsSequentially } from './pdf-merger'

export interface MergeExecutionClientOptions {
  files: { name: string; buffer: ArrayBuffer }[]
  onProgress?: (progress: MergeProgressUpdate) => void
  onCancel?: () => void
}

export interface MergeExecutionHandle {
  promise: Promise<MergePdfResult>
  cancel: () => void
}

/**
 * Executa a união de PDFs preferencialmente via Web Worker (compatível com Vite).
 * Caso o ambiente não suporte Worker ou haja falha na instanciação,
 * executa via fallback assíncrono sequencial no thread principal sem travar.
 */
export function executePdfMerge(options: MergeExecutionClientOptions): MergeExecutionHandle {
  const { files, onProgress } = options

  let worker: Worker | null = null
  let isCancelled = false

  const cancel = () => {
    isCancelled = true
    if (worker) {
      try {
        worker.postMessage({ type: 'CANCEL' } satisfies WorkerInMessage)
        worker.terminate()
      } catch {
        // Ignora erro no cancelamento/término
      }
      worker = null
    }
  }

  const promise = new Promise<MergePdfResult>((resolve) => {
    // 1. Tentar instanciar Web Worker padrão Vite
    try {
      worker = new Worker(new URL('./merge.worker.ts', import.meta.url), {
        type: 'module',
      })

      worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
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
              errorCode: 'CANCELLED',
              error: 'Operação cancelada pelo usuário.',
            })
          } else {
            resolve({
              success: true,
              mergedBuffer: msg.mergedBuffer,
              pageCount: msg.pageCount,
            })
          }
        } else if (msg.type === 'ERROR') {
          if (worker) {
            worker.terminate()
            worker = null
          }
          resolve({
            success: false,
            error: msg.error,
            errorCode: (msg.errorCode as MergePdfResult['errorCode']) || 'GENERIC_ERROR',
            failingFile: msg.failingFile,
          })
        }
      }

      worker.onerror = (err) => {
        console.warn('Erro no Web Worker, executando fallback local:', err)
        if (worker) {
          worker.terminate()
          worker = null
        }
        // Executar fallback se worker falhar na inicialização
        fallbackSequentialMerge(files, onProgress, () => isCancelled).then(resolve)
      }

      // Preparar payload transferível
      // Nota: Duplicamos fatias dos buffers ou transferimos os ArrayBuffers
      const transferables: Transferable[] = []
      const filePayloads: MergePdfFilePayload[] = []

      for (const f of files) {
        // Criar cópia do ArrayBuffer para transferência segura sem invalidar o estado do componente
        const slice = f.buffer.slice(0)
        transferables.push(slice)
        filePayloads.push({
          name: f.name,
          buffer: slice,
        })
      }

      worker.postMessage(
        {
          type: 'START_MERGE',
          files: filePayloads,
        } satisfies WorkerInMessage,
        transferables,
      )
    } catch (workerErr) {
      console.warn('Web Worker não disponível, executando no thread principal:', workerErr)
      fallbackSequentialMerge(files, onProgress, () => isCancelled).then(resolve)
    }
  })

  return {
    promise,
    cancel,
  }
}

/**
 * Fallback no thread principal em caso de impossibilidade de Worker
 */
async function fallbackSequentialMerge(
  files: { name: string; buffer: ArrayBuffer }[],
  onProgress?: (progress: MergeProgressUpdate) => void,
  checkCancelled?: () => boolean,
): Promise<MergePdfResult> {
  // Executar através de setTimeout / microtasks para dar respiro à UI
  await new Promise((r) => setTimeout(r, 10))

  return mergePdfsSequentially({
    files: files.map((f) => ({ name: f.name, buffer: f.buffer.slice(0) })),
    onProgress,
    checkCancelled,
  })
}
