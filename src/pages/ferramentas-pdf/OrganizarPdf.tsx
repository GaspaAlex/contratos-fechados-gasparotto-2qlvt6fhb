import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type * as pdfjsLib from 'pdfjs-dist'
import {
  ArrowLeft,
  LayoutGrid,
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
  FileX2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { validateSinglePdf } from '@/lib/pdf-tools/pdf-merger'
import { type OrganizePdfProgressUpdate } from '@/lib/pdf-tools/pdf-organizer'
import { executePdfOrganize, type OrganizeExecutionHandle } from '@/lib/pdf-tools/organize-client'
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

export default function OrganizarPdf() {
  const [doc, setDoc] = useState<SelectedDocument | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isValidatingFile, setIsValidatingFile] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<OrganizePdfProgressUpdate | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)

  // Estado do PDF.js para renderização de miniaturas
  const [pdfJsDoc, setPdfJsDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [originalRotations, setOriginalRotations] = useState<number[]>([])
  const [thumbnailLoadError, setThumbnailLoadError] = useState<string | null>(null)

  // Páginas marcadas para EXCLUSÃO (1-based, ex: página 4)
  const [excludedPages, setExcludedPages] = useState<Set<number>>(new Set())

  // Resultado
  const [organizedBlobUrl, setOrganizedBlobUrl] = useState<string | null>(null)
  const [outputFileName, setOutputFileName] = useState<string>('documento-organizado.pdf')
  const [resultTotalPages, setResultTotalPages] = useState<number>(0)
  const [resultExcludedPages, setResultExcludedPages] = useState<number>(0)
  const [resultRemainingPages, setResultRemainingPages] = useState<number>(0)
  const [resultHasSignature, setResultHasSignature] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const organizeHandleRef = useRef<OrganizeExecutionHandle | null>(null)

  // Limpeza de Blob URLs e instâncias ao desmontar
  useEffect(() => {
    return () => {
      if (organizedBlobUrl) {
        URL.revokeObjectURL(organizedBlobUrl)
      }
      if (organizeHandleRef.current) {
        organizeHandleRef.current.cancel()
      }
      if (pdfJsDoc) {
        try {
          pdfJsDoc.destroy()
        } catch {
          // ignora
        }
      }
    }
  }, [organizedBlobUrl, pdfJsDoc])

  const cleanupOutput = () => {
    if (organizedBlobUrl) {
      URL.revokeObjectURL(organizedBlobUrl)
      setOrganizedBlobUrl(null)
    }
  }

  // Manipular seleção do arquivo
  const handleFileSelected = async (file: File) => {
    setErrorMessage(null)
    setThumbnailLoadError(null)
    cleanupOutput()
    setSignatureConfirmed(false) // Redefinir confirmação de assinatura
    setExcludedPages(new Set()) // Redefinir páginas excluídas
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
        console.error('[OrganizarPdf] Falha técnica ao inicializar miniaturas PDF.js:', pdfJsErr)
        if (pdfJsErr instanceof Error && pdfJsErr.stack) {
          console.debug('[OrganizarPdf] Stack trace do erro de inicialização:', pdfJsErr.stack)
        }
        setThumbnailLoadError(
          'Não foi possível inicializar as miniaturas visuais deste documento. A exclusão de páginas continuará disponível normalmente.',
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

  // Estatísticas calculadas
  const totalExcludedCount = excludedPages.size
  const totalRemainingCount = useMemo(() => {
    if (!doc) return 0
    return Math.max(0, doc.pageCount - totalExcludedCount)
  }, [doc, totalExcludedCount])

  const wouldExcludeAll = useMemo(() => {
    if (!doc) return false
    return doc.pageCount > 0 && totalExcludedCount >= doc.pageCount
  }, [doc, totalExcludedCount])

  // Ações de seleção para exclusão
  const handleToggleExcludePage = useCallback((pageNumber: number) => {
    setErrorMessage(null)
    setExcludedPages((prev) => {
      const next = new Set(prev)
      if (next.has(pageNumber)) {
        next.delete(pageNumber)
      } else {
        next.add(pageNumber)
      }
      return next
    })
  }, [])

  /**
   * Marcar todas exceto a última para evitar excluir 100% das páginas,
   * ou se já tiver várias, respeita a regra de que pelo menos 1 deve sobrar.
   */
  const handleSelectAllForExclusion = useCallback(() => {
    if (!doc) return
    if (doc.pageCount <= 1) {
      setErrorMessage(
        'Documentos com apenas 1 página não permitem exclusão, pois nenhuma página restaria.',
      )
      return
    }

    // Seleciona da 1 até N-1 para garantir que a última página permaneça (não permite excluir todas)
    const allExceptLast = new Set<number>()
    for (let i = 1; i < doc.pageCount; i++) {
      allExceptLast.add(i)
    }
    setExcludedPages(allExceptLast)
    setErrorMessage(
      'Todas as páginas foram marcadas para exclusão, exceto a última, para garantir que o PDF resultante contenha ao menos uma página.',
    )
  }, [doc])

  const handleClearExclusion = useCallback(() => {
    setExcludedPages(new Set())
    setErrorMessage(null)
  }, [])

  // Executar processamento de exclusão
  const handleProcessOrganize = async () => {
    if (!doc) {
      setErrorMessage('Selecione um arquivo PDF para organizar.')
      return
    }

    if (doc.validationStatus === 'invalid') {
      setErrorMessage(
        doc.errorMessage ||
          'O arquivo selecionado é inválido ou está protegido por senha. Selecione outro documento.',
      )
      return
    }

    if (excludedPages.size === 0) {
      setErrorMessage('Selecione ao menos uma página para excluir do documento.')
      return
    }

    if (wouldExcludeAll) {
      setErrorMessage(
        'Não é permitido excluir todas as páginas do documento. O PDF resultante precisa conter ao menos uma página.',
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

    const handle = executePdfOrganize({
      fileName: doc.name,
      buffer: doc.buffer,
      excludedPages: Array.from(excludedPages),
      allowSignedDocument: doc.hasSignature && signatureConfirmed,
      onProgress: (p) => {
        setProgress(p)
      },
    })

    organizeHandleRef.current = handle

    try {
      const result = await handle.promise
      setIsProcessing(false)
      organizeHandleRef.current = null

      if (result.success && result.organizedBuffer) {
        const blob = new Blob([result.organizedBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setOrganizedBlobUrl(url)
        setOutputFileName(result.fileName || 'documento-organizado.pdf')
        setResultTotalPages(result.totalOriginalPages)
        setResultExcludedPages(result.totalExcludedPages)
        setResultRemainingPages(result.totalRemainingPages)
        setResultHasSignature(result.hasSignedDocument)
        setProgress(null)
      } else {
        setErrorMessage(result.error || 'Ocorreu um erro ao organizar o documento.')
        setProgress(null)
      }
    } catch (err) {
      setIsProcessing(false)
      organizeHandleRef.current = null
      setProgress(null)
      setErrorMessage(
        `Erro inesperado durante a organização: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  const handleCancelProcess = () => {
    if (organizeHandleRef.current) {
      organizeHandleRef.current.cancel()
      organizeHandleRef.current = null
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
    setExcludedPages(new Set())
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
            <LayoutGrid className="w-6 h-6 text-[#C9922A]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Organizar PDF
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Selecione e exclua páginas específicas dos seus documentos.
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
              Envie o documento do qual deseja excluir páginas. Todo o processamento ocorre no seu
              navegador com total privacidade.
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
                    exclusão de páginas altera a estrutura binária do arquivo e{' '}
                    <strong>pode invalidar a assinatura criptográfica</strong> existente.
                  </p>
                  <p>
                    O documento original permanecerá intacto no seu computador. O PDF resultante
                    será uma cópia derivada devidamente identificada.
                  </p>
                  <div className="pt-2 flex items-start gap-2.5">
                    <Checkbox
                      id="signature-confirm-organize"
                      checked={signatureConfirmed}
                      onCheckedChange={(checked) => setSignatureConfirmed(Boolean(checked))}
                      className="mt-0.5 border-amber-600 data-[state=checked]:bg-[#C9922A] data-[state=checked]:border-[#C9922A]"
                    />
                    <label
                      htmlFor="signature-confirm-organize"
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

      {/* SEÇÃO 2: BARRA DE FERRAMENTAS E CONTROLES DE EXCLUSÃO */}
      {doc && doc.validationStatus === 'valid' && (
        <Card className="border-border bg-card/90 shadow-sm rounded-xl">
          <CardHeader className="p-5 pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  Controles de Exclusão
                  {totalExcludedCount > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30">
                      {totalExcludedCount}{' '}
                      {totalExcludedCount === 1 ? 'página marcada' : 'páginas marcadas'} para
                      exclusão
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Clique nas páginas abaixo que deseja remover. A exclusão definitiva ocorrerá
                  somente quando você confirmar a geração do novo PDF.
                </CardDescription>
              </div>

              {/* Ações de Seleção Rápida */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllForExclusion}
                  disabled={isProcessing || doc.pageCount <= 1}
                  className="h-8 text-xs hover:border-destructive hover:text-destructive"
                  title="Marca páginas para exclusão (preservando ao menos uma)"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1 text-destructive" />
                  Marcar todas ({doc.pageCount - 1})
                </Button>

                {totalExcludedCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearExclusion}
                    disabled={isProcessing}
                    className="h-8 text-xs"
                    title="Limpa todas as marcações de exclusão"
                  >
                    <Square className="w-3.5 h-3.5 mr-1" />
                    Limpar seleção
                  </Button>
                )}

                {totalExcludedCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearExclusion}
                    disabled={isProcessing}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Desmarca todas as exclusões"
                  >
                    <Undo2 className="w-3.5 h-3.5 mr-1" />
                    Manter todas
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Resumo Dinâmico da Seleção */}
          <CardContent className="p-5 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/60 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Original:</span>
                  <span className="font-semibold text-foreground">{doc.pageCount} págs.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">A excluir:</span>
                  <span
                    className={`font-semibold ${
                      totalExcludedCount > 0 ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {totalExcludedCount} págs.
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Restantes:</span>
                  <span
                    className={`font-semibold ${
                      totalRemainingCount > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-destructive'
                    }`}
                  >
                    {totalRemainingCount} págs.
                  </span>
                </div>
              </div>

              {wouldExcludeAll && (
                <div className="text-xs text-destructive font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Não é permitido excluir todas as páginas do documento.</span>
                </div>
              )}
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
              {totalExcludedCount} de {doc.pageCount} marcada(s) para exclusão
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: doc.pageCount }, (_, idx) => {
              const pageNumber = idx + 1
              const origRot = originalRotations[idx] || 0
              const isMarked = excludedPages.has(pageNumber)

              return (
                <PageThumbnailCard
                  key={`page-${pageNumber}`}
                  pageNumber={pageNumber}
                  pdfDoc={pdfJsDoc}
                  originalRotation={origRot}
                  deltaRotation={0}
                  isSelected={isMarked}
                  mode="delete"
                  isMarkedForDeletion={isMarked}
                  onToggleSelect={handleToggleExcludePage}
                  disabled={isProcessing}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO 4: AÇÃO DE CONFIRMAÇÃO / PROCESSAMENTO */}
      {doc && doc.validationStatus === 'valid' && !organizedBlobUrl && (
        <Card className="border-border bg-card/90 shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Confirmação de exclusão e geração
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalExcludedCount > 0 ? (
                    wouldExcludeAll ? (
                      <span className="text-destructive font-medium">
                        Todas as páginas foram marcadas. Desmarque ao menos uma página para poder
                        gerar o PDF.
                      </span>
                    ) : (
                      <span>
                        Documento original com <strong>{doc.pageCount} páginas</strong>. Serão
                        excluídas <strong>{totalExcludedCount} página(s)</strong> (
                        {Array.from(excludedPages)
                          .sort((a, b) => a - b)
                          .map((p) => `Pág. ${p}`)
                          .join(', ')}
                        ). O PDF resultante terá{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {totalRemainingCount} página(s)
                        </strong>{' '}
                        preservando a ordem original.
                      </span>
                    )
                  ) : (
                    'Nenhuma página marcada para exclusão. Clique nas miniaturas acima para marcar as páginas que deseja remover.'
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  type="button"
                  onClick={handleProcessOrganize}
                  disabled={
                    isProcessing ||
                    totalExcludedCount === 0 ||
                    wouldExcludeAll ||
                    (doc.hasSignature && !signatureConfirmed)
                  }
                  className="bg-[#C9922A] hover:bg-[#B38022] text-white font-medium px-6 shadow-sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <FileX2 className="w-4 h-4 mr-2" />
                      Excluir páginas e gerar PDF
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
      {organizedBlobUrl && (
        <Card className="border-[#C9922A]/40 bg-[#C9922A]/5 shadow-sm rounded-xl animate-fade-in-up">
          <CardHeader className="p-6 pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#C9922A]/10 text-[#C9922A] ring-1 ring-[#C9922A]/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold text-foreground">
                  Documento organizado com sucesso!
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                  As páginas selecionadas foram excluídas e o novo arquivo foi gerado preservando a
                  integridade e a ordem exata das páginas restantes.
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
                <span className="text-muted-foreground">Páginas originais:</span>
                <span className="font-semibold text-foreground">{resultTotalPages}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">Páginas excluídas:</span>
                <span className="font-semibold text-destructive">{resultExcludedPages}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">Páginas preservadas:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {resultRemainingPages}
                </span>
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
                href={organizedBlobUrl}
                download={outputFileName}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-[#C9922A] text-white hover:bg-[#B38022] h-10 px-6 shadow-sm no-underline"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF Organizado
              </a>

              <Button
                type="button"
                variant="outline"
                onClick={handleResetForNewOperation}
                className="text-xs sm:text-sm"
              >
                Iniciar nova operação
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
