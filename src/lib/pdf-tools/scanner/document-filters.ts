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
export type ShadowRemovalIntensity = 'low' | 'medium' | 'high'

export interface FilterOptions {
  mode: DocumentFilterMode
  /**
   * Intensidade para o modo 'shadow_removal'.
   * Padrão: 'medium'.
   */
  shadowIntensity?: ShadowRemovalIntensity
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
/**
 * Estimação de fundo de iluminação aprimorada (Multiscale Illumination Background):
 * 1. Filtra pixels de tinta escura e azulada para evitar contaminação do fundo por anotações;
 * 2. Amostragem em grade com múltiplos percentis altos;
 * 3. Suavização em múltiplas escalas (raio amplo para sombras globais e raio médio para transições de borda de sombra);
 * 4. Neutralização controlada da dominante azulada do próprio campo de iluminação;
 * 5. Interpolação bilinear suave com piso dinâmico (permite compensar sombras fortes de até 15-20 sem saturação artificial).
 */
export function estimateIlluminationBackground(
  sourcePixels: Uint8ClampedArray,
  width: number,
  height: number,
  options?: {
    neutralizeCoolCast?: number // 0.0 a 1.0 (grau de neutralização da dominante azulada do campo)
  },
): { bgR: Uint8ClampedArray; bgG: Uint8ClampedArray; bgB: Uint8ClampedArray } {
  const coolCastFactor = options?.neutralizeCoolCast ?? 0.85

  // Grade de baixa resolução para capturar campo espacial suave
  // Alvo em torno de 120-160px na maior dimensão
  const downScale = Math.max(1, Math.round(Math.max(width, height) / 140))
  const lowW = Math.max(8, Math.round(width / downScale))
  const lowH = Math.max(8, Math.round(height / downScale))

  const lowR = new Uint8ClampedArray(lowW * lowH)
  const lowG = new Uint8ClampedArray(lowW * lowH)
  const lowB = new Uint8ClampedArray(lowW * lowH)

  // Amostragem de cada bloco
  for (let ly = 0; ly < lowH; ly++) {
    const origYStart = Math.min(height - 1, Math.floor(ly * downScale))
    const origYEnd = Math.min(height, Math.floor((ly + 1) * downScale))

    for (let lx = 0; lx < lowW; lx++) {
      const origXStart = Math.min(width - 1, Math.floor(lx * downScale))
      const origXEnd = Math.min(width, Math.floor((lx + 1) * downScale))

      const step = Math.max(1, Math.floor(downScale / 4))
      let bestLum = -1
      let bestR = 0
      let bestG = 0
      let bestB = 0

      // Percorre os pixels da célula procurando o pixel mais representativo do PAPEL local
      for (let y = origYStart; y < origYEnd; y += step) {
        const rowOffset = y * width * 4
        for (let x = origXStart; x < origXEnd; x += step) {
          const idx = rowOffset + x * 4
          const r = sourcePixels[idx]
          const g = sourcePixels[idx + 1]
          const b = sourcePixels[idx + 2]

          // Luminância perceptual Rec.601
          const lum = 0.299 * r + 0.587 * g + 0.114 * b

          // Critério de descarte de traços e tintas:
          // Se for tinta azul saturada ou traço muito escuro, não queremos como estimativa do papel.
          // Tinta azul típica tem b > r + 30 e lum < 180
          const isBlueStroke = b > r + 30 && b > g + 15 && lum < 180

          if (!isBlueStroke) {
            if (lum > bestLum) {
              bestLum = lum
              bestR = r
              bestG = g
              bestB = b
            }
          }
        }
      }

      // Se todo o bloco era tinta escura ou sombra total
      if (bestLum < 0) {
        // Fallback: pega o pixel central
        const midY = Math.min(height - 1, Math.floor((origYStart + origYEnd) / 2))
        const midX = Math.min(width - 1, Math.floor((origXStart + origXEnd) / 2))
        const midIdx = (midY * width + midX) * 4
        bestR = sourcePixels[midIdx]
        bestG = sourcePixels[midIdx + 1]
        bestB = sourcePixels[midIdx + 2]
      }

      const lowIdx = ly * lowW + lx
      // Piso seguro de 12 para permitir recuperar sombras fortes de celular
      lowR[lowIdx] = Math.max(12, bestR)
      lowG[lowIdx] = Math.max(12, bestG)
      lowB[lowIdx] = Math.max(12, bestB)
    }
  }

  // Suavização em múltiplas escalas (multiscale blur):
  // Escala ampla (campo global de iluminação ~ 14% do tamanho da grade)
  const blurWide = Math.max(4, Math.round(Math.min(lowW, lowH) * 0.14))
  const wideR = new Uint8ClampedArray(lowW * lowH)
  const wideG = new Uint8ClampedArray(lowW * lowH)
  const wideB = new Uint8ClampedArray(lowW * lowH)
  fastBoxBlurChannel(lowR, wideR, lowW, lowH, blurWide, 0, 1)
  fastBoxBlurChannel(lowG, wideG, lowW, lowH, blurWide, 0, 1)
  fastBoxBlurChannel(lowB, wideB, lowW, lowH, blurWide, 0, 1)

  // Escala média (captura transições de penumbra de sombra sem criar degraus ~ 7% do tamanho)
  const blurMid = Math.max(2, Math.round(Math.min(lowW, lowH) * 0.07))
  const midR = new Uint8ClampedArray(lowW * lowH)
  const midG = new Uint8ClampedArray(lowW * lowH)
  const midB = new Uint8ClampedArray(lowW * lowH)
  fastBoxBlurChannel(lowR, midR, lowW, lowH, blurMid, 0, 1)
  fastBoxBlurChannel(lowG, midG, lowW, lowH, blurMid, 0, 1)
  fastBoxBlurChannel(lowB, midB, lowW, lowH, blurMid, 0, 1)

  // Combinação ponderada (65% amplo + 35% médio) + Neutralização da Dominante Azulada no campo
  const blurredLowR = new Uint8ClampedArray(lowW * lowH)
  const blurredLowG = new Uint8ClampedArray(lowW * lowH)
  const blurredLowB = new Uint8ClampedArray(lowW * lowH)

  const totalLow = lowW * lowH
  for (let i = 0; i < totalLow; i++) {
    let r = wideR[i] * 0.65 + midR[i] * 0.35
    let g = wideG[i] * 0.65 + midG[i] * 0.35
    let b = wideB[i] * 0.65 + midB[i] * 0.35

    // Neutralização da dominante azulada na iluminação de fundo:
    // Em sombras sob luz natural/céu ou flash desigual, a iluminação incidente é azulada (B > R e B > G).
    // Quando dividimos pelo campo de iluminação, se o campo mantiver exatamente essa proporção de canal
    // ou se o equilibramos levemente com a média neutra, o papel resultante fica branco neutro e limpo!
    // Se neutralizarmos o fundo em direção à cor real do papel alvo, a correção remove o tom azulado do papel.
    if (coolCastFactor > 0) {
      const avgTone = (r + g + b) / 3
      // Nas áreas mais escuras (sombras), o azul costuma sobressair mais.
      // Reforçamos o valor estimado de B para que na divisão (I / Bg) o excesso de azul da sombra seja atenuado:
      const excessBlue = Math.max(0, b - (r + g) * 0.5)
      // Ajuste proporcional ao coolCastFactor
      b = b + excessBlue * (0.35 * coolCastFactor)
      // Equalização sutil de luminância do campo
      r = r * (1 - coolCastFactor * 0.15) + avgTone * (coolCastFactor * 0.15)
      g = g * (1 - coolCastFactor * 0.15) + avgTone * (coolCastFactor * 0.15)
    }

    blurredLowR[i] = Math.min(255, Math.max(12, Math.round(r)))
    blurredLowG[i] = Math.min(255, Math.max(12, Math.round(g)))
    blurredLowB[i] = Math.min(255, Math.max(12, Math.round(b)))
  }

  // Interpolação bilinear suave de volta à resolução total
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
 * - Estima o mapa de iluminação multiescala (papel iluminado vs sombra do celular).
 * - Corrige iluminação local via divisão proporcional parametrizada pela intensidade (Suave, Média, Forte).
 * - Corrige dominante fria/azulada das áreas sombreadas sem dessaturar traços, assinaturas ou fotos.
 * - Evita halos, ruído excessivo ou faixas artificiais nas transições de penumbra.
 */
export function applyShadowRemovalFilter(
  sourceCanvas: HTMLCanvasElement,
  intensity: ShadowRemovalIntensity = 'medium',
): HTMLCanvasElement {
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

  // Configuração de força baseada na intensidade
  // 'low': ganho mais brando (similar ao comportamento anterior conservador)
  // 'medium': padrão aprimorado (remoção nítida de sombras de celular e dominante fria)
  // 'high': ganho vigoroso para sombras escuras e cantos profundos sem estourar texto
  const config = {
    low: {
      targetWhite: 232,
      minBgFloor: 28,
      blendFactor: 0.75,
      neutralizeCoolCast: 0.5,
      kneeCompress: 242,
      compressSlope: 0.35,
    },
    medium: {
      targetWhite: 238,
      minBgFloor: 16,
      blendFactor: 0.92,
      neutralizeCoolCast: 0.85,
      kneeCompress: 246,
      compressSlope: 0.45,
    },
    high: {
      targetWhite: 242,
      minBgFloor: 12,
      blendFactor: 1.0,
      neutralizeCoolCast: 0.95,
      kneeCompress: 248,
      compressSlope: 0.55,
    },
  }[intensity]

  // Estimar fundo de iluminação multiescala
  const { bgR, bgG, bgB } = estimateIlluminationBackground(data, width, height, {
    neutralizeCoolCast: config.neutralizeCoolCast,
  })

  const targetWhite = config.targetWhite
  const minFloor = config.minBgFloor
  const blend = config.blendFactor
  const knee = config.kneeCompress
  const slope = config.compressSlope

  const len = width * height
  for (let i = 0; i < len; i++) {
    const pxIdx = i * 4

    const r = data[pxIdx]
    const g = data[pxIdx + 1]
    const b = data[pxIdx + 2]

    // Piso dinâmico seguro para evitar divisão por quase zero
    const bR = Math.max(minFloor, bgR[i])
    const bG = Math.max(minFloor, bgG[i])
    const bB = Math.max(minFloor, bgB[i])

    // Correção teórica de iluminação por canal
    const corrR = (r / bR) * targetWhite
    const corrG = (g / bG) * targetWhite
    const corrB = (b / bB) * targetWhite

    // Interpolação entre original e corrigido com base no blendFactor de intensidade
    let newR = r * (1 - blend) + corrR * blend
    let newG = g * (1 - blend) + corrG * blend
    let newB = b * (1 - blend) + corrB * blend

    // Compressão suave de altas luzes no joelho definido (impede clipping rígido em 255)
    if (newR > knee) newR = knee + (newR - knee) * slope
    if (newG > knee) newG = knee + (newG - knee) * slope
    if (newB > knee) newB = knee + (newB - knee) * slope

    data[pxIdx] = Math.min(255, Math.max(0, Math.round(newR)))
    data[pxIdx + 1] = Math.min(255, Math.max(0, Math.round(newG)))
    data[pxIdx + 2] = Math.min(255, Math.max(0, Math.round(newB)))
    // data[pxIdx + 3] (alpha) preservado intacto
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
    resultCanvas = applyShadowRemovalFilter(workingCanvas, options.shadowIntensity)
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
