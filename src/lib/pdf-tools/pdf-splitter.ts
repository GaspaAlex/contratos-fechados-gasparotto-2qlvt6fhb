import { PDFDocument } from 'pdf-lib'
import { validatePdfHeader, detectDigitalSignatures } from './pdf-validator'
import { createZipArchive, type ZipEntryInput } from './zip-builder'

export type SplitMode = 'ranges' | 'extract' | 'all'

export interface PageRange {
  id: string
  start: number
  end: number
}

export interface SplitPdfProgressUpdate {
  phase: 'validating' | 'loading' | 'splitting' | 'packaging'
  currentStep: number
  totalSteps: number
  currentLabel: string
}

export interface GeneratedPdfFile {
  name: string
  buffer: ArrayBuffer
  pageCount: number
  sizeBytes: number
}

export interface SplitPdfResult {
  success: boolean
  files: GeneratedPdfFile[]
  zipBuffer?: ArrayBuffer
  zipName?: string
  totalOriginalPages: number
  totalPagesProcessed: number
  hasSignedDocument: boolean
  error?: string
  errorCode?:
    | 'INVALID_HEADER'
    | 'ENCRYPTED_PDF'
    | 'SIGNATURE_DETECTED'
    | 'SIGNATURE_CHECK_ERROR'
    | 'PARSE_ERROR'
    | 'INVALID_RANGE'
    | 'OUT_OF_MEMORY'
    | 'CANCELLED'
    | 'GENERIC_ERROR'
}

export interface SplitExecutionOptions {
  fileName: string
  buffer: ArrayBuffer
  mode: SplitMode
  ranges?: PageRange[]
  extractPagesString?: string
  allowSignedDocument?: boolean
  onProgress?: (progress: SplitPdfProgressUpdate) => void
  checkCancelled?: () => boolean
}

/**
 * Sanitiza o nome de arquivo base removendo a extensão .pdf e caracteres perigosos.
 */
export function sanitizeBaseName(rawName: string): string {
  const withoutExt = rawName.replace(/\.pdf$/i, '').trim()
  const clean = withoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9_-]/g, '-') // substitui caracteres especiais por hífen
    .replace(/-+/g, '-') // remove hífens duplicados
    .replace(/^-|-$/g, '') // remove hífens nas extremidades
  return clean || 'documento'
}

/**
 * Faz o parse de string de páginas para extração (ex.: "2, 5, 8-10").
 * Retorna array ordenado de páginas base 1 sem duplicidades.
 */
export function parsePageSelection(
  input: string,
  totalAvailablePages: number,
): { valid: boolean; pages: number[]; error?: string } {
  const trimmed = input.trim()
  if (!trimmed) {
    return { valid: false, pages: [], error: 'Informe ao menos uma página ou intervalo.' }
  }

  const parts = trimmed.split(',')
  const pageSet = new Set<number>()

  for (const rawPart of parts) {
    const part = rawPart.trim()
    if (!part) continue

    if (part.includes('-')) {
      const bounds = part.split('-')
      if (bounds.length !== 2) {
        return {
          valid: false,
          pages: [],
          error: `Formato de intervalo inválido: "${part}". Use o formato "início-fim" (ex: 8-10).`,
        }
      }

      const start = parseInt(bounds[0].trim(), 10)
      const end = parseInt(bounds[1].trim(), 10)

      if (isNaN(start) || isNaN(end)) {
        return {
          valid: false,
          pages: [],
          error: `Valores numéricos inválidos no intervalo "${part}".`,
        }
      }

      if (start < 1) {
        return {
          valid: false,
          pages: [],
          error: `A página inicial deve ser maior ou igual a 1 (encontrado: ${start}).`,
        }
      }

      if (start > end) {
        return {
          valid: false,
          pages: [],
          error: `Intervalo inválido: ${start}-${end}. A página inicial deve ser menor ou igual à final.`,
        }
      }

      if (end > totalAvailablePages) {
        return {
          valid: false,
          pages: [],
          error: `O intervalo "${part}" excede o total de ${totalAvailablePages} páginas do documento.`,
        }
      }

      for (let p = start; p <= end; p++) {
        pageSet.add(p)
      }
    } else {
      const pageNum = parseInt(part, 10)
      if (isNaN(pageNum)) {
        return {
          valid: false,
          pages: [],
          error: `Valor de página inválido: "${part}". Informe apenas números e intervalos com hífen.`,
        }
      }

      if (pageNum < 1) {
        return {
          valid: false,
          pages: [],
          error: `Número de página inválido: ${pageNum}. As páginas iniciam em 1.`,
        }
      }

      if (pageNum > totalAvailablePages) {
        return {
          valid: false,
          pages: [],
          error: `A página ${pageNum} não existe no documento (total disponível: ${totalAvailablePages} páginas).`,
        }
      }

      pageSet.add(pageNum)
    }
  }

  if (pageSet.size === 0) {
    return { valid: false, pages: [], error: 'Nenhuma página válida foi selecionada.' }
  }

  // Ordena na ordem original do documento
  const sorted = Array.from(pageSet).sort((a, b) => a - b)
  return { valid: true, pages: sorted }
}

/**
 * Valida lista de intervalos (Modalidade A).
 */
export function validateRangesList(
  ranges: PageRange[],
  totalAvailablePages: number,
): { valid: boolean; error?: string } {
  if (!ranges || ranges.length === 0) {
    return { valid: false, error: 'Configure pelo menos um intervalo de páginas.' }
  }

  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i]
    if (isNaN(r.start) || isNaN(r.end)) {
      return {
        valid: false,
        error: `O intervalo #${i + 1} possui valores numéricos inválidos.`,
      }
    }

    if (r.start < 1) {
      return {
        valid: false,
        error: `No intervalo #${i + 1}, a página inicial deve ser maior ou igual a 1.`,
      }
    }

    if (r.start > r.end) {
      return {
        valid: false,
        error: `No intervalo #${i + 1} (${r.start}-${r.end}), a página inicial não pode ser maior que a final.`,
      }
    }

    if (r.end > totalAvailablePages) {
      return {
        valid: false,
        error: `O intervalo #${i + 1} (${r.start}-${r.end}) ultrapassa o limite de ${totalAvailablePages} páginas do documento.`,
      }
    }
  }

  return { valid: true }
}

/**
 * Executa a divisão do documento PDF no ambiente local.
 *
 * Arquitetura de Eficiência de Memória:
 * 1. Valida cabeçalho %PDF-.
 * 2. Carrega uma única vez o documento de origem usando PDFDocument.load.
 * 3. Faz a checagem preventiva de criptografia e assinaturas digitais.
 * 4. Para cada parte gerada (intervalo, seleção ou página única):
 *    - Cria um novo PDFDocument.
 *    - Copia as páginas específicas com copyPages.
 *    - Salva e converte em ArrayBuffer.
 *    - Descarta o documento derivado intermediário.
 * 5. Se houver múltiplos arquivos (ou modalidade 'all'), empacota em ZIP nativo.
 */
export async function splitPdfLocally(options: SplitExecutionOptions): Promise<SplitPdfResult> {
  const {
    fileName,
    buffer,
    mode,
    ranges = [],
    extractPagesString = '',
    allowSignedDocument = false,
    onProgress,
    checkCancelled,
  } = options

  const isCancelled = () => Boolean(checkCancelled && checkCancelled())

  if (isCancelled()) {
    return {
      success: false,
      files: [],
      totalOriginalPages: 0,
      totalPagesProcessed: 0,
      hasSignedDocument: false,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  // 1. Notificar e checar cabeçalho de bytes
  if (onProgress) {
    onProgress({
      phase: 'validating',
      currentStep: 0,
      totalSteps: 1,
      currentLabel: 'Validando integridade do documento...',
    })
  }

  if (!validatePdfHeader(buffer)) {
    return {
      success: false,
      files: [],
      totalOriginalPages: 0,
      totalPagesProcessed: 0,
      hasSignedDocument: false,
      errorCode: 'INVALID_HEADER',
      error: `O arquivo "${fileName}" não possui cabeçalho válido de documento PDF (%PDF-).`,
    }
  }

  if (isCancelled()) {
    return {
      success: false,
      files: [],
      totalOriginalPages: 0,
      totalPagesProcessed: 0,
      hasSignedDocument: false,
      errorCode: 'CANCELLED',
      error: 'Operação cancelada pelo usuário.',
    }
  }

  // 2. Carregar documento uma única vez
  let sourceDoc: PDFDocument
  try {
    if (onProgress) {
      onProgress({
        phase: 'loading',
        currentStep: 0,
        totalSteps: 1,
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
        files: [],
        totalOriginalPages: 0,
        totalPagesProcessed: 0,
        hasSignedDocument: false,
        errorCode: 'ENCRYPTED_PDF',
        error: `O arquivo "${fileName}" está protegido por senha ou criptografia. O sistema não suporta divisão de PDFs protegidos.`,
      }
    }

    if (
      err instanceof RangeError ||
      msg.toLowerCase().includes('out of memory') ||
      msg.toLowerCase().includes('allocation')
    ) {
      return {
        success: false,
        files: [],
        totalOriginalPages: 0,
        totalPagesProcessed: 0,
        hasSignedDocument: false,
        errorCode: 'OUT_OF_MEMORY',
        error: 'Memória insuficiente para carregar o arquivo PDF no navegador.',
      }
    }

    return {
      success: false,
      files: [],
      totalOriginalPages: 0,
      totalPagesProcessed: 0,
      hasSignedDocument: false,
      errorCode: 'PARSE_ERROR',
      error: `Não foi possível ler o documento PDF: ${msg}`,
    }
  }

  // 3. Verificação preventiva de assinaturas digitais
  const sigResult = detectDigitalSignatures(sourceDoc)
  if (sigResult.state === 'error') {
    return {
      success: false,
      files: [],
      totalOriginalPages: 0,
      totalPagesProcessed: 0,
      hasSignedDocument: false,
      errorCode: 'SIGNATURE_CHECK_ERROR',
      error: `Falha na verificação de assinaturas digitais do arquivo "${fileName}". Por segurança, o arquivo não pôde ser validado e não poderá ser dividido. (${sigResult.error || 'Erro estrutural'})`,
    }
  }

  const hasSignature = sigResult.state === 'detected'
  if (hasSignature && !allowSignedDocument) {
    return {
      success: false,
      files: [],
      totalOriginalPages: sourceDoc.getPageCount(),
      totalPagesProcessed: 0,
      hasSignedDocument: true,
      errorCode: 'SIGNATURE_DETECTED',
      error:
        'Foram detectados indícios de assinatura digital no documento. A divisão poderá invalidar a autenticidade criptográfica. Confirmação expressa é necessária para prosseguir.',
    }
  }

  const totalPages = sourceDoc.getPageCount()
  if (totalPages === 0) {
    return {
      success: false,
      files: [],
      totalOriginalPages: 0,
      totalPagesProcessed: 0,
      hasSignedDocument: hasSignature,
      errorCode: 'GENERIC_ERROR',
      error: 'O documento PDF não contém nenhuma página.',
    }
  }

  const baseSanitized = sanitizeBaseName(fileName)

  // 4. Mapear divisões de acordo com a modalidade
  interface PlanItem {
    outFileName: string
    pageIndices0: number[] // 0-based
  }

  const splitPlan: PlanItem[] = []

  if (mode === 'ranges') {
    const rangeCheck = validateRangesList(ranges, totalPages)
    if (!rangeCheck.valid) {
      return {
        success: false,
        files: [],
        totalOriginalPages: totalPages,
        totalPagesProcessed: 0,
        hasSignedDocument: hasSignature,
        errorCode: 'INVALID_RANGE',
        error: rangeCheck.error,
      }
    }

    for (const r of ranges) {
      const indices: number[] = []
      for (let p = r.start; p <= r.end; p++) {
        indices.push(p - 1)
      }
      splitPlan.push({
        outFileName: `${baseSanitized}-paginas-${r.start}-${r.end}.pdf`,
        pageIndices0: indices,
      })
    }
  } else if (mode === 'extract') {
    const parseResult = parsePageSelection(extractPagesString, totalPages)
    if (!parseResult.valid) {
      return {
        success: false,
        files: [],
        totalOriginalPages: totalPages,
        totalPagesProcessed: 0,
        hasSignedDocument: hasSignature,
        errorCode: 'INVALID_RANGE',
        error: parseResult.error,
      }
    }

    const indices = parseResult.pages.map((p) => p - 1)
    splitPlan.push({
      outFileName: `${baseSanitized}-extraido.pdf`,
      pageIndices0: indices,
    })
  } else if (mode === 'all') {
    for (let p = 1; p <= totalPages; p++) {
      splitPlan.push({
        outFileName: `${baseSanitized}-pagina-${p}.pdf`,
        pageIndices0: [p - 1],
      })
    }
  }

  if (splitPlan.length === 0) {
    return {
      success: false,
      files: [],
      totalOriginalPages: totalPages,
      totalPagesProcessed: 0,
      hasSignedDocument: hasSignature,
      errorCode: 'GENERIC_ERROR',
      error: 'Nenhuma parte configurada para divisão.',
    }
  }

  // 5. Executar geração sequencial de cada parte
  const generatedFiles: GeneratedPdfFile[] = []
  let totalProcessedPagesCount = 0

  try {
    for (let i = 0; i < splitPlan.length; i++) {
      if (isCancelled()) {
        return {
          success: false,
          files: [],
          totalOriginalPages: totalPages,
          totalPagesProcessed: 0,
          hasSignedDocument: hasSignature,
          errorCode: 'CANCELLED',
          error: 'Operação cancelada pelo usuário.',
        }
      }

      const plan = splitPlan[i]

      if (onProgress) {
        onProgress({
          phase: 'splitting',
          currentStep: i + 1,
          totalSteps: splitPlan.length,
          currentLabel:
            splitPlan.length === 1
              ? 'Gerando novo documento com as páginas selecionadas...'
              : `Processando parte ${i + 1} de ${splitPlan.length} (${plan.outFileName})...`,
        })
      }

      // Criar documento derivado
      const subDoc = await PDFDocument.create()
      const copied = await subDoc.copyPages(sourceDoc, plan.pageIndices0)
      for (const page of copied) {
        subDoc.addPage(page)
      }

      const subBytes = await subDoc.save({ useObjectStreams: false })
      const subArrayBuffer = subBytes.buffer.slice(
        subBytes.byteOffset,
        subBytes.byteOffset + subBytes.byteLength,
      ) as ArrayBuffer

      generatedFiles.push({
        name: plan.outFileName,
        buffer: subArrayBuffer,
        pageCount: plan.pageIndices0.length,
        sizeBytes: subArrayBuffer.byteLength,
      })

      totalProcessedPagesCount += plan.pageIndices0.length
    }

    if (isCancelled()) {
      return {
        success: false,
        files: [],
        totalOriginalPages: totalPages,
        totalPagesProcessed: 0,
        hasSignedDocument: hasSignature,
        errorCode: 'CANCELLED',
        error: 'Operação cancelada pelo usuário.',
      }
    }

    // 6. Empacotamento em ZIP se houver múltiplos PDFs
    let zipBuffer: ArrayBuffer | undefined
    let zipName: string | undefined

    if (generatedFiles.length > 1) {
      if (onProgress) {
        onProgress({
          phase: 'packaging',
          currentStep: splitPlan.length,
          totalSteps: splitPlan.length,
          currentLabel: `Empacotando ${generatedFiles.length} arquivos no formato ZIP...`,
        })
      }

      const zipEntries: ZipEntryInput[] = generatedFiles.map((gf) => ({
        name: gf.name,
        data: gf.buffer,
      }))

      zipBuffer = createZipArchive(zipEntries)
      zipName =
        mode === 'all' ? `${baseSanitized}-paginas-separadas.zip` : `${baseSanitized}-dividido.zip`
    }

    return {
      success: true,
      files: generatedFiles,
      zipBuffer,
      zipName,
      totalOriginalPages: totalPages,
      totalPagesProcessed: totalProcessedPagesCount,
      hasSignedDocument: hasSignature,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      err instanceof RangeError ||
      msg.toLowerCase().includes('out of memory') ||
      msg.toLowerCase().includes('allocation')
    ) {
      return {
        success: false,
        files: [],
        totalOriginalPages: totalPages,
        totalPagesProcessed: 0,
        hasSignedDocument: hasSignature,
        errorCode: 'OUT_OF_MEMORY',
        error: 'Memória insuficiente no navegador durante a geração dos PDFs.',
      }
    }

    return {
      success: false,
      files: [],
      totalOriginalPages: totalPages,
      totalPagesProcessed: 0,
      hasSignedDocument: hasSignature,
      errorCode: 'GENERIC_ERROR',
      error: `Erro ao dividir documento: ${msg}`,
    }
  }
}
