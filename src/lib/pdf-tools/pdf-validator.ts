export interface FileValidationResult {
  valid: boolean
  error?: string
  hasSignature?: boolean
  isEncrypted?: boolean
  pageCount?: number
}

export interface MergeProgressUpdate {
  phase: 'validating' | 'merging' | 'saving'
  currentFileIndex: number
  totalFiles: number
  currentFileName: string
}

export interface MergeItemInput {
  id: string
  name: string
  size: number
  buffer: ArrayBuffer
}

/**
 * Validação inicial rápida dos bytes para verificar se o arquivo possui
 * a assinatura de cabeçalho padrão de um documento PDF (%PDF-).
 * Não confia apenas na extensão .pdf.
 */
export function validatePdfHeader(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 5) return false
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 1024))
  // O cabeçalho %PDF- (bytes: 0x25, 0x50, 0x44, 0x46, 0x2D)
  // Normalmente está no índice 0, mas por especificação PDF pode começar nos primeiros 1024 bytes.
  for (let i = 0; i <= bytes.length - 5; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return true
    }
  }
  return false
}

/**
 * Detecção preventiva de campos de assinatura digital (/Sig)
 * no AcroForm do PDF ou assinaturas incorporadas no catálogo do documento.
 *
 * IMPORTANTE: Esta checagem identifica indícios técnicos (campos do tipo /Sig)
 * e não realiza validação criptográfica de certificados nem assegura
 * que um documento esteja 100% isento de outros formatos de assinatura.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectDigitalSignatures(pdfDoc: any): boolean {
  try {
    const catalog = pdfDoc.catalog
    if (!catalog) return false

    // 1. Verificar AcroForm através do catálogo
    const acroFormRef = catalog.get(pdfDoc.context.obj('AcroForm'))
    if (acroFormRef) {
      const acroForm = pdfDoc.context.lookup(acroFormRef)
      if (acroForm && typeof acroForm.get === 'function') {
        // Obter os Fields do AcroForm
        const fieldsRef = acroForm.get(pdfDoc.context.obj('Fields'))
        const fields = pdfDoc.context.lookup(fieldsRef)
        if (fields && Array.isArray(fields.array)) {
          for (const fieldRef of fields.array) {
            const field = pdfDoc.context.lookup(fieldRef)
            if (field && typeof field.get === 'function') {
              const ft = field.get(pdfDoc.context.obj('FT'))
              const ftValue = ft ? ft.toString() : ''
              if (ftValue === '/Sig' || ftValue === 'Sig') {
                return true
              }
            }
          }
        }

        // Verificar flag SigFlags (bit 1 ou bit 2 geralmente indicam assinaturas)
        const sigFlags = acroForm.get(pdfDoc.context.obj('SigFlags'))
        if (sigFlags) {
          const flagsVal = Number(sigFlags.toString())
          if (!isNaN(flagsVal) && flagsVal > 0) {
            return true
          }
        }
      }
    }

    // 2. Verificar Perms (permissões com DocMDP/UR/UR3 para assinaturas de certificação)
    const permsRef = catalog.get(pdfDoc.context.obj('Perms'))
    if (permsRef) {
      const perms = pdfDoc.context.lookup(permsRef)
      if (perms && typeof perms.get === 'function') {
        const docMdp = perms.get(pdfDoc.context.obj('DocMDP'))
        if (docMdp) return true
      }
    }

    // 3. Fallback: inspecionar objetos indiretos registrados no contexto para campos FT = /Sig
    if (pdfDoc.context && pdfDoc.context.enumerateIndirectObjects) {
      const entries = pdfDoc.context.enumerateIndirectObjects()
      for (const [, obj] of entries) {
        if (obj && typeof obj.get === 'function') {
          const ft = obj.get(pdfDoc.context.obj('FT'))
          if (ft && (ft.toString() === '/Sig' || ft.toString() === 'Sig')) {
            return true
          }
        }
      }
    }
  } catch (err) {
    console.warn('Aviso na verificação preventiva de assinaturas digitais:', err)
  }

  return false
}
