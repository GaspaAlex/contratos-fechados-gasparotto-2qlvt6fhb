import { PDFDocument } from 'pdf-lib'
import {
  validatePdfHeader,
  detectDigitalSignatures,
  type MergeProgressUpdate,
} from './pdf-validator'

export interface MergePdfFilePayload {
  name: string
  buffer: ArrayBuffer
}

export interface MergePdfResult {
  success: boolean
  mergedBuffer?: ArrayBuffer
  pageCount?: number
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
  failingFile?: string
}

export interface MergeExecutionOptions {
  files: MergePdfFilePayload[]
  allowSignedDocuments?: boolean
  onProgress?: (progress: MergeProgressUpdate) => void
  checkCancelled?: () => boolean
}

/**
 * Valida individualmente um arquivo PDF antes ou durante o processamento.
 * Checa assinatura de bytes (%PDF-), se é criptografado e se há campos /Sig.
 */
export async function validateSinglePdf(
  fileName: string,
  buffer: ArrayBuffer,
): Promise<{
  valid: boolean
  hasSignature?: boolean
  error?: string
  errorCode?: MergePdfResult['errorCode']
  pageCount?: number
}> {
  // 1. Checagem de cabeçalho de bytes (%PDF-)
  if (!validatePdfHeader(buffer)) {
    return {
      valid: false,
      errorCode: 'INVALID_HEADER',
      error: `O arquivo "${fileName}" não possui uma estrutura válida de documento PDF (cabeçalho %PDF- não encontrado).`,
    }
  }

  // 2. Tentar carregar documento com pdf-lib (SEM ignoreEncryption: true)
  let pdfDoc: PDFDocument
  try {
    // pdf-lib lança EncryptedPDFError quando o PDF está protegido com senha
    pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: false,
      updateMetadata: false,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const errName = err instanceof Error ? err.name : ''

    if (
      errName === 'EncryptedPDFError' ||
      message.toLowerCase().includes('encrypted') ||
      message.toLowerCase().includes('password')
    ) {
      return {
        valid: false,
        errorCode: 'ENCRYPTED_PDF',
        error: `O arquivo "${fileName}" está protegido por senha ou criptografia. O sistema não suporta processamento de PDFs protegidos.`,
      }
    }

    if (
      err instanceof RangeError ||
      message.toLowerCase().includes('out of memory') ||
      message.toLowerCase().includes('allocation')
    ) {
      return {
        valid: false,
        errorCode: 'OUT_OF_MEMORY',
        error: `Memória insuficiente ao carregar o arquivo "${fileName}". Tente processar menos arquivos ou reduza o tamanho.`,
      }
    }

    return {
      valid: false,
      errorCode: 'PARSE_ERROR',
      error: `Não foi possível carregar o arquivo "${fileName}". O conteúdo pode estar corrompido ou em formato incompatível. (${message})`,
    }
  }

  // 3. Verificação preventiva de campos de assinatura digital (/Sig)
  const sigCheck = detectDigitalSignatures(pdfDoc)
  if (sigCheck.state === 'error') {
    return {
      valid: false,
      errorCode: 'SIGNATURE_CHECK_ERROR',
      error: `Falha na verificação de assinaturas digitais do arquivo "${fileName}". Por segurança, o arquivo não pôde ser validado e não poderá ser processado. (${sigCheck.error || 'Erro interno na estrutura do PDF'})`,
    }
  }

  const hasSignature = sigCheck.state === 'detected'

  return {
    valid: true,
    hasSignature,
    pageCount: pdfDoc.getPageCount(),
  }
}

/**
 * Une múltiplos arquivos PDF de forma estritamente sequencial.
 *
 * Arquitetura de Memória:
 * - Cria um novo PDFDocument destino vazio.
 * - Para cada arquivo de entrada:
 *   1. Valida cabeçalho, criptografia e assinaturas.
 *   2. Carrega na memória com PDFDocument.load.
 *   3. Copia todas as páginas para o documento destino (mergedDoc.copyPages).
 *   4. Adiciona ao documento destino (mergedDoc.addPage).
 *   5. Descarta a referência do documento de origem antes de passar para o próximo.
 * - Salva o PDF consolidado em um Uint8Array e retorna como ArrayBuffer.
 */
export async function mergePdfsSequentially(
  options: MergeExecutionOptions,
): Promise<MergePdfResult> {
  const { files, allowSignedDocuments = false, onProgress, checkCancelled } = options

  if (!files || files.length < 2) {
    return {
      success: false,
      errorCode: 'GENERIC_ERROR',
      error: 'Selecione pelo menos dois arquivos PDF para realizar a união.',
    }
  }

  try {
    // Criar o documento destino consolidado
    const mergedDoc = await PDFDocument.create()
    let totalPagesMerged = 0

    for (let i = 0; i < files.length; i++) {
      if (checkCancelled && checkCancelled()) {
        return {
          success: false,
          errorCode: 'CANCELLED',
          error: 'A união dos arquivos foi cancelada pelo usuário.',
        }
      }

      const fileItem = files[i]

      // Notificar etapa de validação do arquivo atual
      if (onProgress) {
        onProgress({
          phase: 'validating',
          currentFileIndex: i,
          totalFiles: files.length,
          currentFileName: fileItem.name,
        })
      }

      // Validar cabeçalho
      if (!validatePdfHeader(fileItem.buffer)) {
        return {
          success: false,
          errorCode: 'INVALID_HEADER',
          failingFile: fileItem.name,
          error: `O arquivo "${fileItem.name}" não possui cabeçalho válido de documento PDF (%PDF-).`,
        }
      }

      if (checkCancelled && checkCancelled()) {
        return {
          success: false,
          errorCode: 'CANCELLED',
          error: 'A união dos arquivos foi cancelada pelo usuário.',
        }
      }

      // Carregar e validar criptografia
      let sourceDoc: PDFDocument | null = null
      try {
        sourceDoc = await PDFDocument.load(fileItem.buffer, {
          ignoreEncryption: false,
          updateMetadata: false,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        const errName = err instanceof Error ? err.name : ''

        if (
          errName === 'EncryptedPDFError' ||
          message.toLowerCase().includes('encrypted') ||
          message.toLowerCase().includes('password')
        ) {
          return {
            success: false,
            errorCode: 'ENCRYPTED_PDF',
            failingFile: fileItem.name,
            error: `O arquivo "${fileItem.name}" está protegido por senha ou criptografia. O sistema bloqueia a união de PDFs protegidos.`,
          }
        }

        if (
          err instanceof RangeError ||
          message.toLowerCase().includes('out of memory') ||
          message.toLowerCase().includes('allocation')
        ) {
          return {
            success: false,
            errorCode: 'OUT_OF_MEMORY',
            failingFile: fileItem.name,
            error: `Memória insuficiente ao ler o arquivo "${fileItem.name}".`,
          }
        }

        return {
          success: false,
          errorCode: 'PARSE_ERROR',
          failingFile: fileItem.name,
          error: `Não foi possível carregar o arquivo "${fileItem.name}". (${message})`,
        }
      }

      // Detectar assinaturas digitais
      const sigCheck = detectDigitalSignatures(sourceDoc)
      if (sigCheck.state === 'error') {
        return {
          success: false,
          errorCode: 'SIGNATURE_CHECK_ERROR',
          failingFile: fileItem.name,
          error: `Falha na verificação de assinaturas digitais do arquivo "${fileItem.name}". O processamento foi interrompido por segurança. (${sigCheck.error || 'Erro interno na estrutura do PDF'})`,
        }
      }

      if (sigCheck.state === 'detected' && !allowSignedDocuments) {
        return {
          success: false,
          errorCode: 'SIGNATURE_DETECTED',
          failingFile: fileItem.name,
          error: `Foram detectados indícios de campos de assinatura digital no arquivo "${fileItem.name}". A união de documentos invalidaria essa assinatura. Confirmação expressa é obrigatória para prosseguir.`,
        }
      }

      // Notificar etapa de cópia de páginas
      if (onProgress) {
        onProgress({
          phase: 'merging',
          currentFileIndex: i,
          totalFiles: files.length,
          currentFileName: fileItem.name,
        })
      }

      const pageCount = sourceDoc.getPageCount()
      if (pageCount > 0) {
        const pageIndices = sourceDoc.getPageIndices()
        const copiedPages = await mergedDoc.copyPages(sourceDoc, pageIndices)
        for (const page of copiedPages) {
          mergedDoc.addPage(page)
        }
        totalPagesMerged += pageCount
      }

      // Descarte explícito da referência para permitir GC
      sourceDoc = null
    }

    if (checkCancelled && checkCancelled()) {
      return {
        success: false,
        errorCode: 'CANCELLED',
        error: 'A união dos arquivos foi cancelada pelo usuário.',
      }
    }

    // Notificar etapa de salvamento final
    if (onProgress) {
      onProgress({
        phase: 'saving',
        currentFileIndex: files.length,
        totalFiles: files.length,
        currentFileName: 'Gerando documento final...',
      })
    }

    const mergedBytes = await mergedDoc.save({ useObjectStreams: false })
    const arrayBuffer = mergedBytes.buffer.slice(
      mergedBytes.byteOffset,
      mergedBytes.byteOffset + mergedBytes.byteLength,
    ) as ArrayBuffer

    return {
      success: true,
      mergedBuffer: arrayBuffer,
      pageCount: totalPagesMerged,
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
        error: 'Memória insuficiente no navegador para concluir a geração do PDF unificado.',
      }
    }

    return {
      success: false,
      errorCode: 'GENERIC_ERROR',
      error: `Erro ao unir documentos: ${message}`,
    }
  }
}
