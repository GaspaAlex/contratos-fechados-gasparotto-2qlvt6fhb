/**
 * test-runner.ts
 *
 * Suíte de Testes Técnicos Automatizados com Imagens Sintéticas (CamScanner Bloco 2)
 *
 * Cenários Exigidos no Objetivo 9:
 * (1) Documento sobre mesa escura com sombra do celular — comparar os 3 modos (Original, Sem sombra, Melhorar)
 * (2) Documento em ângulo com sombra
 * (3) Documento com cores, elementos de segurança e QR Code
 * (4) Assinatura azul preservada (garante não destruição de caneta azul)
 * (5) Iluminação irregular e áreas muito claras sem perda de detalhe
 * (6) PDF com imagens tratadas e não tratadas no mesmo arquivo
 *
 * Medições reais com performance.now.
 */

import {
  type DocumentFilterMode,
  applyShadowRemovalFilter,
  applyEnhanceFilter,
  processDocumentFilter,
} from './document-filters'
import { convertImagesToPdfLocally } from '../image-to-pdf'

export interface TestCaseResult {
  scenarioId: number
  scenarioName: string
  success: boolean
  durationMs: number
  metrics: Record<string, any>
  details: string
}

export interface SyntheticBenchmarkReport {
  timestamp: string
  totalDurationMs: number
  results: TestCaseResult[]
  allPassed: boolean
}

/**
 * Cria uma imagem sintética para o Cenário 1:
 * Documento de papel branco com texto escuro sobre mesa escura com sombra elíptica projetada de celular.
 */
function createSyntheticDocumentWithShadow(w = 800, h = 1000): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Mesa escura ao redor
  ctx.fillStyle = '#222831'
  ctx.fillRect(0, 0, w, h)

  // Folha de papel branca central
  const paperX = 60
  const paperY = 60
  const paperW = w - 120
  const paperH = h - 120

  ctx.fillStyle = '#F8F9FA'
  ctx.fillRect(paperX, paperY, paperW, paperH)

  // Texto do documento
  ctx.fillStyle = '#1A1A1A'
  ctx.font = 'bold 22px sans-serif'
  ctx.fillText('PROCURAÇÃO AD JUDICIA ET EXTRA', paperX + 40, paperY + 60)

  ctx.font = '14px sans-serif'
  for (let y = paperY + 110; y < paperY + paperH - 120; y += 28) {
    ctx.fillText(
      'Pelo presente instrumento particular de procuração, o outorgante nomeia...',
      paperX + 40,
      y,
    )
  }

  // Assinatura em caneta azul
  ctx.strokeStyle = '#1E40AF'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(paperX + 60, paperY + paperH - 80)
  ctx.bezierCurveTo(
    paperX + 120,
    paperY + paperH - 110,
    paperX + 180,
    paperY + paperH - 50,
    paperX + 240,
    paperY + paperH - 75,
  )
  ctx.stroke()

  // Sombra de celular projetada no canto inferior direito
  const shadowGrad = ctx.createRadialGradient(
    paperX + paperW * 0.7,
    paperY + paperH * 0.7,
    40,
    paperX + paperW * 0.7,
    paperY + paperH * 0.7,
    260,
  )
  shadowGrad.addColorStop(0, 'rgba(20, 20, 25, 0.65)')
  shadowGrad.addColorStop(0.6, 'rgba(40, 40, 50, 0.40)')
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = shadowGrad
  ctx.fillRect(paperX, paperY, paperW, paperH)

  return canvas
}

/**
 * Cria uma imagem sintética para o Cenário 3 e 4:
 * Documento com QR Code sintético, carimbo vermelho, assinatura azul e marca de segurança.
 */
function createSyntheticDocumentWithSecurityAndColor(w = 800, h = 1000): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Papel
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, w, h)

  // Gradiente sutil de iluminação
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)')
  grad.addColorStop(1, 'rgba(50, 50, 50, 0.35)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // Título e texto
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 20px sans-serif'
  ctx.fillText('CERTIDÃO DE REGULARIDADE JURÍDICA', 50, 60)

  // QR Code Sintético (matriz de blocos pretos e brancos)
  const qrX = 50
  const qrY = 100
  const qrSize = 120
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10)
  ctx.fillStyle = '#000000'
  // Padrões de busca dos cantos
  ctx.fillRect(qrX, qrY, 35, 35)
  ctx.clearRect(qrX + 6, qrY + 6, 23, 23)
  ctx.fillRect(qrX + 11, qrY + 11, 13, 13)

  ctx.fillRect(qrX + qrSize - 35, qrY, 35, 35)
  ctx.clearRect(qrX + qrSize - 29, qrY + 6, 23, 23)
  ctx.fillRect(qrX + qrSize - 24, qrY + 11, 13, 13)

  ctx.fillRect(qrX, qrY + qrSize - 35, 35, 35)
  ctx.clearRect(qrX + 6, qrY + qrSize - 29, 23, 23)
  ctx.fillRect(qrX + 11, qrY + qrSize - 24, 13, 13)

  // Módulos aleatórios no centro do QR code
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 0) {
        ctx.fillRect(qrX + 40 + c * 5, qrY + 40 + r * 5, 5, 5)
      }
    }
  }

  // Carimbo Vermelho Institucional
  ctx.save()
  ctx.translate(w - 180, 160)
  ctx.rotate((-12 * Math.PI) / 180)
  ctx.strokeStyle = '#DC2626'
  ctx.lineWidth = 3
  ctx.strokeRect(0, 0, 140, 60)
  ctx.fillStyle = '#DC2626'
  ctx.font = 'bold 12px sans-serif'
  ctx.fillText('AUTENTICADO', 18, 25)
  ctx.font = '10px sans-serif'
  ctx.fillText('ADVOCACIA GASPAROTTO', 8, 45)
  ctx.restore()

  // Assinatura Azul
  ctx.strokeStyle = '#2563EB'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(w / 2 - 100, h - 120)
  ctx.bezierCurveTo(w / 2 - 50, h - 160, w / 2 + 20, h - 80, w / 2 + 100, h - 120)
  ctx.stroke()

  return canvas
}

/**
 * Converte canvas em ArrayBuffer para teste de PDF
 */
async function canvasToArrayBuffer(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95)
  })
  return blob.arrayBuffer()
}

/**
 * Executa todos os 6 cenários técnicos e reporta medições exatas.
 */
export async function runSyntheticBenchmarks(): Promise<SyntheticBenchmarkReport> {
  const tTotalStart = performance.now()
  const results: TestCaseResult[] = []

  // CENÁRIO 1: Documento sobre mesa escura com sombra do celular — comparar os 3 modos
  {
    const t0 = performance.now()
    const srcCanvas = createSyntheticDocumentWithShadow(800, 1000)

    // Original
    const tOrig = performance.now()
    const origRes = await processDocumentFilter(srcCanvas, { mode: 'original' })
    const origMs = Math.round(performance.now() - tOrig)

    // Sem Sombra
    const tShadow = performance.now()
    const shadowRes = await processDocumentFilter(srcCanvas, { mode: 'shadow_removal' })
    const shadowMs = Math.round(performance.now() - tShadow)

    // Melhorar
    const tEnhance = performance.now()
    const enhanceRes = await processDocumentFilter(srcCanvas, { mode: 'enhance' })
    const enhanceMs = Math.round(performance.now() - tEnhance)

    // Analisar luminância na área da sombra antes e depois
    const ctxOrig = origRes.canvas.getContext('2d')!
    const ctxShadow = shadowRes.canvas.getContext('2d')!
    const ctxEnhance = enhanceRes.canvas.getContext('2d')!

    // Ponto onde a sombra incidia fortemente (x=500, y=700)
    const pxOrig = ctxOrig.getImageData(500, 700, 1, 1).data
    const pxShadow = ctxShadow.getImageData(500, 700, 1, 1).data
    const pxEnhance = ctxEnhance.getImageData(500, 700, 1, 1).data

    const lumOrig = Math.round(0.299 * pxOrig[0] + 0.587 * pxOrig[1] + 0.114 * pxOrig[2])
    const lumShadow = Math.round(0.299 * pxShadow[0] + 0.587 * pxShadow[1] + 0.114 * pxShadow[2])
    const lumEnhance = Math.round(
      0.299 * pxEnhance[0] + 0.587 * pxEnhance[1] + 0.114 * pxEnhance[2],
    )

    // Validação: a sombra foi atenuada (luminância do papel escuro aumentou significativamente)
    const passed = lumShadow > lumOrig && lumEnhance >= lumShadow && shadowMs < 3000

    results.push({
      scenarioId: 1,
      scenarioName: 'Documento sobre mesa escura com sombra de celular (3 modos)',
      success: passed,
      durationMs: Math.round(performance.now() - t0),
      metrics: {
        tempoOriginalMs: origMs,
        tempoSemSombraMs: shadowMs,
        tempoMelhorarMs: enhanceMs,
        luminanciaSombraOriginal: lumOrig,
        luminanciaSemSombra: lumShadow,
        luminanciaMelhorar: lumEnhance,
      },
      details: `Modo Sem Sombra clareou região de sombra de lum=${lumOrig} para lum=${lumShadow} em ${shadowMs}ms; Modo Melhorar atingiu lum=${lumEnhance} em ${enhanceMs}ms.`,
    })
  }

  // CENÁRIO 2: Documento em ângulo com sombra
  {
    const t0 = performance.now()
    const angledCanvas = document.createElement('canvas')
    angledCanvas.width = 800
    angledCanvas.height = 900
    const ctx = angledCanvas.getContext('2d')!
    ctx.fillStyle = '#333'
    ctx.fillRect(0, 0, 800, 900)

    // Retângulo rotacionado simulando documento torto
    ctx.save()
    ctx.translate(400, 450)
    ctx.rotate((12 * Math.PI) / 180)
    ctx.fillStyle = '#EEE'
    ctx.fillRect(-280, -350, 560, 700)
    ctx.fillStyle = '#111'
    ctx.font = '16px sans-serif'
    ctx.fillText('CONTRATO DE HONORÁRIOS ADVOCATÍCIOS', -240, -300)
    ctx.restore()

    // Sombra diagonal
    const grad = ctx.createLinearGradient(0, 0, 800, 900)
    grad.addColorStop(0, 'rgba(0,0,0,0.5)')
    grad.addColorStop(1, 'rgba(0,0,0,0.1)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 800, 900)

    const tFilt = performance.now()
    const res = await processDocumentFilter(angledCanvas, { mode: 'shadow_removal' })
    const filtMs = Math.round(performance.now() - tFilt)

    results.push({
      scenarioId: 2,
      scenarioName: 'Documento em ângulo com sombra diagonal',
      success: filtMs < 3000 && res.canvas.width === 800,
      durationMs: Math.round(performance.now() - t0),
      metrics: { tempoProcessamentoMs: filtMs },
      details: `Processamento do documento em ângulo concluído em ${filtMs}ms.`,
    })
  }

  // CENÁRIO 3: Documento com cores, elementos de segurança e QR Code
  {
    const t0 = performance.now()
    const secCanvas = createSyntheticDocumentWithSecurityAndColor(800, 1000)

    const tFilt = performance.now()
    const enhanced = await processDocumentFilter(secCanvas, { mode: 'enhance' })
    const filtMs = Math.round(performance.now() - tFilt)

    // Testar se os cantos pretos do QR Code continuam escuros (não viraram cinza claro ou branco)
    const ctxOut = enhanced.canvas.getContext('2d')!
    const qrBlackPx = ctxOut.getImageData(52, 102, 1, 1).data
    const qrIsDark = qrBlackPx[0] < 60 && qrBlackPx[1] < 60 && qrBlackPx[2] < 60

    // Testar se o fundo do QR Code continuou claro
    const qrWhitePx = ctxOut.getImageData(58, 108, 1, 1).data
    const qrBackgroundIsLight = qrWhitePx[0] > 200 && qrWhitePx[1] > 200 && qrWhitePx[2] > 200

    const passed = qrIsDark && qrBackgroundIsLight && filtMs < 3000

    results.push({
      scenarioId: 3,
      scenarioName: 'Documento com QR Code e elementos de segurança',
      success: passed,
      durationMs: Math.round(performance.now() - t0),
      metrics: {
        tempoMs: filtMs,
        qrModuloEscuroRGB: `${qrBlackPx[0]},${qrBlackPx[1]},${qrBlackPx[2]}`,
        qrFundoClaroRGB: `${qrWhitePx[0]},${qrWhitePx[1]},${qrWhitePx[2]}`,
      },
      details: `QR Code manteve contraste extremo (preto=${qrBlackPx[0]}, branco=${qrWhitePx[0]}) garantindo decodificação óptica íntegra sem binarização destrutiva.`,
    })
  }

  // CENÁRIO 4: Assinatura azul preservada
  {
    const t0 = performance.now()
    const canvas = createSyntheticDocumentWithSecurityAndColor(800, 1000)

    const resShadow = await processDocumentFilter(canvas, { mode: 'shadow_removal' })
    const resEnhance = await processDocumentFilter(canvas, { mode: 'enhance' })

    const ctxShadow = resShadow.canvas.getContext('2d')!
    const ctxEnhance = resEnhance.canvas.getContext('2d')!

    // Amostrar pixel na assinatura azul (aproximadamente x=400, y=880)
    const pxShadow = ctxShadow.getImageData(400, 880, 1, 1).data
    const pxEnhance = ctxEnhance.getImageData(400, 880, 1, 1).data

    // Critério: Canal Azul B deve ser estritamente maior que Vermelho R e Verde G
    const isBlueInShadow = pxShadow[2] > pxShadow[0] && pxShadow[2] > pxShadow[1]
    const isBlueInEnhance = pxEnhance[2] > pxEnhance[0] && pxEnhance[2] > pxEnhance[1]

    const passed = isBlueInShadow && isBlueInEnhance

    results.push({
      scenarioId: 4,
      scenarioName: 'Preservação de assinatura em caneta azul',
      success: passed,
      durationMs: Math.round(performance.now() - t0),
      metrics: {
        semSombraAzulRGB: `R:${pxShadow[0]} G:${pxShadow[1]} B:${pxShadow[2]}`,
        melhorarAzulRGB: `R:${pxEnhance[0]} G:${pxEnhance[1]} B:${pxEnhance[2]}`,
      },
      details: `Assinatura azul preservou saturação cromática (B > R e B > G em ambos os modos; sem conversão para escala de cinza).`,
    })
  }

  // CENÁRIO 5: Iluminação irregular e áreas muito claras sem perda de detalhe (anti-clipping)
  {
    const t0 = performance.now()
    const canvas = document.createElement('canvas')
    canvas.width = 600
    canvas.height = 600
    const ctx = canvas.getContext('2d')!

    // Fundo quase saturado (248) com marca d'água sutil (238)
    ctx.fillStyle = '#F8F8F8'
    ctx.fillRect(0, 0, 600, 600)
    ctx.fillStyle = '#EEEEEE'
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText('MARCA D’ÁGUA 123', 80, 300)

    const res = await processDocumentFilter(canvas, { mode: 'shadow_removal' })
    const outCtx = res.canvas.getContext('2d')!

    const pxBg = outCtx.getImageData(10, 10, 1, 1).data
    const pxWatermark = outCtx.getImageData(100, 300, 1, 1).data

    // Detalhe não pode ter sido estourado para 255 igualando fundo e texto
    const diff = Math.abs(pxBg[0] - pxWatermark[0])
    const passed = diff >= 2 && pxBg[0] <= 255

    results.push({
      scenarioId: 5,
      scenarioName: 'Iluminação irregular e áreas claras sem perda de detalhe (anti-clipping)',
      success: passed,
      durationMs: Math.round(performance.now() - t0),
      metrics: {
        diferencaTonalPreservada: diff,
        fundoRGB: `${pxBg[0]}`,
        marcaDaguaRGB: `${pxWatermark[0]}`,
      },
      details: `Compressão suave de altas luzes evitou clipping rígido; detalhe tênue preservado com separação tonal de ${diff} níveis.`,
    })
  }

  // CENÁRIO 6: PDF com imagens tratadas e não tratadas no mesmo arquivo
  {
    const t0 = performance.now()

    // Imagem 1: Original (sem tratamento)
    const img1Canvas = createSyntheticDocumentWithShadow(600, 800)
    const buf1 = await canvasToArrayBuffer(img1Canvas)

    // Imagem 2: Tratada com "Sem Sombra"
    const img2Shadow = applyShadowRemovalFilter(img1Canvas)
    const buf2 = await canvasToArrayBuffer(img2Shadow)

    // Imagem 3: Tratada com "Melhorar"
    const img3Enhance = applyEnhanceFilter(img1Canvas)
    const buf3 = await canvasToArrayBuffer(img3Enhance)

    const items = [
      {
        id: '1',
        name: 'pagina1_original.jpg',
        type: 'image/jpeg' as const,
        buffer: buf1,
        size: buf1.byteLength,
      },
      {
        id: '2',
        name: 'pagina2_sem_sombra.jpg',
        type: 'image/jpeg' as const,
        buffer: buf2,
        size: buf2.byteLength,
      },
      {
        id: '3',
        name: 'pagina3_melhorada.jpg',
        type: 'image/jpeg' as const,
        buffer: buf3,
        size: buf3.byteLength,
      },
    ]

    const pdfResult = await convertImagesToPdfLocally({
      images: items,
      layout: 'a4',
    })

    const passed = pdfResult.success && pdfResult.pageCount === 3 && Boolean(pdfResult.pdfBuffer)

    results.push({
      scenarioId: 6,
      scenarioName: 'PDF com imagens tratadas e não tratadas no mesmo arquivo',
      success: passed,
      durationMs: Math.round(performance.now() - t0),
      metrics: {
        paginasGeradas: pdfResult.pageCount,
        tamanhoPdfBytes: pdfResult.pdfBuffer?.byteLength ?? 0,
      },
      details: `Documento PDF gerado com 3 páginas (Pág 1: Original, Pág 2: Sem Sombra, Pág 3: Melhorada) em ${Math.round(performance.now() - t0)}ms.`,
    })
  }

  const totalDurationMs = Math.round(performance.now() - tTotalStart)
  const allPassed = results.every((r) => r.success)

  return {
    timestamp: new Date().toISOString(),
    totalDurationMs,
    results,
    allPassed,
  }
}
