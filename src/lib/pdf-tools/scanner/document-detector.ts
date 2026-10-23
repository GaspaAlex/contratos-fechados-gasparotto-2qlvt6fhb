// src/lib/pdf-tools/scanner/document-detector.ts
/**
 * Motor de detecção automática de bordas de documentos retangulares.
 * Utiliza OpenCV.js (cv.Canny, GaussianBlur, findContours, approxPolyDP, minAreaRect)
 * com fallback inteligente para contorno padrão com margem caso a imagem não tenha
 * contraste suficiente para detecção segura.
 *
 * Licença OpenCV: Apache-2.0
 */

import { loadOpenCv, isOpenCvLoaded } from './opencv-loader'
import {
  type DocumentCorners,
  type Point2D,
  orderCorners,
  isValidConvexQuad,
  computeTargetDimensions,
  warpPerspectiveCanvas,
} from './perspective-math'

export interface DetectionResult {
  success: boolean
  corners: DocumentCorners
  isConfident: boolean
  sourceWidth: number
  sourceHeight: number
  message?: string
  engineState: 'ready' | 'failed' | 'not_loaded'
  engineInitDurationMs?: number
  detectionDurationMs?: number
  failureReason?: string
}

/**
 * Cria cantos padrão cobrindo 88% da área central com 6% de margem em cada borda.
 */
export function getDefaultCorners(width: number, height: number): DocumentCorners {
  const marginX = Math.round(width * 0.06)
  const marginY = Math.round(height * 0.06)

  return {
    topLeft: { x: marginX, y: marginY },
    topRight: { x: width - marginX, y: marginY },
    bottomRight: { x: width - marginX, y: height - marginY },
    bottomLeft: { x: marginX, y: height - marginY },
  }
}

/**
 * Executa detecção de bordas sobre um elemento de imagem ou canvas.
 */
export async function detectDocumentCorners(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
): Promise<DetectionResult> {
  const naturalWidth = 'naturalWidth' in sourceImage ? sourceImage.naturalWidth : sourceImage.width
  const naturalHeight =
    'naturalHeight' in sourceImage ? sourceImage.naturalHeight : sourceImage.height

  if (!naturalWidth || !naturalHeight) {
    throw new Error('Dimensões da imagem inválidas para detecção.')
  }

  const startDetectionTime = performance.now()

  // 1. Tentar inicializar OpenCV.js
  let cv: any = null
  let engineInitDurationMs: number | undefined
  try {
    cv = await loadOpenCv()
    engineInitDurationMs = typeof window !== 'undefined' ? window._opencvInitDurationMs : undefined
  } catch (cvErr: any) {
    const errMessage = cvErr?.message || 'Motor de visão computacional indisponível'
    console.warn(
      '[Detector] OpenCV não pôde ser inicializado, utilizando cantos manuais pré-definidos:',
      cvErr,
    )
    return {
      success: false,
      corners: getDefaultCorners(naturalWidth, naturalHeight),
      isConfident: false,
      sourceWidth: naturalWidth,
      sourceHeight: naturalHeight,
      engineState: 'failed',
      failureReason: errMessage,
      detectionDurationMs: Math.round(performance.now() - startDetectionTime),
      message:
        'Motor de visão computacional indisponível no momento. Ajuste os cantos manualmente.',
    }
  }

  // 2. Preparar imagem redimensionada para processamento rápido (evitar travar thread)
  // Escala para dimensão máxima de 1000px
  const maxDim = 1000
  const scale = Math.min(1, maxDim / Math.max(naturalWidth, naturalHeight))
  const procW = Math.round(naturalWidth * scale)
  const procH = Math.round(naturalHeight * scale)

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = procW
  tempCanvas.height = procH
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) {
    return {
      success: false,
      corners: getDefaultCorners(naturalWidth, naturalHeight),
      isConfident: false,
      sourceWidth: naturalWidth,
      sourceHeight: naturalHeight,
      engineState: 'ready',
      engineInitDurationMs,
      detectionDurationMs: Math.round(performance.now() - startDetectionTime),
      failureReason: 'Falha ao alocar contexto 2D.',
      message: 'Falha ao alocar contexto gráfico.',
    }
  }

  tempCtx.drawImage(sourceImage, 0, 0, procW, procH)

  // 3. Processamento OpenCV
  let srcMat: any = null
  let grayMat: any = null
  let blurMat: any = null
  let edgesMat: any = null
  let dilatedMat: any = null
  let contours: any = null
  let hierarchy: any = null
  let approx: any = null

  try {
    srcMat = cv.imread(tempCanvas)
    grayMat = new cv.Mat()
    cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY)

    blurMat = new cv.Mat()
    cv.GaussianBlur(grayMat, blurMat, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT)

    // Detecção com Canny
    edgesMat = new cv.Mat()
    cv.Canny(blurMat, edgesMat, 50, 150)

    // Dilatação leve para fechar contornos rompidos
    dilatedMat = new cv.Mat()
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U)
    cv.dilate(edgesMat, dilatedMat, kernel)
    kernel.delete()

    contours = new cv.MatVector()
    hierarchy = new cv.Mat()
    cv.findContours(dilatedMat, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

    const totalArea = procW * procH
    const minDocumentArea = totalArea * 0.15 // ao menos 15% da imagem
    let bestContour: any = null
    let bestArea = 0
    let bestCorners: DocumentCorners | null = null
    let isConfident = false

    approx = new cv.Mat()

    // Procurar melhor contorno de 4 lados
    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i)
      const area = cv.contourArea(cnt)
      if (area < minDocumentArea || area <= bestArea) {
        continue
      }

      const perimeter = cv.arcLength(cnt, true)
      cv.approxPolyDP(cnt, approx, 0.02 * perimeter, true)

      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        // Extrair os 4 pontos
        const pts: Point2D[] = []
        for (let j = 0; j < 4; j++) {
          const x = approx.data32S[j * 2] / scale
          const y = approx.data32S[j * 2 + 1] / scale
          pts.push({
            x: Math.max(0, Math.min(naturalWidth, x)),
            y: Math.max(0, Math.min(naturalHeight, y)),
          })
        }

        try {
          const ordered = orderCorners(pts)
          if (isValidConvexQuad(ordered)) {
            bestArea = area
            bestContour = cnt
            bestCorners = ordered
            isConfident = true
          }
        } catch {
          // continua buscando
        }
      }
    }

    // Se não encontrou quadrilátero exato de 4 vértices, tentar pelo maior contorno via minAreaRect
    if (!bestCorners) {
      let maxArea = 0
      let maxContourIdx = -1
      for (let i = 0; i < contours.size(); ++i) {
        const cnt = contours.get(i)
        const area = cv.contourArea(cnt)
        if (area > maxArea && area >= minDocumentArea) {
          maxArea = area
          maxContourIdx = i
        }
      }

      if (maxContourIdx >= 0) {
        const maxCnt = contours.get(maxContourIdx)
        const rect = cv.minAreaRect(maxCnt)
        // Obter os 4 vértices da caixa rotacionada
        const boxPts = cv.RotatedRect.points(rect)
        const pts: Point2D[] = []
        for (let k = 0; k < 4; k++) {
          const px = boxPts[k].x / scale
          const py = boxPts[k].y / scale
          pts.push({
            x: Math.max(0, Math.min(naturalWidth, px)),
            y: Math.max(0, Math.min(naturalHeight, py)),
          })
        }

        try {
          const ordered = orderCorners(pts)
          if (isValidConvexQuad(ordered)) {
            bestCorners = ordered
            // Menor grau de certeza, requer verificação do usuário
            isConfident = false
          }
        } catch {
          // Fallback abaixo
        }
      }
    }

    const detectionDurationMs = Math.round(performance.now() - startDetectionTime)
    console.info(
      `[Detector] Detecção concluída em ${detectionDurationMs}ms (inicialização prévia: ${engineInitDurationMs ?? 0}ms)`,
    )

    if (bestCorners && isValidConvexQuad(bestCorners)) {
      return {
        success: true,
        corners: bestCorners,
        isConfident,
        sourceWidth: naturalWidth,
        sourceHeight: naturalHeight,
        engineState: 'ready',
        engineInitDurationMs,
        detectionDurationMs,
        message: isConfident
          ? 'Bordas do documento detectadas com sucesso.'
          : 'Detecção aproximada. Ajuste os cantos se necessário.',
      }
    }

    // Se tudo falhar (motor OK, mas contraste/forma não identificados como quadrilátero)
    return {
      success: false,
      corners: getDefaultCorners(naturalWidth, naturalHeight),
      isConfident: false,
      sourceWidth: naturalWidth,
      sourceHeight: naturalHeight,
      engineState: 'ready',
      engineInitDurationMs,
      detectionDurationMs,
      failureReason: 'Contornos nítidos de documento não isolados.',
      message:
        'Motor ativo: não foi possível detectar bordas nítidas automaticamente neste enquadramento. Ajuste os cantos manualmente.',
    }
  } catch (err: any) {
    const detectionDurationMs = Math.round(performance.now() - startDetectionTime)
    console.error('Erro durante detecção com OpenCV:', err)
    return {
      success: false,
      corners: getDefaultCorners(naturalWidth, naturalHeight),
      isConfident: false,
      sourceWidth: naturalWidth,
      sourceHeight: naturalHeight,
      engineState: 'ready',
      engineInitDurationMs,
      detectionDurationMs,
      failureReason: err?.message || 'Erro durante a análise do algoritmo de bordas',
      message: 'Erro durante análise de imagem. Utilize o ajuste manual.',
    }
  } finally {
    // Liberação estrita de recursos nativos OpenCV
    if (approx) approx.delete()
    if (contours) contours.delete()
    if (hierarchy) hierarchy.delete()
    if (dilatedMat) dilatedMat.delete()
    if (edgesMat) edgesMat.delete()
    if (blurMat) blurMat.delete()
    if (grayMat) grayMat.delete()
    if (srcMat) srcMat.delete()
  }
}

/**
 * Aplica recorte e transformação de perspectiva sobre a imagem.
 * Utiliza cv.warpPerspective de alta precisão ou fallback determinístico em canvas.
 */
export async function applyPerspectiveWarp(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  corners: DocumentCorners,
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const naturalWidth = 'naturalWidth' in sourceImage ? sourceImage.naturalWidth : sourceImage.width
  const naturalHeight =
    'naturalHeight' in sourceImage ? sourceImage.naturalHeight : sourceImage.height

  const targetDim = computeTargetDimensions(corners)
  const targetW = targetDim.width
  const targetH = targetDim.height

  // 1. Tentar com OpenCV se disponível
  if (isOpenCvLoaded()) {
    const cv = window.cv
    let srcMat: any = null
    let warpedMat: any = null
    let srcTri: any = null
    let dstTri: any = null
    let M: any = null

    try {
      const inCanvas = document.createElement('canvas')
      inCanvas.width = naturalWidth
      inCanvas.height = naturalHeight
      const inCtx = inCanvas.getContext('2d')
      if (!inCtx) throw new Error('Falha ao obter contexto 2D')
      inCtx.drawImage(sourceImage, 0, 0, naturalWidth, naturalHeight)

      srcMat = cv.imread(inCanvas)
      warpedMat = new cv.Mat()

      srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        corners.topLeft.x,
        corners.topLeft.y,
        corners.topRight.x,
        corners.topRight.y,
        corners.bottomRight.x,
        corners.bottomRight.y,
        corners.bottomLeft.x,
        corners.bottomLeft.y,
      ])

      dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, targetW, 0, targetW, targetH, 0, targetH])

      M = cv.getPerspectiveTransform(srcTri, dstTri)
      const dsize = new cv.Size(targetW, targetH)
      cv.warpPerspective(
        srcMat,
        warpedMat,
        M,
        dsize,
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar(255, 255, 255, 255),
      )

      const outCanvas = document.createElement('canvas')
      outCanvas.width = targetW
      outCanvas.height = targetH
      cv.imshow(outCanvas, warpedMat)

      return { canvas: outCanvas, width: targetW, height: targetH }
    } catch (err) {
      console.warn('Warp OpenCV falhou, aplicando fallback de perspectiva:', err)
    } finally {
      if (srcTri) srcTri.delete()
      if (dstTri) dstTri.delete()
      if (M) M.delete()
      if (warpedMat) warpedMat.delete()
      if (srcMat) srcMat.delete()
    }
  }

  // 2. Fallback matemático nativo (DLT + Bilinear interpolation)
  const inCanvas = document.createElement('canvas')
  inCanvas.width = naturalWidth
  inCanvas.height = naturalHeight
  const inCtx = inCanvas.getContext('2d')
  if (!inCtx) throw new Error('Falha ao obter contexto 2D de origem')
  inCtx.drawImage(sourceImage, 0, 0, naturalWidth, naturalHeight)

  const warpedCanvas = warpPerspectiveCanvas(
    inCtx,
    naturalWidth,
    naturalHeight,
    corners,
    targetW,
    targetH,
  )

  return { canvas: warpedCanvas, width: targetW, height: targetH }
}
