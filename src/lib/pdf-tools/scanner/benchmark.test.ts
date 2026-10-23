/**
 * benchmark.test.ts
 *
 * Teste unitário e de benchmark dos algoritmos de tratamento documental.
 * Testa os algoritmos puros em buffers de imagem sintética (R, G, B, A)
 * simulando o ambiente de pixels do navegador.
 */

import { applyShadowRemovalFilter, applyEnhanceFilter } from './document-filters'

export interface PixelMetrics {
  durationMs: number
  shadowAreaLuminanceBefore: number
  shadowAreaLuminanceAfter: number
  blueStrokeColorBefore: { r: number; g: number; b: number }
  blueStrokeColorAfter: { r: number; g: number; b: number }
  contrastRatio: number
}

/**
 * Cria um canvas com elementos sintéticos controlados para validação matemática.
 */
export function runInMemoryFilterBenchmark(): {
  shadowRemoval: PixelMetrics
  enhance: PixelMetrics
  antiClippingPassed: boolean
  blueColorPreserved: boolean
  qrCodeReadable: boolean
} {
  const w = 400
  const h = 500

  // Mock Canvas / OffscreenCanvas
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Fundo branco com sombra elíptica projetada
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, w, h)

  // Texto
  ctx.fillStyle = '#111111'
  ctx.fillRect(40, 40, 200, 10)
  ctx.fillRect(40, 60, 280, 10)

  // Assinatura Azul
  ctx.fillStyle = '#1D4ED8' // R: 29, G: 78, B: 216
  ctx.fillRect(150, 400, 100, 6)

  // QR Code (blocos pretos e brancos)
  ctx.fillStyle = '#000000'
  ctx.fillRect(30, 200, 40, 40)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(40, 210, 20, 20)
  ctx.fillStyle = '#000000'
  ctx.fillRect(45, 215, 10, 10)

  // Sombra gradiente
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.65)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // Ponto de amostra da sombra (x=300, y=400)
  const pxBeforeShadow = ctx.getImageData(300, 400, 1, 1).data
  const lumBeforeShadow = Math.round(
    0.299 * pxBeforeShadow[0] + 0.587 * pxBeforeShadow[1] + 0.114 * pxBeforeShadow[2],
  )

  // Ponto de amostra da caneta azul (x=200, y=403)
  const pxBeforeBlue = ctx.getImageData(200, 403, 1, 1).data

  // TESTE 1: MODO SEM SOMBRA
  const t0Shadow = performance.now()
  const shadowCanvas = applyShadowRemovalFilter(canvas)
  const tEndShadow = performance.now() - t0Shadow

  const shadowCtx = shadowCanvas.getContext('2d')!
  const pxAfterShadow = shadowCtx.getImageData(300, 400, 1, 1).data
  const lumAfterShadow = Math.round(
    0.299 * pxAfterShadow[0] + 0.587 * pxAfterShadow[1] + 0.114 * pxAfterShadow[2],
  )
  const pxAfterBlueShadow = shadowCtx.getImageData(200, 403, 1, 1).data

  // TESTE 2: MODO MELHORAR
  const t0Enhance = performance.now()
  const enhanceCanvas = applyEnhanceFilter(canvas)
  const tEndEnhance = performance.now() - t0Enhance

  const enhanceCtx = enhanceCanvas.getContext('2d')!
  const pxAfterEnhance = enhanceCtx.getImageData(300, 400, 1, 1).data
  const lumAfterEnhance = Math.round(
    0.299 * pxAfterEnhance[0] + 0.587 * pxAfterEnhance[1] + 0.114 * pxAfterEnhance[2],
  )
  const pxAfterBlueEnhance = enhanceCtx.getImageData(200, 403, 1, 1).data

  // Verificação QR Code
  const qrCenter = enhanceCtx.getImageData(48, 218, 1, 1).data
  const qrWhite = enhanceCtx.getImageData(42, 212, 1, 1).data
  const qrCodeReadable = qrCenter[0] < 60 && qrWhite[0] > 200

  // Verificação Azul Preservado (B > R && B > G)
  const blueColorPreserved =
    pxAfterBlueShadow[2] > pxAfterBlueShadow[0] &&
    pxAfterBlueShadow[2] > pxAfterBlueShadow[1] &&
    pxAfterBlueEnhance[2] > pxAfterBlueEnhance[0] &&
    pxAfterBlueEnhance[2] > pxAfterBlueEnhance[1]

  // Verificação Anti-clipping
  const antiClippingPassed = lumAfterShadow <= 250 && lumAfterEnhance <= 255

  return {
    shadowRemoval: {
      durationMs: Math.round(tEndShadow),
      shadowAreaLuminanceBefore: lumBeforeShadow,
      shadowAreaLuminanceAfter: lumAfterShadow,
      blueStrokeColorBefore: { r: pxBeforeBlue[0], g: pxBeforeBlue[1], b: pxBeforeBlue[2] },
      blueStrokeColorAfter: {
        r: pxAfterBlueShadow[0],
        g: pxAfterBlueShadow[1],
        b: pxAfterBlueShadow[2],
      },
      contrastRatio: lumAfterShadow / Math.max(1, lumBeforeShadow),
    },
    enhance: {
      durationMs: Math.round(tEndEnhance),
      shadowAreaLuminanceBefore: lumBeforeShadow,
      shadowAreaLuminanceAfter: lumAfterEnhance,
      blueStrokeColorBefore: { r: pxBeforeBlue[0], g: pxBeforeBlue[1], b: pxBeforeBlue[2] },
      blueStrokeColorAfter: {
        r: pxAfterBlueEnhance[0],
        g: pxAfterBlueEnhance[1],
        b: pxAfterBlueEnhance[2],
      },
      contrastRatio: lumAfterEnhance / Math.max(1, lumBeforeShadow),
    },
    antiClippingPassed,
    blueColorPreserved,
    qrCodeReadable,
  }
}
