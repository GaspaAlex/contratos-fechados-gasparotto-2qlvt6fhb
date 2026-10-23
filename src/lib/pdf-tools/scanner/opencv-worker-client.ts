import type { DocumentCorners } from './perspective-math'
import { getDefaultCorners } from './perspective-math'
import type {
  WorkerInMessage,
  WorkerOutMessage,
  WorkerDetectSuccessResponse,
  WorkerWarpSuccessResponse,
} from './opencv.worker'

export interface DetectionResult {
  corners: DocumentCorners
  confidence: number
  durationMs: number
  detected: boolean
  estimatedTiltAngle?: number
  status: 'success' | 'no_document' | 'error' | 'cancelled' | 'timeout'
  error?: string
}

export interface WarpResult {
  imageData: ImageData
  width: number
  height: number
  durationMs: number
}

// Timeout configs (controlled in main thread while worker runs)
const INIT_TIMEOUT_MS = 35000
const DETECT_TIMEOUT_MS = 15000
const WARP_TIMEOUT_MS = 18000

class ScanWorkerClient {
  private worker: Worker | null = null
  private isInitialized = false
  private initPromise: Promise<void> | null = null
  private pendingInitResolvers: {
    resolve: () => void
    reject: (err: Error) => void
  }[] = []
  // Pending callbacks for detect/warp requests keyed by request id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: Error) => void; timer: any }
  >()
  private requestCounter = 0

  private createWorker(): Worker {
    const w = new Worker(new URL('./opencv.worker.ts', import.meta.url), {
      type: 'module',
    })

    w.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data
      if (!msg) return

      if (msg.type === 'init_success') {
        this.isInitialized = true
        const callbacks = [...this.pendingInitResolvers]
        this.pendingInitResolvers = []
        callbacks.forEach((cb) => cb.resolve())
        return
      }

      if (msg.type === 'init_error') {
        this.isInitialized = false
        this.initPromise = null
        const callbacks = [...this.pendingInitResolvers]
        this.pendingInitResolvers = []
        callbacks.forEach((cb) => cb.reject(new Error(msg.error)))
        return
      }

      const pending = this.pendingRequests.get(msg.id)
      if (!pending) return

      clearTimeout(pending.timer)
      this.pendingRequests.delete(msg.id)

      if (msg.type === 'detect_success') {
        pending.resolve(msg)
      } else if (msg.type === 'detect_error') {
        pending.reject(new Error(msg.error))
      } else if (msg.type === 'warp_success') {
        pending.resolve(msg)
      } else if (msg.type === 'warp_error') {
        pending.reject(new Error(msg.error))
      }
    }

    w.onerror = (err) => {
      console.error('[ScanWorkerClient] Worker error:', err)
      // Fail all pending
      this.rejectAllPending(new Error('Falha no Web Worker do OpenCV'))
      this.terminate()
    }

    return w
  }

  private rejectAllPending(err: Error) {
    for (const [, req] of this.pendingRequests) {
      clearTimeout(req.timer)
      req.reject(err)
    }
    this.pendingRequests.clear()

    const inits = [...this.pendingInitResolvers]
    this.pendingInitResolvers = []
    inits.forEach((cb) => cb.reject(err))
  }

  /**
   * Resolve relative opencv path against base URL
   */
  private getOpenCvUrl(): string {
    const base = import.meta.env.BASE_URL || '/'
    const cleanBase = base.endsWith('/') ? base : `${base}/`
    return `${cleanBase}opencv/opencv.js`
  }

  /**
   * Explicitly ensures the worker is started and OpenCV is loaded
   */
  public async ensureInitialized(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return
    }
    if (this.initPromise) {
      return this.initPromise
    }

    if (!this.worker) {
      this.worker = this.createWorker()
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      const initId = `init_${++this.requestCounter}`
      const timer = setTimeout(() => {
        const idx = this.pendingInitResolvers.findIndex((cb) => cb.reject === reject)
        if (idx !== -1) {
          this.pendingInitResolvers.splice(idx, 1)
        }
        this.terminate(
          new Error('Tempo limite esgotado ao inicializar motor OpenCV (timeout de 25s)'),
        )
        this.initPromise = null
        reject(new Error('Tempo limite esgotado ao inicializar motor OpenCV (timeout de 25s)'))
      }, INIT_TIMEOUT_MS)

      this.pendingInitResolvers.push({
        resolve: () => {
          clearTimeout(timer)
          resolve()
        },
        reject: (err: Error) => {
          clearTimeout(timer)
          this.initPromise = null
          reject(err)
        },
      })

      const opencvUrl = this.getOpenCvUrl()
      const msg: WorkerInMessage = {
        type: 'init',
        id: initId,
        opencvUrl,
      }
      this.worker!.postMessage(msg)
    })

    return this.initPromise
  }

  /**
   * Detect document corners on a scaled down imageData
   */
  public async detectCorners(
    imageData: ImageData,
    scale: number,
    originalWidth: number,
    originalHeight: number,
    requestId?: string,
  ): Promise<DetectionResult> {
    const id = requestId || `detect_${++this.requestCounter}`
    const t0 = performance.now()

    try {
      await this.ensureInitialized()
    } catch (initErr) {
      const durationMs = Math.round(performance.now() - t0)
      return {
        corners: getDefaultCorners(originalWidth, originalHeight),
        confidence: 0,
        durationMs,
        detected: false,
        status: 'error',
        error: initErr instanceof Error ? initErr.message : String(initErr),
      }
    }

    if (!this.worker) {
      return {
        corners: getDefaultCorners(originalWidth, originalHeight),
        confidence: 0,
        durationMs: Math.round(performance.now() - t0),
        detected: false,
        status: 'error',
        error: 'Worker indisponível',
      }
    }

    return new Promise<DetectionResult>((resolve) => {
      const timer = setTimeout(() => {
        const req = this.pendingRequests.get(id)
        if (req) {
          this.pendingRequests.delete(id)
          const durationMs = Math.round(performance.now() - t0)
          resolve({
            corners: getDefaultCorners(originalWidth, originalHeight),
            confidence: 0,
            durationMs,
            detected: false,
            status: 'timeout',
            error: 'Detecção cancelada por tempo limite (timeout)',
          })
        }
      }, DETECT_TIMEOUT_MS)

      this.pendingRequests.set(id, {
        resolve: (msg: WorkerDetectSuccessResponse) => {
          resolve({
            corners: msg.corners,
            confidence: msg.confidence,
            durationMs: msg.durationMs,
            detected: msg.detected,
            estimatedTiltAngle: msg.estimatedTiltAngle,
            status: msg.detected ? 'success' : 'no_document',
          })
        },
        reject: (err: Error) => {
          const durationMs = Math.round(performance.now() - t0)
          const isUserCancel = err.message && err.message.includes('usuário')
          resolve({
            corners: getDefaultCorners(originalWidth, originalHeight),
            confidence: 0,
            durationMs,
            detected: false,
            status: isUserCancel ? 'cancelled' : 'error',
            error: err.message,
          })
        },
        timer,
      })

      const msg: WorkerInMessage = {
        type: 'detect',
        id,
        imageData,
        scale,
        originalWidth,
        originalHeight,
      }
      this.worker!.postMessage(msg)
    })
  }

  /**
   * Perspective warp executed inside worker
   */
  public async warpPerspective(
    imageData: ImageData,
    corners: DocumentCorners,
    targetWidth: number,
    targetHeight: number,
    requestId?: string,
  ): Promise<WarpResult> {
    const id = requestId || `warp_${++this.requestCounter}`
    const t0 = performance.now()

    await this.ensureInitialized()

    if (!this.worker) {
      throw new Error('Worker indisponível para warp de perspectiva')
    }

    return new Promise<WarpResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        this.terminate()
        reject(new Error('Tempo limite esgotado no recorte de perspectiva (timeout)'))
      }, WARP_TIMEOUT_MS)

      this.pendingRequests.set(id, {
        resolve: (msg: WorkerWarpSuccessResponse) => {
          resolve({
            imageData: msg.imageData,
            width: msg.width,
            height: msg.height,
            durationMs: msg.durationMs,
          })
        },
        reject: (err: Error) => {
          reject(err)
        },
        timer,
      })

      const msg: WorkerInMessage = {
        type: 'warp',
        id,
        imageData,
        corners,
        targetWidth,
        targetHeight,
      }
      // Zero-copy transfer of buffer if possible
      this.worker!.postMessage(msg, [imageData.data.buffer])
    })
  }

  /**
   * Signal cancellation of a specific request triggered explicitly by user action
   */
  public cancel(requestId: string): void {
    const pending = this.pendingRequests.get(requestId)
    if (pending) {
      clearTimeout(pending.timer)
      this.pendingRequests.delete(requestId)
      // Resolve or reject gracefully without destroying the shared worker
      pending.reject(new Error('Operação cancelada pelo usuário'))
    }
    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'cancel', id: requestId } as WorkerInMessage)
      } catch {
        // ignore
      }
    }
  }

  /**
   * Terminate the worker and reset state only when an unrecoverable crash or explicit reset occurs
   */
  public terminate(reason?: Error): void {
    if (this.worker) {
      try {
        this.worker.terminate()
      } catch {
        // ignore
      }
      this.worker = null
    }
    this.isInitialized = false
    this.initPromise = null
    this.rejectAllPending(reason || new Error('Worker reiniciado'))
  }

  public getInitialized(): boolean {
    return this.isInitialized
  }
}

// Singleton client instance for scan worker
export const scanWorkerClient = new ScanWorkerClient()
