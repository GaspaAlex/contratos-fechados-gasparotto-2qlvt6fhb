import { PDFDocument } from 'pdf-lib'
import { validatePdfHeader, detectDigitalSignatures } from './pdf-validator'

export interface OrganizePdfProgressUpdate {
  phase: 'validating' | 'loading' | 'copying' | 'saving'
  currentPage: number
  totalPages: number
  currentLabel: string
}

export interface OrganizePdfResult {
  success: boolean
  organizedBuffer?: ArrayBuffer
  fileName?: string
  totalOriginalPages: number
  totalExcludedPages: number
  totalRemainingPages: number
  reorderedCount?: number
  isOrderModified?: boolean
  hasSignedDocument: boolean
  error?: string
  errorCode?:
    | 'INVALID_HEADER'
    | 'ENCRYPTED_PDF'
    | 'SIGNATURE_DETECTED'
    | 'SIGNATURE_CHECK_ERROR'
    | 'PARSE_ERROR'
    | 'ALL_PAGES_EXCLUDED'
    | 'NO_PAGES_EXCLUDED'
    | 'NO_CHANGES_MADE'
    | 'INVALID_PAGE_SELECTION'
    | 'OUT_OF_MEMORY'
    | 'CANCELLED'
    | 'GENERIC_ERROR'
}

export interface OrganizeExecutionOptions {
  fileName: string
  buffer: ArrayBuffer
  /**
   * Conjunto ou array de números de páginas a excluir (1-based, ex: [4] para excluir página original 4).
   * Opcional se customPageOrder for fornecido com reordenação.
   */
  excludedPages?: number[]
  /**
   * Sequência personalizada das páginas originais desejadas (1-based).
   * Exemplo: para documento de 6 páginas com a 6 na 1ª posição e 3 excluída: [6, 1, 2, 4, 5].
   * Se omitido, utiliza a ordem natural das páginas 1..N exceto excludedPages.
   */
  pageOrder?: number[]
  allowSignedDocument?: boolean
  onProgress?: (progress: OrganizePdfProgressUpdate) => void
  checkCancelled?: () => boolean
}

/**
 * Gera o nome de arquivo de saída segundo as regras da especificação:
 * - base + "-organizado.pdf" (ex: contrato-organizado.pdf)
 * - Com assinatura digital detectada: base + "-organizado-copia.pdf"
 */
export function buildOrganizedFileName(rawName: string, hasSignature: boolean): string {
  const withoutExt = rawName.replace(/\.pdf$/i, '').trim()
  const clean = withoutExt || 'documento'
  if (hasSignature) {
    return `${clean}-organizado-copia.pdf`
  }
  return `${clean}-organizado.pdf`
}

/**
 * Executa a exclusão de páginas de um documento PDF usando pdf-lib sem rasterização.
 * Preserva o conteúdo vetorial e estrutura das páginas mantidas, garantindo a
 * ordem original exata das páginas restantes (ex: de 13 páginas, exclui a 4,
 * mantendo 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13).
 */
export async function organizePdfLocally(
  options: OrganizeExecutionOptions,
): Promise<OrganizePdfResult> {
  const {
    fileName,
    buffer,
    excludedPages = [],
    pageOrder,
    allowSignedDocument = false,
    onProgress,
    checkCancelled,
  } = options

  const isCancelled = () => Boolean(checkCancelled && checkCancelled())

  if (isCancelled()) {
    return {
      success: false,
      totalOriginalPages: 0,
      totalExcludedPages: 0,
      totalRemainingPages: 0,
      hasSignedDocument: false,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  // 1. Notificar e checar cabeçalho de bytes (%PDF-)
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
      totalExcludedPages: 0,
      totalRemainingPages: 0,
      hasSignedDocument: false,
      errorCode: 'INVALID_HEADER',
      error: `O arquivo "${fileName}" não possui cabeçalho válido de documento PDF (%PDF-).`,
    }
  }

  if (isCancelled()) {
    return {
      success: false,
      totalOriginalPages: 0,
      totalExcludedPages: 0,
      totalRemainingPages: 0,
      hasSignedDocument: false,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  // 2. Carregar documento original com pdf-lib (SEM ignoreEncryption: true)
  let sourceDoc: PDFDocument
  try {
    if (onProgress) {
      onProgress({
        phase: 'loading',
        currentPage: 0,
        totalPages: 1,
        currentLabel: 'Lendo estrutura interna do PDF...',
      })
    }

    sourceDoc = await PDFDocument.load(buffer, {
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
        totalExcludedPages: 0,
        totalRemainingPages: 0,
        hasSignedDocument: false,
        errorCode: 'ENCRYPTED_PDF',
        error: `O arquivo "${fileName}" está protegido por senha ou criptografia. O sistema não suporta organizar PDFs protegidos.`,
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
        totalExcludedPages: 0,
        totalRemainingPages: 0,
        hasSignedDocument: false,
        errorCode: 'OUT_OF_MEMORY',
        error: 'Memória insuficiente para carregar o arquivo PDF no navegador.',
      }
    }

    return {
      success: false,
      totalOriginalPages: 0,
      totalExcludedPages: 0,
      totalRemainingPages: 0,
      hasSignedDocument: false,
      errorCode: 'PARSE_ERROR',
      error: `Não foi possível ler o documento PDF: ${msg}`,
    }
  }

  const totalOriginalPages = sourceDoc.getPageCount()
  if (totalOriginalPages === 0) {
    return {
      success: false,
      totalOriginalPages: 0,
      totalExcludedPages: 0,
      totalRemainingPages: 0,
      hasSignedDocument: false,
      errorCode: 'GENERIC_ERROR',
      error: 'O documento PDF não contém nenhuma página.',
    }
  }

  // 3. Verificação preventiva de assinaturas digitais
  const sigResult = detectDigitalSignatures(sourceDoc)
  if (sigResult.state === 'error') {
    return {
      success: false,
      totalOriginalPages,
      totalExcludedPages: 0,
      totalRemainingPages: totalOriginalPages,
      hasSignedDocument: false,
      errorCode: 'SIGNATURE_CHECK_ERROR',
      error: `Falha na verificação de assinaturas digitais do arquivo "${fileName}". Por segurança, o arquivo não pôde ser validado e não poderá ser modificado. (${sigResult.error || 'Erro estrutural'})`,
    }
  }

  const hasSignature = sigResult.state === 'detected'
  if (hasSignature && !allowSignedDocument) {
    return {
      success: false,
      totalOriginalPages,
      totalExcludedPages: 0,
      totalRemainingPages: totalOriginalPages,
      hasSignedDocument: true,
      errorCode: 'SIGNATURE_DETECTED',
      error:
        'Foram detectados indícios de assinatura digital no documento. A exclusão de páginas poderá invalidar a autenticidade criptográfica. Confirmação expressa é necessária para prosseguir.',
    }
  }

  // 4. Validar conjunto de páginas a excluir
  const excludedSet = new Set(
    excludedPages.filter((p) => Number.isInteger(p) && p >= 1 && p <= totalOriginalPages),
  )

  // Checagem se alguma página inválida foi passada na exclusão
  for (const p of excludedPages) {
    if (!Number.isInteger(p) || p < 1 || p > totalOriginalPages) {
      return {
        success: false,
        totalOriginalPages,
        totalExcludedPages: 0,
        totalRemainingPages: totalOriginalPages,
        hasSignedDocument: hasSignature,
        errorCode: 'INVALID_PAGE_SELECTION',
        error: `A página ${p} não existe no documento (intervalo válido: 1 a ${totalOriginalPages}).`,
      }
    }
  }

  // 5. Determinar a sequência de páginas resultantes
  // Se pageOrder for fornecido, usamos pageOrder excluindo as que estiverem no excludedSet.
  // Caso pageOrder não seja fornecido, usamos a sequência original 1..totalOriginalPages excluindo as marcadas.
  let finalSequence1Based: number[] = []

  if (Array.isArray(pageOrder) && pageOrder.length > 0) {
    // Validar itens do pageOrder
    const seenInOrder = new Set<number>()
    for (const p of pageOrder) {
      if (!Number.isInteger(p) || p < 1 || p > totalOriginalPages) {
        return {
          success: false,
          totalOriginalPages,
          totalExcludedPages: excludedSet.size,
          totalRemainingPages: 0,
          hasSignedDocument: hasSignature,
          errorCode: 'INVALID_PAGE_SELECTION',
          error: `A sequência contém página inválida: ${p} (documento possui ${totalOriginalPages} páginas).`,
        }
      }
      if (seenInOrder.has(p)) {
        return {
          success: false,
          totalOriginalPages,
          totalExcludedPages: excludedSet.size,
          totalRemainingPages: 0,
          hasSignedDocument: hasSignature,
          errorCode: 'INVALID_PAGE_SELECTION',
          error: `A página ${p} foi duplicada na sequência de organização.`,
        }
      }
      seenInOrder.add(p)
      if (!excludedSet.has(p)) {
        finalSequence1Based.push(p)
      }
    }
  } else {
    // Sequência natural 1..totalOriginalPages
    for (let i = 1; i <= totalOriginalPages; i++) {
      if (!excludedSet.has(i)) {
        finalSequence1Based.push(i)
      }
    }
  }

  // Verificar se há páginas restantes
  const totalRemainingPages = finalSequence1Based.length
  if (totalRemainingPages === 0) {
    return {
      success: false,
      totalOriginalPages,
      totalExcludedPages: excludedSet.size,
      totalRemainingPages: 0,
      hasSignedDocument: hasSignature,
      errorCode: 'ALL_PAGES_EXCLUDED',
      error:
        'Não é permitido gerar um PDF com zero páginas. Ao menos uma página deve ser preservada.',
    }
  }

  // Verificar se houve alguma alteração (seja exclusão ou reordenação)
  // Ordem natural esperada sem alterações: 1, 2, ..., totalOriginalPages
  const isOrderModified =
    finalSequence1Based.length !== totalOriginalPages ||
    finalSequence1Based.some((origNum, posIdx) => origNum !== posIdx + 1)

  const hasExclusion = excludedSet.size > 0
  const hasReorder =
    Array.isArray(pageOrder) &&
    pageOrder.length === totalOriginalPages &&
    pageOrder.some((origNum, posIdx) => origNum !== posIdx + 1)

  if (!hasExclusion && !hasReorder) {
    return {
      success: false,
      totalOriginalPages,
      totalExcludedPages: 0,
      totalRemainingPages: totalOriginalPages,
      hasSignedDocument: hasSignature,
      errorCode: 'NO_CHANGES_MADE',
      error:
        'Nenhuma alteração foi realizada (nenhuma página excluída e a ordem original permanece a mesma).',
    }
  }

  // Contabilizar quantas páginas tiveram sua posição alterada em relação à ordem original
  let reorderedCount = 0
  if (Array.isArray(pageOrder)) {
    pageOrder.forEach((origNum, posIdx) => {
      if (origNum !== posIdx + 1) {
        reorderedCount++
      }
    })
  }

  // Converter finalSequence1Based para índices 0-based do pdf-lib
  const keptIndices: number[] = finalSequence1Based.map((p) => p - 1)

  if (isCancelled()) {
    return {
      success: false,
      totalOriginalPages,
      totalExcludedPages: excludedSet.size,
      totalRemainingPages,
      hasSignedDocument: hasSignature,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  // 6. Criar novo documento PDF de destino e copiar as páginas mantidas
  let targetDoc: PDFDocument
  try {
    targetDoc = await PDFDocument.create()

    if (onProgress) {
      onProgress({
        phase: 'copying',
        currentPage: 0,
        totalPages: keptIndices.length,
        currentLabel: `Preparando páginas preservadas (0/${keptIndices.length})...`,
      })
    }

    // Copia as páginas em lote ou em partes para reportar progresso
    // copyPages copia objetos de página sem rasterizar imagens ou texto
    const copiedPages = await targetDoc.copyPages(sourceDoc, keptIndices)

    for (let c = 0; c < copiedPages.length; c++) {
      if (isCancelled()) {
        return {
          success: false,
          totalOriginalPages,
          totalExcludedPages: excludedSet.size,
          totalRemainingPages,
          hasSignedDocument: hasSignature,
          errorCode: 'CANCELLED',
          error: 'Operação cancelada pelo usuário.',
        }
      }

      targetDoc.addPage(copiedPages[c])

      if (onProgress) {
        onProgress({
          phase: 'copying',
          currentPage: c + 1,
          totalPages: copiedPages.length,
          currentLabel: `Preservando página ${keptIndices[c] + 1} (${c + 1} de ${copiedPages.length})...`,
        })
      }
    }
  } catch (copyErr: unknown) {
    const msg = copyErr instanceof Error ? copyErr.message : String(copyErr)
    return {
      success: false,
      totalOriginalPages,
      totalExcludedPages: excludedSet.size,
      totalRemainingPages,
      hasSignedDocument: hasSignature,
      errorCode: 'GENERIC_ERROR',
      error: `Erro ao extrair e compor as páginas do documento: ${msg}`,
    }
  }

  if (isCancelled()) {
    return {
      success: false,
      totalOriginalPages,
      totalExcludedPages: excludedSet.size,
      totalRemainingPages,
      hasSignedDocument: hasSignature,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  // 7. Salvar novo documento PDF
  if (onProgress) {
    onProgress({
      phase: 'saving',
      currentPage: keptIndices.length,
      totalPages: keptIndices.length,
      currentLabel: 'Gerando PDF final...',
    })
  }

  try {
    const savedBytes = await targetDoc.save({ useObjectStreams: false })
    const arrayBuffer = savedBytes.buffer.slice(
      savedBytes.byteOffset,
      savedBytes.byteOffset + savedBytes.byteLength,
    ) as ArrayBuffer

    const outputName = buildOrganizedFileName(fileName, hasSignature)

    return {
      success: true,
      organizedBuffer: arrayBuffer,
      fileName: outputName,
      totalOriginalPages,
      totalExcludedPages: excludedSet.size,
      totalRemainingPages,
      reorderedCount,
      isOrderModified,
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
        totalOriginalPages,
        totalExcludedPages: excludedSet.size,
        totalRemainingPages,
        hasSignedDocument: hasSignature,
        errorCode: 'OUT_OF_MEMORY',
        error: 'Memória insuficiente no navegador ao salvar o PDF organizado.',
      }
    }

    return {
      success: false,
      totalOriginalPages,
      totalExcludedPages: excludedSet.size,
      totalRemainingPages,
      hasSignedDocument: hasSignature,
      errorCode: 'GENERIC_ERROR',
      error: `Erro ao salvar documento organizado: ${msg}`,
    }
  }
}
