import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'
import { validatePdfHeader, detectDigitalSignatures } from './pdf-validator'
import { loadPdfJsDocument } from './pdf-thumbnail-service'

export interface ExtendedPdfValidationResult {
  valid: boolean
  mode: 'standard' | 'derivative'
  canUseDerivativeCopy: boolean
  isEncrypted: boolean
  needsRealPassword?: boolean
  hasSignature?: boolean
  error?: string
  errorCode?:
    | 'INVALID_HEADER'
    | 'ENCRYPTED_WITH_PASSWORD'
    | 'ENCRYPTED_PDF'
    | 'SIGNATURE_CHECK_ERROR'
    | 'PARSE_ERROR'
    | 'OUT_OF_MEMORY'
    | 'RESTRICTED_PERMISSIONS'
  pageCount?: number
  permissions?: {
    print?: boolean
    modify?: boolean
    copy?: boolean
    assemble?: boolean
  }
}

/**
 * Validação aprofundada para o fluxo de Juntar PDF.
 * Testa primeiramente se o PDF pode ser carregado nativamente pelo pdf-lib (modo 'standard').
 * Se o pdf-lib rejeitar com EncryptedPDFError, testa se o PDF.js consegue abri-lo
 * com senha vazia (criptografia interna/permissões sem senha de abertura do usuário).
 *
 * Se o PDF.js também exigir senha real (PasswordResponses.NEED_PASSWORD),
 * bloqueia informando que há senha de abertura.
 */
export async function validatePdfForMerge(
  fileName: string,
  buffer: ArrayBuffer,
): Promise<ExtendedPdfValidationResult> {
  // 1. Cabeçalho %PDF-
  if (!validatePdfHeader(buffer)) {
    return {
      valid: false,
      mode: 'standard',
      canUseDerivativeCopy: false,
      isEncrypted: false,
      errorCode: 'INVALID_HEADER',
      error: `O arquivo "${fileName}" não possui uma estrutura válida de documento PDF (cabeçalho %PDF- não encontrado).`,
    }
  }

  // 2. Tentar carregar com pdf-lib (SEM ignoreEncryption: true)
  let standardPdfDoc: PDFDocument | null = null
  let isPdfLibEncrypted = false

  try {
    standardPdfDoc = await PDFDocument.load(buffer, {
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
      isPdfLibEncrypted = true
    } else if (
      err instanceof RangeError ||
      message.toLowerCase().includes('out of memory') ||
      message.toLowerCase().includes('allocation')
    ) {
      return {
        valid: false,
        mode: 'standard',
        canUseDerivativeCopy: false,
        isEncrypted: false,
        errorCode: 'OUT_OF_MEMORY',
        error: `Memória insuficiente ao carregar o arquivo "${fileName}". Tente processar menos arquivos ou reduza o tamanho.`,
      }
    } else {
      return {
        valid: false,
        mode: 'standard',
        canUseDerivativeCopy: false,
        isEncrypted: false,
        errorCode: 'PARSE_ERROR',
        error: `Não foi possível carregar o arquivo "${fileName}". O conteúdo pode estar corrompido ou em formato incompatível. (${message})`,
      }
    }
  }

  // 3. Se o pdf-lib carregou com sucesso, checa assinaturas e retorna modo 'standard'
  if (standardPdfDoc && !isPdfLibEncrypted) {
    const sigCheck = detectDigitalSignatures(standardPdfDoc)
    if (sigCheck.state === 'error') {
      return {
        valid: false,
        mode: 'standard',
        canUseDerivativeCopy: false,
        isEncrypted: false,
        errorCode: 'SIGNATURE_CHECK_ERROR',
        error: `Falha na verificação de assinaturas digitais do arquivo "${fileName}". (${sigCheck.error || 'Erro interno na estrutura'})`,
      }
    }

    return {
      valid: true,
      mode: 'standard',
      canUseDerivativeCopy: false,
      isEncrypted: false,
      hasSignature: sigCheck.state === 'detected',
      pageCount: standardPdfDoc.getPageCount(),
    }
  }

  // 4. Se o pdf-lib acusou criptografia: testar via PDF.js com senha vazia
  try {
    const pdfJsDoc = await loadPdfJsDocument(buffer)
    const pageCount = pdfJsDoc.numPages

    // Verificar se há assinaturas através de anotações /Sig no PDF.js
    let hasSigFromPdfJs = false
    try {
      for (let p = 1; p <= Math.min(pageCount, 10); p++) {
        const page = await pdfJsDoc.getPage(p)
        const annotations = await page.getAnnotations()
        if (
          annotations &&
          annotations.some(
            (a: { subtype?: string; fieldType?: string }) =>
              a.subtype === 'Widget' && a.fieldType === 'Sig',
          )
        ) {
          hasSigFromPdfJs = true
          break
        }
      }
    } catch {
      // Falha não crítica na inspeção de anotações
    }

    // Verificar permissões declaradas no PDF.js
    let permFlags: { print?: boolean; modify?: boolean; copy?: boolean; assemble?: boolean } = {
      print: true,
      modify: false,
      copy: false,
      assemble: false,
    }

    try {
      if (typeof pdfJsDoc.getPermissions === 'function') {
        const perms = (await pdfJsDoc.getPermissions()) as unknown
        if (Array.isArray(perms)) {
          permFlags = {
            print: perms.includes(4) || perms.includes(2048),
            modify: perms.includes(8),
            copy: perms.includes(16),
            assemble: perms.includes(1024),
          }
        } else if (perms && typeof perms === 'object' && perms instanceof Set) {
          const permArray = Array.from(perms as Set<number>)
          permFlags = {
            print: permArray.includes(4) || permArray.includes(2048),
            modify: permArray.includes(8),
            copy: permArray.includes(16),
            assemble: permArray.includes(1024),
          }
        }
      }
    } catch {
      // Ignora erro em getPermissions
    }

    // O PDF abriu sem senha no PDF.js -> elegível para o fluxo alternativo "Gerar cópia derivada e unir"
    return {
      valid: true,
      mode: 'derivative',
      canUseDerivativeCopy: true,
      isEncrypted: true,
      needsRealPassword: false,
      hasSignature: hasSigFromPdfJs,
      pageCount,
      permissions: permFlags,
    }
  } catch (pdfJsErr: unknown) {
    const errorMsg = pdfJsErr instanceof Error ? pdfJsErr.message : String(pdfJsErr)
    const errName = pdfJsErr instanceof Error ? pdfJsErr.name : ''

    // Se o PDF.js solicitar senha real (PasswordException)
    if (
      errName === 'PasswordException' ||
      errorMsg.toLowerCase().includes('password') ||
      errorMsg.toLowerCase().includes('need_password')
    ) {
      return {
        valid: false,
        mode: 'standard',
        canUseDerivativeCopy: false,
        isEncrypted: true,
        needsRealPassword: true,
        errorCode: 'ENCRYPTED_WITH_PASSWORD',
        error: `O arquivo "${fileName}" está protegido por uma senha de abertura. Digitação ou quebra de senha não é suportada por segurança.`,
      }
    }

    return {
      valid: false,
      mode: 'standard',
      canUseDerivativeCopy: false,
      isEncrypted: true,
      errorCode: 'ENCRYPTED_PDF',
      error: `O arquivo "${fileName}" possui criptografia ou proteção incompatível com o processador de documentos. (${errorMsg})`,
    }
  }
}
