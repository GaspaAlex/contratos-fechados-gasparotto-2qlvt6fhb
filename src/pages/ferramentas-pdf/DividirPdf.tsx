import { useState, useRef, useEffect, useId } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Scissors,
  Upload,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Info,
  ShieldCheck,
  Ban,
  Plus,
  Trash2,
  FileText,
  Archive,
  Layers,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { validateSinglePdf } from '@/lib/pdf-tools/pdf-merger'
import {
  type SplitMode,
  type PageRange,
  type SplitPdfProgressUpdate,
  type GeneratedPdfFile,
  parsePageSelection,
  validateRangesList,
} from '@/lib/pdf-tools/pdf-splitter'
import { executePdfSplit, type SplitExecutionHandle } from '@/lib/pdf-tools/split-client'

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

export default function DividirPdf() {
  const [doc, setDoc] = useState<SelectedDocument | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isValidatingFile, setIsValidatingFile] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)
  const [progress, setProgress] = useState<SplitPdfProgressUpdate | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)

  // Modalidade de divisão
  const [splitMode, setSplitMode] = useState<SplitMode>('ranges')

  // Modalidade A: Múltiplos Intervalos
  const [ranges, setRanges] = useState<PageRange[]>([{ id: 'range-1', start: 1, end: 1 }])

  // Modalidade B: Extrair Páginas Específicas
  const [extractInput, setExtractInput] = useState('')

  // Resultado
  const [resultFiles, setResultFiles] = useState<GeneratedPdfFile[]>([])
  const [singlePdfUrl, setSinglePdfUrl] = useState<string | null>(null)
  const [zipBlobUrl, setZipBlobUrl] = useState<string | null>(null)
  const [zipFileName, setZipFileName] = useState<string>('documentos-divididos.zip')
  const [totalProcessedPages, setTotalProcessedPages] = useState<number>(0)
  const [resultHasSignedDocs, setResultHasSignedDocs] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const splitHandleRef = useRef<SplitExecutionHandle | null>(null)

  const modeRadioRangesId = useId()
  const modeRadioExtractId = useId()
  const modeRadioAllId = useId()

  // Limpeza de Blob URLs ao desmontar ou trocar resultado
  useEffect(() => {
    return () => {
      if (singlePdfUrl) {
        URL.revokeObjectURL(singlePdfUrl)
      }
      if (zipBlobUrl) {
        URL.revokeObjectURL(zipBlobUrl)
      }
      if (splitHandleRef.current) {
        splitHandleRef.current.cancel()
      }
    }
  }, [singlePdfUrl, zipBlobUrl])

  // Limpar URLs anteriores
  const cleanupUrls = () => {
    if (singlePdfUrl) {
      URL.revokeObjectURL(singlePdfUrl)
      setSinglePdfUrl(null)
    }
    if (zipBlobUrl) {
      URL.revokeObjectURL(zipBlobUrl)
      setZipBlobUrl(null)
    }
  }

  // Manipular seleção do documento
  const handleFileSelected = async (file: File) => {
    setErrorMessage(null)
    cleanupUrls()
    setResultFiles([])
    setSignatureConfirmed(false) // Redefinir confirmação ao substituir
    setIsValidatingFile(true)

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

      // Inicializar intervalos padrão para o documento carregado
      setRanges([
        {
          id: `range-${Date.now()}-1`,
          start: 1,
          end: Math.min(pages, Math.ceil(pages / 2) || 1),
        },
      ])

      // Inicializar sugestão de extração se documento tiver páginas
      if (pages >= 2) {
        setExtractInput(`1, ${pages}`)
      } else {
        setExtractInput('1')
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

  // Ações de intervalos (Modalidade A)
  const addRange = () => {
    if (!doc) return
    const lastRange = ranges[ranges.length - 1]
    const nextStart = lastRange ? Math.min(doc.pageCount, lastRange.end + 1) : 1
    const nextEnd = Math.min(doc.pageCount, nextStart + 4)

    setRanges((prev) => [
      ...prev,
      {
        id: `range-${Date.now()}-${prev.length + 1}`,
        start: nextStart,
        end: Math.max(nextStart, nextEnd),
      },
    ])
  }

  const updateRange = (id: string, field: 'start' | 'end', val: number) => {
    setRanges((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        return {
          ...r,
          [field]: val,
        }
      }),
    )
  }

  const removeRange = (id: string) => {
    if (ranges.length <= 1) return
    setRanges((prev) => prev.filter((r) => r.id !== id))
  }

  // Análise em tempo real da Modalidade B (Extrair páginas específicas)
  const extractAnalysis = (() => {
    if (!doc || doc.pageCount === 0 || !extractInput.trim()) {
      return { valid: false, selectedCount: 0, excludedCount: 0, error: undefined }
    }
    const parsed = parsePageSelection(extractInput, doc.pageCount)
    if (!parsed.valid) {
      return { valid: false, selectedCount: 0, excludedCount: 0, error: parsed.error }
    }
    const selectedCount = parsed.pages.length
    const excludedCount = Math.max(0, doc.pageCount - selectedCount)
    return { valid: true, selectedCount, excludedCount, error: undefined }
  })()

  // Executar Divisão
  const handleSplit = async () => {
    if (!doc) {
      setErrorMessage('Selecione um arquivo PDF para dividir.')
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

    // Validações por modalidade antes da chamada
    if (splitMode === 'ranges') {
      const check = validateRangesList(ranges, doc.pageCount)
      if (!check.valid) {
        setErrorMessage(check.error || 'Intervalos configurados incorretamente.')
        return
      }
    } else if (splitMode === 'extract') {
      const parsed = parsePageSelection(extractInput, doc.pageCount)
      if (!parsed.valid) {
        setErrorMessage(parsed.error || 'Páginas informadas para extração são inválidas.')
        return
      }
    }

    setErrorMessage(null)
    cleanupUrls()
    setIsSplitting(true)
    setProgress({
      phase: 'validating',
      currentStep: 0,
      totalSteps: 1,
      currentLabel: 'Iniciando verificação do documento...',
    })

    const handle = executePdfSplit({
      fileName: doc.name,
      buffer: doc.buffer,
      mode: splitMode,
      ranges,
      extractPagesString: extractInput,
      allowSignedDocument: doc.hasSignature && signatureConfirmed,
      onProgress: (p) => {
        setProgress(p)
      },
    })

    splitHandleRef.current = handle

    try {
      const result = await handle.promise
      setIsSplitting(false)
      splitHandleRef.current = null

      if (result.success) {
        setResultFiles(result.files)
        setTotalProcessedPages(result.totalPagesProcessed)
        setResultHasSignedDocs(result.hasSignedDocument)

        // Se gerou um único PDF (caso de extract ou intervalo único)
        if (result.files.length === 1) {
          const singleBlob = new Blob([result.files[0].buffer], { type: 'application/pdf' })
          setSinglePdfUrl(URL.createObjectURL(singleBlob))
        }

        // Se gerou ZIP (múltiplos PDFs ou separação de todas as páginas)
        if (result.zipBuffer) {
          const zipBlob = new Blob([result.zipBuffer], { type: 'application/zip' })
          setZipBlobUrl(URL.createObjectURL(zipBlob))
          setZipFileName(result.zipName || 'documentos-divididos.zip')
        }

        setProgress(null)
      } else {
        setErrorMessage(result.error || 'Ocorreu um erro ao dividir o documento.')
        setProgress(null)
      }
    } catch (err) {
      setIsSplitting(false)
      splitHandleRef.current = null
      setProgress(null)
      setErrorMessage(
        `Erro inesperado durante a divisão: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // Cancelar
  const handleCancelSplit = () => {
    if (splitHandleRef.current) {
      splitHandleRef.current.cancel()
      splitHandleRef.current = null
    }
    setIsSplitting(false)
    setProgress(null)
    setErrorMessage('Operação cancelada pelo usuário. Nenhum arquivo foi gerado.')
  }

  // Iniciar Nova Operação
  const handleResetForNewOperation = () => {
    cleanupUrls()
    setDoc(null)
    setResultFiles([])
    setErrorMessage(null)
    setProgress(null)
    setSignatureConfirmed(false)
    setResultHasSignedDocs(false)
    setTotalProcessedPages(0)
    setRanges([{ id: 'range-1', start: 1, end: 1 }])
    setExtractInput('')
    setSplitMode('ranges')
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12 max-w-5xl mx-auto">
      {/* Botão Voltar e Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link
          to="/ferramentas-pdf"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-fit group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Voltar para Ferramentas PDF
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#C9922A]/10 border border-[#C9922A]/20 rounded-lg">
              <Scissors className="w-6 h-6 text-[#C9922A]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Dividir PDF
              </h1>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">
                Separe páginas, extraia trechos específicos ou divida o documento em intervalos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta Institucional / Integridade */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex items-start gap-3 text-muted-foreground text-xs leading-relaxed">
        <Info className="w-4 h-4 text-[#C9922A] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">
            Aviso sobre integridade de documentos:
          </span>{' '}
          A divisão de arquivos PDF gera cópias derivadas com as páginas selecionadas. Arquivos
          protegidos por senha não podem ser divididos. Caso o arquivo contenha indícios de
          assinatura digital, o prosseguimento exigirá ciência expressa, pois a divisão não preserva
          a validade criptográfica da assinatura no documento derivado.
        </div>
      </div>

      {/* Mensagem de Erro */}
      {errorMessage && (
        <Alert
          variant="destructive"
          className="border-destructive/40 bg-destructive/10 text-destructive"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Não foi possível concluir a operação</AlertTitle>
          <AlertDescription className="mt-1 text-xs sm:text-sm">
            <p>{errorMessage}</p>
          </AlertDescription>
        </Alert>
      )}

      {/* TELA DE SUCESSO: Download dos Arquivos */}
      {resultFiles.length > 0 && (singlePdfUrl || zipBlobUrl) ? (
        <Card className="border-border bg-card shadow-sm rounded-xl">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
              Documento dividido com sucesso!
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground max-w-md mx-auto">
              {resultFiles.length === 1
                ? 'Seu novo arquivo PDF está pronto para download.'
                : `Foram gerados ${resultFiles.length} arquivos PDF agrupados em um pacote ZIP.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            {/* Detalhes do resultado */}
            <div className="max-w-md mx-auto rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Arquivos gerados:</span>
                <span className="font-semibold text-foreground">
                  {resultFiles.length} arquivo(s)
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Total de páginas processadas:</span>
                <span className="font-semibold text-foreground">{totalProcessedPages} páginas</span>
              </div>
              {doc && (
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Documento original:</span>
                  <span className="font-semibold text-foreground truncate max-w-[220px]">
                    {doc.name}
                  </span>
                </div>
              )}
              {resultHasSignedDocs && (
                <div className="pt-2 border-t border-border/60 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Arquivos gerados como cópias derivadas sem validade criptográfica da assinatura
                  original.
                </div>
              )}
            </div>

            {/* Lista dos arquivos gerados */}
            <div className="max-w-md mx-auto rounded-lg border border-border p-3 divide-y divide-border text-xs">
              <div className="font-semibold text-muted-foreground pb-2 flex items-center justify-between">
                <span>Arquivos resultantes</span>
                <span>{resultFiles.length} total</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-border/60">
                {resultFiles.map((f, idx) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-foreground font-medium flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#C9922A] shrink-0" />
                      {f.name}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {f.pageCount} pág{f.pageCount > 1 ? 's' : ''} • {formatBytes(f.sizeBytes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações de Download */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              {singlePdfUrl && resultFiles.length === 1 && (
                <Button
                  asChild
                  className="w-full sm:w-auto flex-1 bg-[#C9922A] hover:bg-[#b07d1f] text-white font-semibold"
                >
                  <a href={singlePdfUrl} download={resultFiles[0].name}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF ({formatBytes(resultFiles[0].sizeBytes)})
                  </a>
                </Button>
              )}

              {zipBlobUrl && resultFiles.length > 1 && (
                <Button
                  asChild
                  className="w-full sm:w-auto flex-1 bg-[#C9922A] hover:bg-[#b07d1f] text-white font-semibold"
                >
                  <a href={zipBlobUrl} download={zipFileName}>
                    <Archive className="w-4 h-4 mr-2" />
                    Baixar pacote ZIP ({resultFiles.length} PDFs)
                  </a>
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleResetForNewOperation}
                className="w-full sm:w-auto"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Nova divisão
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ÁREA DE CONFIGURAÇÃO E PROCESSAMENTO */
        <div className="space-y-6">
          {/* Zona de Seleção do Documento Único */}
          {!doc ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-xl border-2 border-dashed transition-all p-8 text-center flex flex-col items-center justify-center cursor-pointer ${
                isDragging
                  ? 'border-[#C9922A] bg-[#C9922A]/10 scale-[1.005]'
                  : 'border-border/80 bg-card/60 hover:border-[#C9922A]/50 hover:bg-card'
              }`}
              onClick={() => !isSplitting && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleInputChange}
                disabled={isSplitting || isValidatingFile}
              />

              <div className="p-4 rounded-full bg-[#C9922A]/10 text-[#C9922A] ring-1 ring-[#C9922A]/20 mb-3">
                <Upload className="w-6 h-6" />
              </div>

              <h3 className="text-base font-semibold text-foreground">
                Clique para selecionar ou arraste o arquivo PDF
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md">
                Selecione um arquivo PDF para realizar a divisão por intervalos, extrair páginas
                específicas ou separar página a página.
              </p>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="font-medium"
                  disabled={isSplitting || isValidatingFile}
                >
                  {isValidatingFile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Lendo documento...
                    </>
                  ) : (
                    <>Selecionar PDF</>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Card do Documento Selecionado com Opção de Substituir */
            <Card className="border-border bg-card shadow-sm rounded-xl">
              <CardHeader className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#C9922A]" />
                    Documento selecionado
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Você pode alterar as opções de divisão abaixo ou substituir o documento.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSplitting}
                    className="text-xs h-8"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Substituir PDF
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDoc(null)
                      setErrorMessage(null)
                      setSignatureConfirmed(false)
                    }}
                    disabled={isSplitting}
                    className="text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Remover
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleInputChange}
                  disabled={isSplitting || isValidatingFile}
                />
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate max-w-md">
                        {doc.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        {doc.pageCount} {doc.pageCount === 1 ? 'página' : 'páginas'}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatBytes(doc.size)}</span>
                      {doc.hasSignature && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          Indício de assinatura digital
                        </span>
                      )}
                    </div>

                    {doc.validationStatus === 'invalid' && (
                      <div className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
                        <Ban className="w-3.5 h-3.5 shrink-0" />
                        <span>{doc.errorMessage || 'Arquivo inválido.'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuração das Modalidades de Divisão */}
          {doc && doc.validationStatus === 'valid' && (
            <Card className="border-border bg-card shadow-sm rounded-xl">
              <CardHeader className="p-4 sm:p-5 border-b">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#C9922A]" />
                  Modalidade de divisão
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Escolha como deseja separar as páginas do documento.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-6">
                <RadioGroup
                  value={splitMode}
                  onValueChange={(val) => setSplitMode(val as SplitMode)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3"
                  disabled={isSplitting}
                >
                  {/* Opção 1: Intervalos */}
                  <label
                    htmlFor={modeRadioRangesId}
                    className={`flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      splitMode === 'ranges'
                        ? 'border-[#C9922A] bg-[#C9922A]/5'
                        : 'border-border/70 hover:border-border hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          Dividir por intervalos
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Gere múltiplos PDFs a partir de intervalos configurados (ex: 1-10, 11-20).
                        </p>
                      </div>
                      <RadioGroupItem value="ranges" id={modeRadioRangesId} className="mt-0.5" />
                    </div>
                  </label>

                  {/* Opção 2: Extrair páginas específicas */}
                  <label
                    htmlFor={modeRadioExtractId}
                    className={`flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      splitMode === 'extract'
                        ? 'border-[#C9922A] bg-[#C9922A]/5'
                        : 'border-border/70 hover:border-border hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          Extrair páginas
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Gera UM ÚNICO PDF contendo páginas avulsas e intervalos na ordem original.
                        </p>
                      </div>
                      <RadioGroupItem value="extract" id={modeRadioExtractId} className="mt-0.5" />
                    </div>
                  </label>

                  {/* Opção 3: Separar todas as páginas */}
                  <label
                    htmlFor={modeRadioAllId}
                    className={`flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      splitMode === 'all'
                        ? 'border-[#C9922A] bg-[#C9922A]/5'
                        : 'border-border/70 hover:border-border hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          Separar todas as páginas
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Gera um PDF individual para cada página, empacotados em um único arquivo
                          ZIP.
                        </p>
                      </div>
                      <RadioGroupItem value="all" id={modeRadioAllId} className="mt-0.5" />
                    </div>
                  </label>
                </RadioGroup>

                {/* PAINEL DINÂMICO CONFORME MODALIDADE */}

                {/* MODALIDADE A: MÚLTIPLOS INTERVALOS */}
                {splitMode === 'ranges' && (
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          Configurar intervalos de páginas
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Cada linha abaixo irá gerar um arquivo PDF independente.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addRange}
                        disabled={isSplitting}
                        className="text-xs h-8 border-[#C9922A]/40 text-[#C9922A] hover:bg-[#C9922A]/10"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Adicionar intervalo
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {ranges.map((range, index) => {
                        const isInvalid =
                          range.start < 1 ||
                          range.start > range.end ||
                          range.end > (doc?.pageCount || 1)
                        const pagesInRange = Math.max(0, range.end - range.start + 1)

                        return (
                          <div
                            key={range.id}
                            className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isInvalid
                                ? 'border-destructive/40 bg-destructive/5'
                                : 'border-border bg-muted/20'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-xs font-bold text-muted-foreground w-6">
                                #{index + 1}
                              </span>

                              <div className="flex items-center gap-2 flex-wrap flex-1">
                                <div className="flex items-center gap-1.5">
                                  <Label className="text-xs text-muted-foreground">De:</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={doc.pageCount}
                                    value={isNaN(range.start) ? '' : range.start}
                                    onChange={(e) =>
                                      updateRange(
                                        range.id,
                                        'start',
                                        parseInt(e.target.value, 10) || 0,
                                      )
                                    }
                                    disabled={isSplitting}
                                    className="w-20 h-8 text-xs font-semibold"
                                  />
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <Label className="text-xs text-muted-foreground">Até:</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={doc.pageCount}
                                    value={isNaN(range.end) ? '' : range.end}
                                    onChange={(e) =>
                                      updateRange(
                                        range.id,
                                        'end',
                                        parseInt(e.target.value, 10) || 0,
                                      )
                                    }
                                    disabled={isSplitting}
                                    className="w-20 h-8 text-xs font-semibold"
                                  />
                                </div>

                                <span className="text-xs text-muted-foreground ml-2">
                                  {!isInvalid && (
                                    <>
                                      ({pagesInRange} {pagesInRange === 1 ? 'página' : 'páginas'})
                                    </>
                                  )}
                                  {isInvalid && (
                                    <span className="text-destructive font-medium">
                                      Intervalo inválido
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRange(range.id)}
                              disabled={ranges.length <= 1 || isSplitting}
                              className="text-xs h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 self-end sm:self-auto"
                              title="Remover este intervalo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* MODALIDADE B: EXTRAIR PÁGINAS ESPECÍFICAS */}
                {splitMode === 'extract' && (
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="extract-pages-input"
                        className="text-sm font-semibold text-foreground"
                      >
                        Páginas e intervalos para extração
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Digite números de páginas e intervalos separados por vírgula. Exemplo:{' '}
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                          2, 5, 8-10
                        </span>
                      </p>
                      <Input
                        id="extract-pages-input"
                        placeholder="Ex: 1, 3, 5-8"
                        value={extractInput}
                        onChange={(e) => setExtractInput(e.target.value)}
                        disabled={isSplitting}
                        className="text-sm font-mono mt-1"
                      />
                    </div>

                    {/* Resumo da extração em tempo real */}
                    {extractAnalysis.valid ? (
                      <div className="rounded-lg border border-border bg-muted/20 p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-foreground font-medium">
                            {extractAnalysis.selectedCount} página(s) selecionada(s) para o novo
                            PDF.
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {extractAnalysis.excludedCount} página(s) permanecerão fora do resultado.
                        </span>
                      </div>
                    ) : (
                      extractAnalysis.error && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{extractAnalysis.error}</span>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* MODALIDADE C: SEPARAR TODAS AS PÁGINAS */}
                {splitMode === 'all' && (
                  <div className="pt-2 border-t border-border/60">
                    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <FileSpreadsheet className="w-4 h-4 text-[#C9922A]" />
                        <span>
                          Cada uma das {doc.pageCount} páginas será convertida em um documento PDF
                          separado.
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        Para conveniência e evitar múltiplos downloads individuais, os{' '}
                        {doc.pageCount} arquivos serão reunidos automaticamente em um único pacote{' '}
                        <strong className="text-foreground">ZIP</strong> pronto para descompactação.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bloco de Confirmação Obrigatória para Documento Assinado */}
          {doc && doc.hasSignature && !isSplitting && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <h4 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200 tracking-tight">
                    ATENÇÃO — DOCUMENTO COM ASSINATURA DIGITAL
                  </h4>
                  <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                    Foram detectados indícios de campos de assinatura digital no arquivo
                    selecionado. A divisão do documento poderá comprometer a validade criptográfica
                    das assinaturas digitais. Os arquivos gerados serão cópias derivadas. O
                    documento original permanecerá inalterado.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20">
                <label
                  htmlFor="split-signature-agreement"
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <Checkbox
                    id="split-signature-agreement"
                    checked={signatureConfirmed}
                    onCheckedChange={(checked) => setSignatureConfirmed(checked === true)}
                    className="mt-0.5 border-amber-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                  />
                  <span className="text-xs sm:text-sm font-medium text-amber-950 dark:text-amber-200 leading-normal select-none group-hover:text-amber-900">
                    Estou ciente de que os PDFs gerados poderão não preservar a validade
                    criptográfica das assinaturas digitais e desejo prosseguir com a geração de
                    cópias derivadas.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Painel de Progresso / Em Andamento */}
          {isSplitting && (
            <Card className="border-[#C9922A]/40 bg-[#C9922A]/5 rounded-xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-[#C9922A] animate-spin" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Dividindo documento...
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {progress?.currentLabel || 'Processando páginas...'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleCancelSplit}
                  >
                    Cancelar
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Progress
                    value={
                      progress
                        ? progress.totalSteps > 0
                          ? Math.round((progress.currentStep / progress.totalSteps) * 100)
                          : 50
                        : 0
                    }
                    className="h-2"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>
                      Etapa {progress?.currentStep ?? 0} de {progress?.totalSteps ?? 1}
                    </span>
                    <span>
                      {progress && progress.totalSteps > 0
                        ? Math.round((progress.currentStep / progress.totalSteps) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão de Ação Principal */}
          {doc && doc.validationStatus === 'valid' && !isSplitting && (
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              {doc.hasSignature && !signatureConfirmed && (
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium text-right order-2 sm:order-1">
                  Confirme a ciência acima para habilitar a divisão.
                </p>
              )}
              <Button
                type="button"
                size="lg"
                onClick={handleSplit}
                disabled={
                  isValidatingFile ||
                  (doc.hasSignature && !signatureConfirmed) ||
                  (splitMode === 'extract' && !extractAnalysis.valid)
                }
                className="w-full sm:w-auto bg-[#C9922A] hover:bg-[#b07d1f] text-white font-semibold shadow-sm px-8 order-1 sm:order-2"
              >
                <Scissors className="w-4 h-4 mr-2" />
                Dividir PDF
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Informação sobre Processamento Local no Navegador */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5 flex items-center gap-3.5 text-muted-foreground">
        <ShieldCheck className="w-5 h-5 text-[#C9922A] shrink-0" />
        <p className="text-xs sm:text-sm leading-relaxed">
          Processamento executado 100% de forma local no seu navegador. Os documentos não são
          enviados para nenhum servidor ou armazenados externamente, garantindo sigilo e
          conformidade.
        </p>
      </div>
    </div>
  )
}
