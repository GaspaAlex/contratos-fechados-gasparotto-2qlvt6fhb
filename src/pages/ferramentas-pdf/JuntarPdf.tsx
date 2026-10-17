import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Files,
  Upload,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Info,
  ShieldCheck,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { executePdfMerge, type MergeExecutionHandle } from '@/lib/pdf-tools/merge-client'
import { validateSinglePdf } from '@/lib/pdf-tools/pdf-merger'
import type { MergeProgressUpdate } from '@/lib/pdf-tools/pdf-validator'

interface SelectedFileItem {
  id: string
  file: File
  name: string
  size: number
  buffer: ArrayBuffer
  pageCount?: number
  validationStatus: 'pending' | 'valid' | 'invalid'
  hasSignature?: boolean
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

export default function JuntarPdf() {
  const [items, setItems] = useState<SelectedFileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isValidatingFiles, setIsValidatingFiles] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [progress, setProgress] = useState<MergeProgressUpdate | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [mergedBlobUrl, setMergedBlobUrl] = useState<string | null>(null)
  const [mergedPageCount, setMergedPageCount] = useState<number>(0)
  const [mergedSizeBytes, setMergedSizeBytes] = useState<number>(0)
  const [mergedHasSignedDocs, setMergedHasSignedDocs] = useState<boolean>(false)
  const [signatureConfirmed, setSignatureConfirmed] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mergeHandleRef = useRef<MergeExecutionHandle | null>(null)

  // Limpeza de Blob URL anterior ao desmontar ou trocar resultado
  useEffect(() => {
    return () => {
      if (mergedBlobUrl) {
        URL.revokeObjectURL(mergedBlobUrl)
      }
      if (mergeHandleRef.current) {
        mergeHandleRef.current.cancel()
      }
    }
  }, [mergedBlobUrl])

  // Totalizadores
  const totalSizeBytes = items.reduce((acc, curr) => acc + curr.size, 0)
  const hasInvalidItem = items.some((item) => item.validationStatus === 'invalid')
  const hasSignedDocuments = items.some((item) => item.hasSignature)

  // Adicionar arquivos à lista existente preservando ordem
  const handleFilesAdded = async (newFileList: FileList | File[]) => {
    setErrorMessage(null)
    setErrorDetails(null)

    const rawFiles = Array.from(newFileList)
    if (rawFiles.length === 0) return

    setIsValidatingFiles(true)

    const newItems: SelectedFileItem[] = []

    for (const file of rawFiles) {
      // Ler ArrayBuffer
      try {
        const buffer = await file.arrayBuffer()
        const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

        // Validar preventivamente cabeçalho, criptografia e assinatura
        const validation = await validateSinglePdf(file.name, buffer)

        newItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          buffer,
          pageCount: validation.pageCount,
          hasSignature: Boolean(validation.hasSignature),
          validationStatus: validation.valid ? 'valid' : 'invalid',
          errorMessage: validation.error,
        })
      } catch (err) {
        newItems.push({
          id: `${file.name}-${Date.now()}`,
          file,
          name: file.name,
          size: file.size,
          buffer: new ArrayBuffer(0),
          validationStatus: 'invalid',
          errorMessage: `Não foi possível ler os bytes do arquivo: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        })
      }
    }

    // Redefinir confirmação de assinatura quando a composição da lista mudar
    setSignatureConfirmed(false)
    setItems((prev) => [...prev, ...newItems])
    setIsValidatingFiles(false)
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
      await handleFilesAdded(e.dataTransfer.files)
    }
  }

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFilesAdded(e.target.files)
    }
    // Resetar input para permitir selecionar os mesmos arquivos novamente se o usuário quiser
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Ordenação manual: Mover para cima
  const moveUp = (index: number) => {
    if (index <= 0) return
    setItems((prev) => {
      const copy = [...prev]
      const temp = copy[index - 1]
      copy[index - 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  // Ordenação manual: Mover para baixo
  const moveDown = (index: number) => {
    if (index >= items.length - 1) return
    setItems((prev) => {
      const copy = [...prev]
      const temp = copy[index + 1]
      copy[index + 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  // Remover item individual
  const removeItem = (id: string) => {
    setSignatureConfirmed(false)
    setItems((prev) => prev.filter((item) => item.id !== id))
    setErrorMessage(null)
  }

  // Limpar toda a seleção
  const handleClearAll = () => {
    if (isMerging) return
    setSignatureConfirmed(false)
    setItems([])
    setErrorMessage(null)
    setErrorDetails(null)
    if (mergedBlobUrl) {
      URL.revokeObjectURL(mergedBlobUrl)
      setMergedBlobUrl(null)
    }
  }

  // Iniciar nova operação
  const handleResetForNewOperation = () => {
    if (mergedBlobUrl) {
      URL.revokeObjectURL(mergedBlobUrl)
      setMergedBlobUrl(null)
    }
    setSignatureConfirmed(false)
    setMergedHasSignedDocs(false)
    setItems([])
    setErrorMessage(null)
    setErrorDetails(null)
    setProgress(null)
    setMergedPageCount(0)
    setMergedSizeBytes(0)
  }

  // Executar a união
  const handleMerge = async () => {
    if (items.length < 2) {
      setErrorMessage('Selecione pelo menos 2 arquivos PDF para unir.')
      return
    }

    if (hasInvalidItem) {
      setErrorMessage(
        'Existem arquivos inválidos, corrompidos ou protegidos por senha na lista. Corrija-os ou remova-os para prosseguir.',
      )
      return
    }

    if (hasSignedDocuments && !signatureConfirmed) {
      setErrorMessage(
        'Um ou mais arquivos possuem indícios de assinatura digital. É necessário confirmar a declaração de ciência antes de prosseguir.',
      )
      return
    }

    setErrorMessage(null)
    setErrorDetails(null)
    setIsMerging(true)
    setProgress({
      phase: 'validating',
      currentFileIndex: 0,
      totalFiles: items.length,
      currentFileName: items[0].name,
    })

    if (mergedBlobUrl) {
      URL.revokeObjectURL(mergedBlobUrl)
      setMergedBlobUrl(null)
    }

    const payload = items.map((it) => ({
      name: it.name,
      buffer: it.buffer,
    }))

    const containsSigned = hasSignedDocuments

    const handle = executePdfMerge({
      files: payload,
      allowSignedDocuments: containsSigned && signatureConfirmed,
      onProgress: (p) => {
        setProgress(p)
      },
    })

    mergeHandleRef.current = handle

    try {
      const result = await handle.promise
      setIsMerging(false)
      mergeHandleRef.current = null

      if (result.success && result.mergedBuffer) {
        const blob = new Blob([result.mergedBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setMergedBlobUrl(url)
        setMergedPageCount(result.pageCount || 0)
        setMergedSizeBytes(blob.size)
        setMergedHasSignedDocs(containsSigned)
        setProgress(null)
      } else {
        setErrorMessage(result.error || 'Ocorreu um erro ao processar a união dos documentos.')
        if (result.failingFile) {
          setErrorDetails(`Arquivo que originou o bloqueio/falha: ${result.failingFile}`)
        }
        setProgress(null)
      }
    } catch (err) {
      setIsMerging(false)
      mergeHandleRef.current = null
      setProgress(null)
      setErrorMessage(
        `Erro inesperado durante o processamento: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // Cancelar processamento
  const handleCancelMerge = () => {
    if (mergeHandleRef.current) {
      mergeHandleRef.current.cancel()
      mergeHandleRef.current = null
    }
    setIsMerging(false)
    setProgress(null)
    setErrorMessage('Operação cancelada pelo usuário. Nenhum arquivo foi gerado.')
  }

  // Cálculo de progresso percentual real baseado em arquivos concluídos
  const calculateProgressPercent = () => {
    if (!progress) return 0
    if (progress.phase === 'saving') return 95
    if (progress.totalFiles === 0) return 0
    return Math.round((progress.currentFileIndex / progress.totalFiles) * 90)
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12 max-w-5xl mx-auto">
      {/* 1. CABEÇALHO CORPORATIVO PADRONIZADO (GRAFITE PREMIUM 2.1) */}
      <div className="flex flex-col gap-3">
        <Link
          to="/ferramentas-pdf"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#78818E] hover:text-[#C9922A] transition-colors w-fit group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Voltar para Ferramentas PDF
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
                FERRAMENTAS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
              Juntar PDF
            </h1>
            <p className="text-sm text-[#78818E] dark:text-muted-foreground">
              Mescle múltiplos documentos em um único PDF na sequência desejada.
            </p>
          </div>
        </div>
      </div>

      {/* Alerta Institucional / Jurídico de Integridade e Assinaturas */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-4 sm:p-5 flex items-start gap-3.5 text-[#78818E] dark:text-muted-foreground text-xs leading-relaxed shadow-xs">
        <div className="h-8 w-8 rounded-md bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border flex items-center justify-center text-[#C9922A] shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-[#C9922A]" />
        </div>
        <div>
          <span className="font-semibold text-[#252B34] dark:text-foreground">
            Aviso sobre integridade de documentos:
          </span>{' '}
          A união de PDFs cria uma nova estrutura de páginas e pode não preservar formulários
          interativos, índices prévios, anexos incorporados ou assinaturas digitais. Arquivos com
          indícios de assinatura digital ou proteção por senha têm a união bloqueada preventivamente
          para evitar perda de validade jurídica.
        </div>
      </div>

      {/* Mensagem de Erro / Bloqueio */}
      {errorMessage && (
        <Alert
          variant="destructive"
          className="rounded-[10px] border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-[#B4453C]"
        >
          <AlertTriangle className="h-4 w-4 text-[#B4453C]" />
          <AlertTitle className="font-semibold text-xs sm:text-sm text-[#B4453C]">
            Não foi possível concluir a operação
          </AlertTitle>
          <AlertDescription className="mt-1 text-xs sm:text-sm text-[#B4453C]/90">
            <p>{errorMessage}</p>
            {errorDetails && <p className="mt-1 font-mono text-xs opacity-90">{errorDetails}</p>}
          </AlertDescription>
        </Alert>
      )}

      {/* TELA DE SUCESSO: Documento Pronto para Download */}
      {mergedBlobUrl ? (
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-[#3E8E5A]" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
              Documentos unidos com sucesso!
            </CardTitle>
            <CardDescription className="text-sm text-[#78818E] dark:text-muted-foreground max-w-md mx-auto">
              Seu arquivo final consolidado está pronto para download.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <div className="max-w-md mx-auto rounded-[10px] border border-[#E4E7EB] dark:border-border bg-[#F5F6F8]/60 dark:bg-muted/20 p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center text-[#78818E] dark:text-muted-foreground">
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Total de páginas:
                </span>
                <span className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                  {mergedPageCount} páginas
                </span>
              </div>
              <div className="flex justify-between items-center text-[#78818E] dark:text-muted-foreground">
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Tamanho do arquivo:
                </span>
                <span className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                  {formatBytes(mergedSizeBytes)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#78818E] dark:text-muted-foreground">
                <span className="text-xs uppercase tracking-wider font-semibold">Origem:</span>
                <span className="font-semibold text-[#252B34] dark:text-foreground">
                  {items.length} arquivos combinados
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <Button
                asChild
                className="w-full sm:w-auto flex-1 h-9 bg-[#C9922A] hover:bg-[#b58324] text-white text-xs font-semibold rounded-md shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#C9922A]"
              >
                <a
                  href={mergedBlobUrl}
                  download={
                    mergedHasSignedDocs ? 'documentos-unidos-copia.pdf' : 'documentos-unidos.pdf'
                  }
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={handleResetForNewOperation}
                className="w-full sm:w-auto h-9 text-xs font-medium border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A] rounded-md transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Iniciar nova união
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ÁREA DE SELEÇÃO, LISTA E PROCESSAMENTO */
        <div className="space-y-6">
          {/* Zona de Drop / Seleção de Arquivos */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-[10px] border-2 border-dashed transition-all p-8 text-center flex flex-col items-center justify-center cursor-pointer ${
              isDragging
                ? 'border-[#C9922A] bg-[#FAF8F2] dark:bg-muted/30 scale-[1.005]'
                : 'border-[#E4E7EB] dark:border-border bg-white dark:bg-card hover:border-[#C9922A]/60 hover:bg-[#FAF8F2]/30 dark:hover:bg-muted/10'
            }`}
            onClick={() => !isMerging && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={handleInputChange}
              disabled={isMerging || isValidatingFiles}
            />

            <div className="h-12 w-12 rounded-full bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border text-[#C9922A] flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-[#C9922A]" />
            </div>

            <h3 className="text-base font-bold text-[#252B34] dark:text-foreground tracking-tight">
              Clique para selecionar ou arraste seus arquivos PDF
            </h3>
            <p className="text-xs sm:text-sm text-[#78818E] dark:text-muted-foreground mt-1 max-w-md">
              Selecione quantos arquivos forem necessários. A ordem de inclusão é preservada e você
              poderá reorganizá-los abaixo.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-4 text-xs font-semibold border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
                disabled={isMerging || isValidatingFiles}
              >
                {isValidatingFiles ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-[#C9922A]" />
                    Lendo arquivos...
                  </>
                ) : (
                  <>Selecionar PDFs</>
                )}
              </Button>
            </div>
          </div>

          {/* Lista de Arquivos Selecionados */}
          {items.length > 0 && (
            <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
              <div className="p-4 sm:px-6 sm:py-4 border-b border-[#E4E7EB]/80 dark:border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F5F6F8]/60 dark:bg-muted/20">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-[#FAF8F2] dark:bg-muted/40 flex items-center justify-center text-[#C9922A]">
                      <FileCheck2 className="w-4 h-4 text-[#C9922A]" />
                    </div>
                    <h2 className="text-sm font-bold text-[#252B34] dark:text-foreground tracking-tight">
                      Arquivos selecionados ({items.length})
                    </h2>
                  </div>
                  <p className="text-xs text-[#78818E] dark:text-muted-foreground mt-1">
                    Tamanho total:{' '}
                    <strong className="text-[#252B34] dark:text-foreground font-semibold tabular-nums">
                      {formatBytes(totalSizeBytes)}
                    </strong>
                    {' • '}
                    Organize a ordem final usando as setas.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isMerging}
                    className="h-8 px-3 text-xs font-semibold border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Adicionar mais
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={isMerging}
                    className="h-8 px-3 text-xs font-medium text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Limpar tudo
                  </Button>
                </div>
              </div>

              <div>
                <ul className="divide-y divide-[#E4E7EB]/80 dark:divide-border/80">
                  {items.map((item, idx) => {
                    const isInvalid = item.validationStatus === 'invalid'
                    const hasSig = Boolean(item.hasSignature && !isInvalid)

                    let rowBgClass = 'hover:bg-[#FAF8F2]/40 dark:hover:bg-muted/10'
                    if (isInvalid) {
                      rowBgClass = 'bg-red-50/40 dark:bg-red-950/20'
                    } else if (hasSig) {
                      rowBgClass = 'bg-amber-500/5 hover:bg-amber-500/10'
                    }

                    return (
                      <li
                        key={item.id}
                        className={`p-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${rowBgClass}`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          {/* Número da Ordem */}
                          <div className="w-7 h-7 rounded-md bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border text-[#C9922A] flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#252B34] dark:text-foreground truncate max-w-[280px] sm:max-w-md">
                                {item.name}
                              </span>
                              {item.pageCount !== undefined && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F6F8] dark:bg-muted/50 border border-[#E4E7EB]/80 dark:border-border/60 text-[#78818E] dark:text-muted-foreground font-medium tabular-nums">
                                  {item.pageCount} {item.pageCount === 1 ? 'pág' : 'págs'}
                                </span>
                              )}
                              <span className="text-[11px] text-[#78818E] dark:text-muted-foreground tabular-nums">
                                {formatBytes(item.size)}
                              </span>
                              {hasSig && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#C77E1E]/10 text-[#C77E1E] font-medium inline-flex items-center gap-1 border border-[#C77E1E]/30">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  Indício de assinatura digital
                                </span>
                              )}
                            </div>

                            {/* Alerta de erro de validação do arquivo específico (vermelho/bloqueante) */}
                            {isInvalid && (
                              <div className="mt-1 text-xs text-[#B4453C] flex items-center gap-1 font-medium">
                                <Ban className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {item.errorMessage || 'Arquivo inválido ou não suportado.'}
                                </span>
                              </div>
                            )}

                            {/* Aviso informativo em tom âmbar sobre indício de assinatura */}
                            {hasSig && (
                              <div className="mt-1 text-xs text-[#C77E1E] flex items-center gap-1 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Documento com indício de assinatura digital. Poderá ser unido como
                                  cópia derivada após confirmação.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controles de Ordenação e Remoção */}
                        <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md"
                            disabled={idx === 0 || isMerging}
                            onClick={() => moveUp(idx)}
                            title="Mover para cima"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md"
                            disabled={idx === items.length - 1 || isMerging}
                            onClick={() => moveDown(idx)}
                            title="Mover para baixo"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#78818E] hover:text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                            disabled={isMerging}
                            onClick={() => removeItem(item.id)}
                            title="Remover arquivo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Bloco de Confirmação Obrigatória para Documentos Assinados */}
          {items.length > 0 && hasSignedDocuments && !isMerging && (
            <div className="rounded-[10px] border border-amber-300 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/20 p-5 space-y-4 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#C77E1E] shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#C77E1E]">
                    ATENÇÃO — DOCUMENTOS ASSINADOS
                  </h4>
                  <p className="text-xs sm:text-sm text-amber-950/90 dark:text-amber-200/90 leading-relaxed">
                    Um ou mais arquivos apresentam indícios de assinatura digital. A união poderá
                    invalidar as assinaturas criptográficas incorporadas aos documentos, mesmo que
                    as assinaturas visíveis e os relatórios de evidências continuem aparecendo. O
                    arquivo gerado será uma cópia derivada. Os documentos originais permanecerão
                    inalterados.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40">
                <label
                  htmlFor="signature-agreement-checkbox"
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <Checkbox
                    id="signature-agreement-checkbox"
                    checked={signatureConfirmed}
                    onCheckedChange={(checked) => setSignatureConfirmed(checked === true)}
                    className="mt-0.5 border-[#C77E1E] data-[state=checked]:bg-[#C9922A] data-[state=checked]:border-[#C9922A]"
                  />
                  <span className="text-xs sm:text-sm font-medium text-amber-950 dark:text-amber-200 leading-normal select-none group-hover:text-amber-900">
                    Estou ciente de que o PDF resultante poderá não preservar a validade
                    criptográfica das assinaturas e desejo prosseguir com a geração da cópia
                    derivada.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Painel de Progresso / Em Andamento */}
          {isMerging && (
            <Card className="rounded-[10px] border border-[#C9922A]/40 bg-[#FAF8F2]/60 dark:bg-muted/20">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-5 h-5 text-[#C9922A] animate-spin" />
                    <div>
                      <h4 className="text-sm font-bold text-[#252B34] dark:text-foreground">
                        Processando documentos...
                      </h4>
                      <p className="text-xs text-[#78818E] dark:text-muted-foreground">
                        {progress?.phase === 'saving'
                          ? 'Finalizando e compactando documento final...'
                          : `Arquivo ${Number(progress?.currentFileIndex ?? 0) + 1} de ${progress?.totalFiles}: ${progress?.currentFileName || ''}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs text-[#B4453C] border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                    onClick={handleCancelMerge}
                  >
                    Cancelar
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Progress value={calculateProgressPercent()} className="h-2" />
                  <div className="flex justify-between text-[11px] text-[#78818E] dark:text-muted-foreground">
                    <span>
                      Progresso real por arquivos: {progress?.currentFileIndex ?? 0} de{' '}
                      {progress?.totalFiles ?? items.length} concluídos
                    </span>
                    <span className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                      {calculateProgressPercent()}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão de Ação Principal */}
          {items.length > 0 && !isMerging && (
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              {hasSignedDocuments &&
                !signatureConfirmed &&
                !hasInvalidItem &&
                items.length >= 2 && (
                  <p className="text-xs text-[#C77E1E] font-medium text-right order-2 sm:order-1">
                    Confirme a ciência acima para habilitar a união.
                  </p>
                )}
              <Button
                type="button"
                size="lg"
                onClick={handleMerge}
                disabled={
                  items.length < 2 ||
                  hasInvalidItem ||
                  isValidatingFiles ||
                  (hasSignedDocuments && !signatureConfirmed)
                }
                className="w-full sm:w-auto h-9 px-6 bg-[#C9922A] hover:bg-[#b58324] text-white text-xs font-semibold rounded-md shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#C9922A] order-1 sm:order-2"
              >
                <Files className="w-4 h-4 mr-2" />
                Juntar {items.length} {items.length === 1 ? 'PDF' : 'PDFs'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Informação sobre Processamento Local no Navegador */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-4 sm:p-5 flex items-center gap-3.5 text-[#78818E] dark:text-muted-foreground shadow-xs">
        <div className="h-9 w-9 rounded-md bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border flex items-center justify-center text-[#C9922A] shrink-0">
          <ShieldCheck className="w-5 h-5 text-[#C9922A]" />
        </div>
        <p className="text-xs sm:text-sm leading-relaxed">
          <strong className="text-[#252B34] dark:text-foreground font-semibold">
            Processamento 100% Local:
          </strong>{' '}
          Executado no seu navegador. Os documentos não são enviados para nenhum servidor ou
          armazenados externamente, garantindo sigilo e conformidade.
        </p>
      </div>
    </div>
  )
}
