/**
 * Scanner module facade and fallback implementations
 */
import type { DocumentCorners } from './perspective-math'
import {
  computeTargetDimensions,
  getDefaultCorners,
  warpPerspectiveCanvas,
} from './perspective-math'
import { scanWorkerClient, type DetectionResult, type WarpResult } from './opencv-worker-client'

export type { DetectionResult, WarpResult }
export { getDefaultCorners }

const MAX_DETECTION_DIMENSION = 900

/**
 * Resizes an HTMLImageElement or Canvas to an offscreen canvas with max dimension.
 */
function createScaledImageData(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDim: number = MAX_DETECTION_DIMENSION,
): { imageData: ImageData; scale: number; procWidth: number; procHeight: number } {
  let scale = 1
  let procWidth = sourceWidth
  let procHeight = sourceHeight

  if (Math.max(sourceWidth, sourceHeight) > maxDim) {
    if (sourceWidth >= sourceHeight) {
      scale = sourceWidth / maxDim
      procWidth = maxDim
      procHeight = Math.round(sourceHeight / scale)
    } else {
      scale = sourceHeight / maxDim
      procHeight = maxDim
      procWidth = Math.round(sourceWidth / scale)
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = procWidth
  canvas.height = procHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Falha ao obter contexto 2D para redimensionamento de detecção')
  }

  ctx.drawImage(source, 0, 0, procWidth, procHeight)
  const imageData = ctx.getImageData(0, 0, procWidth, procHeight)
  return { imageData, scale, procWidth, procHeight }
}

/**
 * Detects document corners asynchronously via the dedicated Web Worker.
 * If the worker fails or times out, safely falls back to default corners
 * without blocking the main UI thread.
 */
export async function detectDocumentCorners(
  imageSource: CanvasImageSource,
  originalWidth: number,
  originalHeight: number,
  requestId?: string,
): Promise<DetectionResult> {
  const { imageData, scale } = createScaledImageData(
    imageSource,
    originalWidth,
    originalHeight,
    MAX_DETECTION_DIMENSION,
  )

  return scanWorkerClient.detectCorners(imageData, scale, originalWidth, originalHeight, requestId)
}

/**
 * Applies perspective warp to extract a rectified rectangular document image.
 * Tries the worker first (non-blocking, full-resolution). If worker is unavailable
 * or fails, falls back gracefully to standard 2D canvas interpolation.
 */
export async function applyPerspectiveWarp(
  source: CanvasImageSource,
  corners: DocumentCorners,
  sourceWidth: number,
  sourceHeight: number,
  requestId?: string,
): Promise<HTMLCanvasElement> {
  const targetDims = computeTargetDimensions(corners)

  // Se o motor OpenCV estiver pronto no worker, tenta o warp via worker sem bloquear a main thread
  if (scanWorkerClient.isReady()) {
    const tWarpOpenCv = performance.now()
    try {
      const fullCanvas = document.createElement('canvas')
      fullCanvas.width = sourceWidth
      fullCanvas.height = sourceHeight
      const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true })
      if (fullCtx) {
        fullCtx.drawImage(source, 0, 0, sourceWidth, sourceHeight)
        const fullImageData = fullCtx.getImageData(0, 0, sourceWidth, sourceHeight)

        const warpResult = await scanWorkerClient.warpPerspective(
          fullImageData,
          corners,
          targetDims.width,
          targetDims.height,
          requestId,
        )

        const outCanvas = document.createElement('canvas')
        outCanvas.width = warpResult.width
        outCanvas.height = warpResult.height
        const outCtx = outCanvas.getContext('2d')
        if (outCtx) {
          outCtx.putImageData(warpResult.imageData, 0, 0)
          console.log(
            `[Scanner] Recorte OpenCV concluído em ${(performance.now() - tWarpOpenCv).toFixed(2)}ms (${warpResult.width}x${warpResult.height})`,
          )
          return outCanvas
        }
      }
    } catch (workerErr) {
      const errMsg = workerErr instanceof Error ? workerErr.message : String(workerErr)
      console.log(
        `[Scanner] Worker warp indisponível/falhou (${errMsg}), caindo imediatamente no fallback de Canvas 2D`,
      )
    }
  }

  // Graceful Canvas 2D fallback: imediato (milisegundos), 100% funcional sem OpenCV e sem bloquear
  const tCanvasFallback = performance.now()
  const fallbackCanvas = document.createElement('canvas')
  fallbackCanvas.width = sourceWidth
  fallbackCanvas.height = sourceHeight
  const fallbackCtx = fallbackCanvas.getContext('2d', { willReadFrequently: true })
  if (!fallbackCtx) {
    throw new Error('Falha ao obter contexto 2D para fallback de warp')
  }
  fallbackCtx.drawImage(source, 0, 0, sourceWidth, sourceHeight)

  const resultCanvas = warpPerspectiveCanvas(
    fallbackCtx,
    sourceWidth,
    sourceHeight,
    corners,
    targetDims.width,
    targetDims.height,
  )
  console.log(
    `[Scanner] Recorte Canvas 2D (fallback) concluído em ${(performance.now() - tCanvasFallback).toFixed(2)}ms (${targetDims.width}x${targetDims.height})`,
  )
  return resultCanvas
}
