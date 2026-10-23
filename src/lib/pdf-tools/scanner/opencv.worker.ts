import type { DocumentCorners, Point2D } from './perspective-math'
import { orderCorners, isValidConvexQuad } from './perspective-math'

export interface WorkerInitMessage {
  type: 'init'
  id: string
  opencvUrl: string
}

export interface WorkerDetectMessage {
  type: 'detect'
  id: string
  imageData: ImageData
  scale: number
  originalWidth: number
  originalHeight: number
}

export interface WorkerWarpMessage {
  type: 'warp'
  id: string
  imageData: ImageData
  corners: DocumentCorners
  targetWidth: number
  targetHeight: number
}

export interface WorkerCancelMessage {
  type: 'cancel'
  id: string
}

export type WorkerInMessage =
  | WorkerInitMessage
  | WorkerDetectMessage
  | WorkerWarpMessage
  | WorkerCancelMessage

export interface WorkerInitSuccessResponse {
  type: 'init_success'
  id: string
  durationMs: number
}

export interface WorkerInitErrorResponse {
  type: 'init_error'
  id: string
  error: string
}

export interface WorkerDetectSuccessResponse {
  type: 'detect_success'
  id: string
  corners: DocumentCorners
  confidence: number
  durationMs: number
  detected: boolean
}

export interface WorkerDetectErrorResponse {
  type: 'detect_error'
  id: string
  error: string
  durationMs: number
}

export interface WorkerWarpSuccessResponse {
  type: 'warp_success'
  id: string
  imageData: ImageData
  width: number
  height: number
  durationMs: number
}

export interface WorkerWarpErrorResponse {
  type: 'warp_error'
  id: string
  error: string
  durationMs: number
}

export type WorkerOutMessage =
  | WorkerInitSuccessResponse
  | WorkerInitErrorResponse
  | WorkerDetectSuccessResponse
  | WorkerDetectErrorResponse
  | WorkerWarpSuccessResponse
  | WorkerWarpErrorResponse

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cvInstance: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let initPromise: Promise<any> | null = null
let currentCancelledId: string | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadOpenCvInWorker(opencvUrl: string): Promise<any> {
  if (cvInstance && cvInstance.Mat) {
    return cvInstance
  }
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    const t0 = performance.now()
    const res = await fetch(opencvUrl)
    if (!res.ok) {
      throw new Error(`Falha ao carregar OpenCV do caminho local (HTTP ${res.status})`)
    }
    const scriptCode = await res.text()

    return new Promise((resolve, reject) => {
      let isResolved = false

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finishResolve = (cv: any) => {
        if (!isResolved) {
          isResolved = true
          cvInstance = cv
          const elapsed = Math.round(performance.now() - t0)
          console.log(`[ScanWorker] OpenCV inicializado em ${elapsed}ms`)
          resolve(cv)
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finishReject = (err: any) => {
        if (!isResolved) {
          isResolved = true
          initPromise = null
          reject(err)
        }
      }

      // Configuration for Emscripten runtime inside worker
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Module: Record<string, any> = {
        wasmBinaryFile: undefined,
        onRuntimeInitialized() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cvObj = (self as any).cv || (self as any).Module
          finishResolve(cvObj)
        },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(self as any).Module = Module

      try {
        // Execute the script with Module available on self and in scope
        const runner = new Function(
          'Module',
          `${scriptCode}\n; return (typeof cv !== "undefined" ? cv : self.cv);`,
        )
        const cvExport = runner.call(self, Module)

        if (cvExport && typeof cvExport === 'object' && cvExport.Mat) {
          finishResolve(cvExport)
        } else if (typeof cvExport === 'function') {
          const maybePromise = cvExport(Module)
          if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise.then(finishResolve).catch(finishReject)
          }
        } else if ((self as any).cv && (self as any).cv.Mat) {
          finishResolve((self as any).cv)
        }
      } catch (err) {
        finishReject(err)
      }
    })
  })()

  return initPromise
}

function processDetection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cv: any,
  imageData: ImageData,
  scale: number,
  originalWidth: number,
  originalHeight: number,
): { corners: DocumentCorners; confidence: number; detected: boolean } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let srcMat: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let gray: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let blurred: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let edges: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dilated: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let M: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contours: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hierarchy: any = null

  try {
    srcMat = cv.matFromImageData(imageData)
    gray = new cv.Mat()
    cv.cvtColor(srcMat, gray, cv.COLOR_RGBA2GRAY)

    blurred = new cv.Mat()
    const ksize = new cv.Size(5, 5)
    cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT)

    edges = new cv.Mat()
    cv.Canny(blurred, edges, 50, 150, 3, false)

    dilated = new cv.Mat()
    M = cv.Mat.ones(3, 3, cv.CV_8U)
    const anchor = new cv.Point(-1, -1)
    cv.dilate(edges, dilated, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue())

    contours = new cv.MatVector()
    hierarchy = new cv.Mat()
    cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

    const procWidth = imageData.width
    const procHeight = imageData.height
    const minArea = procWidth * procHeight * 0.05
    const maxArea = procWidth * procHeight * 0.98

    let bestCorners: DocumentCorners | null = null
    let maxFoundArea = 0

    const numContours = contours.size()
    for (let i = 0; i < numContours; i++) {
      const contour = contours.get(i)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let approx: any = null
      try {
        const area = cv.contourArea(contour)
        if (area < minArea || area > maxArea) {
          continue
        }

        const peri = cv.arcLength(contour, true)
        approx = new cv.Mat()
        cv.approxPolyDP(contour, approx, peri * 0.02, true)

        if (approx.rows === 4) {
          const rawPts: Point2D[] = []
          for (let r = 0; r < 4; r++) {
            rawPts.push({
              x: approx.data32S[r * 2] * scale,
              y: approx.data32S[r * 2 + 1] * scale,
            })
          }

          const ordered = orderCorners(rawPts)
          if (isValidConvexQuad(ordered) && area > maxFoundArea) {
            maxFoundArea = area
            bestCorners = ordered
          }
        }
      } finally {
        contour?.delete?.()
        approx?.delete?.()
      }
    }

    if (bestCorners) {
      const totalArea = procWidth * procHeight
      const confidence = Math.min(1, Math.max(0.3, maxFoundArea / totalArea))
      return {
        corners: bestCorners,
        confidence,
        detected: true,
      }
    }

    // Fallback: 8% inset margin
    const insetX = originalWidth * 0.08
    const insetY = originalHeight * 0.08
    return {
      corners: {
        topLeft: { x: insetX, y: insetY },
        topRight: { x: originalWidth - insetX, y: insetY },
        bottomRight: { x: originalWidth - insetX, y: originalHeight - insetY },
        bottomLeft: { x: insetX, y: originalHeight - insetY },
      },
      confidence: 0,
      detected: false,
    }
  } finally {
    srcMat?.delete?.()
    gray?.delete?.()
    blurred?.delete?.()
    edges?.delete?.()
    dilated?.delete?.()
    M?.delete?.()
    contours?.delete?.()
    hierarchy?.delete?.()
  }
}

function processWarp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cv: any,
  imageData: ImageData,
  corners: DocumentCorners,
  targetWidth: number,
  targetHeight: number,
): ImageData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let srcMat: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dstMat: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let srcCoords: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dstCoords: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let transformMatrix: any = null

  try {
    srcMat = cv.matFromImageData(imageData)
    dstMat = new cv.Mat()
    const dsize = new cv.Size(targetWidth, targetHeight)

    srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
      corners.topLeft.x,
      corners.topLeft.y,
      corners.topRight.x,
      corners.topRight.y,
      corners.bottomRight.x,
      corners.bottomRight.y,
      corners.bottomLeft.x,
      corners.bottomLeft.y,
    ])

    dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      targetWidth,
      0,
      targetWidth,
      targetHeight,
      0,
      targetHeight,
    ])

    transformMatrix = cv.getPerspectiveTransform(srcCoords, dstCoords)
    cv.warpPerspective(
      srcMat,
      dstMat,
      transformMatrix,
      dsize,
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(),
    )

    const clamped = new Uint8ClampedArray(dstMat.data)
    return new ImageData(clamped, targetWidth, targetHeight)
  } finally {
    srcMat?.delete?.()
    dstMat?.delete?.()
    srcCoords?.delete?.()
    dstCoords?.delete?.()
    transformMatrix?.delete?.()
  }
}

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data
  if (!msg || !msg.type) return

  if (msg.type === 'cancel') {
    currentCancelledId = msg.id
    return
  }

  if (msg.type === 'init') {
    const t0 = performance.now()
    try {
      await loadOpenCvInWorker(msg.opencvUrl)
      const durationMs = Math.round(performance.now() - t0)
      const res: WorkerInitSuccessResponse = {
        type: 'init_success',
        id: msg.id,
        durationMs,
      }
      self.postMessage(res)
    } catch (err) {
      const res: WorkerInitErrorResponse = {
        type: 'init_error',
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
      }
      self.postMessage(res)
    }
    return
  }

  if (msg.type === 'detect') {
    const t0 = performance.now()
    try {
      if (currentCancelledId === msg.id) {
        return
      }
      if (!cvInstance) {
        throw new Error('OpenCV não está inicializado no worker')
      }

      const result = processDetection(
        cvInstance,
        msg.imageData,
        msg.scale,
        msg.originalWidth,
        msg.originalHeight,
      )

      if (currentCancelledId === msg.id) {
        return
      }

      const durationMs = Math.round(performance.now() - t0)
      console.log(`[ScanWorker] detecção concluída em ${durationMs}ms`)

      const res: WorkerDetectSuccessResponse = {
        type: 'detect_success',
        id: msg.id,
        corners: result.corners,
        confidence: result.confidence,
        detected: result.detected,
        durationMs,
      }
      self.postMessage(res)
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0)
      const res: WorkerDetectErrorResponse = {
        type: 'detect_error',
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
        durationMs,
      }
      self.postMessage(res)
    }
    return
  }

  if (msg.type === 'warp') {
    const t0 = performance.now()
    try {
      if (currentCancelledId === msg.id) {
        return
      }
      if (!cvInstance) {
        throw new Error('OpenCV não está inicializado no worker')
      }

      const warpedData = processWarp(
        cvInstance,
        msg.imageData,
        msg.corners,
        msg.targetWidth,
        msg.targetHeight,
      )

      if (currentCancelledId === msg.id) {
        return
      }

      const durationMs = Math.round(performance.now() - t0)
      console.log(`[ScanWorker] warp de perspectiva concluído em ${durationMs}ms`)

      const res: WorkerWarpSuccessResponse = {
        type: 'warp_success',
        id: msg.id,
        imageData: warpedData,
        width: msg.targetWidth,
        height: msg.targetHeight,
        durationMs,
      }
      // Transfer the underlying array buffer for zero-copy performance
      const post = self.postMessage as unknown as (message: unknown, transfer?: Transferable[]) => void
      post(res, [warpedData.data.buffer])
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0)
      const res: WorkerWarpErrorResponse = {
        type: 'warp_error',
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
        durationMs,
      }
      self.postMessage(res)
    }
    return
  }
}
