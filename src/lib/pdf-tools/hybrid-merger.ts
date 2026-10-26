import { PDFDocument } from 'pdf-lib'
import { loadPdfJsDocument } from './pdf-thumbnail-service'
import { detectDigitalSignatures, validatePdfHeader } from './pdf-validator'

export interface HybridMergeInputItem {
  name: string
  buffer: ArrayBuffer
  mode?: 'standard' | 'derivative'
}

export interface HybridMergeProgressUpdate {
  phase: 'validating' | 'merging_structural' | 'rendering_page' | 'embedding_page' | 'saving'
  currentFileIndex: number
  totalFiles: number
  currentFileName: string
  currentPage?: number
  totalPagesForFile?: number
  percent: number
}

export interface HybridMergeResult {
  success: boolean
  mergedBuffer?: ArrayBuffer
  pageCount?: number
  error?: string
  errorCode?:
    | 'INVALID_HEADER'
    | 'ENCRYPTED_WITH_PASSWORD'
    | 'ENCRYPTED_PDF'
    | 'SIGNATURE_DETECTED'
    | 'SIGNATURE_CHECK_ERROR'
    | 'PARSE_ERROR'
    | 'OUT_OF_MEMORY'
    | 'CANCELLED'
    | 'GENERIC_ERROR'
  failingFile?: string
  rasterizedPageCount?: number
  structuralPageCount?: number
}

export interface HybridMergeOptions {
  files: HybridMergeInputItem[]
  allowSignedDocuments?: boolean
  dpi?: number // padrão: 200 DPI (escala ~2.77)
  jpegQuality?: number // padrão: 0.92
  onProgress?: (progress: HybridMergeProgressUpdate) => void
  checkCancelled?: () => boolean
}

/**
 * Renderiza uma página de um documento PDF.js para um canvas em alta resolução (≈ 200 DPI)
 * e extrai o blob/buffer JPEG com alta qualidade para embutir no PDF final sem perda de legibilidade.
 */
async function renderPdfJsPageToJpegBuffer(
  page: any,
  dpi = 200,
  jpegQuality = 0.92,
): Promise<{ buffer: ArrayBuffer; widthPt: number; heightPt: number }> {
  // 72 pontos por polegada é a escala base PDF (escala 1.0 = 72 DPI)
  const scale = dpi / 72.0
  const viewport = page.getViewport({ scale, rotation: page.rotate || 0 })
  const unscaledViewport = page.getViewport({ scale: 1.0, rotation: page.rotate || 0 })

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) {
    throw new Error('Falha ao obter contexto 2D para renderização de página.')
  }

  // Fundo branco limpo
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const renderContext = {
    canvasContext: ctx,
    viewport,
  }

  await page.render(renderContext).promise

  // Converter para Blob JPEG de alta qualidade
  const jpegBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Falha ao codificar página renderizada em JPEG.'))
        }
      },
      'image/jpeg',
      jpegQuality,
    )
  })

  // Liberar dimensões do canvas temporário
  canvas.width = 0
  canvas.height = 0

  const arrayBuffer = await jpegBlob.arrayBuffer()
  return {
    buffer: arrayBuffer,
    widthPt: unscaledViewport.width,
    heightPt: unscaledViewport.height,
  }
}

/**
 * Realiza a união de múltiplos PDFs suportando arquivos híbridos:
 * - PDFs comuns são copiados estruturalmente (vetores, textos pesquisáveis, fontes).
 * - PDFs com criptografia interna e permissões restritas (ex.: Dataprev) que abrem sem senha
 *   são renderizados página a página via PDF.js em alta fidelidade (~200 DPI) e embutidos
 *   com as dimensões e proporções originais exatas.
 * - Arquivos com senha de abertura real continuam estritamente bloqueados.
 */
export async function mergeHybridPdfsSequentially(
  options: HybridMergeOptions,
): Promise<HybridMergeResult> {
  const {
    files,
    allowSignedDocuments = false,
    dpi = 200,
    jpegQuality = 0.92,
    onProgress,
    checkCancelled,
  } = options

  const isCancelled = () => Boolean(checkCancelled && checkCancelled())

  if (isCancelled()) {
    return {
      success: false,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  if (!files || files.length < 2) {
    return {
      success: false,
      errorCode: 'GENERIC_ERROR',
      error: 'Selecione pelo menos dois arquivos PDF para realizar a união.',
    }
  }

  try {
    const mergedDoc = await PDFDocument.create()
    let totalPagesMerged = 0
    let rasterizedCount = 0
    let structuralCount = 0

    for (let i = 0; i < files.length; i++) {
      if (isCancelled()) {
        return {
          success: false,
          errorCode: 'CANCELLED',
          error: 'Operação cancelada pelo usuário.',
        }
      }

      const fileItem = files[i]

      // 1. Validar cabeçalho %PDF-
      if (!validatePdfHeader(fileItem.buffer)) {
        return {
          success: false,
          errorCode: 'INVALID_HEADER',
          failingFile: fileItem.name,
          error: `O arquivo "${fileItem.name}" não possui cabeçalho válido de documento PDF (%PDF-).`,
        }
      }

      if (onProgress) {
        onProgress({
          phase: 'validating',
          currentFileIndex: i,
          totalFiles: files.length,
          currentFileName: fileItem.name,
          percent: Math.round((i / files.length) * 100),
        })
      }

      // 2. Determinar modo se não pré-especificado
      let isDerivative = fileItem.mode === 'derivative'
      let standardDoc: PDFDocument | null = null

      if (!isDerivative) {
        try {
          standardDoc = await PDFDocument.load(fileItem.buffer, {
            ignoreEncryption: false,
            updateMetadata: false,
          })
        } catch (loadErr: unknown) {
          const message = loadErr instanceof Error ? loadErr.message : String(loadErr)
          const errName = loadErr instanceof Error ? loadErr.name : ''

          if (
            errName === 'EncryptedPDFError' ||
            message.toLowerCase().includes('encrypted') ||
            message.toLowerCase().includes('password')
          ) {
            isDerivative = true
          } else {
            return {
              success: false,
              errorCode: 'PARSE_ERROR',
              failingFile: fileItem.name,
              error: `Não foi possível carregar o arquivo "${fileItem.name}". (${message})`,
            }
          }
        }
      }

      // 3. Processamento Estrutural (PDF comum)
      if (!isDerivative && standardDoc) {
        // Checar assinaturas preventivamente
        const sigCheck = detectDigitalSignatures(standardDoc)
        if (sigCheck.state === 'error') {
          return {
            success: false,
            errorCode: 'SIGNATURE_CHECK_ERROR',
            failingFile: fileItem.name,
            error: `Falha na verificação de assinaturas digitais do arquivo "${fileItem.name}".`,
          }
        }
        if (sigCheck.state === 'detected' && !allowSignedDocuments) {
          return {
            success: false,
            errorCode: 'SIGNATURE_DETECTED',
            failingFile: fileItem.name,
            error: `Foram detectados indícios de campos de assinatura digital no arquivo "${fileItem.name}". Confirmação prévia é necessária para prosseguir.`,
          }
        }

        const count = standardDoc.getPageCount()
        if (count > 0) {
          if (onProgress) {
            onProgress({
              phase: 'merging_structural',
              currentFileIndex: i,
              totalFiles: files.length,
              currentFileName: fileItem.name,
              totalPagesForFile: count,
              percent: Math.round((i / files.length) * 100),
            })
          }

          const indices = standardDoc.getPageIndices()
          const copiedPages = await mergedDoc.copyPages(standardDoc, indices)
          for (const page of copiedPages) {
            mergedDoc.addPage(page)
          }
          totalPagesMerged += count
          structuralCount += count
        }
        standardDoc = null
      } else {
        // 4. Processamento Alternativo (Cópia derivada com renderização de alta fidelidade)
        let pdfJsDoc: any
        try {
          pdfJsDoc = await loadPdfJsDocument(fileItem.buffer)
        } catch (pdfJsErr: unknown) {
          const errorMsg = pdfJsErr instanceof Error ? pdfJsErr.message : String(pdfJsErr)
          const errName = pdfJsErr instanceof Error ? pdfJsErr.name : ''
          if (
            errName === 'PasswordException' ||
            errorMsg.toLowerCase().includes('password') ||
            errorMsg.toLowerCase().includes('need_password')
          ) {
            return {
              success: false,
              errorCode: 'ENCRYPTED_WITH_PASSWORD',
              failingFile: fileItem.name,
              error: `O arquivo "${fileItem.name}" exige senha de abertura desconhecida e não pode ser processado.`,
            }
          }

          return {
            success: false,
            errorCode: 'ENCRYPTED_PDF',
            failingFile: fileItem.name,
            error: `Falha ao abrir cópia derivada do arquivo "${fileItem.name}": ${errorMsg}`,
          }
        }

        const numPages = pdfJsDoc.numPages
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          if (isCancelled()) {
            return {
              success: false,
              errorCode: 'CANCELLED',
              error: 'Operação cancelada pelo usuário.',
            }
          }

          if (onProgress) {
            onProgress({
              phase: 'rendering_page',
              currentFileIndex: i,
              totalFiles: files.length,
              currentFileName: fileItem.name,
              currentPage: pageNum,
              totalPagesForFile: numPages,
              percent: Math.round(((i + (pageNum - 1) / numPages) / files.length) * 100),
            })
          }

          const page = await pdfJsDoc.getPage(pageNum)
          const {
            buffer: jpegBuffer,
            widthPt,
            heightPt,
          } = await renderPdfJsPageToJpegBuffer(page, dpi, jpegQuality)

          if (onProgress) {
            onProgress({
              phase: 'embedding_page',
              currentFileIndex: i,
              totalFiles: files.length,
              currentFileName: fileItem.name,
              currentPage: pageNum,
              totalPagesForFile: numPages,
              percent: Math.round(((i + pageNum / numPages) / files.length) * 100),
            })
          }

          // Embutir a imagem no documento PDF final preservando dimensões exatas da página original
          const embeddedImg = await mergedDoc.embedJpg(jpegBuffer)
          const newPage = mergedDoc.addPage([widthPt, heightPt])
          newPage.drawImage(embeddedImg, {
            x: 0,
            y: 0,
            width: widthPt,
            height: heightPt,
          })

          totalPagesMerged++
          rasterizedCount++
        }
      }
    }

    if (isCancelled()) {
      return {
        success: false,
        errorCode: 'CANCELLED',
        error: 'Operação cancelada pelo usuário.',
      }
    }

    // 5. Salvar documento unificado final
    if (onProgress) {
      onProgress({
        phase: 'saving',
        currentFileIndex: files.length,
        totalFiles: files.length,
        currentFileName: 'Gerando documento final...',
        percent: 98,
      })
    }

    const savedBytes = await mergedDoc.save({ useObjectStreams: false })
    const arrayBuffer = savedBytes.buffer.slice(
      savedBytes.byteOffset,
      savedBytes.byteOffset + savedBytes.byteLength,
    ) as ArrayBuffer

    return {
      success: true,
      mergedBuffer: arrayBuffer,
      pageCount: totalPagesMerged,
      rasterizedPageCount: rasterizedCount,
      structuralPageCount: structuralCount,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (
      err instanceof RangeError ||
      message.toLowerCase().includes('out of memory') ||
      message.toLowerCase().includes('allocation')
    ) {
      return {
        success: false,
        errorCode: 'OUT_OF_MEMORY',
        error: 'Memória insuficiente no navegador durante a geração do documento final.',
      }
    }

    return {
      success: false,
      errorCode: 'GENERIC_ERROR',
      error: `Erro ao unir documentos: ${message}`,
    }
  }
}
