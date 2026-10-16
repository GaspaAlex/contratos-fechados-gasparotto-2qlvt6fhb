import { PDFDocument, degrees } from 'pdf-lib'
import { validatePdfHeader, detectDigitalSignatures } from './pdf-validator'

export interface PageRotationMap {
  /**
   * Rotação delta aplicada pelo usuário (0, 90, 180, 270) indexada em base 1 (página 1, 2, ...).
   */
  [pageNumber: number]: number
}

export interface RotatePdfProgressUpdate {
  phase: 'validating' | 'loading' | 'rotating' | 'saving'
  currentPage: number
  totalPages: number
  currentLabel: string
}

export interface RotatePdfResult {
  success: boolean
  rotatedBuffer?: ArrayBuffer
  fileName?: string
  totalOriginalPages: number
  totalModifiedPages: number
  hasSignedDocument: boolean
  error?: string
  errorCode?:
    | 'INVALID_HEADER'
    | 'ENCRYPTED_PDF'
    | 'SIGNATURE_DETECTED'
    | 'SIGNATURE_CHECK_ERROR'
    | 'PARSE_ERROR'
    | 'OUT_OF_MEMORY'
    | 'CANCELLED'
    | 'GENERIC_ERROR'
}

export interface RotateExecutionOptions {
  fileName: string
  buffer: ArrayBuffer
  rotations: PageRotationMap
  allowSignedDocument?: boolean
  onProgress?: (progress: RotatePdfProgressUpdate) => void
  checkCancelled?: () => boolean
}

/**
 * Normaliza um ângulo em graus para o intervalo canônico [0, 90, 180, 270].
 */
export function normalizeAngle(angle: number): number {
  const mod = ((angle % 360) + 360) % 360
  // Arredonda para múltiplo de 90 mais próximo para evitar imprecisões de ponto flutuante
  const rounded = Math.round(mod / 90) * 90
  return rounded % 360
}

/**
 * Gera o nome de arquivo de saída segundo as regras da especificação:
 * - base + "-rotacionado.pdf"
 * - Quando há assinatura digital detectada: base + "-rotacionado-copia.pdf"
 */
export function buildRotatedFileName(rawName: string, hasSignature: boolean): string {
  const withoutExt = rawName.replace(/\.pdf$/i, '').trim()
  const clean = withoutExt || 'documento'
  if (hasSignature) {
    return `${clean}-rotacionado-copia.pdf`
  }
  return `${clean}-rotacionado.pdf`
}

/**
 * Executa a rotação de páginas no documento PDF usando pdf-lib sem rasterização.
 * Preserva o conteúdo vetorial original e aplica a rotação relativa ao /Rotate original.
 */
export async function rotatePdfLocally(options: RotateExecutionOptions): Promise<RotatePdfResult> {
  const {
    fileName,
    buffer,
    rotations,
    allowSignedDocument = false,
    onProgress,
    checkCancelled,
  } = options

  const isCancelled = () => Boolean(checkCancelled && checkCancelled())

  if (isCancelled()) {
    return {
      success: false,
      totalOriginalPages: 0,
      totalModifiedPages: 0,
      hasSignedDocument: false,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  // 1. Notificar e checar cabeçalho de bytes
  if (onProgress) {
    onProgress({
      phase: 'validating',
      currentPage: 0,
      totalPages: 1,
      currentLabel: 'Validando cabeçalho do documento...',
    })
  }

  if (!validatePdfHeader(buffer)) {
    return {
      success: false,
      totalOriginalPages: 0,
      totalModifiedPages: 0,
      hasSignedDocument: false,
      errorCode: 'INVALID_HEADER',
      error: `O arquivo "${fileName}" não possui cabeçalho válido de documento PDF (%PDF-).`,
    }
  }

  if (isCancelled()) {
    return {
      success: false,
      totalOriginalPages: 0,
      totalModifiedPages: 0,
      hasSignedDocument: false,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  // 2. Carregar documento com pdf-lib (SEM ignoreEncryption: true)
  let pdfDoc: PDFDocument
  try {
    if (onProgress) {
      onProgress({
        phase: 'loading',
        currentPage: 0,
        totalPages: 1,
        currentLabel: 'Lendo estrutura interna do PDF...',
      })
    }

    pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: false,
      updateMetadata: false,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const errName = err instanceof Error ? err.name : ''

    if (
      errName === 'EncryptedPDFError' ||
      msg.toLowerCase().includes('encrypted') ||
      msg.toLowerCase().includes('password')
    ) {
      return {
        success: false,
        totalOriginalPages: 0,
        totalModifiedPages: 0,
        hasSignedDocument: false,
        errorCode: 'ENCRYPTED_PDF',
        error: `O arquivo "${fileName}" está protegido por senha ou criptografia. O sistema não suporta rotacionar PDFs protegidos.`,
      }
    }

    if (
      err instanceof RangeError ||
      msg.toLowerCase().includes('out of memory') ||
      msg.toLowerCase().includes('allocation')
    ) {
      return {
        success: false,
        totalOriginalPages: 0,
        totalModifiedPages: 0,
        hasSignedDocument: false,
        errorCode: 'OUT_OF_MEMORY',
        error: 'Memória insuficiente para carregar o arquivo PDF no navegador.',
      }
    }

    return {
      success: false,
      totalOriginalPages: 0,
      totalModifiedPages: 0,
      hasSignedDocument: false,
      errorCode: 'PARSE_ERROR',
      error: `Não foi possível ler o documento PDF: ${msg}`,
    }
  }

  // 3. Verificação preventiva de assinaturas digitais
  const sigResult = detectDigitalSignatures(pdfDoc)
  if (sigResult.state === 'error') {
    return {
      success: false,
      totalOriginalPages: 0,
      totalModifiedPages: 0,
      hasSignedDocument: false,
      errorCode: 'SIGNATURE_CHECK_ERROR',
      error: `Falha na verificação de assinaturas digitais do arquivo "${fileName}". Por segurança, o arquivo não pôde ser validado e não poderá ser rotacionado. (${sigResult.error || 'Erro estrutural'})`,
    }
  }

  const hasSignature = sigResult.state === 'detected'
  if (hasSignature && !allowSignedDocument) {
    return {
      success: false,
      totalOriginalPages: pdfDoc.getPageCount(),
      totalModifiedPages: 0,
      hasSignedDocument: true,
      errorCode: 'SIGNATURE_DETECTED',
      error:
        'Foram detectados indícios de assinatura digital no documento. A rotação poderá invalidar a autenticidade criptográfica. Confirmação expressa é necessária para prosseguir.',
    }
  }

  const totalPages = pdfDoc.getPageCount()
  if (totalPages === 0) {
    return {
      success: false,
      totalOriginalPages: 0,
      totalModifiedPages: 0,
      hasSignedDocument: hasSignature,
      errorCode: 'GENERIC_ERROR',
      error: 'O documento PDF não contém nenhuma página.',
    }
  }

  // 4. Aplicar rotação relativa por página
  let totalModifiedPages = 0
  const pages = pdfDoc.getPages()

  for (let i = 0; i < pages.length; i++) {
    if (isCancelled()) {
      return {
        success: false,
        totalOriginalPages: totalPages,
        totalModifiedPages: 0,
        hasSignedDocument: hasSignature,
        errorCode: 'CANCELLED',
        error: 'Operação cancelada pelo usuário.',
      }
    }

    const pageNumber = i + 1
    const page = pages[i]
    const delta = rotations[pageNumber] || 0
    const normalizedDelta = normalizeAngle(delta)

    if (normalizedDelta !== 0) {
      totalModifiedPages += 1
      const originalAngle = page.getRotation().angle
      const finalAngle = normalizeAngle(originalAngle + normalizedDelta)
      page.setRotation(degrees(finalAngle))
    }

    if (onProgress) {
      onProgress({
        phase: 'rotating',
        currentPage: pageNumber,
        totalPages,
        currentLabel: `Aplicando rotações... página ${pageNumber} de ${totalPages}`,
      })
    }
  }

  if (isCancelled()) {
    return {
      success: false,
      totalOriginalPages: totalPages,
      totalModifiedPages: 0,
      hasSignedDocument: hasSignature,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  // 5. Salvar documento rotacionado
  if (onProgress) {
    onProgress({
      phase: 'saving',
      currentPage: totalPages,
      totalPages,
      currentLabel: 'Gerando documento final...',
    })
  }

  try {
    const savedBytes = await pdfDoc.save({ useObjectStreams: false })
    const arrayBuffer = savedBytes.buffer.slice(
      savedBytes.byteOffset,
      savedBytes.byteOffset + savedBytes.byteLength,
    ) as ArrayBuffer

    const outputName = buildRotatedFileName(fileName, hasSignature)

    return {
      success: true,
      rotatedBuffer: arrayBuffer,
      fileName: outputName,
      totalOriginalPages: totalPages,
      totalModifiedPages,
      hasSignedDocument: hasSignature,
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
        totalOriginalPages: totalPages,
        totalModifiedPages,
        hasSignedDocument: hasSignature,
        errorCode: 'OUT_OF_MEMORY',
        error: 'Memória insuficiente no navegador ao salvar o PDF rotacionado.',
      }
    }

    return {
      success: false,
      totalOriginalPages: totalPages,
      totalModifiedPages,
      hasSignedDocument: hasSignature,
      errorCode: 'GENERIC_ERROR',
      error: `Erro ao salvar documento rotacionado: ${msg}`,
    }
  }
}
