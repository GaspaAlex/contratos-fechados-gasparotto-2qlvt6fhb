import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerRaw from 'pdfjs-dist/build/pdf.worker.min.mjs?raw'

// Cache em memória para o Blob URL do Worker, garantindo criação única por sessão
let cachedWorkerBlobUrl: string | null = null

/**
 * Inicializa e configura o worker do PDF.js de forma 100% local a partir do bundle.
 *
 * Utiliza o código fonte do worker importado como string via `?raw` e empacotado
 * em um Blob com MIME type explícito 'application/javascript'. Isso contorna a limitação
 * em que servidores de hospedagem estática servem extensões `.mjs` com Content-Type
 * `application/octet-stream`, o que faz navegadores modernos (como o Chrome) bloquearem a
 * inicialização do Worker.
 */
function ensurePdfJsWorkerConfigured(): void {
  if (typeof window === 'undefined' || !pdfjsLib.GlobalWorkerOptions) {
    return
  }

  if (!cachedWorkerBlobUrl) {
    try {
      const blob = new Blob([pdfWorkerRaw], { type: 'application/javascript' })
      cachedWorkerBlobUrl = URL.createObjectURL(blob)
    } catch (blobErr) {
      console.error('[PDF.js Worker] Falha ao criar Blob URL para o worker:', blobErr)
      throw blobErr
    }
  }

  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== cachedWorkerBlobUrl) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = cachedWorkerBlobUrl
  }
}

// Configura o worker antecipadamente se em ambiente de navegador
try {
  ensurePdfJsWorkerConfigured()
} catch (err) {
  console.warn('[PDF.js Worker] Erro na configuração imediata do worker:', err)
}

export interface RenderThumbnailOptions {
  pageNumber: number // 1-based
  rotation: number // rotação efetiva final em graus (múltiplo de 90)
  targetWidth?: number // largura de renderização recomendada (~140-160px para economia de memória)
}

export interface DocumentInfo {
  pageCount: number
  originalRotations: number[] // rotação original por página (índice 0 = pág 1)
}

/**
 * Carrega a estrutura do documento via PDF.js a partir do ArrayBuffer.
 * Retorna uma instância do PDFDocumentProxy.
 */
export async function loadPdfJsDocument(buffer: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  // Garante que o workerSrc esteja configurado com o Blob URL JS antes de qualquer carregamento
  try {
    ensurePdfJsWorkerConfigured()
  } catch (workerInitErr) {
    console.error('[PDF.js Worker] Erro ao garantir workerSrc antes de getDocument:', workerInitErr)
    throw workerInitErr
  }

  // Clona o buffer para evitar mutações
  const copy = buffer.slice(0)
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(copy),
    isEvalSupported: false,
    useSystemFonts: false,
  })
  return loadingTask.promise
}

/**
 * Obtém as orientações originais de cada página do documento.
 */
export async function getDocumentOriginalRotations(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
): Promise<number[]> {
  const rotations: number[] = []
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i)
    rotations.push(page.rotate || 0)
  }
  return rotations
}

/**
 * Renderiza uma página específica com a rotação desejada diretamente no canvas HTML fornecido.
 *
 * Utiliza escala calculada para largura alvo (~150px), garantindo renderização ultra-rápida
 * e consumo mínimo de memória.
 */
export async function renderPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  effectiveRotation: number,
  canvas: HTMLCanvasElement,
  targetWidth = 150,
): Promise<void> {
  const page = await pdfDoc.getPage(pageNumber)

  // Obtém o viewport na rotação efetiva
  const unscaledViewport = page.getViewport({
    scale: 1,
    rotation: effectiveRotation,
  })

  // Calcula a escala para que a largura seja proporcional a targetWidth
  const scale = targetWidth / unscaledViewport.width
  const viewport = page.getViewport({
    scale,
    rotation: effectiveRotation,
  })

  // Ajusta dimensões do canvas
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) {
    throw new Error('Não foi possível obter o contexto 2D do canvas.')
  }

  // Preenche fundo branco limpo antes de renderizar
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const renderContext = {
    canvasContext: ctx,
    viewport,
  }

  const renderTask = page.render(renderContext)
  await renderTask.promise
}
