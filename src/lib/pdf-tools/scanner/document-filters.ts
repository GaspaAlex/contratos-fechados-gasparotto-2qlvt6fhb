/**
 * document-filters.ts
 *
 * Módulo de Processamento e Tratamento Documental de Imagens (CamScanner Bloco 2)
 * Advocacia Gasparotto - 100% Local no Navegador (Client-side, sem APIs externas)
 *
 * Modos de Tratamento:
 * 1. 'original': Não altera cores, iluminação ou contraste. Retorna a imagem intacta.
 * 2. 'shadow_removal': Estima a iluminação de fundo desigual e a remove via divisão local
 *    (I_corr = (I / Background) * 230). Preserva cores originais (carimbos vermelhos,
 *    assinaturas azuis, fotografias, QR Codes e marcas d'água).
 * 3. 'enhance': Tratamento documental otimizado para legibilidade de texto.
 *    Combina remoção de sombras, realce suave de contraste com retenção de realces/sombras
 *    e leve unsharp masking para nitidez de caracteres, SEM binarização agressiva
 *    e SEM transformar em preto e branco.
 */

export type DocumentFilterMode = 'original' | 'shadow_removal' | 'enhance'

export interface FilterOptions {
  mode: DocumentFilterMode
  /**
   * Resolução máxima para a prévia rápida (ex.: 1200px na maior dimensão).
   * Se omitido ou <= 0, processa na resolução nativa.
   */
  maxPreviewDimension?: number
}

export interface FilterResult {
  canvas: HTMLCanvasElement
  durationMs: number
  mode: DocumentFilterMode
  width: number
  height: number
}

/**
 * Cria uma cópia independente de um canvas ou redimensiona mantendo aspect ratio.
 */
export function cloneOrResizeCanvas(
  source: HTMLCanvasElement,
  maxDimension?: number,
): HTMLCanvasElement {
  const srcW = source.width
  const srcH = source.height

  let targetW = srcW
  let targetH = srcH

  if (maxDimension && maxDimension > 0 && Math.max(srcW, srcH) > maxDimension) {
    const scale = maxDimension / Math.max(srcW, srcH)
    targetW = Math.max(1, Math.round(srcW * scale))
    targetH = Math.max(1, Math.round(srcH * scale))
  }

  const out = document.createElement('canvas')
  out.width = targetW
  out.height = targetH
  const ctx = out.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Não foi possível obter contexto 2D do Canvas')

  ctx.drawImage(source, 0, 0, targetW, targetH)
  return out
}

/**
 * Filtro Box Blur rápido de 2 passos (horizontal + vertical) usando soma deslizante (O(N)).
 * Opera in-place ou entre buffers uint8 para velocidade extrema (milissegundos mesmo em imagens 4K).
 */
function fastBoxBlurChannel(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  channelOffset: number,
  step: number = 4,
) {
  if (radius < 1) {
    for (let i = channelOffset; i < src.length; i += step) {
      dst[i] = src[i]
    }
    return
  }

  const temp = new Float32Array(width * height)

  // Passo 1: Blur Horizontal
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    let sum = 0
    let hits = 0

    // Janela inicial
    for (let x = -radius; x <= radius; x++) {
      const clampedX = Math.min(width - 1, Math.max(0, x))
      sum += src[(rowOffset + clampedX) * step + channelOffset]
      hits++
    }

    for (let x = 0; x < width; x++) {
      temp[rowOffset + x] = sum / hits

      // Desloca janela
      const removeX = Math.min(width - 1, Math.max(0, x - radius))
      const addX = Math.min(width - 1, Math.max(0, x + radius + 1))
      sum +=
        src[(rowOffset + addX) * step + channelOffset] -
        src[(rowOffset + removeX) * step + channelOffset]
    }
  }

  // Passo 2: Blur Vertical
  for (let x = 0; x < width; x++) {
    let sum = 0
    let hits = 0

    // Janela inicial
    for (let y = -radius; y <= radius; y++) {
      const clampedY = Math.min(height - 1, Math.max(0, y))
      sum += temp[clampedY * width + x]
      hits++
    }

    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * step + channelOffset
      dst[idx] = Math.min(255, Math.max(0, Math.round(sum / hits)))

      // Desloca janela
      const removeY = Math.min(height - 1, Math.max(0, y - radius))
      const addY = Math.min(height - 1, Math.max(0, y + radius + 1))
      sum += temp[addY * width + x] - temp[removeY * width + x]
    }
  }
}

/**
 * Estimação de fundo de iluminação (Background Illumination Map) via downsampling,
 * dilatação suave de máximos locais (papel claro) e blur gaussiano/box blur aproximado.
 * Retorna os canais de iluminação R, G, B em resolução original.
 */
function estimateIlluminationBackground(
  sourcePixels: Uint8ClampedArray,
  width: number,
  height: number,
): { bgR: Uint8ClampedArray; bgG: Uint8ClampedArray; bgB: Uint8ClampedArray } {
  // Redução de resolução da grade para estimativa rápida de fundo
  // Um grid de ~160px a 240px captura gradientes de luz e sombras de celulares
  // sem ser afetado por linhas finas de texto ou assinaturas.
  const downScale = Math.max(1, Math.round(Math.max(width, height) / 180))
  const lowW = Math.max(10, Math.round(width / downScale))
  const lowH = Math.max(10, Math.round(height / downScale))

  const lowR = new Uint8ClampedArray(lowW * lowH)
  const lowG = new Uint8ClampedArray(lowW * lowH)
  const lowB = new Uint8ClampedArray(lowW * lowH)

  // Amostragem com filtro de máximo de bloco (para priorizar o papel claro e ignorar o texto escuro)
  for (let ly = 0; ly < lowH; ly++) {
    const origYStart = Math.min(height - 1, Math.floor(ly * downScale))
    const origYEnd = Math.min(height, Math.floor((ly + 1) * downScale))

    for (let lx = 0; lx < lowW; lx++) {
      const origXStart = Math.min(width - 1, Math.floor(lx * downScale))
      const origXEnd = Math.min(width, Math.floor((lx + 1) * downScale))

      let maxR = 0
      let maxG = 0
      let maxB = 0

      // Bloco de amostragem
      for (let y = origYStart; y < origYEnd; y += Math.max(1, Math.floor(downScale / 4))) {
        for (let x = origXStart; x < origXEnd; x += Math.max(1, Math.floor(downScale / 4))) {
          const idx = (y * width + x) * 4
          if (sourcePixels[idx] > maxR) maxR = sourcePixels[idx]
          if (sourcePixels[idx + 1] > maxG) maxG = sourcePixels[idx + 1]
          if (sourcePixels[idx + 2] > maxB) maxB = sourcePixels[idx + 2]
        }
      }

      const lowIdx = ly * lowW + lx
      lowR[lowIdx] = Math.max(30, maxR)
      lowG[lowIdx] = Math.max(30, maxG)
      lowB[lowIdx] = Math.max(30, maxB)
    }
  }

  // Suavização do mapa reduzido (2 passadas de box blur com raio proporcional)
  const blurredLowR = new Uint8ClampedArray(lowW * lowH)
  const blurredLowG = new Uint8ClampedArray(lowW * lowH)
  const blurredLowB = new Uint8ClampedArray(lowW * lowH)

  const blurRadiusLow = Math.max(3, Math.round(Math.min(lowW, lowH) * 0.12))
  fastBoxBlurChannel(lowR, blurredLowR, lowW, lowH, blurRadiusLow, 0, 1)
  fastBoxBlurChannel(lowG, blurredLowG, lowW, lowH, blurRadiusLow, 0, 1)
  fastBoxBlurChannel(lowB, blurredLowB, lowW, lowH, blurRadiusLow, 0, 1)

  // Interpolação bilinear de volta à resolução total
  const bgR = new Uint8ClampedArray(width * height)
  const bgG = new Uint8ClampedArray(width * height)
  const bgB = new Uint8ClampedArray(width * height)

  const xRatio = (lowW - 1) / Math.max(1, width - 1)
  const yRatio = (lowH - 1) / Math.max(1, height - 1)

  for (let y = 0; y < height; y++) {
    const ly = y * yRatio
    const y0 = Math.floor(ly)
    const y1 = Math.min(lowH - 1, y0 + 1)
    const dy = ly - y0

    const row0Offset = y0 * lowW
    const row1Offset = y1 * lowW
    const destRowOffset = y * width

    for (let x = 0; x < width; x++) {
      const lx = x * xRatio
      const x0 = Math.floor(lx)
      const x1 = Math.min(lowW - 1, x0 + 1)
      const dx = lx - x0

      const idx00 = row0Offset + x0
      const idx10 = row0Offset + x1
      const idx01 = row1Offset + x0
      const idx11 = row1Offset + x1

      const w00 = (1 - dx) * (1 - dy)
      const w10 = dx * (1 - dy)
      const w01 = (1 - dx) * dy
      const w11 = dx * dy

      const destIdx = destRowOffset + x

      bgR[destIdx] = Math.round(
        blurredLowR[idx00] * w00 +
          blurredLowR[idx10] * w10 +
          blurredLowR[idx01] * w01 +
          blurredLowR[idx11] * w11,
      )
      bgG[destIdx] = Math.round(
        blurredLowG[idx00] * w00 +
          blurredLowG[idx10] * w10 +
          blurredLowG[idx01] * w01 +
          blurredLowG[idx11] * w11,
      )
      bgB[destIdx] = Math.round(
        blurredLowB[idx00] * w00 +
          blurredLowB[idx10] * w10 +
          blurredLowB[idx01] * w01 +
          blurredLowB[idx11] * w11,
      )
    }
  }

  return { bgR, bgG, bgB }
}

/**
 * Modo B: SEM SOMBRA
 * - Estima o mapa de iluminação de fundo (celular, lâmpada inclinada, sombras pontuais).
 * - Corrige os canais RGB proporcionalmente via divisão local:
 *   pixel_corr = (pixel / fundo) * targetWhite
 * - Garante que cores (tinta azul, carimbos, fotos) sejam preservadas com seu tom original,
 *   evitando saturação e brancos estourados artificiais.
 */
export function applyShadowRemovalFilter(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const width = sourceCanvas.width
  const height = sourceCanvas.height

  const outCanvas = document.createElement('canvas')
  outCanvas.width = width
  outCanvas.height = height
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Não foi possível obter contexto 2D')

  ctx.drawImage(sourceCanvas, 0, 0)
  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data

  // Estimar fundo
  const { bgR, bgG, bgB } = estimateIlluminationBackground(data, width, height)

  // Alvo de branco suave para o papel (232-238, evitando 255 puro que causaria "recorte digital")
  const targetWhite = 232

  const len = width * height
  for (let i = 0; i < len; i++) {
    const pxIdx = i * 4

    const r = data[pxIdx]
    const g = data[pxIdx + 1]
    const b = data[pxIdx + 2]

    // Fundo local com piso seguro
    const bR = Math.max(35, bgR[i])
    const bG = Math.max(35, bgG[i])
    const bB = Math.max(35, bgB[i])

    // Ganho local baseado no canal
    let newR = (r / bR) * targetWhite
    let newG = (g / bG) * targetWhite
    let newB = (b / bB) * targetWhite

    // Compressão suave de altas luzes (evita clipping rígido em 255)
    if (newR > 240) newR = 240 + (newR - 240) * 0.4
    if (newG > 240) newG = 240 + (newG - 240) * 0.4
    if (newB > 240) newB = 240 + (newB - 240) * 0.4

    data[pxIdx] = Math.min(255, Math.max(0, Math.round(newR)))
    data[pxIdx + 1] = Math.min(255, Math.max(0, Math.round(newG)))
    data[pxIdx + 2] = Math.min(255, Math.max(0, Math.round(newB)))
    // Alpha permanece inalterado (data[pxIdx + 3])
  }

  ctx.putImageData(imgData, 0, 0)
  return outCanvas
}

/**
 * Modo C: MELHORAR
 * - Aplica a normalização de fundo e remoção de sombras.
 * - Realça o contraste documental de texto com curva sigmoide suave (CLAHE-like)
 *   que escurece traços de caneta e caracteres mantendo o fundo claro e uniforme.
 * - Aplica máscara de nitidez leve (unsharp mask) para caracteres nítidos e legíveis.
 * - Preserva cores: assinaturas azuis, carimbos vermelhos e QR codes permanecem
 *   claramente reconhecíveis e não binarizados.
 */
export function applyEnhanceFilter(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  // Passo 1: Começa com a correção de fundo/sombras
  const shadowRemovedCanvas = applyShadowRemovalFilter(sourceCanvas)
  const width = shadowRemovedCanvas.width
  const height = shadowRemovedCanvas.height

  const ctx = shadowRemovedCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return shadowRemovedCanvas

  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data
  const len = width * height

  // Passo 2: Curva de contraste tonal documental
  // Tabela LUT para curva de contraste que:
  // - Deixa o fundo limpo e quase branco (240-252)
  // - Escurece e encorpa tons de texto (15 a 140)
  // - Preserva tons intermediários de cores e fotos
  const lut = new Uint8Array(256)
  for (let v = 0; v < 256; v++) {
    if (v < 30) {
      // Pretos profundos permanecem pretos nítidos
      lut[v] = Math.round(v * 0.85)
    } else if (v < 160) {
      // Tons de texto: escurecimento controlado de 10% a 25%
      const norm = (v - 30) / 130
      // Interpolação suave
      lut[v] = Math.round(25 + norm * 125 * 0.88)
    } else if (v < 225) {
      // Transição para o papel
      const norm = (v - 160) / 65
      lut[v] = Math.round(135 + norm * 85)
    } else {
      // Fundo de papel: suavemente clareado até ~248
      const norm = (v - 225) / 31
      lut[v] = Math.round(220 + norm * 28)
    }
  }

  // Cria cópia para unsharp mask
  const originalR = new Uint8ClampedArray(len)
  const originalG = new Uint8ClampedArray(len)
  const originalB = new Uint8ClampedArray(len)

  for (let i = 0; i < len; i++) {
    const pxIdx = i * 4

    const r = lut[data[pxIdx]]
    const g = lut[data[pxIdx + 1]]
    const b = lut[data[pxIdx + 2]]

    data[pxIdx] = r
    data[pxIdx + 1] = g
    data[pxIdx + 2] = b

    originalR[i] = r
    originalG[i] = g
    originalB[i] = b
  }

  // Passo 3: Nitidez Moderada (Unsharp Mask leve: Raio 1.5, Força 0.35)
  // Ajuda a recuperar contornos nítidos de texto digitalizado
  const blurredR = new Uint8ClampedArray(len)
  const blurredG = new Uint8ClampedArray(len)
  const blurredB = new Uint8ClampedArray(len)

  fastBoxBlurChannel(originalR, blurredR, width, height, 2, 0, 1)
  fastBoxBlurChannel(originalG, blurredG, width, height, 2, 0, 1)
  fastBoxBlurChannel(originalB, blurredB, width, height, 2, 0, 1)

  const sharpenStrength = 0.35

  for (let i = 0; i < len; i++) {
    const pxIdx = i * 4

    const r = originalR[i]
    const g = originalG[i]
    const b = originalB[i]

    const diffR = r - blurredR[i]
    const diffG = g - blurredG[i]
    const diffB = b - blurredB[i]

    // Limitar o realce para não criar halos brancos excessivos ao redor de letras
    const sharpR = r + Math.max(-25, Math.min(25, diffR * sharpenStrength))
    const sharpG = g + Math.max(-25, Math.min(25, diffG * sharpenStrength))
    const sharpB = b + Math.max(-25, Math.min(25, diffB * sharpenStrength))

    data[pxIdx] = Math.min(255, Math.max(0, Math.round(sharpR)))
    data[pxIdx + 1] = Math.min(255, Math.max(0, Math.round(sharpG)))
    data[pxIdx + 2] = Math.min(255, Math.max(0, Math.round(sharpB)))
  }

  ctx.putImageData(imgData, 0, 0)
  return shadowRemovedCanvas
}

/**
 * Função principal para processamento de filtros documentais.
 * Pode ser executada de forma síncrona/assíncrona sem bloquear
 * e possui medição exata via performance.now.
 */
export async function processDocumentFilter(
  sourceCanvas: HTMLCanvasElement,
  options: FilterOptions,
): Promise<FilterResult> {
  const t0 = performance.now()
  const { mode, maxPreviewDimension } = options

  if (mode === 'original') {
    const canvas = cloneOrResizeCanvas(sourceCanvas, maxPreviewDimension)
    const durationMs = Math.round(performance.now() - t0)
    return {
      canvas,
      durationMs,
      mode: 'original',
      width: canvas.width,
      height: canvas.height,
    }
  }

  // Redimensiona preliminarmente se for apenas para prévia rápida
  const workingCanvas = cloneOrResizeCanvas(sourceCanvas, maxPreviewDimension)

  let resultCanvas: HTMLCanvasElement

  if (mode === 'shadow_removal') {
    resultCanvas = applyShadowRemovalFilter(workingCanvas)
  } else if (mode === 'enhance') {
    resultCanvas = applyEnhanceFilter(workingCanvas)
  } else {
    resultCanvas = workingCanvas
  }

  const durationMs = Math.round(performance.now() - t0)

  return {
    canvas: resultCanvas,
    durationMs,
    mode,
    width: resultCanvas.width,
    height: resultCanvas.height,
  }
}
