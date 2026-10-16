import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type * as pdfjsLib from 'pdfjs-dist'
import {
  ArrowLeft,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Info,
  ShieldCheck,
  Ban,
  Trash2,
  CheckSquare,
  Square,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { validateSinglePdf } from '@/lib/pdf-tools/pdf-merger'
import {
  type PageRotationMap,
  type RotatePdfProgressUpdate,
  normalizeAngle,
} from '@/lib/pdf-tools/pdf-rotator'
import { executePdfRotate, type RotateExecutionHandle } from '@/lib/pdf-tools/rotate-client'
import {
  loadPdfJsDocument,
  getDocumentOriginalRotations,
} from '@/lib/pdf-tools/pdf-thumbnail-service'
import { PageThumbnailCard } from '@/components/pdf-tools/PageThumbnailCard'

interface SelectedDocument {
  file: File
  name: string
  size: number
  buffer: ArrayBuffer
  pageCount: number
  validationStatus: 'valid' | 'invalid'
  hasSignature: boolean
  errorMessage?: string
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function RotacionarPdf() {
  const [doc, setDoc] = useState<SelectedDocument | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isValidatingFile, setIsValidatingFile] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<RotatePdfProgressUpdate | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)

  // Estado do PDF.js
  const [pdfJsDoc, setPdfJsDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [originalRotations, setOriginalRotations] = useState<number[]>([])
  const [thumbnailLoadError, setThumbnailLoadError] = useState<string | null>(null)

  // Seleção de páginas e rotações aplicadas
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [pageRotations, setPageRotations] = useState<PageRotationMap>({})

  // Resultado
  const [rotatedBlobUrl, setRotatedBlobUrl] = useState<string | null>(null)
  const [outputFileName, setOutputFileName] = useState<string>('documento-rotacionado.pdf')
  const [resultTotalPages, setResultTotalPages] = useState<number>(0)
  const [resultModifiedPages, setResultModifiedPages] = useState<number>(0)
  const [resultHasSignature, setResultHasSignature] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const rotateHandleRef = useRef<RotateExecutionHandle | null>(null)

  // Limpeza de Blob URLs e instâncias ao desmontar
  useEffect(() => {
    return () => {
      if (rotatedBlobUrl) {
        URL.revokeObjectURL(rotatedBlobUrl)
      }
      if (rotateHandleRef.current) {
        rotateHandleRef.current.cancel()
      }
      if (pdfJsDoc) {
        try {
          pdfJsDoc.destroy()
        } catch {
          // ignora
        }
      }
    }
  }, [rotatedBlobUrl, pdfJsDoc])

  const cleanupOutput = () => {
    if (rotatedBlobUrl) {
      URL.revokeObjectURL(rotatedBlobUrl)
      setRotatedBlobUrl(null)
    }
  }

  // Manipular seleção do arquivo
  const handleFileSelected = async (file: File) => {
    setErrorMessage(null)
    setThumbnailLoadError(null)
    cleanupOutput()
    setSignatureConfirmed(false) // Redefinir confirmação de assinatura
    setSelectedPages(new Set())
    setPageRotations({})
    setIsValidatingFile(true)

    if (pdfJsDoc) {
      try {
        pdfJsDoc.destroy()
      } catch {
        // ignora
      }
      setPdfJsDoc(null)
    }

    try {
      const buffer = await file.arrayBuffer()
      const validation = await validateSinglePdf(file.name, buffer)

      if (!validation.valid) {
        setDoc({
          file,
          name: file.name,
          size: file.size,
          buffer,
          pageCount: 0,
          validationStatus: 'invalid',
          hasSignature: false,
          errorMessage: validation.error || 'Arquivo inválido.',
        })
        setIsValidatingFile(false)
        return
      }

      const pages = validation.pageCount || 1
      setDoc({
        file,
        name: file.name,
        size: file.size,
        buffer,
        pageCount: pages,
        validationStatus: 'valid',
        hasSignature: Boolean(validation.hasSignature),
      })

      // Tenta carregar PDF.js para renderização das miniaturas
      try {
        const loadedPdf = await loadPdfJsDocument(buffer)
        setPdfJsDoc(loadedPdf)
        const origRots = await getDocumentOriginalRotations(loadedPdf)
        setOriginalRotations(origRots)
      } catch (pdfJsErr: unknown) {
        console.error('[RotacionarPdf] Falha técnica ao inicializar miniaturas PDF.js:', pdfJsErr)
        if (pdfJsErr instanceof Error && pdfJsErr.stack) {
          console.debug('[RotacionarPdf] Stack trace do erro de inicialização:', pdfJsErr.stack)
        }
        setThumbnailLoadError(
          'Não foi possível inicializar as miniaturas visuais deste documento. A rotação continuará disponível normalmente.',
        )
      }
    } catch (err) {
      setDoc({
        file,
        name: file.name,
        size: file.size,
        buffer: new ArrayBuffer(0),
        pageCount: 0,
        validationStatus: 'invalid',
        hasSignature: false,
        errorMessage: `Erro ao ler arquivo: ${err instanceof Error ? err.message : 'Falha desconhecida'}`,
      })
    } finally {
      setIsValidatingFile(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileSelected(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFileSelected(e.target.files[0])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Estatística: total de páginas modificadas
  const modifiedPagesCount = useMemo(() => {
    let count = 0
    for (const pageNum in pageRotations) {
      if (normalizeAngle(pageRotations[pageNum]) !== 0) {
        count++
      }
    }
    return count
  }, [pageRotations])

  // Ações de seleção de páginas
  const handleToggleSelectPage = useCallback((pageNumber: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev)
      if (next.has(pageNumber)) {
        next.delete(pageNumber)
      } else {
        next.add(pageNumber)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (!doc) return
    const all = new Set<number>()
    for (let i = 1; i <= doc.pageCount; i++) {
      all.add(i)
    }
    setSelectedPages(all)
  }, [doc])

  const handleDeselectAll = useCallback(() => {
    setSelectedPages(new Set())
  }, [])

  // Ações de rotação individual e em lote
  const rotatePage = useCallback((pageNumber: number, delta: number) => {
    setPageRotations((prev) => {
      const current = prev[pageNumber] || 0
      const nextAngle = normalizeAngle(current + delta)
      return {
        ...prev,
        [pageNumber]: nextAngle,
      }
    })
  }, [])

  const rotateSelectedPages = useCallback(
    (delta: number) => {
      if (!doc) return
      // Se nenhuma página estiver selecionada, atua sobre TODAS as páginas
      const targets =
        selectedPages.size > 0
          ? Array.from(selectedPages)
          : Array.from({ length: doc.pageCount }, (_, i) => i + 1)

      setPageRotations((prev) => {
        const next = { ...prev }
        for (const pageNum of targets) {
          const current = next[pageNum] || 0
          next[pageNum] = normalizeAngle(current + delta)
        }
        return next
      })
    },
    [doc, selectedPages],
  )

  // Restaurar rotações de todas as páginas às orientações originais
  const handleResetRotations = useCallback(() => {
    setPageRotations({})
  }, [])

  // Executar processamento de rotação
  const handleProcessRotation = async () => {
    if (!doc) {
      setErrorMessage('Selecione um arquivo PDF para rotacionar.')
      return
    }

    if (doc.validationStatus === 'invalid') {
      setErrorMessage(
        doc.errorMessage ||
          'O arquivo selecionado é inválido ou está protegido por senha. Selecione outro documento.',
      )
      return
    }

    if (doc.hasSignature && !signatureConfirmed) {
      setErrorMessage(
        'O documento possui indícios de assinatura digital. É obrigatório confirmar a declaração de ciência para prosseguir.',
      )
      return
    }

    setErrorMessage(null)
    cleanupOutput()
    setIsProcessing(true)
    setProgress({
      phase: 'validating',
      currentPage: 0,
      totalPages: doc.pageCount,
      currentLabel: 'Iniciando verificação do documento...',
    })

    const handle = executePdfRotate({
      fileName: doc.name,
      buffer: doc.buffer,
      rotations: pageRotations,
      allowSignedDocument: doc.hasSignature && signatureConfirmed,
      onProgress: (p) => {
        setProgress(p)
      },
    })

    rotateHandleRef.current = handle

    try {
      const result = await handle.promise
      setIsProcessing(false)
      rotateHandleRef.current = null

      if (result.success && result.rotatedBuffer) {
        const blob = new Blob([result.rotatedBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setRotatedBlobUrl(url)
        setOutputFileName(result.fileName || 'documento-rotacionado.pdf')
        setResultTotalPages(result.totalOriginalPages)
        setResultModifiedPages(result.totalModifiedPages)
        setResultHasSignature(result.hasSignedDocument)
        setProgress(null)
      } else {
        setErrorMessage(result.error || 'Ocorreu um erro ao rotacionar o documento.')
        setProgress(null)
      }
    } catch (err) {
      setIsProcessing(false)
      rotateHandleRef.current = null
      setProgress(null)
      setErrorMessage(
        `Erro inesperado durante a rotação: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  const handleCancelProcess = () => {
    if (rotateHandleRef.current) {
      rotateHandleRef.current.cancel()
      rotateHandleRef.current = null
    }
    setIsProcessing(false)
    setProgress(null)
    setErrorMessage('Operação cancelada pelo usuário. Nenhum arquivo foi gerado.')
  }

  // Iniciar nova operação
  const handleResetForNewOperation = () => {
    cleanupOutput()
    if (pdfJsDoc) {
      try {
        pdfJsDoc.destroy()
      } catch {
        // ignora
      }
      setPdfJsDoc(null)
    }
    setDoc(null)
    setErrorMessage(null)
    setProgress(null)
    setSignatureConfirmed(false)
    setSelectedPages(new Set())
    setPageRotations({})
    setOriginalRotations([])
    setThumbnailLoadError(null)
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12 max-w-6xl mx-auto">
      {/* Botão Voltar e Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link
          to="/ferramentas-pdf"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#C9922A] transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Ferramentas PDF
        </Link>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#C9922A]/10 border border-[#C9922A]/20 rounded-lg">
            <RotateCw className="w-6 h-6 text-[#C9922A]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Rotacionar PDF
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Gire páginas específicas ou o documento inteiro.
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de Erro Geral */}
      {errorMessage && (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <Ban className="w-4 h-4" />
          <AlertTitle className="font-semibold">Atenção</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm mt-1">{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* SEÇÃO 1: SELEÇÃO DO DOCUMENTO */}
      {!doc ? (
        <Card className="border-border bg-card/90 shadow-sm rounded-xl">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg font-bold text-foreground">
              Selecionar documento PDF
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Envie o documento que deseja rotacionar. Todo o processamento ocorre no seu navegador
              com total privacidade.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-[#C9922A] bg-[#C9922A]/10'
                  : 'border-border/80 hover:border-[#C9922A]/60 bg-muted/20 hover:bg-muted/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleInputChange}
              />
              <div className="p-4 rounded-full bg-[#C9922A]/10 text-[#C9922A] ring-1 ring-[#C9922A]/20">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">
                  Arraste o arquivo PDF aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: PDF nativo (.pdf). Sem limites de páginas ou tamanho.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 border-[#C9922A]/40 text-[#C9922A] hover:bg-[#C9922A]/10"
              >
                Procurar no computador
              </Button>
            </div>

            {isValidatingFile && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-[#C9922A]" />
                <span>Validando integridade do documento...</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Card do Arquivo Carregado */
        <Card className="border-border bg-card/90 shadow-sm rounded-xl">
          <CardHeader className="p-5 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                    doc.validationStatus === 'valid'
                      ? 'bg-[#C9922A]/10 text-[#C9922A]'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground leading-snug break-all">
                    {doc.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span>{formatBytes(doc.size)}</span>
                    <span>•</span>
                    <span>{doc.pageCount} página(s)</span>
                    <span>•</span>
                    <span
                      className={`font-medium ${
                        doc.validationStatus === 'valid'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-destructive'
                      }`}
                    >
                      {doc.validationStatus === 'valid' ? 'Arquivo válido' : 'Arquivo com erro'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="text-xs"
                >
                  Substituir
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handleInputChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetForNewOperation}
                  disabled={isProcessing}
                  className="text-xs text-muted-foreground hover:text-destructive"
                  title="Remover documento"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Erro de Validação do Arquivo */}
          {doc.validationStatus === 'invalid' && (
            <CardContent className="p-5 pt-0">
              <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
                <Ban className="w-4 h-4" />
                <AlertTitle className="font-semibold">Documento bloqueado</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm mt-1">
                  {doc.errorMessage || 'O arquivo selecionado não pôde ser validado.'}
                </AlertDescription>
              </Alert>
            </CardContent>
          )}

          {/* Aviso e Confirmação de Assinatura Digital */}
          {doc.validationStatus === 'valid' && doc.hasSignature && (
            <CardContent className="p-5 pt-0">
              <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="font-semibold text-amber-900 dark:text-amber-200">
                  Indícios de Assinatura Digital Detectados
                </AlertTitle>
                <AlertDescription className="text-xs sm:text-sm mt-1 space-y-2">
                  <p>
                    Foram identificados campos de assinatura digital (/Sig) neste documento. A
                    rotação de páginas altera a estrutura binária do arquivo e{' '}
                    <strong>pode comprometer a validade criptográfica</strong> das assinaturas
                    existentes.
                  </p>
                  <p>
                    O documento original permanecerá intacto no seu computador. O PDF gerado será
                    uma cópia derivada devidamente identificada.
                  </p>
                  <div className="pt-2 flex items-start gap-2.5">
                    <Checkbox
                      id="signature-confirm"
                      checked={signatureConfirmed}
                      onCheckedChange={(checked) => setSignatureConfirmed(Boolean(checked))}
                      className="mt-0.5 border-amber-600 data-[state=checked]:bg-[#C9922A] data-[state=checked]:border-[#C9922A]"
                    />
                    <label
                      htmlFor="signature-confirm"
                      className="text-xs sm:text-sm leading-snug cursor-pointer font-medium select-none text-foreground"
                    >
                      Estou ciente de que o PDF resultante poderá não preservar a validade
                      criptográfica das assinaturas digitais e desejo gerar uma cópia derivada.
                    </label>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          )}

          {/* Aviso pontual caso haja erro ao carregar miniaturas */}
          {thumbnailLoadError && (
            <CardContent className="p-5 pt-0">
              <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>{thumbnailLoadError}</span>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* SEÇÃO 2: BARRA DE FERRAMENTAS E CONTROLES DE ROTAÇÃO */}
      {doc && doc.validationStatus === 'valid' && (
        <Card className="border-border bg-card/90 shadow-sm rounded-xl">
          <CardHeader className="p-5 pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  Controles de Rotação
                  {modifiedPagesCount > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#C9922A]/10 text-[#C9922A] border border-[#C9922A]/30">
                      {modifiedPagesCount}{' '}
                      {modifiedPagesCount === 1 ? 'página modificada' : 'páginas modificadas'}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  {selectedPages.size > 0
                    ? `Aplicando ações nas ${selectedPages.size} página(s) selecionada(s).`
                    : 'Nenhuma página selecionada individualmente: os botões abaixo aplicarão a todas as páginas.'}
                </CardDescription>
              </div>

              {/* Ações de Seleção Rápida */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isProcessing}
                  className="h-8 text-xs"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1 text-[#C9922A]" />
                  Selecionar todas ({doc.pageCount})
                </Button>
                {selectedPages.size > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={isProcessing}
                    className="h-8 text-xs"
                  >
                    <Square className="w-3.5 h-3.5 mr-1" />
                    Desmarcar seleção
                  </Button>
                )}
                {modifiedPagesCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetRotations}
                    disabled={isProcessing}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Retorna todas as páginas às orientações originais do arquivo"
                  >
                    <Undo2 className="w-3.5 h-3.5 mr-1" />
                    Restaurar originais
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-2">
            <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-xs font-medium text-muted-foreground mr-1">
                Girar {selectedPages.size > 0 ? 'selecionadas:' : 'todas as páginas:'}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => rotateSelectedPages(-90)}
                disabled={isProcessing}
                className="h-8 text-xs hover:border-[#C9922A] hover:text-[#C9922A]"
                title="Girar 90° para a esquerda (anti-horário)"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                90° para a esquerda
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => rotateSelectedPages(90)}
                disabled={isProcessing}
                className="h-8 text-xs hover:border-[#C9922A] hover:text-[#C9922A]"
                title="Girar 90° para a direita (horário)"
              >
                <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                90° para a direita
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => rotateSelectedPages(180)}
                disabled={isProcessing}
                className="h-8 text-xs hover:border-[#C9922A] hover:text-[#C9922A]"
                title="Girar 180°"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                180°
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO 3: GRADE DE MINIATURAS VISUAIS DAS PÁGINAS */}
      {doc && doc.validationStatus === 'valid' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Páginas do Documento ({doc.pageCount})
            </h2>
            <span className="text-xs text-muted-foreground">
              {selectedPages.size} de {doc.pageCount} selecionada(s)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: doc.pageCount }, (_, idx) => {
              const pageNumber = idx + 1
              const origRot = originalRotations[idx] || 0
              const deltaRot = pageRotations[pageNumber] || 0
              const isSelected = selectedPages.has(pageNumber)

              return (
                <PageThumbnailCard
                  key={`page-${pageNumber}`}
                  pageNumber={pageNumber}
                  pdfDoc={pdfJsDoc}
                  originalRotation={origRot}
                  deltaRotation={deltaRot}
                  isSelected={isSelected}
                  onToggleSelect={handleToggleSelectPage}
                  onRotateClockwise={(p) => rotatePage(p, 90)}
                  onRotateCounterClockwise={(p) => rotatePage(p, -90)}
                  disabled={isProcessing}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO 4: AÇÃO DE CONFIRMAÇÃO / PROCESSAMENTO */}
      {doc && doc.validationStatus === 'valid' && !rotatedBlobUrl && (
        <Card className="border-border bg-card/90 shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Pronto para gerar o documento rotacionado
                </p>
                <p className="text-xs text-muted-foreground">
                  {modifiedPagesCount > 0
                    ? `${modifiedPagesCount} página(s) serão rotacionadas. As demais manterão suas orientações originais.`
                    : 'Nenhuma página foi rotacionada ainda. Ajuste as páginas desejadas ou aplique a rotação em todo o documento.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleProcessRotation}
                  disabled={isProcessing || (doc.hasSignature && !signatureConfirmed)}
                  className="bg-[#C9922A] hover:bg-[#B38022] text-white font-medium px-6 shadow-sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-4 h-4 mr-2" />
                      Gerar PDF Rotacionado
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progresso do Processamento */}
            {isProcessing && progress && (
              <div className="mt-5 pt-4 border-t border-border/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{progress.currentLabel}</span>
                  {progress.totalPages > 0 && progress.currentPage > 0 && (
                    <span>
                      {progress.currentPage} / {progress.totalPages}
                    </span>
                  )}
                </div>
                <Progress
                  value={
                    progress.totalPages > 0
                      ? Math.round((progress.currentPage / progress.totalPages) * 100)
                      : 50
                  }
                  className="h-1.5"
                />
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelProcess}
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Cancelar operação
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO 5: SUCESSO E DOWNLOAD */}
      {rotatedBlobUrl && (
        <Card className="border-[#C9922A]/40 bg-[#C9922A]/5 shadow-sm rounded-xl animate-fade-in-up">
          <CardHeader className="p-6 pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#C9922A]/10 text-[#C9922A] ring-1 ring-[#C9922A]/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold text-foreground">
                  Documento rotacionado com sucesso!
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                  O arquivo resultante foi gerado preservando a integridade original das páginas sem
                  qualquer rasterização.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-4">
            <div className="rounded-lg border border-border/80 bg-background/80 p-4 space-y-2 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">Nome do arquivo gerado:</span>
                <span className="font-mono font-medium text-foreground break-all">
                  {outputFileName}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">Total de páginas:</span>
                <span className="font-semibold text-foreground">{resultTotalPages}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">Páginas com rotação modificada:</span>
                <span className="font-semibold text-[#C9922A]">{resultModifiedPages}</span>
              </div>
              {resultHasSignature && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-amber-700 dark:text-amber-400">
                  <span>Natureza do arquivo:</span>
                  <span className="font-medium">Cópia derivada de documento assinado</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={rotatedBlobUrl}
                download={outputFileName}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-[#C9922A] text-white hover:bg-[#B38022] h-10 px-6 shadow-sm no-underline"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF Rotacionado
              </a>

              <Button
                type="button"
                variant="outline"
                onClick={handleResetForNewOperation}
                className="text-xs sm:text-sm"
              >
                Rotacionar outro documento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informativo de Privacidade e Segurança */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5 flex items-center gap-3.5 text-muted-foreground">
        <ShieldCheck className="w-5 h-5 text-[#C9922A] shrink-0" />
        <p className="text-xs sm:text-sm leading-relaxed">
          Processamento estritamente local: os dados dos seus documentos não são transmitidos para
          servidores externos ou bancos de dados, mantendo o sigilo e a privacidade dos processos
          jurídicos.
        </p>
      </div>
    </div>
  )
}
