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
  RotateCcw,
  Sparkles,
  FileOutput,
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

  // Modalidade de operação: 'organize' (Organizar / Excluir) ou 'extract' (Extrair páginas)
  const [activeMode, setActiveMode] = useState<'organize' | 'extract'>('organize')

  // Estado do PDF.js para renderização de miniaturas
  const [pdfJsDoc, setPdfJsDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [originalRotations, setOriginalRotations] = useState<number[]>([])
  const [thumbnailLoadError, setThumbnailLoadError] = useState<string | null>(null)

  // Páginas marcadas para EXCLUSÃO na modalidade 'organize' (1-based, ex: página original 4)
  const [excludedPages, setExcludedPages] = useState<Set<number>>(new Set())

  // Páginas selecionadas para EXTRAÇÃO na modalidade 'extract' (1-based, ex: páginas originais 6, 2, 4)
  const [selectedPagesForExtract, setSelectedPagesForExtract] = useState<Set<number>>(new Set())

  // Ordem atual das páginas (array com números originais 1-based, ex: [6, 1, 2, 3, 4, 5])
  const [pageOrder, setPageOrder] = useState<number[]>([])

  // Estado de Drag and Drop
  const [draggedPage, setDraggedPage] = useState<number | null>(null)
  const [dragOverPage, setDragOverPage] = useState<number | null>(null)
  const [dropIndicator, setDropIndicator] = useState<'before' | 'after' | null>(null)

  // Resultado
  const [organizedBlobUrl, setOrganizedBlobUrl] = useState<string | null>(null)
  const [outputFileName, setOutputFileName] = useState<string>('documento-organizado.pdf')
  const [resultTotalPages, setResultTotalPages] = useState<number>(0)
  const [resultExcludedPages, setResultExcludedPages] = useState<number>(0)
  const [resultRemainingPages, setResultRemainingPages] = useState<number>(0)
  const [resultSelectedPages, setResultSelectedPages] = useState<number>(0)
  const [resultUnselectedPages, setResultUnselectedPages] = useState<number>(0)
  const [resultMode, setResultMode] = useState<'organize' | 'extract'>('organize')
  const [resultReorderedCount, setResultReorderedCount] = useState<number>(0)
  const [resultIsOrderModified, setResultIsOrderModified] = useState(false)
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
    setSelectedPagesForExtract(new Set()) // Redefinir páginas para extração
    setPageOrder([])
    setDraggedPage(null)
    setDragOverPage(null)
    setDropIndicator(null)
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

      // Inicializa ordem natural 1..N
      const initialOrder = Array.from({ length: pages }, (_, i) => i + 1)
      setPageOrder(initialOrder)

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
          'Não foi possível inicializar as miniaturas visuais deste documento. A reordenação e a exclusão continuarão disponíveis normalmente.',
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

  // Quantidade de páginas cuja posição visual atual difere da posição original (1-based)
  const reorderedPagesCount = useMemo(() => {
    if (!doc || pageOrder.length === 0) return 0
    let count = 0
    pageOrder.forEach((origNum, posIdx) => {
      if (origNum !== posIdx + 1) {
        count++
      }
    })
    return count
  }, [doc, pageOrder])

  const isOrderModified = reorderedPagesCount > 0

  // Verifica se há alguma alteração realizada (reordenação ou exclusão)
  const hasAnyChanges = useMemo(() => {
    return totalExcludedCount > 0 || isOrderModified
  }, [totalExcludedCount, isOrderModified])

  // Lista de páginas preservadas na sequência final ordenada
  const finalRemainingSequence = useMemo(() => {
    return pageOrder.filter((origPage) => !excludedPages.has(origPage))
  }, [pageOrder, excludedPages])

  // Estatísticas calculadas para EXTRAÇÃO
  const totalExtractSelectedCount = selectedPagesForExtract.size
  const totalExtractUnselectedCount = useMemo(() => {
    if (!doc) return 0
    return Math.max(0, doc.pageCount - totalExtractSelectedCount)
  }, [doc, totalExtractSelectedCount])

  // Sequência de páginas para extração respeitando a ordem visual atual
  const finalExtractSequence = useMemo(() => {
    return pageOrder.filter((origPage) => selectedPagesForExtract.has(origPage))
  }, [pageOrder, selectedPagesForExtract])

  // Alternância segura de modalidade
  const handleSwitchMode = useCallback((newMode: 'organize' | 'extract') => {
    setErrorMessage(null)
    cleanupOutput()
    setActiveMode(newMode)
  }, [])

  // Ações de seleção para exclusão (modalidade 'organize')
  const handleToggleExcludePage = useCallback((originalPageNumber: number) => {
    setErrorMessage(null)
    setExcludedPages((prev) => {
      const next = new Set(prev)
      if (next.has(originalPageNumber)) {
        next.delete(originalPageNumber)
      } else {
        next.add(originalPageNumber)
      }
      return next
    })
  }, [])

  // Ações de seleção para extração (modalidade 'extract')
  const handleToggleExtractPage = useCallback((originalPageNumber: number) => {
    setErrorMessage(null)
    setSelectedPagesForExtract((prev) => {
      const next = new Set(prev)
      if (next.has(originalPageNumber)) {
        next.delete(originalPageNumber)
      } else {
        next.add(originalPageNumber)
      }
      return next
    })
  }, [])

  // Selecionar todas as páginas para extração
  const handleSelectAllForExtract = useCallback(() => {
    if (!doc) return
    const all = new Set<number>()
    for (let i = 1; i <= doc.pageCount; i++) {
      all.add(i)
    }
    setSelectedPagesForExtract(all)
    setErrorMessage(null)
  }, [doc])

  // Limpar seleção de extração
  const handleClearExtractSelection = useCallback(() => {
    setSelectedPagesForExtract(new Set())
    setErrorMessage(null)
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

  // Restaurar ordem original (sem alterar marcações de exclusão)
  const handleRestoreOriginalOrder = useCallback(() => {
    if (!doc) return
    const naturalOrder = Array.from({ length: doc.pageCount }, (_, i) => i + 1)
    setPageOrder(naturalOrder)
    setErrorMessage(null)
  }, [doc])

  // Mover página uma posição para a esquerda (anterior)
  const handleMoveLeft = useCallback((originalPageNumber: number) => {
    setPageOrder((prev) => {
      const idx = prev.indexOf(originalPageNumber)
      if (idx <= 0) return prev
      const next = [...prev]
      const temp = next[idx - 1]
      next[idx - 1] = next[idx]
      next[idx] = temp
      return next
    })
    setErrorMessage(null)
  }, [])

  // Mover página uma posição para a direita (posterior)
  const handleMoveRight = useCallback((originalPageNumber: number) => {
    setPageOrder((prev) => {
      const idx = prev.indexOf(originalPageNumber)
      if (idx < 0 || idx >= prev.length - 1) return prev
      const next = [...prev]
      const temp = next[idx + 1]
      next[idx + 1] = next[idx]
      next[idx] = temp
      return next
    })
    setErrorMessage(null)
  }, [])

  // Drag and Drop de páginas
  const handleDragStartCard = useCallback(
    (e: React.DragEvent<HTMLDivElement>, originalPageNumber: number) => {
      setDraggedPage(originalPageNumber)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(originalPageNumber))
    },
    [],
  )

  const handleDragOverCard = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetOriginalPageNumber: number) => {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'

      if (draggedPage === null || draggedPage === targetOriginalPageNumber) {
        setDragOverPage(null)
        setDropIndicator(null)
        return
      }

      setDragOverPage(targetOriginalPageNumber)

      // Identifica se soltará antes ou depois com base na coordenada X do cursor no card
      const rect = e.currentTarget.getBoundingClientRect()
      const relX = e.clientX - rect.left
      const isAfter = relX > rect.width / 2
      setDropIndicator(isAfter ? 'after' : 'before')
    },
    [draggedPage],
  )

  const handleDragLeaveCard = useCallback(() => {
    setDragOverPage(null)
    setDropIndicator(null)
  }, [])

  const handleDropCard = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetOriginalPageNumber: number) => {
      e.preventDefault()
      e.stopPropagation()

      if (draggedPage === null || draggedPage === targetOriginalPageNumber) {
        setDraggedPage(null)
        setDragOverPage(null)
        setDropIndicator(null)
        return
      }

      const rect = e.currentTarget.getBoundingClientRect()
      const relX = e.clientX - rect.left
      const isAfter = relX > rect.width / 2

      setPageOrder((prev) => {
        const fromIdx = prev.indexOf(draggedPage)
        if (fromIdx < 0) return prev

        const next = [...prev]
        // Remove da posição de origem
        next.splice(fromIdx, 1)

        // Localiza nova posição do alvo
        let toIdx = next.indexOf(targetOriginalPageNumber)
        if (toIdx < 0) return prev

        if (isAfter) {
          toIdx += 1
        }

        // Insere na nova posição
        next.splice(toIdx, 0, draggedPage)
        return next
      })

      setDraggedPage(null)
      setDragOverPage(null)
      setDropIndicator(null)
      setErrorMessage(null)
    },
    [draggedPage],
  )

  const handleDragEndCard = useCallback(() => {
    setDraggedPage(null)
    setDragOverPage(null)
    setDropIndicator(null)
  }, [])

  // Executar processamento de exclusão e/ou reordenação
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

    if (!hasAnyChanges) {
      setErrorMessage(
        'Nenhuma alteração foi realizada. Reordene as páginas arrastando/movendo ou selecione páginas para exclusão antes de gerar o novo PDF.',
      )
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
      mode: 'organize',
      pageOrder,
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
        setResultSelectedPages(0)
        setResultUnselectedPages(0)
        setResultMode('organize')
        setResultReorderedCount(result.reorderedCount ?? reorderedPagesCount)
        setResultIsOrderModified(result.isOrderModified ?? isOrderModified)
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

  // Executar processamento de EXTRAÇÃO de páginas
  const handleProcessExtract = async () => {
    if (!doc) {
      setErrorMessage('Selecione um arquivo PDF para extrair páginas.')
      return
    }

    if (doc.validationStatus === 'invalid') {
      setErrorMessage(
        doc.errorMessage ||
          'O arquivo selecionado é inválido ou está protegido por senha. Selecione outro documento.',
      )
      return
    }

    if (totalExtractSelectedCount === 0) {
      setErrorMessage(
        'Nenhuma página foi selecionada para extração. Selecione ao menos uma página pelas miniaturas.',
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
      mode: 'extract',
      pageOrder,
      selectedPages: Array.from(selectedPagesForExtract),
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
        setOutputFileName(result.fileName || 'documento-extraido.pdf')
        setResultTotalPages(result.totalOriginalPages)
        setResultExcludedPages(result.totalExcludedPages)
        setResultRemainingPages(result.totalRemainingPages)
        setResultSelectedPages(result.totalSelectedPages ?? totalExtractSelectedCount)
        setResultUnselectedPages(result.totalUnselectedPages ?? totalExtractUnselectedCount)
        setResultMode('extract')
        setResultReorderedCount(result.reorderedCount ?? reorderedPagesCount)
        setResultIsOrderModified(result.isOrderModified ?? isOrderModified)
        setResultHasSignature(result.hasSignedDocument)
        setProgress(null)
      } else {
        setErrorMessage(result.error || 'Ocorreu um erro ao extrair as páginas do documento.')
        setProgress(null)
      }
    } catch (err) {
      setIsProcessing(false)
      organizeHandleRef.current = null
      setProgress(null)
      setErrorMessage(
        `Erro inesperado durante a extração: ${err instanceof Error ? err.message : String(err)}`,
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
    setSelectedPagesForExtract(new Set())
    setPageOrder([])
    setDraggedPage(null)
    setDragOverPage(null)
    setDropIndicator(null)
    setOriginalRotations([])
    setThumbnailLoadError(null)
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12 max-w-6xl mx-auto">
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
              Organizar PDF
            </h1>
            <p className="text-sm text-[#78818E] dark:text-muted-foreground">
              Reordene, exclua ou extraia páginas específicas dos seus documentos com
              pré-visualização real.
            </p>
          </div>
        </div>
      </div>

      {/* SELETOR DE MODALIDADE (DUAS AÇÕES CLARAMENTE DISTINTAS) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-xs">
        <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleSwitchMode('organize')}
            disabled={isProcessing}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeMode === 'organize'
                ? 'bg-[#C9922A] text-white shadow-xs'
                : 'text-[#78818E] dark:text-muted-foreground hover:text-[#252B34] dark:hover:text-foreground hover:bg-[#FAF8F2] dark:hover:bg-muted/40'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Organizar / Excluir páginas</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode('extract')}
            disabled={isProcessing}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeMode === 'extract'
                ? 'bg-[#C9922A] text-white shadow-xs'
                : 'text-[#78818E] dark:text-muted-foreground hover:text-[#252B34] dark:hover:text-foreground hover:bg-[#FAF8F2] dark:hover:bg-muted/40'
            }`}
          >
            <FileOutput className="w-4 h-4" />
            <span>Extrair páginas</span>
          </button>
        </div>

        <div className="text-xs text-[#78818E] dark:text-muted-foreground px-3 py-1 flex items-center gap-1.5 hidden md:flex">
          <Info className="w-3.5 h-3.5 text-[#C9922A] shrink-0" />
          <span>
            {activeMode === 'organize'
              ? 'Modalidade Organizar/Excluir: selecione páginas para remover e reordene a sequência.'
              : 'Modalidade Extrair: selecione as páginas desejadas para compor um novo PDF na ordem visual atual.'}
          </span>
        </div>
      </div>

      {/* Alerta de Erro Geral */}
      {errorMessage && (
        <Alert
          variant="destructive"
          className="rounded-[10px] border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-[#B4453C]"
        >
          <Ban className="w-4 h-4 text-[#B4453C]" />
          <AlertTitle className="font-semibold text-xs sm:text-sm text-[#B4453C]">
            Atenção
          </AlertTitle>
          <AlertDescription className="text-xs sm:text-sm mt-1 text-[#B4453C]/90">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* SEÇÃO 1: SELEÇÃO DO DOCUMENTO */}
      {!doc ? (
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-base sm:text-lg font-bold text-[#252B34] dark:text-foreground tracking-tight">
              Selecionar documento PDF
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-[#78818E] dark:text-muted-foreground">
              Envie o documento cujas páginas deseja reorganizar ou excluir. Todo o processamento
              ocorre no seu navegador com total privacidade.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[10px] p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-[#C9922A] bg-[#FAF8F2] dark:bg-muted/30 scale-[1.005]'
                  : 'border-[#E4E7EB] dark:border-border hover:border-[#C9922A]/60 bg-white dark:bg-card hover:bg-[#FAF8F2]/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleInputChange}
              />
              <div className="h-12 w-12 rounded-full bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border text-[#C9922A] flex items-center justify-center">
                <Upload className="w-5 h-5 text-[#C9922A]" />
              </div>
              <div>
                <p className="text-base font-bold text-[#252B34] dark:text-foreground tracking-tight">
                  Arraste o arquivo PDF aqui ou clique para selecionar
                </p>
                <p className="text-xs text-[#78818E] dark:text-muted-foreground mt-1">
                  Formatos aceitos: PDF nativo (.pdf). Sem limites de páginas ou tamanho.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-8 px-4 text-xs font-semibold border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
              >
                Procurar no computador
              </Button>
            </div>

            {isValidatingFile && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-[#78818E] dark:text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-[#C9922A]" />
                <span>Validando integridade do documento...</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Card do Arquivo Carregado */
        <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
          <div className="p-4 sm:px-6 sm:py-4 border-b border-[#E4E7EB]/80 dark:border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F5F6F8]/60 dark:bg-muted/20">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-md mt-0.5 shrink-0 ${
                  doc.validationStatus === 'valid'
                    ? 'bg-[#FAF8F2] dark:bg-muted/40 text-[#C9922A] border border-[#E4E7EB] dark:border-border'
                    : 'bg-red-50 text-[#B4453C] border border-red-200'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#252B34] dark:text-foreground leading-snug break-all tracking-tight">
                  {doc.name}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#78818E] dark:text-muted-foreground mt-1">
                  <span className="tabular-nums">{formatBytes(doc.size)}</span>
                  <span>•</span>
                  <span className="tabular-nums">{doc.pageCount} página(s)</span>
                  <span>•</span>
                  <span
                    className={`font-semibold ${
                      doc.validationStatus === 'valid' ? 'text-[#3E8E5A]' : 'text-[#B4453C]'
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
                className="h-8 px-3 text-xs font-semibold border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
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
                className="h-8 px-3 text-xs font-medium text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                title="Remover documento"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Remover
              </Button>
            </div>
          </div>

          {/* Erro de Validação do Arquivo */}
          {doc.validationStatus === 'invalid' && (
            <div className="p-4 sm:p-5">
              <Alert
                variant="destructive"
                className="rounded-[10px] border border-red-200 bg-red-50 text-[#B4453C]"
              >
                <Ban className="w-4 h-4 text-[#B4453C]" />
                <AlertTitle className="font-semibold text-xs sm:text-sm">
                  Documento bloqueado
                </AlertTitle>
                <AlertDescription className="text-xs sm:text-sm mt-1">
                  {doc.errorMessage || 'O arquivo selecionado não pôde ser validado.'}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Aviso e Confirmação de Assinatura Digital */}
          {doc.validationStatus === 'valid' && doc.hasSignature && (
            <div className="p-4 sm:p-5 border-t border-[#E4E7EB]/80 dark:border-border/60">
              <div className="rounded-[10px] border border-amber-300 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#C77E1E] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#C77E1E]">
                      Indícios de Assinatura Digital Detectados
                    </h4>
                    <p className="text-xs text-amber-950/90 dark:text-amber-200/90 leading-relaxed">
                      Foram identificados campos de assinatura digital (/Sig) neste documento. A{' '}
                      {activeMode === 'extract'
                        ? 'extração de páginas gera um documento derivado e '
                        : 'reordenação ou exclusão de páginas altera a estrutura binária do arquivo e '}
                      <strong>poderá comprometer a validade criptográfica</strong> das assinaturas
                      existentes.
                    </p>
                    <p className="text-xs text-amber-950/90 dark:text-amber-200/90 leading-relaxed">
                      O documento original permanecerá intacto no seu computador. O PDF resultante
                      será uma cópia derivada devidamente identificada.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40 flex items-start gap-2.5">
                  <Checkbox
                    id="signature-confirm-organize"
                    checked={signatureConfirmed}
                    onCheckedChange={(checked) => setSignatureConfirmed(Boolean(checked))}
                    className="mt-0.5 border-[#C77E1E] data-[state=checked]:bg-[#C9922A] data-[state=checked]:border-[#C9922A]"
                  />
                  <label
                    htmlFor="signature-confirm-organize"
                    className="text-xs leading-snug cursor-pointer font-medium select-none text-amber-950 dark:text-amber-200"
                  >
                    Estou ciente de que a extração/organização gera uma cópia derivada e poderá
                    comprometer a validade criptográfica das assinaturas digitais, e desejo
                    prosseguir.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Aviso pontual caso haja erro ao carregar miniaturas */}
          {thumbnailLoadError && (
            <div className="p-4 sm:p-5 pt-0">
              <div className="text-xs text-[#C77E1E] bg-amber-50 dark:bg-amber-950/30 p-3 rounded-[10px] border border-amber-200 dark:border-amber-800/40 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>{thumbnailLoadError}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 2: BARRA DE FERRAMENTAS E CONTROLES DE ORGANIZAÇÃO / EXTRAÇÃO */}
      {doc && doc.validationStatus === 'valid' && (
        <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
          <div className="p-4 sm:px-6 sm:py-4 border-b border-[#E4E7EB]/80 dark:border-border/80 bg-[#F5F6F8]/60 dark:bg-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#252B34] dark:text-foreground tracking-tight">
                    {activeMode === 'organize'
                      ? 'Organizar e Excluir Páginas'
                      : 'Extração Visual de Páginas'}
                  </span>
                  {activeMode === 'organize' ? (
                    <>
                      {isOrderModified && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#C9922A]/10 text-[#C9922A] border border-[#C9922A]/30 tabular-nums">
                          Ordem modificada ({reorderedPagesCount} em nova posição)
                        </span>
                      )}
                      {totalExcludedCount > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-[#B4453C] border border-red-200 tabular-nums">
                          {totalExcludedCount}{' '}
                          {totalExcludedCount === 1 ? 'página marcada' : 'páginas marcadas'} para
                          exclusão
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {isOrderModified && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#C9922A]/10 text-[#C9922A] border border-[#C9922A]/30 tabular-nums">
                          Sequência personalizada ({reorderedPagesCount} em nova posição)
                        </span>
                      )}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#C9922A]/10 text-[#C9922A] border border-[#C9922A]/30 tabular-nums">
                        {totalExtractSelectedCount}{' '}
                        {totalExtractSelectedCount === 1
                          ? 'página selecionada'
                          : 'páginas selecionadas'}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-[#78818E] dark:text-muted-foreground mt-1">
                  {activeMode === 'organize' ? (
                    <>
                      Arraste e solte as miniaturas ou use os botões{' '}
                      <strong className="text-[#252B34] dark:text-foreground">
                        Anterior/Próxima
                      </strong>{' '}
                      para reordenar. Clique no card para marcar/desmarcar exclusão (semântica:
                      vermelho = remover).
                    </>
                  ) : (
                    <>
                      Selecione as páginas que deseja manter no novo PDF. Arraste ou use{' '}
                      <strong className="text-[#252B34] dark:text-foreground">
                        Anterior/Próxima
                      </strong>{' '}
                      para definir a ordem de extração. O novo PDF respeitará exatamente a sequência
                      visual atual.
                    </>
                  )}
                </p>
              </div>

              {/* Ações de Organização e Seleção Rápida Conforme a Modalidade */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Restaurar Ordem Original */}
                {isOrderModified && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRestoreOriginalOrder}
                    disabled={isProcessing}
                    className="h-8 px-3 text-xs font-semibold border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
                    title="Devolve as páginas à sequência original do documento"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1 text-[#C9922A]" />
                    Restaurar ordem
                  </Button>
                )}

                {activeMode === 'organize' ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllForExclusion}
                      disabled={isProcessing || doc.pageCount <= 1}
                      className="h-8 px-3 text-xs font-medium border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                      title="Marca páginas para exclusão (preservando ao menos uma)"
                    >
                      <CheckSquare className="w-3.5 h-3.5 mr-1 text-[#B4453C]" />
                      Marcar todas ({doc.pageCount - 1})
                    </Button>

                    {totalExcludedCount > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearExclusion}
                        disabled={isProcessing}
                        className="h-8 px-3 text-xs font-medium border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#252B34] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
                        title="Limpa todas as marcações de exclusão mantendo a ordem atual"
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
                        className="h-8 px-2.5 text-xs text-[#78818E] hover:text-[#252B34] hover:bg-[#F5F6F8] rounded-md"
                        title="Desmarca todas as exclusões"
                      >
                        <Undo2 className="w-3.5 h-3.5 mr-1" />
                        Manter todas
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllForExtract}
                      disabled={isProcessing}
                      className="h-8 px-3 text-xs font-semibold border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
                      title="Seleciona todas as páginas do documento para extração"
                    >
                      <CheckSquare className="w-3.5 h-3.5 mr-1 text-[#C9922A]" />
                      Selecionar todas ({doc.pageCount})
                    </Button>

                    {totalExtractSelectedCount > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearExtractSelection}
                        disabled={isProcessing}
                        className="h-8 px-3 text-xs font-medium border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#252B34] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
                        title="Limpa a seleção de extração"
                      >
                        <Square className="w-3.5 h-3.5 mr-1" />
                        Limpar seleção
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Resumo Dinâmico da Seleção e Ordem */}
          <div className="p-4 sm:p-5">
            {activeMode === 'organize' ? (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-[10px] bg-[#F5F6F8]/60 dark:bg-muted/20 border border-[#E4E7EB]/80 dark:border-border/60 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                      Original:
                    </span>
                    <span className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                      {doc.pageCount} págs.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                      Ordem:
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        isOrderModified
                          ? 'text-[#C9922A]'
                          : 'text-[#78818E] dark:text-muted-foreground'
                      }`}
                    >
                      {isOrderModified ? `Modificada (${reorderedPagesCount} movidas)` : 'Original'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                      A excluir (vermelho):
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        totalExcludedCount > 0
                          ? 'text-[#B4453C]'
                          : 'text-[#78818E] dark:text-muted-foreground'
                      }`}
                    >
                      {totalExcludedCount} págs.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                      Restantes no PDF:
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        totalRemainingCount > 0 ? 'text-[#3E8E5A]' : 'text-[#B4453C]'
                      }`}
                    >
                      {totalRemainingCount} págs.
                    </span>
                  </div>
                </div>

                {wouldExcludeAll && (
                  <div className="text-xs text-[#B4453C] font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Não é permitido excluir todas as páginas do documento.</span>
                  </div>
                )}
              </div>
            ) : (
              /* Modalidade Extrair: Exibe total de páginas, selecionadas para extração e fora do resultado */
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-[10px] bg-[#F5F6F8]/60 dark:bg-muted/20 border border-[#E4E7EB]/80 dark:border-border/60 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                      Total do documento:
                    </span>
                    <span className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                      {doc.pageCount} págs.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                      Ordem visual:
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        isOrderModified
                          ? 'text-[#C9922A]'
                          : 'text-[#78818E] dark:text-muted-foreground'
                      }`}
                    >
                      {isOrderModified ? `Modificada (${reorderedPagesCount} movidas)` : 'Original'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                      Para extrair (dourado):
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        totalExtractSelectedCount > 0
                          ? 'text-[#C9922A]'
                          : 'text-[#78818E] dark:text-muted-foreground'
                      }`}
                    >
                      {totalExtractSelectedCount} págs.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                      Fora do resultado:
                    </span>
                    <span className="font-semibold text-[#78818E] dark:text-muted-foreground tabular-nums">
                      {totalExtractUnselectedCount} págs.
                    </span>
                  </div>
                </div>

                {totalExtractSelectedCount === 0 && (
                  <div className="text-xs text-[#C77E1E] font-medium flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Selecione ao menos uma página pelas miniaturas para extrair.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEÇÃO 3: GRADE DE MINIATURAS VISUAIS DAS PÁGINAS COM REORDENAÇÃO */}
      {doc && doc.validationStatus === 'valid' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Páginas do Documento ({doc.pageCount})
              </h2>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                • Arraste para reposicionar ou use os botões Anterior / Próxima
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {activeMode === 'organize' ? (
                <span>
                  {totalExcludedCount} excluída(s) • {totalRemainingCount} preservada(s)
                </span>
              ) : (
                <span>
                  {totalExtractSelectedCount} para extrair • {totalExtractUnselectedCount} fora do
                  PDF
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {pageOrder.map((originalPageNumber, visualIndex) => {
              const currentPosition = visualIndex + 1
              const origRot = originalRotations[originalPageNumber - 1] || 0

              if (activeMode === 'organize') {
                const isMarked = excludedPages.has(originalPageNumber)

                return (
                  <PageThumbnailCard
                    key={`organize-page-${originalPageNumber}`}
                    pageNumber={originalPageNumber}
                    currentPosition={currentPosition}
                    totalCount={pageOrder.length}
                    pdfDoc={pdfJsDoc}
                    originalRotation={origRot}
                    deltaRotation={0}
                    isSelected={isMarked}
                    mode="organize"
                    isMarkedForDeletion={isMarked}
                    onToggleSelect={handleToggleExcludePage}
                    onMoveLeft={handleMoveLeft}
                    onMoveRight={handleMoveRight}
                    draggable={!isProcessing}
                    onDragStart={handleDragStartCard}
                    onDragOver={handleDragOverCard}
                    onDragLeave={handleDragLeaveCard}
                    onDrop={handleDropCard}
                    onDragEnd={handleDragEndCard}
                    isDraggingThis={draggedPage === originalPageNumber}
                    isDragOverThis={dragOverPage === originalPageNumber}
                    dropPositionIndicator={
                      dragOverPage === originalPageNumber ? dropIndicator : null
                    }
                    disabled={isProcessing}
                  />
                )
              } else {
                // Modalidade 'extract'
                const isSelectedForExtract = selectedPagesForExtract.has(originalPageNumber)

                return (
                  <PageThumbnailCard
                    key={`extract-page-${originalPageNumber}`}
                    pageNumber={originalPageNumber}
                    currentPosition={currentPosition}
                    totalCount={pageOrder.length}
                    pdfDoc={pdfJsDoc}
                    originalRotation={origRot}
                    deltaRotation={0}
                    isSelected={isSelectedForExtract}
                    mode="extract"
                    isMarkedForDeletion={false}
                    onToggleSelect={handleToggleExtractPage}
                    onMoveLeft={handleMoveLeft}
                    onMoveRight={handleMoveRight}
                    draggable={!isProcessing}
                    onDragStart={handleDragStartCard}
                    onDragOver={handleDragOverCard}
                    onDragLeave={handleDragLeaveCard}
                    onDrop={handleDropCard}
                    onDragEnd={handleDragEndCard}
                    isDraggingThis={draggedPage === originalPageNumber}
                    isDragOverThis={dragOverPage === originalPageNumber}
                    dropPositionIndicator={
                      dragOverPage === originalPageNumber ? dropIndicator : null
                    }
                    disabled={isProcessing}
                  />
                )
              }
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO 4: AÇÃO DE CONFIRMAÇÃO / PROCESSAMENTO */}
      {doc && doc.validationStatus === 'valid' && !organizedBlobUrl && (
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
          <CardContent className="p-5 sm:p-6">
            {activeMode === 'organize' ? (
              /* Confirmação do Modo Organizar / Excluir */
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#252B34] dark:text-foreground tracking-tight">
                    Confirmação de organização e exclusão
                  </p>
                  <div className="text-xs text-[#78818E] dark:text-muted-foreground space-y-1 leading-relaxed">
                    {!hasAnyChanges ? (
                      <p>
                        Nenhuma alteração realizada. Arraste as miniaturas ou utilize os botões
                        Anterior/Próxima para alterar a ordem, ou clique em uma miniatura para
                        marcar para exclusão.
                      </p>
                    ) : wouldExcludeAll ? (
                      <p className="text-[#B4453C] font-semibold">
                        Todas as páginas foram marcadas para exclusão. Ao menos uma página deve ser
                        preservada.
                      </p>
                    ) : (
                      <p>
                        Documento original:{' '}
                        <strong className="text-[#252B34] dark:text-foreground">
                          {doc.pageCount} páginas
                        </strong>
                        .
                        {totalExcludedCount > 0 && (
                          <>
                            {' '}
                            Excluindo{' '}
                            <strong className="text-[#B4453C]">
                              {totalExcludedCount} página(s)
                            </strong>{' '}
                            (
                            {Array.from(excludedPages)
                              .sort((a, b) => a - b)
                              .map((p) => `Orig. ${p}`)
                              .join(', ')}
                            ).
                          </>
                        )}
                        {isOrderModified && (
                          <>
                            {' '}
                            Ordem modificada:{' '}
                            <strong className="text-[#C9922A]">
                              {reorderedPagesCount} página(s)
                            </strong>{' '}
                            em nova posição.
                          </>
                        )}{' '}
                        Resultado:{' '}
                        <strong className="text-[#3E8E5A]">{totalRemainingCount} página(s)</strong>
                        {finalRemainingSequence.length > 0 && (
                          <span className="text-[#78818E] dark:text-muted-foreground font-mono ml-1">
                            (Sequência final:{' '}
                            {finalRemainingSequence.map((p) => `p.${p}`).join(', ')})
                          </span>
                        )}
                        .
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    type="button"
                    onClick={handleProcessOrganize}
                    disabled={
                      isProcessing ||
                      !hasAnyChanges ||
                      wouldExcludeAll ||
                      (doc.hasSignature && !signatureConfirmed)
                    }
                    className="h-9 px-6 bg-[#C9922A] hover:bg-[#b58324] text-white text-xs font-semibold rounded-md shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#C9922A]"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Gerar PDF organizado
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Confirmação do Modo Extrair Páginas */
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#252B34] dark:text-foreground tracking-tight">
                    Resumo da extração de páginas
                  </p>
                  <div className="text-xs text-[#78818E] dark:text-muted-foreground space-y-1 leading-relaxed">
                    {totalExtractSelectedCount === 0 ? (
                      <p className="text-[#C77E1E] font-medium">
                        Nenhuma página selecionada. Clique nas miniaturas para selecionar as páginas
                        que farão parte do novo PDF.
                      </p>
                    ) : (
                      <p>
                        Documento original:{' '}
                        <strong className="text-[#252B34] dark:text-foreground">
                          {doc.pageCount} páginas
                        </strong>
                        . Quantidade selecionada:{' '}
                        <strong className="text-[#C9922A]">
                          {totalExtractSelectedCount} página(s)
                        </strong>
                        . Fora do resultado:{' '}
                        <strong>{totalExtractUnselectedCount} página(s)</strong>.
                        {isOrderModified && (
                          <>
                            {' '}
                            Ordem personalizada: <strong>
                              {reorderedPagesCount} página(s)
                            </strong> em
                            nova posição visual.
                          </>
                        )}
                        {finalExtractSequence.length > 0 && (
                          <span className="block mt-1 text-[#252B34] dark:text-foreground font-mono">
                            Sequência de páginas selecionadas:{' '}
                            <span className="text-[#C9922A] font-bold">
                              {finalExtractSequence.map((p) => `p.${p}`).join(', ')}
                            </span>
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    type="button"
                    onClick={handleProcessExtract}
                    disabled={
                      isProcessing ||
                      totalExtractSelectedCount === 0 ||
                      (doc.hasSignature && !signatureConfirmed)
                    }
                    className="h-9 px-6 bg-[#C9922A] hover:bg-[#b58324] text-white text-xs font-semibold rounded-md shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#C9922A]"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extraindo...
                      </>
                    ) : (
                      <>
                        <FileOutput className="w-4 h-4 mr-2" />
                        Extrair páginas e gerar PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Progresso do Processamento */}
            {isProcessing && progress && (
              <div className="mt-5 pt-4 border-t border-[#E4E7EB]/80 dark:border-border/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#78818E] dark:text-muted-foreground">
                  <span className="font-semibold text-[#252B34] dark:text-foreground">
                    {progress.currentLabel}
                  </span>
                  {progress.totalPages > 0 && progress.currentPage > 0 && (
                    <span className="tabular-nums">
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
                    className="h-7 px-2.5 text-xs text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
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
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden animate-fade-in-up">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#3E8E5A] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#3E8E5A]" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold tracking-tight text-[#252B34] dark:text-foreground">
                  {resultMode === 'extract'
                    ? 'Páginas extraídas com sucesso!'
                    : 'Documento organizado com sucesso!'}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-[#78818E] dark:text-muted-foreground">
                  {resultMode === 'extract'
                    ? 'O novo PDF foi gerado contendo somente as páginas selecionadas, preservando a sequência visual definida e a fidelidade vetorial original.'
                    : 'O documento foi reconstruído com base na nova sequência e exclusões definidas, preservando a integridade vetorial, dimensões, imagens e formatação das páginas.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-0 space-y-4">
            <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-[#F5F6F8]/60 dark:bg-muted/20 p-4 space-y-2 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                  Nome do arquivo gerado:
                </span>
                <span className="font-mono font-semibold text-[#252B34] dark:text-foreground break-all">
                  {outputFileName}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                  Páginas do documento original:
                </span>
                <span className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                  {resultTotalPages}
                </span>
              </div>
              {resultMode === 'extract' ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                      Páginas selecionadas e extraídas:
                    </span>
                    <span className="font-semibold text-[#C9922A] tabular-nums">
                      {resultSelectedPages || resultRemainingPages}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                      Páginas deixadas fora do novo PDF:
                    </span>
                    <span className="font-semibold text-[#78818E] dark:text-muted-foreground tabular-nums">
                      {resultUnselectedPages}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                    Páginas excluídas:
                  </span>
                  <span className="font-semibold text-[#B4453C] tabular-nums">
                    {resultExcludedPages}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                  Sequência de páginas:
                </span>
                <span className="font-semibold text-[#C9922A]">
                  {resultIsOrderModified
                    ? `Ordem personalizada (${resultReorderedCount} páginas em nova posição)`
                    : 'Ordem original preservada'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#78818E] dark:text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                  Total de páginas no PDF gerado:
                </span>
                <span className="font-semibold text-[#3E8E5A] tabular-nums">
                  {resultRemainingPages}
                </span>
              </div>
              {resultHasSignature && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[#C77E1E]">
                  <span className="uppercase tracking-wider text-[11px] font-semibold">
                    Natureza do arquivo:
                  </span>
                  <span className="font-semibold">Cópia derivada de documento assinado</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={organizedBlobUrl}
                download={outputFileName}
                className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors bg-[#C9922A] text-white hover:bg-[#b58324] h-9 px-6 shadow-sm no-underline focus-visible:ring-2 focus-visible:ring-[#C9922A]"
              >
                <Download className="w-4 h-4 mr-2" />
                {resultMode === 'extract' ? 'Baixar PDF Extraído' : 'Baixar PDF Organizado'}
              </a>

              <Button
                type="button"
                variant="outline"
                onClick={handleResetForNewOperation}
                className="h-9 px-4 text-xs font-medium border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
              >
                Iniciar nova operação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informativo de Privacidade e Segurança */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-4 sm:p-5 flex items-center gap-3.5 text-[#78818E] dark:text-muted-foreground shadow-xs">
        <div className="h-9 w-9 rounded-md bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border flex items-center justify-center text-[#C9922A] shrink-0">
          <ShieldCheck className="w-5 h-5 text-[#C9922A]" />
        </div>
        <p className="text-xs sm:text-sm leading-relaxed">
          <strong className="text-[#252B34] dark:text-foreground font-semibold">
            Processamento 100% Local:
          </strong>{' '}
          Os dados dos seus documentos não são transmitidos para servidores externos ou bancos de
          dados, mantendo o sigilo e a privacidade dos processos jurídicos.
        </p>
      </div>
    </div>
  )
}
