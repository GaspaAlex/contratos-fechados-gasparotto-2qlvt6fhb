import { PDFDocument, PageSizes } from 'pdf-lib'

export type ImagePageLayout = 'a4' | 'original'

export interface ImageToPdfFileItem {
  id: string
  name: string
  buffer: ArrayBuffer
  type: 'image/jpeg' | 'image/png'
}

export interface ImageToPdfProgressUpdate {
  phase: 'preparing' | 'embedding' | 'saving'
  currentIndex: number
  totalImages: number
  currentImageName: string
  percent: number
}

export interface ImageToPdfResult {
  success: boolean
  pdfBuffer?: ArrayBuffer
  fileName?: string
  totalImages: number
  pageCount: number
  layout: ImagePageLayout
  error?: string
  errorCode?:
    | 'NO_IMAGES'
    | 'UNSUPPORTED_FORMAT'
    | 'DECODE_ERROR'
    | 'CORRUPTED_IMAGE'
    | 'OUT_OF_MEMORY'
    | 'CANCELLED'
    | 'GENERIC_ERROR'
  failingImageName?: string
}

export interface ImageToPdfExecutionOptions {
  images: ImageToPdfFileItem[]
  layout: ImagePageLayout
  onProgress?: (progress: ImageToPdfProgressUpdate) => void
  checkCancelled?: () => boolean
}

/**
 * Validação de cabeçalho mágico de imagem:
 * - JPEG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 */
export function detectImageType(buffer: ArrayBuffer): {
  valid: boolean
  format?: 'jpeg' | 'png'
  error?: string
} {
  if (!buffer || buffer.byteLength < 4) {
    return { valid: false, error: 'Arquivo vazio ou truncado.' }
  }

  const bytes = new Uint8Array(buffer)

  // JPEG check (FF D8 FF)
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, format: 'jpeg' }
  }

  // PNG check (89 50 4E 47 0D 0A 1A 0A)
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { valid: true, format: 'png' }
  }

  // Detecta se é WebP ou HEIC para erro descritivo
  const headerAscii = String.fromCharCode(...bytes.slice(0, 16))
  if (headerAscii.includes('WEBP') || headerAscii.includes('RIFF')) {
    return {
      valid: false,
      error:
        'O formato WebP não é suportado nesta ferramenta. Utilize imagens no formato JPG ou PNG.',
    }
  }
  if (headerAscii.includes('ftypheic') || headerAscii.includes('ftypmif1')) {
    return {
      valid: false,
      error:
        'O formato HEIC não é suportado nesta ferramenta. Converta para JPG ou PNG antes de continuar.',
    }
  }

  return {
    valid: false,
    error:
      'Formato não reconhecido. A ferramenta aceita exclusivamente arquivos de imagem JPG/JPEG e PNG.',
  }
}

/**
 * Converte sequencialmente as imagens fornecidas em um único documento PDF utilizando pdf-lib.
 * - Suporta JPG e PNG misturados na mesma operação
 * - Mantém resolução e proporção exatas sem cortes e sem distorção
 * - Opção A4: orientação automática (retrato/paisagem), margens discretas, centralização
 * - Opção Original: dimensões da página equivalem aos pontos da imagem
 * - Processamento seguro com verificação de cancelamento e memória
 */
export async function convertImagesToPdfLocally(
  options: ImageToPdfExecutionOptions,
): Promise<ImageToPdfResult> {
  const { images, layout = 'a4', onProgress, checkCancelled } = options

  const isCancelled = () => Boolean(checkCancelled && checkCancelled())

  if (isCancelled()) {
    return {
      success: false,
      totalImages: 0,
      pageCount: 0,
      layout,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  if (!images || images.length === 0) {
    return {
      success: false,
      totalImages: 0,
      pageCount: 0,
      layout,
      errorCode: 'NO_IMAGES',
      error: 'Nenhuma imagem foi selecionada para conversão.',
    }
  }

  // 1. Notificar início
  if (onProgress) {
    onProgress({
      phase: 'preparing',
      currentIndex: 0,
      totalImages: images.length,
      currentImageName: images[0].name,
      percent: 5,
    })
  }

  // 2. Criar novo documento PDF
  let pdfDoc: PDFDocument
  try {
    pdfDoc = await PDFDocument.create()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      totalImages: images.length,
      pageCount: 0,
      layout,
      errorCode: 'GENERIC_ERROR',
      error: `Não foi possível inicializar o documento PDF: ${msg}`,
    }
  }

  // Dimensões A4 em pontos (72 pontos por polegada)
  // PageSizes.A4 = [595.28, 841.89]
  const a4Width = PageSizes.A4[0]
  const a4Height = PageSizes.A4[1]
  // Margem discreta de 20pt em A4
  const a4Margin = 20

  // 3. Processar cada imagem na ordem especificada
  for (let i = 0; i < images.length; i++) {
    if (isCancelled()) {
      return {
        success: false,
        totalImages: images.length,
        pageCount: i,
        layout,
        errorCode: 'CANCELLED',
        error: 'Operação cancelada pelo usuário.',
      }
    }

    const item = images[i]

    if (onProgress) {
      const percent = Math.round(10 + (i / images.length) * 80)
      onProgress({
        phase: 'embedding',
        currentIndex: i + 1,
        totalImages: images.length,
        currentImageName: item.name,
        percent,
      })
    }

    // Validação de cabeçalho
    const typeCheck = detectImageType(item.buffer)
    if (!typeCheck.valid) {
      return {
        success: false,
        totalImages: images.length,
        pageCount: i,
        layout,
        errorCode: 'UNSUPPORTED_FORMAT',
        error: `O arquivo "${item.name}" não é uma imagem JPG ou PNG válida: ${typeCheck.error}`,
        failingImageName: item.name,
      }
    }

    let embeddedImage
    try {
      if (typeCheck.format === 'jpeg') {
        embeddedImage = await pdfDoc.embedJpg(item.buffer)
      } else {
        embeddedImage = await pdfDoc.embedPng(item.buffer)
      }
    } catch (embedErr: unknown) {
      const msg = embedErr instanceof Error ? embedErr.message : String(embedErr)
      if (
        embedErr instanceof RangeError ||
        msg.toLowerCase().includes('out of memory') ||
        msg.toLowerCase().includes('allocation')
      ) {
        return {
          success: false,
          totalImages: images.length,
          pageCount: i,
          layout,
          errorCode: 'OUT_OF_MEMORY',
          error: `Memória insuficiente no navegador ao processar a imagem "${item.name}". Experimente converter menos imagens por vez.`,
          failingImageName: item.name,
        }
      }

      return {
        success: false,
        totalImages: images.length,
        pageCount: i,
        layout,
        errorCode: 'DECODE_ERROR',
        error: `Falha ao decodificar a imagem "${item.name}". O arquivo pode estar corrompido ou em um formato incompatível: ${msg}`,
        failingImageName: item.name,
      }
    }

    const imgWidth = embeddedImage.width
    const imgHeight = embeddedImage.height

    if (imgWidth <= 0 || imgHeight <= 0) {
      return {
        success: false,
        totalImages: images.length,
        pageCount: i,
        layout,
        errorCode: 'CORRUPTED_IMAGE',
        error: `A imagem "${item.name}" possui dimensões inválidas (${imgWidth}x${imgHeight}).`,
        failingImageName: item.name,
      }
    }

    if (layout === 'original') {
      // Cria página com o tamanho exato da imagem em pontos
      // Respeita orientação natural e proporção sem cortes
      const page = pdfDoc.addPage([imgWidth, imgHeight])
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: imgWidth,
        height: imgHeight,
      })
    } else {
      // Layout A4: orientação retrato ou paisagem de acordo com a proporção da imagem
      const isLandscape = imgWidth > imgHeight
      const pageWidth = isLandscape ? a4Height : a4Width
      const pageHeight = isLandscape ? a4Width : a4Height

      // Área utilizável respeitando margens discretas
      const usableWidth = pageWidth - a4Margin * 2
      const usableHeight = pageHeight - a4Margin * 2

      // Escala mantendo proporção original estrita
      const scale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight)
      const renderWidth = imgWidth * scale
      const renderHeight = imgHeight * scale

      // Centralização perfeita na página
      const posX = (pageWidth - renderWidth) / 2
      const posY = (pageHeight - renderHeight) / 2

      const page = pdfDoc.addPage([pageWidth, pageHeight])
      page.drawImage(embeddedImage, {
        x: posX,
        y: posY,
        width: renderWidth,
        height: renderHeight,
      })
    }
  }

  if (isCancelled()) {
    return {
      success: false,
      totalImages: images.length,
      pageCount: images.length,
      layout,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  // 4. Salvar PDF resultante
  if (onProgress) {
    onProgress({
      phase: 'saving',
      currentIndex: images.length,
      totalImages: images.length,
      currentImageName: images[images.length - 1].name,
      percent: 95,
    })
  }

  try {
    const savedBytes = await pdfDoc.save({ useObjectStreams: false })
    const arrayBuffer = savedBytes.buffer.slice(
      savedBytes.byteOffset,
      savedBytes.byteOffset + savedBytes.byteLength,
    ) as ArrayBuffer

    return {
      success: true,
      pdfBuffer: arrayBuffer,
      fileName: 'imagens-convertidas.pdf',
      totalImages: images.length,
      pageCount: images.length,
      layout,
    }
  } catch (saveErr: unknown) {
    const msg = saveErr instanceof Error ? saveErr.message : String(saveErr)
    if (
      saveErr instanceof RangeError ||
      msg.toLowerCase().includes('out of memory') ||
      msg.toLowerCase().includes('allocation')
    ) {
      return {
        success: false,
        totalImages: images.length,
        pageCount: images.length,
        layout,
        errorCode: 'OUT_OF_MEMORY',
        error:
          'Memória insuficiente no navegador durante a gravação do arquivo PDF. Tente processar uma quantidade menor de imagens.',
      }
    }

    return {
      success: false,
      totalImages: images.length,
      pageCount: images.length,
      layout,
      errorCode: 'GENERIC_ERROR',
      error: `Erro ao gerar o arquivo PDF: ${msg}`,
    }
  }
}
