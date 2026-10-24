import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  FileImage,
  Upload,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Info,
  ShieldCheck,
  Ban,
  MoveLeft,
  MoveRight,
  Maximize2,
  FileText,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  executeImageToPdf,
  type ImageToPdfExecutionHandle,
} from '@/lib/pdf-tools/image-to-pdf-client'
import {
  detectImageType,
  type ImagePageLayout,
  type ImageToPdfProgressUpdate,
} from '@/lib/pdf-tools/image-to-pdf'
import { ImageEditorModal, type ImageEditorOutput } from '@/components/pdf-tools/ImageEditorModal'
import { Crop } from 'lucide-react'

interface SelectedImageItem {
  id: string
  file: File
  name: string
  size: number
  buffer: ArrayBuffer // Buffer ativo utilizado na conversão do PDF
  originalBuffer: ArrayBuffer // Preserva integralmente a imagem original na memória
  originalSize: number
  type: 'image/jpeg' | 'image/png'
  previewUrl: string
  width?: number
  height?: number
  validationStatus: 'valid' | 'invalid'
  errorMessage?: string
  isEdited?: boolean
  filterMode?: string
  shadowIntensity?: string
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function ImagensParaPdf() {
  const [images, setImages] = useState<SelectedImageItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isValidatingFiles, setIsValidatingFiles] = useState(false)
  const [layout, setLayout] = useState<ImagePageLayout>('a4')
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState<ImageToPdfProgressUpdate | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  // Drag and drop entre cards
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Modal de Edição Inteligente de Imagem (CamScanner Bloco 1)
  const [editingImageItem, setEditingImageItem] = useState<SelectedImageItem | null>(null)

  // Resultado
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [outputFileName, setOutputFileName] = useState<string>('imagens-convertidas.pdf')
  const [resultPageCount, setResultPageCount] = useState<number>(0)
  const [resultSizeBytes, setResultSizeBytes] = useState<number>(0)
  const [resultImagesCount, setResultImagesCount] = useState<number>(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const executionHandleRef = useRef<ImageToPdfExecutionHandle | null>(null)

  // Limpar Object URLs ao desmontar ou trocar
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
      }
      if (executionHandleRef.current) {
        executionHandleRef.current.cancel()
      }
    }
  }, [pdfBlobUrl])

  // Limpeza de pré-visualizações das imagens
  useEffect(() => {
    return () => {
      images.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
    }
  }, [images])

  const totalSizeBytes = useMemo(() => {
    return images.reduce((acc, curr) => acc + curr.size, 0)
  }, [images])

  const hasInvalidItem = useMemo(() => {
    return images.some((item) => item.validationStatus === 'invalid')
  }, [images])

  const validImagesCount = useMemo(() => {
    return images.filter((item) => item.validationStatus === 'valid').length
  }, [images])

  // Processar adição de novos arquivos
  const handleFilesAdded = useCallback(async (newFileList: FileList | File[]) => {
    setErrorMessage(null)
    setErrorDetails(null)

    const rawFiles = Array.from(newFileList)
    if (rawFiles.length === 0) return

    setIsValidatingFiles(true)

    const newItems: SelectedImageItem[] = []

    for (const file of rawFiles) {
      try {
        const buffer = await file.arrayBuffer()
        const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

        // Validar cabeçalho da imagem
        const check = detectImageType(buffer)

        if (!check.valid || !check.format) {
          newItems.push({
            id,
            file,
            name: file.name,
            size: file.size,
            buffer,
            originalBuffer: buffer.slice(0),
            originalSize: file.size,
            type: 'image/jpeg',
            previewUrl: '',
            validationStatus: 'invalid',
            errorMessage:
              check.error || 'Formato não suportado. Aceita-se exclusivamente imagens JPG e PNG.',
          })
          continue
        }

        const mimeType = check.format === 'jpeg' ? 'image/jpeg' : 'image/png'
        const previewBlob = new Blob([buffer], { type: mimeType })
        const previewUrl = URL.createObjectURL(previewBlob)

        // Obter dimensões reais da imagem via Image nativo
        let width = 0
        let height = 0
        try {
          const img = new Image()
          img.src = previewUrl
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              width = img.naturalWidth
              height = img.naturalHeight
              resolve()
            }
            img.onerror = () => reject(new Error('Falha ao decodificar pixels da imagem'))
          })
        } catch (dimErr) {
          console.warn('Erro ao ler dimensões da imagem:', dimErr)
        }

        newItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          buffer,
          originalBuffer: buffer.slice(0),
          originalSize: file.size,
          type: mimeType,
          previewUrl,
          width,
          height,
          validationStatus: 'valid',
          isEdited: false,
        })
      } catch (err) {
        newItems.push({
          id: `${file.name}-${Date.now()}`,
          file,
          name: file.name,
          size: file.size,
          buffer: new ArrayBuffer(0),
          originalBuffer: new ArrayBuffer(0),
          originalSize: file.size,
          type: 'image/jpeg',
          previewUrl: '',
          validationStatus: 'invalid',
          errorMessage: `Não foi possível carregar os bytes do arquivo: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        })
      }
    }

    setImages((prev) => [...prev, ...newItems])
    setIsValidatingFiles(false)
  }, [])

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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Ordenação: mover para a esquerda / cima
  const moveLeft = (index: number) => {
    if (index <= 0) return
    setImages((prev) => {
      const copy = [...prev]
      const temp = copy[index - 1]
      copy[index - 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  // Ordenação: mover para a direita / baixo
  const moveRight = (index: number) => {
    if (index >= images.length - 1) return
    setImages((prev) => {
      const copy = [...prev]
      const temp = copy[index + 1]
      copy[index + 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  // Drag and drop reordenação entre cards
  const handleCardDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
    setDraggedIndex(index)
  }

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleCardDragLeave = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragOverIndex === index) {
      setDragOverIndex(null)
    }
  }

  const handleCardDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    const sourceIdx =
      draggedIndex !== null ? draggedIndex : parseInt(e.dataTransfer.getData('text/plain'), 10)
    setDraggedIndex(null)

    if (
      isNaN(sourceIdx) ||
      sourceIdx === targetIndex ||
      sourceIdx < 0 ||
      sourceIdx >= images.length
    ) {
      return
    }

    setImages((prev) => {
      const copy = [...prev]
      const [moved] = copy.splice(sourceIdx, 1)
      copy.splice(targetIndex, 0, moved)
      return copy
    })
  }

  const handleCardDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Abrir editor de imagem (clona o buffer ou garante referência íntegra)
  const handleOpenEditor = (item: SelectedImageItem) => {
    if (isConverting) return
    if (!item.originalBuffer || item.originalBuffer.byteLength === 0) {
      setErrorMessage(
        `Não foi possível abrir "${item.name}": arquivo de imagem corrompido ou vazio.`,
      )
      return
    }
    setEditingImageItem(item)
  }

  // Aplicar alterações do editor de imagem
  const handleApplyEditor = (output: ImageEditorOutput) => {
    if (!editingImageItem) return

    setImages((prev) =>
      prev.map((it) => {
        if (it.id === editingImageItem.id) {
          // Revoga URL temporária antiga apenas se for diferente
          if (
            it.previewUrl &&
            it.previewUrl.startsWith('blob:') &&
            it.previewUrl !== output.previewUrl
          ) {
            URL.revokeObjectURL(it.previewUrl)
          }
          return {
            ...it,
            buffer: output.buffer,
            previewUrl: output.previewUrl,
            width: output.width,
            height: output.height,
            size: output.size,
            isEdited: true,
            filterMode: output.filterMode,
            shadowIntensity: output.shadowIntensity,
          }
        }
        return it
      }),
    )

    setEditingImageItem(null)
  }

  // Restaurar imagem da lista ao seu arquivo original não editado
  const handleRestoreItemOriginal = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setImages((prev) =>
      prev.map((it) => {
        if (it.id === id && it.isEdited) {
          if (it.previewUrl && it.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(it.previewUrl)
          }
          const blob = new Blob([it.originalBuffer], { type: it.type })
          const newPreviewUrl = URL.createObjectURL(blob)
          return {
            ...it,
            buffer: it.originalBuffer.slice(0),
            previewUrl: newPreviewUrl,
            size: it.originalSize,
            isEdited: false,
          }
        }
        return it
      }),
    )
  }

  // Remover imagem individual
  const removeItem = (id: string) => {
    setImages((prev) => {
      const item = prev.find((it) => it.id === id)
      if (item && item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
      return prev.filter((it) => it.id !== id)
    })
    if (editingImageItem?.id === id) {
      setEditingImageItem(null)
    }
    setErrorMessage(null)
  }

  // Limpar toda a seleção
  const handleClearAll = () => {
    if (isConverting) return
    images.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
    })
    setImages([])
    setErrorMessage(null)
    setErrorDetails(null)
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl)
      setPdfBlobUrl(null)
    }
  }

  // Iniciar nova operação
  const handleResetForNewOperation = () => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl)
      setPdfBlobUrl(null)
    }
    images.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
    })
    setImages([])
    setErrorMessage(null)
    setErrorDetails(null)
    setProgress(null)
    setResultPageCount(0)
    setResultSizeBytes(0)
    setResultImagesCount(0)
  }

  // Executar conversão
  const handleConvert = async () => {
    if (images.length === 0) {
      setErrorMessage('Selecione ao menos uma imagem JPG ou PNG para converter.')
      return
    }

    if (hasInvalidItem) {
      setErrorMessage(
        'Existem arquivos com formatos incompatíveis na lista. Remova-os antes de gerar o PDF.',
      )
      return
    }

    setErrorMessage(null)
    setErrorDetails(null)
    setIsConverting(true)
    setProgress({
      phase: 'preparing',
      currentIndex: 0,
      totalImages: images.length,
      currentImageName: images[0].name,
      percent: 5,
    })

    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl)
      setPdfBlobUrl(null)
    }

    const payload = images.map((it) => ({
      id: it.id,
      name: it.name,
      buffer: it.buffer,
      type: it.type,
    }))

    const handle = executeImageToPdf({
      images: payload,
      layout,
      onProgress: (p) => {
        setProgress(p)
      },
    })

    executionHandleRef.current = handle

    try {
      const result = await handle.promise
      setIsConverting(false)
      executionHandleRef.current = null

      if (result.success && result.pdfBuffer) {
        const blob = new Blob([result.pdfBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPdfBlobUrl(url)
        setOutputFileName(result.fileName || 'imagens-convertidas.pdf')
        setResultPageCount(result.pageCount)
        setResultSizeBytes(blob.size)
        setResultImagesCount(result.totalImages)
        setProgress(null)
      } else {
        setErrorMessage(result.error || 'Ocorreu um erro ao converter as imagens em PDF.')
        if (result.failingImageName) {
          setErrorDetails(`Imagem que originou a falha: ${result.failingImageName}`)
        }
        setProgress(null)
      }
    } catch (err) {
      setIsConverting(false)
      executionHandleRef.current = null
      setProgress(null)
      setErrorMessage(
        `Erro inesperado durante a conversão: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  const handleCancelConvert = () => {
    if (executionHandleRef.current) {
      executionHandleRef.current.cancel()
      executionHandleRef.current = null
    }
    setIsConverting(false)
    setProgress(null)
    setErrorMessage('Operação cancelada pelo usuário. Nenhum arquivo PDF foi gerado.')
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
              Imagens para PDF
            </h1>
            <p className="text-sm text-[#78818E] dark:text-muted-foreground">
              Converta imagens JPG e PNG em um único documento PDF.
            </p>
          </div>
        </div>
      </div>

      {/* Alerta Institucional de Integridade e Preservação de Qualidade */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-4 sm:p-5 flex items-start gap-3.5 text-[#78818E] dark:text-muted-foreground text-xs leading-relaxed shadow-xs">
        <div className="h-8 w-8 rounded-md bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border flex items-center justify-center text-[#C9922A] shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-[#C9922A]" />
        </div>
        <div>
          <span className="font-semibold text-[#252B34] dark:text-foreground">
            Alta nitidez e processamento local seguro:
          </span>{' '}
          As imagens são incorporadas nativamente via{' '}
          <code className="text-[#C9922A] font-mono">embedJpg</code> /{' '}
          <code className="text-[#C9922A] font-mono">embedPng</code> sem recompressão destrutiva,
          preservando a transparência de arquivos PNG e a qualidade original. A ordem das páginas
          geradas segue exatamente a sequência definida abaixo.
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
      {pdfBlobUrl ? (
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-[#3E8E5A]" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
              PDF gerado com sucesso!
            </CardTitle>
            <CardDescription className="text-sm text-[#78818E] dark:text-muted-foreground max-w-md mx-auto">
              Suas imagens foram reunidas em um único documento PDF pronto para download.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <div className="max-w-md mx-auto rounded-[10px] border border-[#E4E7EB] dark:border-border bg-[#F5F6F8]/60 dark:bg-muted/20 p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center text-[#78818E] dark:text-muted-foreground">
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Imagens processadas:
                </span>
                <span className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                  {resultImagesCount} imagem(ns)
                </span>
              </div>
              <div className="flex justify-between items-center text-[#78818E] dark:text-muted-foreground">
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Páginas geradas:
                </span>
                <span className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                  {resultPageCount} página(s)
                </span>
              </div>
              <div className="flex justify-between items-center text-[#78818E] dark:text-muted-foreground">
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Configuração de página:
                </span>
                <span className="font-semibold text-[#252B34] dark:text-foreground">
                  {layout === 'a4' ? 'Padrão A4 (Auto-orientação)' : 'Tamanho Original'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#78818E] dark:text-muted-foreground">
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Tamanho do arquivo:
                </span>
                <span className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                  {formatBytes(resultSizeBytes)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <Button
                asChild
                className="w-full sm:w-auto flex-1 h-9 bg-[#C9922A] hover:bg-[#b58324] text-white text-xs font-semibold rounded-md shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#C9922A]"
              >
                <a href={pdfBlobUrl} download={outputFileName}>
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
                Iniciar nova conversão
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ÁREA DE SELEÇÃO, LISTA E PROCESSAMENTO */
        <div className="space-y-6">
          {/* Zona de Drop / Seleção de Imagens */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-[10px] border-2 border-dashed transition-all p-8 text-center flex flex-col items-center justify-center cursor-pointer ${
              isDragging
                ? 'border-[#C9922A] bg-[#FAF8F2] dark:bg-muted/30 scale-[1.005]'
                : 'border-[#E4E7EB] dark:border-border bg-white dark:bg-card hover:border-[#C9922A]/60 hover:bg-[#FAF8F2]/30 dark:hover:bg-muted/10'
            }`}
            onClick={() => !isConverting && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={handleInputChange}
              disabled={isConverting || isValidatingFiles}
            />

            <div className="h-12 w-12 rounded-full bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border text-[#C9922A] flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-[#C9922A]" />
            </div>

            <h3 className="text-base font-bold text-[#252B34] dark:text-foreground tracking-tight">
              Clique para selecionar ou arraste suas imagens JPG e PNG
            </h3>
            <p className="text-xs sm:text-sm text-[#78818E] dark:text-muted-foreground mt-1 max-w-md">
              Selecione uma ou mais fotos ou ilustrações. Você poderá reordená-las, remover
              individualmente e escolher o formato de página antes de gerar o PDF.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-4 text-xs font-semibold border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
                disabled={isConverting || isValidatingFiles}
              >
                {isValidatingFiles ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-[#C9922A]" />
                    Lendo imagens...
                  </>
                ) : (
                  <>Selecionar Imagens</>
                )}
              </Button>
            </div>
          </div>

          {/* Opções de Configuração de Página */}
          <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C9922A]" />
                <CardTitle className="text-sm font-bold text-[#252B34] dark:text-foreground tracking-tight">
                  Configuração das Páginas
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-[#78818E] dark:text-muted-foreground">
                Defina como as imagens serão posicionadas em cada página do documento PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <RadioGroup
                value={layout}
                onValueChange={(val) => setLayout(val as ImagePageLayout)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                disabled={isConverting}
              >
                <div
                  className={`flex items-start gap-3 p-3.5 rounded-[8px] border transition-all cursor-pointer ${
                    layout === 'a4'
                      ? 'border-[#C9922A] bg-[#FAF8F2]/60 dark:bg-muted/30 shadow-xs'
                      : 'border-[#E4E7EB] dark:border-border hover:border-[#C9922A]/40'
                  }`}
                  onClick={() => !isConverting && setLayout('a4')}
                >
                  <RadioGroupItem value="a4" id="layout-a4" className="mt-0.5" />
                  <div className="space-y-1">
                    <Label
                      htmlFor="layout-a4"
                      className="text-xs sm:text-sm font-bold text-[#252B34] dark:text-foreground cursor-pointer"
                    >
                      Padrão A4 (Recomendado)
                    </Label>
                    <p className="text-[11px] sm:text-xs text-[#78818E] dark:text-muted-foreground leading-relaxed">
                      Ajusta a imagem proporcionalmente em folha A4 com orientação automática
                      (retrato/paisagem), margens discretas, sem distorção e sem cortes.
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 p-3.5 rounded-[8px] border transition-all cursor-pointer ${
                    layout === 'original'
                      ? 'border-[#C9922A] bg-[#FAF8F2]/60 dark:bg-muted/30 shadow-xs'
                      : 'border-[#E4E7EB] dark:border-border hover:border-[#C9922A]/40'
                  }`}
                  onClick={() => !isConverting && setLayout('original')}
                >
                  <RadioGroupItem value="original" id="layout-original" className="mt-0.5" />
                  <div className="space-y-1">
                    <Label
                      htmlFor="layout-original"
                      className="text-xs sm:text-sm font-bold text-[#252B34] dark:text-foreground cursor-pointer"
                    >
                      Tamanho Original da Imagem
                    </Label>
                    <p className="text-[11px] sm:text-xs text-[#78818E] dark:text-muted-foreground leading-relaxed">
                      Cada página do PDF terá as dimensões exatas da respectiva imagem (em pontos),
                      preservando proporções originais para gráficos ou plantas técnicas.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Grade / Lista de Imagens Selecionadas */}
          {images.length > 0 && (
            <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
              <div className="p-4 sm:px-6 sm:py-4 border-b border-[#E4E7EB]/80 dark:border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F5F6F8]/60 dark:bg-muted/20">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-[#FAF8F2] dark:bg-muted/40 flex items-center justify-center text-[#C9922A]">
                      <FileImage className="w-4 h-4 text-[#C9922A]" />
                    </div>
                    <h2 className="text-sm font-bold text-[#252B34] dark:text-foreground tracking-tight">
                      Imagens selecionadas ({images.length})
                    </h2>
                  </div>
                  <p className="text-xs text-[#78818E] dark:text-muted-foreground mt-1">
                    Tamanho total:{' '}
                    <strong className="text-[#252B34] dark:text-foreground font-semibold tabular-nums">
                      {formatBytes(totalSizeBytes)}
                    </strong>
                    {' • '}
                    Arraste os cards ou use as setas para definir a ordem das páginas no PDF.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isConverting}
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
                    disabled={isConverting}
                    className="h-8 px-3 text-xs font-medium text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Limpar tudo
                  </Button>
                </div>
              </div>

              {/* Grade visual responsiva com miniaturas reais */}
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((item, idx) => {
                  const isInvalid = item.validationStatus === 'invalid'
                  const isBeingDragged = draggedIndex === idx
                  const isOver = dragOverIndex === idx

                  return (
                    <div
                      key={item.id}
                      draggable={!isConverting && !isInvalid}
                      onDragStart={(e) => handleCardDragStart(e, idx)}
                      onDragOver={(e) => handleCardDragOver(e, idx)}
                      onDragLeave={(e) => handleCardDragLeave(e, idx)}
                      onDrop={(e) => handleCardDrop(e, idx)}
                      onDragEnd={handleCardDragEnd}
                      className={`relative flex flex-col justify-between rounded-[8px] border transition-all duration-150 overflow-hidden bg-white dark:bg-card ${
                        isBeingDragged
                          ? 'opacity-40 scale-95 border-dashed border-[#C9922A]'
                          : isOver
                            ? 'border-[#C9922A] ring-2 ring-[#C9922A]/20 scale-[1.01]'
                            : isInvalid
                              ? 'border-red-300 dark:border-red-900/60 bg-red-50/30'
                              : 'border-[#E4E7EB] dark:border-border hover:border-[#C9922A]/50 hover:shadow-xs'
                      }`}
                    >
                      {/* Topo do card: Número de página e Ação rápida */}
                      <div className="p-2.5 pb-2 flex items-center justify-between border-b border-[#E4E7EB]/60 dark:border-border/40 bg-[#FAF8F2]/40 dark:bg-muted/10">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-[#FAF8F2] dark:bg-muted border border-[#E4E7EB] text-[#C9922A] flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] font-medium text-[#78818E] dark:text-muted-foreground uppercase tracking-wider">
                            Pág. {idx + 1}
                          </span>
                          {item.isEdited && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[#C9922A]/15 text-[#C9922A] border border-[#C9922A]/30">
                              {item.filterMode === 'shadow_removal'
                                ? `Sem sombra (${item.shadowIntensity === 'low' ? 'Suave' : item.shadowIntensity === 'high' ? 'Forte' : 'Média'})`
                                : item.filterMode === 'enhance'
                                  ? 'Melhorada'
                                  : 'Editada'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-[#78818E] hover:text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                            disabled={isConverting}
                            onClick={() => removeItem(item.id)}
                            title="Remover imagem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Miniatura visual da imagem com botão de overlay para editar */}
                      <div className="relative aspect-[4/3] bg-[#F5F6F8] dark:bg-muted/30 flex items-center justify-center overflow-hidden p-2 group/thumb">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain rounded-[4px] shadow-2xs"
                            loading="lazy"
                          />
                        ) : (
                          <div className="text-center p-2 text-[#B4453C]">
                            <Ban className="w-6 h-6 mx-auto mb-1 text-[#B4453C]" />
                            <span className="text-[10px] font-semibold">Sem miniatura</span>
                          </div>
                        )}

                        {/* Botão de Atalho Rápido "Editar imagem" no hover da miniatura */}
                        {!isInvalid && !isConverting && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2.5 text-[11px] font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white shadow-sm rounded"
                              onClick={() => handleOpenEditor(item)}
                            >
                              <Crop className="w-3 h-3 mr-1" />
                              Editar imagem
                            </Button>
                          </div>
                        )}

                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/60 text-white backdrop-blur-xs">
                          {item.type === 'image/jpeg' ? 'JPG' : 'PNG'}
                        </span>
                      </div>

                      {/* Informações da imagem */}
                      <div className="p-2.5 space-y-1.5">
                        <p
                          className="text-xs font-semibold text-[#252B34] dark:text-foreground truncate"
                          title={item.name}
                        >
                          {item.name}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-[#78818E] dark:text-muted-foreground tabular-nums">
                          <span>{formatBytes(item.size)}</span>
                          {item.width && item.height ? (
                            <span>
                              {item.width}×{item.height}px
                            </span>
                          ) : null}
                        </div>

                        {isInvalid && (
                          <p className="text-[10px] text-[#B4453C] font-medium leading-tight">
                            {item.errorMessage || 'Arquivo de imagem inválido.'}
                          </p>
                        )}

                        {/* Ação Principal: Editar Imagem + Reordenação */}
                        <div className="pt-1.5 space-y-1.5 border-t border-[#E4E7EB]/60 dark:border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px] font-semibold border-[#E4E7EB] dark:border-border text-[#252B34] dark:text-foreground hover:bg-[#FAF8F2] hover:text-[#C9922A] hover:border-[#C9922A]/40 rounded flex-1 shadow-2xs"
                              disabled={isInvalid || isConverting}
                              onClick={() => handleOpenEditor(item)}
                              title="Editar limites, bordas e rotação (estilo CamScanner)"
                            >
                              <Crop className="w-3 h-3 mr-1 text-[#C9922A]" />
                              Editar imagem
                            </Button>

                            {item.isEdited && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-1.5 text-[10px] text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] rounded"
                                disabled={isConverting}
                                onClick={(e) => handleRestoreItemOriginal(item.id, e)}
                                title="Desfazer edição e restaurar original"
                              >
                                Reverter
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[10px] text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded flex-1"
                              disabled={idx === 0 || isConverting}
                              onClick={() => moveLeft(idx)}
                              title="Mover para a esquerda"
                            >
                              <MoveLeft className="w-3 h-3 mr-1" />
                              Anterior
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[10px] text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded flex-1"
                              disabled={idx === images.length - 1 || isConverting}
                              onClick={() => moveRight(idx)}
                              title="Mover para a direita"
                            >
                              Próxima
                              <MoveRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Painel de Progresso / Em Andamento */}
          {isConverting && (
            <Card className="rounded-[10px] border border-[#C9922A]/40 bg-[#FAF8F2]/60 dark:bg-muted/20">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-5 h-5 text-[#C9922A] animate-spin" />
                    <div>
                      <h4 className="text-sm font-bold text-[#252B34] dark:text-foreground">
                        Convertendo imagens em PDF...
                      </h4>
                      <p className="text-xs text-[#78818E] dark:text-muted-foreground">
                        {progress?.phase === 'saving'
                          ? 'Finalizando e compactando o documento PDF...'
                          : `Processando imagem ${progress?.currentIndex ?? 0} de ${progress?.totalImages}: ${progress?.currentImageName || ''}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs text-[#B4453C] border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                    onClick={handleCancelConvert}
                  >
                    Cancelar
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Progress value={progress?.percent ?? 0} className="h-2" />
                  <div className="flex justify-between text-[11px] text-[#78818E] dark:text-muted-foreground">
                    <span>
                      Progresso real: {progress?.currentIndex ?? 0} de{' '}
                      {progress?.totalImages ?? images.length} páginas processadas
                    </span>
                    <span className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                      {progress?.percent ?? 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão de Ação Principal */}
          {images.length > 0 && !isConverting && (
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                size="lg"
                onClick={handleConvert}
                disabled={images.length === 0 || hasInvalidItem || isValidatingFiles}
                className="w-full sm:w-auto h-9 px-6 bg-[#C9922A] hover:bg-[#b58324] text-white text-xs font-semibold rounded-md shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#C9922A]"
              >
                <FileImage className="w-4 h-4 mr-2" />
                Converter {validImagesCount} {validImagesCount === 1 ? 'imagem' : 'imagens'} para
                PDF
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
          Suas imagens são decodificadas e convertidas exclusivamente no navegador do seu
          dispositivo. Nenhum arquivo ou dado é enviado para servidores externos, PocketBase ou
          nuvem, garantindo sigilo absoluto conforme as diretrizes institucionais.
        </p>
      </div>

      {/* Modal de Edição Inteligente (CamScanner Bloco 1) */}
      {editingImageItem && (
        <ImageEditorModal
          isOpen={Boolean(editingImageItem)}
          onClose={() => setEditingImageItem(null)}
          imageName={editingImageItem.name}
          imageType={editingImageItem.type}
          originalBuffer={editingImageItem.originalBuffer}
          onApply={handleApplyEditor}
        />
      )}
    </div>
  )
}
