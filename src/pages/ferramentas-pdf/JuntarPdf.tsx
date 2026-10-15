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
    setItems((prev) => prev.filter((item) => item.id !== id))
    setErrorMessage(null)
  }

  // Limpar toda a seleção
  const handleClearAll = () => {
    if (isMerging) return
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
        'Existem arquivos inválidos, protegidos ou com assinaturas digitais na lista. Remova-os para prosseguir.',
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

    const handle = executePdfMerge({
      files: payload,
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
              <Files className="w-6 h-6 text-[#C9922A]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Juntar PDF
              </h1>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">
                Mescle múltiplos documentos em um único PDF na sequência desejada.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta Institucional / Jurídico de Integridade e Assinaturas */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex items-start gap-3 text-muted-foreground text-xs leading-relaxed">
        <Info className="w-4 h-4 text-[#C9922A] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">
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
          className="border-destructive/40 bg-destructive/10 text-destructive"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Não foi possível concluir a operação</AlertTitle>
          <AlertDescription className="mt-1 text-xs sm:text-sm">
            <p>{errorMessage}</p>
            {errorDetails && <p className="mt-1 font-mono text-xs opacity-90">{errorDetails}</p>}
          </AlertDescription>
        </Alert>
      )}

      {/* TELA DE SUCESSO: Documento Pronto para Download */}
      {mergedBlobUrl ? (
        <Card className="border-border bg-card shadow-sm rounded-xl">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
              Documentos unidos com sucesso!
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground max-w-md mx-auto">
              Seu arquivo final consolidado está pronto para download.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <div className="max-w-md mx-auto rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Total de páginas:</span>
                <span className="font-semibold text-foreground">{mergedPageCount} páginas</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Tamanho do arquivo:</span>
                <span className="font-semibold text-foreground">
                  {formatBytes(mergedSizeBytes)}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Origem:</span>
                <span className="font-semibold text-foreground">
                  {items.length} arquivos combinados
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <Button
                asChild
                className="w-full sm:w-auto flex-1 bg-[#C9922A] hover:bg-[#b07d1f] text-white font-semibold"
              >
                <a href={mergedBlobUrl} download="documentos-unidos.pdf">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={handleResetForNewOperation}
                className="w-full sm:w-auto"
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
            className={`relative rounded-xl border-2 border-dashed transition-all p-8 text-center flex flex-col items-center justify-center cursor-pointer ${
              isDragging
                ? 'border-[#C9922A] bg-[#C9922A]/10 scale-[1.005]'
                : 'border-border/80 bg-card/60 hover:border-[#C9922A]/50 hover:bg-card'
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

            <div className="p-4 rounded-full bg-[#C9922A]/10 text-[#C9922A] ring-1 ring-[#C9922A]/20 mb-3">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="text-base font-semibold text-foreground">
              Clique para selecionar ou arraste seus arquivos PDF
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md">
              Selecione quantos arquivos forem necessários. A ordem de inclusão é preservada e você
              poderá reorganizá-los abaixo.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="font-medium"
                disabled={isMerging || isValidatingFiles}
              >
                {isValidatingFiles ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
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
            <Card className="border-border bg-card shadow-sm rounded-xl">
              <CardHeader className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#C9922A]" />
                    Arquivos selecionados ({items.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Tamanho total:{' '}
                    <span className="font-semibold text-foreground">
                      {formatBytes(totalSizeBytes)}
                    </span>
                    {' • '}
                    Organize a ordem final usando as setas.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isMerging}
                    className="text-xs h-8"
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
                    className="text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Limpar tudo
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {items.map((item, idx) => {
                    const isInvalid = item.validationStatus === 'invalid'
                    return (
                      <li
                        key={item.id}
                        className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isInvalid ? 'bg-destructive/5' : 'hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          {/* Número da Ordem */}
                          <div className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                            {idx + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground truncate max-w-[280px] sm:max-w-md">
                                {item.name}
                              </span>
                              {item.pageCount !== undefined && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {item.pageCount} {item.pageCount === 1 ? 'pág' : 'págs'}
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground">
                                {formatBytes(item.size)}
                              </span>
                            </div>

                            {/* Alerta de erro de validação do arquivo específico */}
                            {isInvalid && (
                              <div className="mt-1 text-xs text-destructive flex items-center gap-1 font-medium">
                                <Ban className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {item.errorMessage || 'Arquivo inválido ou não suportado.'}
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
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
              </CardContent>
            </Card>
          )}

          {/* Painel de Progresso / Em Andamento */}
          {isMerging && (
            <Card className="border-[#C9922A]/40 bg-[#C9922A]/5 rounded-xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-[#C9922A] animate-spin" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Processando documentos...
                      </h4>
                      <p className="text-xs text-muted-foreground">
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
                    className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleCancelMerge}
                  >
                    Cancelar
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Progress value={calculateProgressPercent()} className="h-2" />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>
                      Progresso real por arquivos: {progress?.currentFileIndex ?? 0} de{' '}
                      {progress?.totalFiles ?? items.length} concluídos
                    </span>
                    <span>{calculateProgressPercent()}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão de Ação Principal */}
          {items.length > 0 && !isMerging && (
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                size="lg"
                onClick={handleMerge}
                disabled={items.length < 2 || hasInvalidItem || isValidatingFiles}
                className="w-full sm:w-auto bg-[#C9922A] hover:bg-[#b07d1f] text-white font-semibold shadow-sm px-8"
              >
                <Files className="w-4 h-4 mr-2" />
                Juntar {items.length} {items.length === 1 ? 'PDF' : 'PDFs'}
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
