import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configura o worker localmente empacotado pelo Vite (sem chamadas a CDNs ou APIs externas)
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  }
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
