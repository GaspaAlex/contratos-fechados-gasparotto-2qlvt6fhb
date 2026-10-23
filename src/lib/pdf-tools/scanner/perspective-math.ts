// src/lib/pdf-tools/scanner/perspective-math.ts
/**
 * Implementação matemática pura de Transformação de Perspectiva 2D (Homografia 3x3)
 * e interpolação bilinear de pixels.
 *
 * Utilizada como:
 * 1. Fallback 100% autônomo e sem dependências caso o OpenCV.js não esteja disponível;
 * 2. Motor determinístico para cálculos de cantos, reordenação de vértices e validação geométrica.
 *
 * Baseada no algoritmo padrão de normalização DLT (Direct Linear Transformation).
 */

export interface Point2D {
  x: number
  y: number
}

export interface DocumentCorners {
  topLeft: Point2D
  topRight: Point2D
  bottomRight: Point2D
  bottomLeft: Point2D
}

/**
 * Distância Euclidiana entre dois pontos
 */
export function distance(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y)
}

/**
 * Calcula o ângulo em graus de inclinação (tilt) do quadrilátero em relação à horizontal (-45° a +45°).
 * Retorna valores positivos para rotação horária e negativos para anti-horária.
 */
export function estimateQuadTiltDegrees(corners: DocumentCorners): number {
  // Vetor do topo: topLeft -> topRight
  const dxTop = corners.topRight.x - corners.topLeft.x
  const dyTop = corners.topRight.y - corners.topLeft.y
  const angleTopRad = Math.atan2(dyTop, dxTop)
  const angleTopDeg = (angleTopRad * 180) / Math.PI

  // Vetor da base: bottomLeft -> bottomRight
  const dxBottom = corners.bottomRight.x - corners.bottomLeft.x
  const dyBottom = corners.bottomRight.y - corners.bottomLeft.y
  const angleBottomRad = Math.atan2(dyBottom, dxBottom)
  const angleBottomDeg = (angleBottomRad * 180) / Math.PI

  // Média ponderada dos dois lados horizontais
  const avgDeg = (angleTopDeg + angleBottomDeg) / 2

  // Normalizar para faixa entre -45° e +45°
  let normalized = avgDeg
  while (normalized > 45) normalized -= 90
  while (normalized < -45) normalized += 90

  // Arredondar para 1 casa decimal
  return Math.round(normalized * 10) / 10
}

/**
 * Ordena 4 cantos arbitrários em: [TopLeft, TopRight, BottomRight, BottomLeft].
 * Algoritmo:
 * - A soma (x + y) é mínima no TopLeft e máxima no BottomRight.
 * - A diferença (y - x) é mínima no TopRight e máxima no BottomLeft.
 */
export function orderCorners(pts: Point2D[]): DocumentCorners {
  if (pts.length !== 4) {
    throw new Error('A ordenação requer exatamente 4 pontos.')
  }

  // Clonar para não mutar
  const points = [...pts]

  // Top-left: soma x + y mínima
  // Bottom-right: soma x + y máxima
  let tl = points[0]
  let br = points[0]
  let minSum = tl.x + tl.y
  let maxSum = br.x + br.y

  for (let i = 1; i < 4; i++) {
    const sum = points[i].x + points[i].y
    if (sum < minSum) {
      minSum = sum
      tl = points[i]
    }
    if (sum > maxSum) {
      maxSum = sum
      br = points[i]
    }
  }

  // Top-right: diferença (y - x) mínima (ou x - y máxima)
  // Bottom-left: diferença (y - x) máxima
  let tr = points[0]
  let bl = points[0]
  let minDiff = tr.y - tr.x
  let maxDiff = bl.y - bl.x

  for (let i = 1; i < 4; i++) {
    const diff = points[i].y - points[i].x
    if (diff < minDiff) {
      minDiff = diff
      tr = points[i]
    }
    if (diff > maxDiff) {
      maxDiff = diff
      bl = points[i]
    }
  }

  return {
    topLeft: { x: Math.round(tl.x), y: Math.round(tl.y) },
    topRight: { x: Math.round(tr.x), y: Math.round(tr.y) },
    bottomRight: { x: Math.round(br.x), y: Math.round(br.y) },
    bottomLeft: { x: Math.round(bl.x), y: Math.round(bl.y) },
  }
}

/**
 * Verifica se os 4 cantos formam um quadrilátero convexo simples (sem cruzamentos).
 * Utiliza o produto vetorial (cross product) entre arestas consecutivas.
 */
/**
 * Retorna os 4 cantos padrão com margem de 8% de margem interna.
 */
export function getDefaultCorners(width: number, height: number): DocumentCorners {
  const insetX = width * 0.08
  const insetY = height * 0.08
  return {
    topLeft: { x: insetX, y: insetY },
    topRight: { x: width - insetX, y: insetY },
    bottomRight: { x: width - insetX, y: height - insetY },
    bottomLeft: { x: insetX, y: height - insetY },
  }
}

export function isValidConvexQuad(corners: DocumentCorners): boolean {
  const pts = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]

  let sign = 0
  for (let i = 0; i < 4; i++) {
    const p1 = pts[i]
    const p2 = pts[(i + 1) % 4]
    const p3 = pts[(i + 2) % 4]

    const dx1 = p2.x - p1.x
    const dy1 = p2.y - p1.y
    const dx2 = p3.x - p2.x
    const dy2 = p3.y - p2.y

    const cross = dx1 * dy2 - dy1 * dx2
    if (Math.abs(cross) < 1e-5) {
      // Pontos colineares
      return false
    }

    if (sign === 0) {
      sign = cross > 0 ? 1 : -1
    } else if ((cross > 0 && sign < 0) || (cross < 0 && sign > 0)) {
      // Mudança de sinal => não convexo ou arestas cruzadas
      return false
    }
  }

  return true
}

/**
 * Calcula a largura e altura naturais do documento após a retificação de perspectiva.
 * Usa o máximo das larguras superior/inferior e alturas esquerda/direita.
 */
export function computeTargetDimensions(corners: DocumentCorners): {
  width: number
  height: number
} {
  const widthTop = distance(corners.topLeft, corners.topRight)
  const widthBottom = distance(corners.bottomLeft, corners.bottomRight)
  const maxWidth = Math.max(widthTop, widthBottom)

  const heightLeft = distance(corners.topLeft, corners.bottomLeft)
  const heightRight = distance(corners.topRight, corners.bottomRight)
  const maxHeight = Math.max(heightLeft, heightRight)

  return {
    width: Math.max(30, Math.round(maxWidth)),
    height: Math.max(30, Math.round(maxHeight)),
  }
}

/**
 * Inverte matriz 8x8 por eliminação de Gauss-Jordan para resolver os 8 coeficientes da homografia.
 */
function solve8x8(A: number[][], b: number[]): number[] {
  const n = 8
  const M: number[][] = []
  for (let i = 0; i < n; i++) {
    M[i] = [...A[i], b[i]]
  }

  for (let i = 0; i < n; i++) {
    // Pivô
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k
      }
    }
    const temp = M[i]
    M[i] = M[maxRow]
    M[maxRow] = temp

    const pivot = M[i][i]
    if (Math.abs(pivot) < 1e-10) {
      throw new Error('Matriz singular: cantos degenerados para perspectiva.')
    }

    for (let j = i; j <= n; j++) {
      M[i][j] /= pivot
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i]
        for (let j = i; j <= n; j++) {
          M[k][j] -= factor * M[i][j]
        }
      }
    }
  }

  const res = new Array(n)
  for (let i = 0; i < n; i++) {
    res[i] = M[i][n]
  }
  return res
}

/**
 * Calcula a matriz de perspectiva M de (src -> dst).
 * src: 4 pontos de origem [TL, TR, BR, BL]
 * dst: 4 pontos de destino [TL, TR, BR, BL]
 * Retorna os 9 coeficientes [h00, h01, h02, h10, h11, h12, h20, h21, 1]
 */
export function getPerspectiveTransformMatrix(
  src: [Point2D, Point2D, Point2D, Point2D],
  dst: [Point2D, Point2D, Point2D, Point2D],
): number[] {
  const A: number[][] = []
  const b: number[] = []

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x
    const sy = src[i].y
    const dx = dst[i].x
    const dy = dst[i].y

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy])
    b.push(dx)

    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy])
    b.push(dy)
  }

  const h = solve8x8(A, b)
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
}

/**
 * Inverte matriz 3x3
 */
function invert3x3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)

  if (Math.abs(det) < 1e-12) {
    throw new Error('Matriz não invertível')
  }

  const invDet = 1 / det
  return [
    (e * i - f * h) * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    (f * g - d * i) * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    (d * h - e * g) * invDet,
    (g * b - a * h) * invDet,
    (a * e - b * d) * invDet,
  ]
}

/**
 * Aplica Warp Perspective puro em ImageData via Canvas 2D com interpolação bilinear.
 * Utilizado caso o OpenCV.js falhe ou não esteja disponível.
 */
export function warpPerspectiveCanvas(
  sourceCtx: CanvasRenderingContext2D,
  srcWidth: number,
  srcHeight: number,
  corners: DocumentCorners,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  const srcImgData = sourceCtx.getImageData(0, 0, srcWidth, srcHeight)
  const srcPixels = srcImgData.data

  const outCanvas = document.createElement('canvas')
  outCanvas.width = targetWidth
  outCanvas.height = targetHeight
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) {
    throw new Error('Contexto 2D não suportado.')
  }

  const outImgData = outCtx.createImageData(targetWidth, targetHeight)
  const outPixels = outImgData.data

  // src -> corners
  // dst -> retângulo de (0,0) a (targetWidth, targetHeight)
  const srcQuad: [Point2D, Point2D, Point2D, Point2D] = [
    corners.topLeft,
    corners.topRight,
    corners.bottomRight,
    corners.bottomLeft,
  ]
  const dstQuad: [Point2D, Point2D, Point2D, Point2D] = [
    { x: 0, y: 0 },
    { x: targetWidth, y: 0 },
    { x: targetWidth, y: targetHeight },
    { x: 0, y: targetHeight },
  ]

  // Para cada pixel do destino (dx, dy), queremos achar a coordenada de origem (sx, sy).
  // Logo usamos a transformação dst -> src:
  const invM = getPerspectiveTransformMatrix(dstQuad, srcQuad)
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = invM

  for (let dy = 0; dy < targetHeight; dy++) {
    const rowOffset = dy * targetWidth * 4
    for (let dx = 0; dx < targetWidth; dx++) {
      const denom = m6 * dx + m7 * dy + m8
      if (Math.abs(denom) < 1e-9) continue

      const sx = (m0 * dx + m1 * dy + m2) / denom
      const sy = (m3 * dx + m4 * dy + m5) / denom

      // Interpolação Bilinear se dentro dos limites
      if (sx >= 0 && sx < srcWidth - 1 && sy >= 0 && sy < srcHeight - 1) {
        const x0 = Math.floor(sx)
        const y0 = Math.floor(sy)
        const x1 = x0 + 1
        const y1 = y0 + 1

        const fx = sx - x0
        const fy = sy - y0
        const w00 = (1 - fx) * (1 - fy)
        const w10 = fx * (1 - fy)
        const w01 = (1 - fx) * fy
        const w11 = fx * fy

        const idx00 = (y0 * srcWidth + x0) * 4
        const idx10 = (y0 * srcWidth + x1) * 4
        const idx01 = (y1 * srcWidth + x0) * 4
        const idx11 = (y1 * srcWidth + x1) * 4

        const outIdx = rowOffset + dx * 4
        outPixels[outIdx] = Math.round(
          srcPixels[idx00] * w00 +
            srcPixels[idx10] * w10 +
            srcPixels[idx01] * w01 +
            srcPixels[idx11] * w11,
        )
        outPixels[outIdx + 1] = Math.round(
          srcPixels[idx00 + 1] * w00 +
            srcPixels[idx10 + 1] * w10 +
            srcPixels[idx01 + 1] * w01 +
            srcPixels[idx11 + 1] * w11,
        )
        outPixels[outIdx + 2] = Math.round(
          srcPixels[idx00 + 2] * w00 +
            srcPixels[idx10 + 2] * w10 +
            srcPixels[idx01 + 2] * w01 +
            srcPixels[idx11 + 2] * w11,
        )
        outPixels[outIdx + 3] = 255
      } else if (sx >= 0 && sx < srcWidth && sy >= 0 && sy < srcHeight) {
        // Nearest neighbor nas bordas exatas
        const rx = Math.min(srcWidth - 1, Math.max(0, Math.round(sx)))
        const ry = Math.min(srcHeight - 1, Math.max(0, Math.round(sy)))
        const srcIdx = (ry * srcWidth + rx) * 4
        const outIdx = rowOffset + dx * 4
        outPixels[outIdx] = srcPixels[srcIdx]
        outPixels[outIdx + 1] = srcPixels[srcIdx + 1]
        outPixels[outIdx + 2] = srcPixels[srcIdx + 2]
        outPixels[outIdx + 3] = 255
      }
    }
  }

  outCtx.putImageData(outImgData, 0, 0)
  return outCanvas
}
