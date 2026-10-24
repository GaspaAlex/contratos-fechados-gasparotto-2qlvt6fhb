/**
 * document-filters-client.ts
 *
 * Cliente de execução e cache para os filtros documentais.
 * Tenta Web Worker leve em segundo plano se disponível; caso contrário,
 * executa de forma assíncrona na thread local via Canvas 2D sem travar a UI.
 */

import {
  type DocumentFilterMode,
  type ShadowRemovalIntensity,
  processDocumentFilter,
  type FilterResult,
} from './document-filters'
import type { FilterWorkerInMessage, FilterWorkerOutMessage } from './document-filters.worker'

class DocumentFiltersClient {
  private worker: Worker | null = null
  private workerFailed = false
  private requestCounter = 0
  private pendingRequests = new Map<
    string,
    { resolve: (data: ImageData) => void; reject: (err: Error) => void; timer: any }
  >()

  private getWorker(): Worker | null {
    if (this.workerFailed) return null
    if (this.worker) return this.worker

    try {
      this.worker = new Worker(new URL('./document-filters.worker.ts', import.meta.url), {
        type: 'module',
      })

      this.worker.onmessage = (e: MessageEvent<FilterWorkerOutMessage>) => {
        const msg = e.data
        if (!msg) return

        const pending = this.pendingRequests.get(msg.id)
        if (!pending) return

        clearTimeout(pending.timer)
        this.pendingRequests.delete(msg.id)

        if (msg.type === 'filter_success' && msg.imageData) {
          pending.resolve(msg.imageData)
        } else {
          pending.reject(new Error(msg.error || 'Erro no worker de filtros'))
        }
      }

      this.worker.onerror = (err) => {
        console.warn(
          '[DocumentFiltersClient] Worker falhou, usando processamento direto em Canvas 2D:',
          err,
        )
        this.workerFailed = true
        this.worker?.terminate()
        this.worker = null
        for (const [, req] of this.pendingRequests) {
          clearTimeout(req.timer)
          req.reject(new Error('Worker de filtros indisponível'))
        }
        this.pendingRequests.clear()
      }

      return this.worker
    } catch {
      this.workerFailed = true
      return null
    }
  }

  /**
   * Aplica o filtro selecionado a um canvas.
   * Se maxPreviewDimension for passado, processa em resolução reduzida para visualização instantânea.
   */
  public async applyFilter(
    sourceCanvas: HTMLCanvasElement,
    mode: DocumentFilterMode,
    maxPreviewDimension?: number,
    shadowIntensity?: ShadowRemovalIntensity,
  ): Promise<FilterResult> {
    const t0 = performance.now()

    if (mode === 'original') {
      return processDocumentFilter(sourceCanvas, { mode: 'original', maxPreviewDimension })
    }

    // Para prévia rápida, processar direto via Canvas 2D no cliente é ultra-rápido (poucos milissegundos)
    // Para resolução máxima completa, tenta descarregar no worker se for grande (> 1500px)
    const isFullRes =
      !maxPreviewDimension ||
      maxPreviewDimension >= Math.max(sourceCanvas.width, sourceCanvas.height)
    const worker = isFullRes ? this.getWorker() : null

    if (worker) {
      try {
        const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          const imgData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
          const reqId = `filt_${++this.requestCounter}`

          const processedData = await new Promise<ImageData>((resolve, reject) => {
            const timer = setTimeout(() => {
              this.pendingRequests.delete(reqId)
              reject(new Error('Timeout no worker de filtros'))
            }, 10000)

            this.pendingRequests.set(reqId, { resolve, reject, timer })

            const msg: FilterWorkerInMessage = {
              type: 'filter',
              id: reqId,
              mode,
              shadowIntensity,
              imageData: imgData,
            }
            worker.postMessage(msg, [imgData.data.buffer])
          })

          const out = document.createElement('canvas')
          out.width = processedData.width
          out.height = processedData.height
          const outCtx = out.getContext('2d')
          if (outCtx) {
            outCtx.putImageData(processedData, 0, 0)
            const durationMs = Math.round(performance.now() - t0)
            return {
              canvas: out,
              durationMs,
              mode,
              width: out.width,
              height: out.height,
            }
          }
        }
      } catch (err) {
        console.warn('[DocumentFiltersClient] Worker falhou, fallback síncrono Canvas 2D:', err)
      }
    }

    // Processamento local via Canvas 2D
    return processDocumentFilter(sourceCanvas, { mode, shadowIntensity, maxPreviewDimension })
  }
}

export const documentFiltersClient = new DocumentFiltersClient()
