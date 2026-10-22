import {
  convertImagesToPdfLocally,
  type ImageToPdfFileItem,
  type ImagePageLayout,
  type ImageToPdfProgressUpdate,
  type ImageToPdfResult,
} from './image-to-pdf'
import type { ImageToPdfWorkerInMessage, ImageToPdfWorkerOutMessage } from './image-to-pdf.worker'

export interface ImageToPdfExecutionClientOptions {
  images: { id: string; name: string; buffer: ArrayBuffer; type: 'image/jpeg' | 'image/png' }[]
  layout: ImagePageLayout
  onProgress?: (progress: ImageToPdfProgressUpdate) => void
  onCancel?: () => void
}

export interface ImageToPdfExecutionHandle {
  promise: Promise<ImageToPdfResult>
  cancel: () => void
}

/**
 * Executa a conversão de imagens para PDF preferencialmente via Web Worker.
 * Caso o ambiente não suporte Worker ou ocorra falha na instanciação,
 * executa no thread principal via microtasks (fallback assíncrono).
 */
export function executeImageToPdf(
  options: ImageToPdfExecutionClientOptions,
): ImageToPdfExecutionHandle {
  const { images, layout = 'a4', onProgress } = options

  let worker: Worker | null = null
  let isCancelled = false

  const cancel = () => {
    isCancelled = true
    if (worker) {
      try {
        worker.postMessage({ type: 'CANCEL' } satisfies ImageToPdfWorkerInMessage)
        worker.terminate()
      } catch {
        // Ignora erro no cancelamento/término
      }
      worker = null
    }
  }

  const promise = new Promise<ImageToPdfResult>((resolve) => {
    try {
      worker = new Worker(new URL('./image-to-pdf.worker.ts', import.meta.url), {
        type: 'module',
      })

      worker.onmessage = (event: MessageEvent<ImageToPdfWorkerOutMessage>) => {
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
              totalImages: msg.totalImages,
              pageCount: 0,
              layout: msg.layout,
              errorCode: 'CANCELLED',
              error: 'Operação cancelada pelo usuário.',
            })
          } else {
            resolve({
              success: true,
              pdfBuffer: msg.pdfBuffer,
              fileName: msg.fileName,
              totalImages: msg.totalImages,
              pageCount: msg.pageCount,
              layout: msg.layout,
            })
          }
        } else if (msg.type === 'ERROR') {
          if (worker) {
            worker.terminate()
            worker = null
          }
          resolve({
            success: false,
            totalImages: images.length,
            pageCount: 0,
            layout,
            error: msg.error,
            errorCode: (msg.errorCode as ImageToPdfResult['errorCode']) || 'GENERIC_ERROR',
            failingImageName: msg.failingImageName,
          })
        }
      }

      worker.onerror = (err) => {
        console.warn('Erro no Web Worker de imagens para PDF, executando fallback local:', err)
        if (worker) {
          worker.terminate()
          worker = null
        }
        fallbackLocalImageToPdf(options, () => isCancelled).then(resolve)
      }

      // Preparar buffers transferíveis com cópias para não invalidar o estado do componente
      const transferables: Transferable[] = []
      const filePayloads: ImageToPdfFileItem[] = []

      for (const item of images) {
        const slice = item.buffer.slice(0)
        transferables.push(slice)
        filePayloads.push({
          id: item.id,
          name: item.name,
          buffer: slice,
          type: item.type,
        })
      }

      worker.postMessage(
        {
          type: 'START_CONVERT',
          images: filePayloads,
          layout,
        } satisfies ImageToPdfWorkerInMessage,
        transferables,
      )
    } catch (workerErr) {
      console.warn(
        'Web Worker não disponível, executando conversão no thread principal:',
        workerErr,
      )
      fallbackLocalImageToPdf(options, () => isCancelled).then(resolve)
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
async function fallbackLocalImageToPdf(
  options: ImageToPdfExecutionClientOptions,
  checkCancelled: () => boolean,
): Promise<ImageToPdfResult> {
  await new Promise((r) => setTimeout(r, 10))

  return convertImagesToPdfLocally({
    images: options.images.map((img) => ({
      ...img,
      buffer: img.buffer.slice(0),
    })),
    layout: options.layout,
    onProgress: options.onProgress,
    checkCancelled,
  })
}
