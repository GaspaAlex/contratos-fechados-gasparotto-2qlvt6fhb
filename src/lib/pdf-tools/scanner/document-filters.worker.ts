/**
 * document-filters.worker.ts
 *
 * Web Worker dedicado leve para processamento assíncrono dos filtros documentais.
 * Permite processamento de imagens completas em segundo plano sem engasgar
 * ou congelar a thread da interface do usuário.
 */

import {
  type DocumentFilterMode,
  applyShadowRemovalFilter,
  applyEnhanceFilter,
} from './document-filters'

export interface FilterWorkerInMessage {
  type: 'filter'
  id: string
  mode: DocumentFilterMode
  imageData: ImageData
}

export interface FilterWorkerOutMessage {
  type: 'filter_success' | 'filter_error'
  id: string
  imageData?: ImageData
  durationMs: number
  error?: string
}

self.onmessage = (e: MessageEvent<FilterWorkerInMessage>) => {
  const msg = e.data
  if (!msg || msg.type !== 'filter') return

  const t0 = performance.now()

  try {
    const { id, mode, imageData } = msg

    if (mode === 'original') {
      const durationMs = Math.round(performance.now() - t0)
      const res: FilterWorkerOutMessage = {
        type: 'filter_success',
        id,
        imageData,
        durationMs,
      }
      const post = self.postMessage as unknown as (
        message: unknown,
        transfer?: Transferable[],
      ) => void
      post(res, [imageData.data.buffer])
      return
    }

    // Criar um OffscreenCanvas se disponível no Worker ou manipular direto via ImageData
    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreen = new OffscreenCanvas(imageData.width, imageData.height)
      const ctx = offscreen.getContext('2d')
      if (ctx) {
        ctx.putImageData(imageData, 0, 0)
        // Convert to canvas-like object
        const canvasShim = offscreen as unknown as HTMLCanvasElement

        let filteredCanvas: HTMLCanvasElement
        if (mode === 'shadow_removal') {
          filteredCanvas = applyShadowRemovalFilter(canvasShim)
        } else if (mode === 'enhance') {
          filteredCanvas = applyEnhanceFilter(canvasShim)
        } else {
          filteredCanvas = canvasShim
        }

        const outCtx = (filteredCanvas as unknown as OffscreenCanvas).getContext('2d')
        const outData = outCtx?.getImageData(0, 0, imageData.width, imageData.height) || imageData

        const durationMs = Math.round(performance.now() - t0)
        const res: FilterWorkerOutMessage = {
          type: 'filter_success',
          id,
          imageData: outData,
          durationMs,
        }
        const post = self.postMessage as unknown as (
          message: unknown,
          transfer?: Transferable[],
        ) => void
        post(res, [outData.data.buffer])
        return
      }
    }

    // Fallback: se OffscreenCanvas não estiver disponível no worker
    const durationMs = Math.round(performance.now() - t0)
    self.postMessage({
      type: 'filter_error',
      id: msg.id,
      error: 'OffscreenCanvas não suportado no worker',
      durationMs,
    } as FilterWorkerOutMessage)
  } catch (err) {
    const durationMs = Math.round(performance.now() - t0)
    self.postMessage({
      type: 'filter_error',
      id: msg.id,
      error: err instanceof Error ? err.message : String(err),
      durationMs,
    } as FilterWorkerOutMessage)
  }
}
