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
  strategy: 'importScripts' | 'fetch_fallback'
  scriptLoadMs: number
  wasmInitMs: number
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
  estimatedTiltAngle?: number
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
let cachedScriptCode: string | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadOpenCvInWorker(opencvUrl: string): Promise<any> {
  if (cvInstance && cvInstance.Mat) {
    return cvInstance
  }
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    const tInitStart = performance.now()

    // Estratégia 1 (Principal): importScripts no worker clássico (asset local /opencv/opencv.js)
    if (
      typeof (self as unknown as { importScripts?: (...urls: string[]) => void }).importScripts ===
      'function'
    ) {
      try {
        const tScriptStart = performance.now()
        console.log(`[ScanWorker] Carregando OpenCV via importScripts: ${opencvUrl}`)

        let scriptLoadMs = 0
        let wasmInitMs = 0

        const cvPromise = new Promise<{ cv: any; scriptMs: number; wasmMs: number }>(
          (resolve, reject) => {
            let isResolved = false
            const tWasmStart = performance.now()

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const Module: Record<string, any> = {
              wasmBinaryFile: undefined,
              onRuntimeInitialized() {
                wasmInitMs = Math.round(performance.now() - tWasmStart)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const cvObj = (self as any).cv || (self as any).Module
                if (!isResolved) {
                  isResolved = true
                  resolve({ cv: cvObj, scriptMs: scriptLoadMs, wasmMs: wasmInitMs })
                }
              },
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(self as any).Module = Module

            try {
              ;(self as unknown as { importScripts: (...urls: string[]) => void }).importScripts(
                opencvUrl,
              )
              scriptLoadMs = Math.round(performance.now() - tScriptStart)

              // Se cv já inicializou ou está disponível
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const syncCv = (self as any).cv
              if (syncCv && syncCv.Mat && !isResolved) {
                isResolved = true
                wasmInitMs = Math.round(performance.now() - tWasmStart)
                resolve({ cv: syncCv, scriptMs: scriptLoadMs, wasmMs: wasmInitMs })
              }
            } catch (importErr) {
              reject(importErr)
            }
          },
        )

        const { cv: cvLoaded, scriptMs, wasmMs } = await cvPromise

        // Validação estrita de disponibilidade dos métodos essenciais do OpenCV
        if (
          cvLoaded &&
          cvLoaded.Mat &&
          typeof cvLoaded.imread === 'function' &&
          typeof cvLoaded.matFromImageData === 'function' &&
          typeof cvLoaded.Canny === 'function' &&
          typeof cvLoaded.findContours === 'function' &&
          typeof cvLoaded.warpPerspective === 'function'
        ) {
          cvInstance = cvLoaded
          const totalInitMs = Math.round(performance.now() - tInitStart)
          console.log(
            `[ScanWorker] OpenCV pronto via importScripts em ${totalInitMs}ms (script: ${scriptMs}ms, WASM: ${wasmMs}ms, métodos validados: Mat, matFromImageData, Canny, findContours, warpPerspective)`,
          )
          return {
            cv: cvInstance,
            strategy: 'importScripts' as const,
            scriptLoadMs: scriptMs,
            wasmInitMs: wasmMs,
          }
        } else if (cvLoaded && cvLoaded.Mat) {
          // Mat presente mas métodos faltando
          cvInstance = cvLoaded
          const totalInitMs = Math.round(performance.now() - tInitStart)
          console.log(
            `[ScanWorker] OpenCV carregado via importScripts em ${totalInitMs}ms (script: ${scriptMs}ms, WASM: ${wasmMs}ms)`,
          )
          return {
            cv: cvInstance,
            strategy: 'importScripts' as const,
            scriptLoadMs: scriptMs,
            wasmInitMs: wasmMs,
          }
        } else {
          throw new Error('Objeto OpenCV carregado não contém a propriedade Mat esperada')
        }
      } catch (importErr) {
        const importErrMsg = importErr instanceof Error ? importErr.message : String(importErr)
        console.error(
          `[ScanWorker] FALHA TÉCNICA na Estratégia 1 (importScripts: ${opencvUrl}): ${importErrMsg}. Tentando fallback secundário...`,
        )
      }
    } else {
      console.error(
        '[ScanWorker] FALHA TÉCNICA: importScripts não está disponível no contexto do worker. Tentando fallback secundário...',
      )
    }

    // Estratégia 2 (Fallback): fetch + cache em memória da sessão do worker + new Function
    console.warn(
      '[ScanWorker] Executando Estratégia 2 de fallback (fetch + new Function). Isto indica que importScripts falhou.',
    )
    let scriptCode = cachedScriptCode
    let scriptFetchMs = 0
    if (!scriptCode) {
      const tFetchStart = performance.now()
      const res = await fetch(opencvUrl)
      if (!res.ok) {
        throw new Error(`Falha ao carregar OpenCV do caminho local (HTTP ${res.status})`)
      }
      scriptCode = await res.text()
      cachedScriptCode = scriptCode
      scriptFetchMs = Math.round(performance.now() - tFetchStart)
      console.log(
        `[ScanWorker] Download fallback do OpenCV concluído em ${scriptFetchMs}ms (${(scriptCode.length / (1024 * 1024)).toFixed(2)} MB)`,
      )
    } else {
      console.log('[ScanWorker] Reutilizando script OpenCV do cache em memória do worker')
    }

    return new Promise((resolve, reject) => {
      let isResolved = false
      const tWasmStart = performance.now()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finishResolve = (cv: any) => {
        if (!isResolved) {
          isResolved = true
          cvInstance = cv
          const wasmInitMs = Math.round(performance.now() - tWasmStart)
          const totalElapsed = Math.round(performance.now() - tInitStart)
          console.log(
            `[ScanWorker] Init fallback do OpenCV concluída em ${totalElapsed}ms (fetch: ${scriptFetchMs}ms, WASM: ${wasmInitMs}ms)`,
          )
          resolve({
            cv,
            strategy: 'fetch_fallback' as const,
            scriptLoadMs: scriptFetchMs,
            wasmInitMs,
          })
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

interface CandidateQuad {
  corners: DocumentCorners
  procCorners: DocumentCorners
  area: number
  score: number
  confidence: number
}

function processDetection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cv: any,
  imageData: ImageData,
  scale: number,
  originalWidth: number,
  originalHeight: number,
): {
  corners: DocumentCorners
  confidence: number
  detected: boolean
  estimatedTiltAngle?: number
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let srcMat: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let gray: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let enhanced: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let blurred: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let morphKernel: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clahe: any = null

  try {
    srcMat = cv.matFromImageData(imageData)
    gray = new cv.Mat()
    cv.cvtColor(srcMat, gray, cv.COLOR_RGBA2GRAY)

    // Correção preliminar de iluminação local apenas para detecção (CLAHE)
    enhanced = new cv.Mat()
    try {
      clahe = new cv.CLAHE(2.0, new cv.Size(8, 8))
      clahe.apply(gray, enhanced)
    } catch {
      // Se CLAHE falhar ou não estiver no build, usar equalização ou cinza puro
      gray.copyTo(enhanced)
    }

    blurred = new cv.Mat()
    const ksize = new cv.Size(5, 5)
    cv.GaussianBlur(enhanced, blurred, ksize, 0, 0, cv.BORDER_DEFAULT)

    morphKernel = cv.Mat.ones(3, 3, cv.CV_8U)
    const anchor = new cv.Point(-1, -1)

    const procWidth = imageData.width
    const procHeight = imageData.height
    const totalProcArea = procWidth * procHeight
    const minArea = totalProcArea * 0.08
    const maxArea = totalProcArea * 0.96

    // Testar múltiplos esquemas de Canny e parâmetros de dilatação/fechamento
    const passes = [
      { low: 30, high: 100, close: true, eps: 0.02 },
      { low: 50, high: 150, close: false, eps: 0.025 },
      { low: 75, high: 200, close: true, eps: 0.03 },
    ]

    const candidates: CandidateQuad[] = []

    for (const pass of passes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let edges: any = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let morphed: any = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let contours: any = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let hierarchy: any = null

      try {
        edges = new cv.Mat()
        cv.Canny(blurred, edges, pass.low, pass.high, 3, false)

        morphed = new cv.Mat()
        if (pass.close) {
          // Fechamento morfológico para unir bordas pontilhadas de RGs/plásticos
          cv.morphologyEx(
            edges,
            morphed,
            cv.MORPH_CLOSE,
            morphKernel,
            anchor,
            1,
            cv.BORDER_CONSTANT,
            cv.morphologyDefaultBorderValue(),
          )
        } else {
          cv.dilate(
            edges,
            morphed,
            morphKernel,
            anchor,
            1,
            cv.BORDER_CONSTANT,
            cv.morphologyDefaultBorderValue(),
          )
        }

        contours = new cv.MatVector()
        hierarchy = new cv.Mat()
        cv.findContours(morphed, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

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
            cv.approxPolyDP(contour, approx, peri * pass.eps, true)

            // Se for 4 pontos, avaliar
            if (approx.rows === 4) {
              const rawPtsProc: Point2D[] = []
              const rawPtsOrig: Point2D[] = []
              for (let r = 0; r < 4; r++) {
                const px = approx.data32S[r * 2]
                const py = approx.data32S[r * 2 + 1]
                rawPtsProc.push({ x: px, y: py })
                rawPtsOrig.push({
                  x: Math.max(0, Math.min(originalWidth, px * scale)),
                  y: Math.max(0, Math.min(originalHeight, py * scale)),
                })
              }

              const orderedProc = orderCorners(rawPtsProc)
              const orderedOrig = orderCorners(rawPtsOrig)

              if (!isValidConvexQuad(orderedProc)) {
                continue
              }

              // CRITÉRIOS DE AVALIAÇÃO E RANKING:
              // 1. Proporção de aspecto (RG, A4, CNH, carteiras): típica 1.25 a 1.65 (horizontal ou vertical)
              const wTop = Math.hypot(
                orderedProc.topRight.x - orderedProc.topLeft.x,
                orderedProc.topRight.y - orderedProc.topLeft.y,
              )
              const wBot = Math.hypot(
                orderedProc.bottomRight.x - orderedProc.bottomLeft.x,
                orderedProc.bottomRight.y - orderedProc.bottomLeft.y,
              )
              const hLeft = Math.hypot(
                orderedProc.bottomLeft.x - orderedProc.topLeft.x,
                orderedProc.bottomLeft.y - orderedProc.topLeft.y,
              )
              const hRight = Math.hypot(
                orderedProc.bottomRight.x - orderedProc.topRight.x,
                orderedProc.bottomRight.y - orderedProc.topRight.y,
              )

              const avgW = (wTop + wBot) / 2
              const avgH = (hLeft + hRight) / 2
              if (avgW < 40 || avgH < 40) continue

              const aspect = Math.max(avgW / avgH, avgH / avgW)
              // Documentos brasileiros (RG aberto ~1.43, RG fechado ~1.42, A4 ~1.414, CNH ~1.45)
              let aspectScore = 1.0
              if (aspect >= 1.2 && aspect <= 1.7) {
                aspectScore = 1.25
              } else if (aspect > 2.5 || aspect < 1.05) {
                aspectScore = 0.5
              }

              // 2. Proximidade de paralelismo (lados opostos devem ter tamanhos similares)
              const ratioW = Math.min(wTop, wBot) / Math.max(wTop, wBot)
              const ratioH = Math.min(hLeft, hRight) / Math.max(hLeft, hRight)
              const parallelismScore = (ratioW + ratioH) / 2

              // 3. Afastamento das bordas da imagem (evitar confundir com o quadro da própria foto)
              const marginMargin = 8
              const touchesBorder = [
                orderedProc.topLeft,
                orderedProc.topRight,
                orderedProc.bottomRight,
                orderedProc.bottomLeft,
              ].some(
                (p) =>
                  p.x <= marginMargin ||
                  p.x >= procWidth - marginMargin ||
                  p.y <= marginMargin ||
                  p.y >= procHeight - marginMargin,
              )
              const borderPenalty = touchesBorder ? 0.6 : 1.0

              // 4. Área relativa (ideal entre 15% e 85% da imagem total)
              const areaFraction = area / totalProcArea
              let areaScore = 1.0
              if (areaFraction >= 0.2 && areaFraction <= 0.85) {
                areaScore = 1.2
              } else if (areaFraction > 0.92) {
                areaScore = 0.5 // quase o frame todo
              }

              // 5. Pontuação agregada
              const score = area * aspectScore * parallelismScore * borderPenalty * areaScore
              const confidence = Math.min(
                0.98,
                Math.max(
                  0.15,
                  (parallelismScore * 0.4 + areaFraction * 0.3 + (aspectScore / 1.25) * 0.3) *
                    borderPenalty,
                ),
              )

              candidates.push({
                corners: orderedOrig,
                procCorners: orderedProc,
                area,
                score,
                confidence,
              })
            }
          } finally {
            contour?.delete?.()
            approx?.delete?.()
          }
        }
      } finally {
        edges?.delete?.()
        morphed?.delete?.()
        contours?.delete?.()
        hierarchy?.delete?.()
      }
    }

    if (candidates.length > 0) {
      // Ordenar pelo ranking com múltiplos critérios
      candidates.sort((a, b) => b.score - a.score)
      const best = candidates[0]

      // Estimar inclinação das bordas do documento detectado
      const dx = best.corners.topRight.x - best.corners.topLeft.x
      const dy = best.corners.topRight.y - best.corners.topLeft.y
      let tilt = (Math.atan2(dy, dx) * 180) / Math.PI
      while (tilt > 45) tilt -= 90
      while (tilt < -45) tilt += 90
      const estimatedTiltAngle = Math.round(tilt * 10) / 10

      // Se a confiança for maior ou igual a 0.35, consideramos detecção confiável
      const isConfident = best.confidence >= 0.35
      return {
        corners: best.corners,
        confidence: best.confidence,
        detected: isConfident,
        estimatedTiltAngle,
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
    clahe?.delete?.()
    srcMat?.delete?.()
    gray?.delete?.()
    enhanced?.delete?.()
    blurred?.delete?.()
    morphKernel?.delete?.()
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
      const initResult = await loadOpenCvInWorker(msg.opencvUrl)
      const durationMs = Math.round(performance.now() - t0)
      const res: WorkerInitSuccessResponse = {
        type: 'init_success',
        id: msg.id,
        durationMs,
        strategy: initResult?.strategy || 'importScripts',
        scriptLoadMs: initResult?.scriptLoadMs || 0,
        wasmInitMs: initResult?.wasmInitMs || 0,
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
        estimatedTiltAngle: result.estimatedTiltAngle,
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
      const post = self.postMessage as unknown as (
        message: unknown,
        transfer?: Transferable[],
      ) => void
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
