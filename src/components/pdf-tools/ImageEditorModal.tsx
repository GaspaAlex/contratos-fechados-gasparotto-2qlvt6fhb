// src/components/pdf-tools/ImageEditorModal.tsx
/**
 * Modal de Edição Inteligente de Imagem (estilo CamScanner)
 * Sistema de Gestão da Advocacia Gasparotto (Identidade visual Grafite Premium)
 *
 * Funcionalidades do Bloco 1:
 * - Detecção automática dos limites do documento com OpenCV.js (lazy loaded)
 * - Indicador de incerteza da detecção e ajuste manual imediato
 * - 4 cantos arrastáveis independentes com coordenadas convertidas da prévia para a imagem real
 * - Polígono verde institucional semitransparente destacando a área a ser preservada
 * - Rotação de 90° à esquerda e à direita mantendo sincronização de coordenadas dos cantos
 * - "Detectar novamente"
 * - "Visualizar recorte" (alterna entre visualização do corte e modo edição)
 * - "Restaurar original" (desfaz recortes, rotações e distorções da sessão)
 * - "Cancelar" (mantém imagem da lista intacta)
 * - "Aplicar ajustes" (gera blob e buffer atualizados sem alterar o original arquivado)
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  RotateCcw,
  RotateCw,
  Sparkles,
  Eye,
  Check,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  HelpCircle,
  Crop,
  Layers,
  Undo2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  type DocumentCorners,
  type Point2D,
  isValidConvexQuad,
  orderCorners,
  estimateQuadTiltDegrees,
} from '@/lib/pdf-tools/scanner/perspective-math'
import { Slider } from '@/components/ui/slider'
import {
  detectDocumentCorners,
  applyPerspectiveWarp,
  getDefaultCorners,
} from '@/lib/pdf-tools/scanner/document-detector'
import { scanWorkerClient } from '@/lib/pdf-tools/scanner/opencv-worker-client'

export interface ImageEditorOutput {
  buffer: ArrayBuffer
  previewUrl: string
  width: number
  height: number
  size: number
  type: 'image/jpeg' | 'image/png'
}

interface ImageEditorModalProps {
  isOpen: boolean
  onClose: () => void
  imageName: string
  imageType: 'image/jpeg' | 'image/png'
  originalBuffer: ArrayBuffer
  onApply: (output: ImageEditorOutput) => void
}

type CornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'

const CORNER_LABELS: Record<CornerKey, string> = {
  topLeft: 'Superior Esquerdo',
  topRight: 'Superior Direito',
  bottomRight: 'Inferior Direito',
  bottomLeft: 'Inferior Esquerdo',
}

export function ImageEditorModal({
  isOpen,
  onClose,
  imageName,
  imageType,
  originalBuffer,
  onApply,
}: ImageEditorModalProps) {
  // Imagem em edição (pode sofrer rotações 90º durante a sessão)
  const [currentCanvas, setCurrentCanvas] = useState<HTMLCanvasElement | null>(null)
  const [naturalWidth, setNaturalWidth] = useState<number>(0)
  const [naturalHeight, setNaturalHeight] = useState<number>(0)
  const [rotationAngle, setRotationAngle] = useState<number>(0) // rotação cumulativa 0, 90, 180, 270

  // Correção fina de inclinação (-15° a +15° em passos de 0,5°)
  const [fineTiltAngle, setFineTiltAngle] = useState<number>(0)
  const [suggestedTilt, setSuggestedTilt] = useState<number | null>(null)

  // Estado da detecção e inicialização
  const [isDetecting, setIsDetecting] = useState<boolean>(false)
  const [detectStepText, setDetectStepText] = useState<string>(
    'Analisando contornos do documento com OpenCV...',
  )
  const [isWarping, setIsWarping] = useState<boolean>(false)
  const [corners, setCorners] = useState<DocumentCorners | null>(null)
  const [isConfident, setIsConfident] = useState<boolean>(true)
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null)

  // Modo de prévia do recorte (alternância antes de aplicar)
  const [isPreviewWarp, setIsPreviewWarp] = useState<boolean>(false)
  const [previewWarpCanvas, setPreviewWarpCanvas] = useState<HTMLCanvasElement | null>(null)

  // Dragging de cantos
  const [activeCorner, setActiveCorner] = useState<CornerKey | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const stageBoxRef = useRef<HTMLDivElement>(null)

  // Dimensões do viewport e do stage calculadas com base no contêiner disponível
  const [stageLayout, setStageLayout] = useState<{
    width: number
    height: number
    scale: number
  }>({ width: 0, height: 0, scale: 1 })

  // Lupa de precisão ao arrastar cantos
  const [magnifierPos, setMagnifierPos] = useState<{ x: number; y: number } | null>(null)
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null)

  // Recalcular enquadramento perfeito (object-fit: contain) considerando as dimensões reais do contêiner
  const updateStageLayout = useCallback(() => {
    if (!containerRef.current || naturalWidth <= 0 || naturalHeight <= 0) return

    const containerRect = containerRef.current.getBoundingClientRect()
    // Margem de segurança de respiração (padding interno) para garantir que
    // as alças e anéis verdes dos 4 cantos nunca sejam cortados
    const horizontalPadding = 32
    const verticalPadding = 32

    const availW = Math.max(100, containerRect.width - horizontalPadding)
    const availH = Math.max(100, containerRect.height - verticalPadding)

    const scale = Math.min(availW / naturalWidth, availH / naturalHeight)
    const renderW = Math.round(naturalWidth * scale)
    const renderH = Math.round(naturalHeight * scale)

    setStageLayout({
      width: renderW,
      height: renderH,
      scale,
    })
  }, [naturalWidth, naturalHeight])

  // ResizeObserver e window resize listener
  useEffect(() => {
    updateStageLayout()

    const containerEl = containerRef.current
    if (!containerEl) return

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateStageLayout()
      })
      resizeObserver.observe(containerEl)
    }

    const handleWindowResize = () => {
      updateStageLayout()
    }
    window.addEventListener('resize', handleWindowResize)
    window.addEventListener('orientationchange', handleWindowResize)

    return () => {
      if (resizeObserver) resizeObserver.disconnect()
      window.removeEventListener('resize', handleWindowResize)
      window.removeEventListener('orientationchange', handleWindowResize)
    }
  }, [updateStageLayout])

  // Controle de requisição / token assíncrono para evitar condições de corrida
  const activeSessionTokenRef = useRef<number>(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false)

  // Carregar imagem inicial a partir do originalBuffer com cancelamento seguro
  const initFromBuffer = useCallback(
    (buf: ArrayBuffer) => {
      // Incrementar token de sessão para invalidar qualquer operação assíncrona anterior
      const sessionToken = ++activeSessionTokenRef.current

      if (!buf || buf.byteLength === 0) {
        setLoadError('O buffer da imagem está vazio ou corrompido.')
        return
      }

      setIsLoadingImage(true)
      setLoadError(null)
      setDetectionMessage(null)

      const blob = new Blob([buf], { type: imageType })
      const url = URL.createObjectURL(blob)
      const img = new Image()

      img.onload = () => {
        // Se a sessão mudou durante a decodificação da imagem, aborta
        if (sessionToken !== activeSessionTokenRef.current) {
          URL.revokeObjectURL(url)
          return
        }

        const nw = img.naturalWidth
        const nh = img.naturalHeight

        if (!nw || !nh || nw <= 0 || nh <= 0) {
          URL.revokeObjectURL(url)
          setIsLoadingImage(false)
          setLoadError('Não foi possível determinar as dimensões da imagem (0×0px).')
          return
        }

        const c = document.createElement('canvas')
        c.width = nw
        c.height = nh
        const ctx = c.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
        }
        URL.revokeObjectURL(url)

        setCurrentCanvas(c)
        setNaturalWidth(nw)
        setNaturalHeight(nh)
        setRotationAngle(0)
        setFineTiltAngle(0)
        setSuggestedTilt(null)
        setIsPreviewWarp(false)
        setPreviewWarpCanvas(null)
        setIsLoadingImage(false)

        // Iniciar detecção automática apenas após imagem estar 100% pronta e com dimensões válidas
        runDetection(c, sessionToken)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        if (sessionToken !== activeSessionTokenRef.current) return
        setIsLoadingImage(false)
        setLoadError('Falha ao decodificar a imagem selecionada. Verifique se o arquivo é válido.')
      }

      img.src = url
    },
    [imageType],
  )

  // Pular detecção e permitir ajuste manual imediatamente
  const handleSkipDetection = useCallback(() => {
    if (!currentCanvas) return
    // Invalidar requisições pendentes da sessão anterior
    activeSessionTokenRef.current++
    scanWorkerClient.cancel(`req_${activeSessionTokenRef.current}`)
    setIsDetecting(false)
    if (!corners) {
      const def = getDefaultCorners(currentCanvas.width, currentCanvas.height)
      setCorners(def)
    }
    setIsConfident(false)
    setDetectionMessage('Detecção automática pulada. Ajuste os cantos manualmente.')
  }, [currentCanvas, corners])

  // Inicializar sempre que a modal abrir ou quando trocar o buffer/imagem
  useEffect(() => {
    if (isOpen && originalBuffer && originalBuffer.byteLength > 0) {
      initFromBuffer(originalBuffer)
    } else {
      activeSessionTokenRef.current++
      setCurrentCanvas(null)
      setNaturalWidth(0)
      setNaturalHeight(0)
      setCorners(null)
      setIsPreviewWarp(false)
      setPreviewWarpCanvas(null)
      setLoadError(null)
      setIsLoadingImage(false)
      setIsDetecting(false)
    }
  }, [isOpen, originalBuffer, initFromBuffer])

  // Executar detecção de bordas com verificação estrita do sessionToken
  const runDetection = async (canvasToDetect: HTMLCanvasElement, token?: number) => {
    const currentToken = token ?? activeSessionTokenRef.current
    setIsDetecting(true)
    setDetectionMessage(null)

    // Indicar estado correto na UI (iniciando motor vs analisando contornos)
    if (!scanWorkerClient.getInitialized()) {
      setDetectStepText('Iniciando motor de digitalização (OpenCV)...')
    } else {
      setDetectStepText('Analisando contornos do documento com OpenCV...')
    }

    try {
      const requestId = `scan_${currentToken}`
      const result = await detectDocumentCorners(
        canvasToDetect,
        canvasToDetect.width,
        canvasToDetect.height,
        requestId,
      )

      if (currentToken !== activeSessionTokenRef.current) {
        return // Descarte de resultados obsoletos
      }

      setCorners(result.corners)
      const confident = result.detected && result.confidence >= 0.35
      setIsConfident(confident)

      if (result.estimatedTiltAngle !== undefined && Math.abs(result.estimatedTiltAngle) <= 15) {
        setSuggestedTilt(-result.estimatedTiltAngle)
      } else {
        setSuggestedTilt(null)
      }

      // Exibir mensagens claras discriminando falha do motor vs contornos não detectados
      if (result.status === 'error') {
        setDetectionMessage(
          `Motor OpenCV indisponível (${result.error || 'erro ao carregar runtime'}). Ajuste os cantos manualmente.`,
        )
      } else if (result.status === 'timeout') {
        setDetectionMessage(
          'A detecção excedeu o tempo limite. Sugestão de enquadramento aplicada para ajuste manual.',
        )
      } else if (!confident) {
        setDetectionMessage(
          'Sugestão de enquadramento (confiança moderada). Confira e ajuste os cantos se necessário.',
        )
      } else {
        setDetectionMessage(null)
      }
    } catch (err: any) {
      if (currentToken !== activeSessionTokenRef.current) return
      console.warn('[ImageEditor] Erro na detecção automática:', err)
      const def = getDefaultCorners(canvasToDetect.width, canvasToDetect.height)
      setCorners(def)
      setIsConfident(false)
      setDetectionMessage('Falha na análise dos contornos. Posicione os cantos manualmente.')
    } finally {
      if (currentToken === activeSessionTokenRef.current) {
        setIsDetecting(false)
      }
    }
  }

  // Rotação de 90° à esquerda (-90) ou à direita (+90)
  const rotateCanvas = (deltaAngle: 90 | -90) => {
    if (!currentCanvas || !corners) return

    const oldW = currentCanvas.width
    const oldH = currentCanvas.height
    const newW = oldH
    const newH = oldW

    const rotated = document.createElement('canvas')
    rotated.width = newW
    rotated.height = newH
    const ctx = rotated.getContext('2d')
    if (!ctx) return

    ctx.save()
    if (deltaAngle === 90) {
      // 90° horário: translate(newW, 0) + rotate(90deg)
      ctx.translate(newW, 0)
      ctx.rotate((90 * Math.PI) / 180)
    } else {
      // 90° anti-horário: translate(0, newH) + rotate(-90deg)
      ctx.translate(0, newH)
      ctx.rotate((-90 * Math.PI) / 180)
    }
    ctx.drawImage(currentCanvas, 0, 0)
    ctx.restore()

    // Transformar as coordenadas dos 4 cantos junto com a rotação
    // Para deltaAngle === 90 (horário): novo_x = oldH - old_y, novo_y = old_x
    // Para deltaAngle === -90 (anti-horário): novo_x = old_y, novo_y = oldW - old_x
    const transformPoint = (p: Point2D): Point2D => {
      if (deltaAngle === 90) {
        return {
          x: Math.max(0, Math.min(newW, oldH - p.y)),
          y: Math.max(0, Math.min(newH, p.x)),
        }
      } else {
        return {
          x: Math.max(0, Math.min(newW, p.y)),
          y: Math.max(0, Math.min(newH, oldW - p.x)),
        }
      }
    }

    const newPoints = [
      transformPoint(corners.topLeft),
      transformPoint(corners.topRight),
      transformPoint(corners.bottomRight),
      transformPoint(corners.bottomLeft),
    ]

    const newOrderedCorners = orderCorners(newPoints)

    setCurrentCanvas(rotated)
    setNaturalWidth(newW)
    setNaturalHeight(newH)
    setRotationAngle((prev) => (prev + deltaAngle + 360) % 360)
    setFineTiltAngle(0) // zerar ajuste fino ao fazer rotação ortogonal de 90°
    setSuggestedTilt(null)
    setCorners(newOrderedCorners)
    setIsPreviewWarp(false)
    setPreviewWarpCanvas(null)

    // Forçar recálculo imediato do layout de stage para nova orientação
    requestAnimationFrame(() => {
      updateStageLayout()
    })
  }

  // Restaurar original da sessão de edição
  const handleRestoreOriginal = () => {
    initFromBuffer(originalBuffer)
  }

  // Aplica rotação fina em torno do centro com recorte inteligente evitando bordas vazias
  const applyFineTiltToCanvas = (
    sourceCanvas: HTMLCanvasElement,
    angleDeg: number,
  ): HTMLCanvasElement => {
    if (Math.abs(angleDeg) < 0.05) {
      return sourceCanvas
    }

    const rad = (angleDeg * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const absCos = Math.abs(cos)
    const absSin = Math.abs(sin)

    const w = sourceCanvas.width
    const h = sourceCanvas.height

    // Tamanho do maior retângulo central contido sem bordas vazias
    // Para rotações pequenas (<= 15°):
    // cropW = w - h * absSin
    // cropH = h - w * absSin
    // Ou fórmula exata de corte inscrito:
    const cropW = Math.max(
      20,
      Math.floor((w * absCos - h * absSin) / (absCos * absCos - absSin * absSin)),
    )
    const cropH = Math.max(
      20,
      Math.floor((h * absCos - w * absSin) / (absCos * absCos - absSin * absSin)),
    )

    // Para evitar distorções se o ângulo for no limite, limitamos a proporção razoável
    const targetW = Math.min(
      w,
      Math.max(20, cropW > 0 && cropW <= w ? cropW : Math.round(w * (1 - absSin * 0.5))),
    )
    const targetH = Math.min(
      h,
      Math.max(20, cropH > 0 && cropH <= h ? cropH : Math.round(h * (1 - absSin * 0.5))),
    )

    const out = document.createElement('canvas')
    out.width = targetW
    out.height = targetH
    const ctx = out.getContext('2d')
    if (!ctx) return sourceCanvas

    ctx.save()
    ctx.translate(targetW / 2, targetH / 2)
    ctx.rotate(rad)
    ctx.drawImage(sourceCanvas, -w / 2, -h / 2)
    ctx.restore()

    return out
  }

  // Alternar prévia do recorte de perspectiva
  const togglePreviewWarp = async () => {
    if (isPreviewWarp) {
      setIsPreviewWarp(false)
      return
    }

    if (!currentCanvas || !corners) return

    setIsWarping(true)
    try {
      const warpedCanvas = await applyPerspectiveWarp(
        currentCanvas,
        corners,
        currentCanvas.width,
        currentCanvas.height,
      )

      // Aplicar rotação fina também na prévia se fineTiltAngle !== 0
      const finalCanvas =
        fineTiltAngle !== 0 ? applyFineTiltToCanvas(warpedCanvas, fineTiltAngle) : warpedCanvas

      setPreviewWarpCanvas(finalCanvas)
      setIsPreviewWarp(true)
    } catch (err) {
      console.error('Erro ao gerar prévia da transformação de perspectiva:', err)
      setDetectionMessage('Não foi possível gerar a prévia da perspectiva. Ajuste os cantos.')
    } finally {
      setIsWarping(false)
    }
  }

  // Aplicar ajustes e finalizar
  const handleApply = async () => {
    if (!currentCanvas || !corners) return

    setIsWarping(true)
    try {
      const warpedCanvas = await applyPerspectiveWarp(
        currentCanvas,
        corners,
        currentCanvas.width,
        currentCanvas.height,
      )

      // Aplicar correção fina de inclinação se selecionada
      const outCanvas =
        fineTiltAngle !== 0 ? applyFineTiltToCanvas(warpedCanvas, fineTiltAngle) : warpedCanvas

      // Exportar como blob de alta qualidade no tipo original (jpeg ou png)
      const mime = imageType === 'image/png' ? 'image/png' : 'image/jpeg'
      const quality = mime === 'image/jpeg' ? 0.96 : undefined

      const blob = await new Promise<Blob | null>((resolve) => {
        outCanvas.toBlob((b) => resolve(b), mime, quality)
      })

      if (!blob) {
        throw new Error('Falha ao serializar imagem processada.')
      }

      const buffer = await blob.arrayBuffer()
      const previewUrl = URL.createObjectURL(blob)

      onApply({
        buffer,
        previewUrl,
        width: outCanvas.width,
        height: outCanvas.height,
        size: blob.size,
        type: imageType,
      })
      onClose()
    } catch (err) {
      console.error('Erro ao aplicar recorte:', err)
      setDetectionMessage(
        `Erro ao finalizar documento: ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setIsWarping(false)
    }
  }

  // Atualizar lupa quando arrastando
  const updateMagnifier = useCallback(
    (pointInCanvas: Point2D) => {
      if (!currentCanvas || !magnifierCanvasRef.current) return
      const magCanvas = magnifierCanvasRef.current
      const magCtx = magCanvas.getContext('2d')
      if (!magCtx) return

      const zoom = 2.5
      const size = 120
      magCanvas.width = size
      magCanvas.height = size

      magCtx.clearRect(0, 0, size, size)
      magCtx.imageSmoothingEnabled = true

      // Recorte ao redor do ponto no canvas de resolução natural
      const cropW = size / zoom
      const cropH = size / zoom
      const cropX = pointInCanvas.x - cropW / 2
      const cropY = pointInCanvas.y - cropH / 2

      magCtx.drawImage(currentCanvas, cropX, cropY, cropW, cropH, 0, 0, size, size)

      // Mira central na lupa
      magCtx.strokeStyle = '#C9922A'
      magCtx.lineWidth = 1.5
      magCtx.beginPath()
      // linha vertical
      magCtx.moveTo(size / 2, size / 2 - 12)
      magCtx.lineTo(size / 2, size / 2 + 12)
      // linha horizontal
      magCtx.moveTo(size / 2 - 12, size / 2)
      magCtx.lineTo(size / 2 + 12, size / 2)
      magCtx.stroke()

      // Borda circular
      magCtx.strokeStyle = '#252B34'
      magCtx.lineWidth = 2
      magCtx.beginPath()
      magCtx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
      magCtx.stroke()
    },
    [currentCanvas],
  )

  // Manipulação de ponteiro (Pointer / Touch / Mouse) para arrastar cantos
  const handlePointerDownCorner = (cornerKey: CornerKey, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setActiveCorner(cornerKey)
    if (corners) {
      updateMagnifier(corners[cornerKey])
      setMagnifierPos({ x: e.clientX, y: e.clientY })
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeCorner || !corners || !stageBoxRef.current) return
    e.preventDefault()

    const stageRect = stageBoxRef.current.getBoundingClientRect()
    if (stageRect.width === 0 || stageRect.height === 0) return

    const clientX = e.clientX
    const clientY = e.clientY

    // Posição relativa dentro da caixa renderizada da imagem
    const relX = Math.max(0, Math.min(stageRect.width, clientX - stageRect.left))
    const relY = Math.max(0, Math.min(stageRect.height, clientY - stageRect.top))

    // Mapeamento exato para a resolução nativa da imagem
    const realX = Math.round((relX / stageRect.width) * naturalWidth)
    const realY = Math.round((relY / stageRect.height) * naturalHeight)

    const updatedCorners: DocumentCorners = {
      ...corners,
      [activeCorner]: {
        x: Math.max(0, Math.min(naturalWidth, realX)),
        y: Math.max(0, Math.min(naturalHeight, realY)),
      },
    }

    setCorners(updatedCorners)
    updateMagnifier(updatedCorners[activeCorner])
    setMagnifierPos({ x: clientX, y: clientY })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeCorner) {
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      setActiveCorner(null)
      setMagnifierPos(null)

      // Garantir convexidade / reordenar se houver inversão acidental de vértices
      if (corners) {
        if (!isValidConvexQuad(corners)) {
          const reordered = orderCorners([
            corners.topLeft,
            corners.topRight,
            corners.bottomRight,
            corners.bottomLeft,
          ])
          setCorners(reordered)
        }
      }
    }
  }

  // DataURL para exibição da imagem atual no elemento img
  const currentImageUrl = useMemo(() => {
    if (!currentCanvas) return ''
    return currentCanvas.toDataURL()
  }, [currentCanvas])

  const previewWarpUrl = useMemo(() => {
    if (!previewWarpCanvas) return ''
    return previewWarpCanvas.toDataURL()
  }, [previewWarpCanvas])

  // Coordenadas percentuais para posicionar SVG e controles com precisão sobre o layout responsivo
  const percentCorners = useMemo(() => {
    if (!corners || naturalWidth === 0 || naturalHeight === 0) return null
    return {
      topLeft: {
        x: (corners.topLeft.x / naturalWidth) * 100,
        y: (corners.topLeft.y / naturalHeight) * 100,
      },
      topRight: {
        x: (corners.topRight.x / naturalWidth) * 100,
        y: (corners.topRight.y / naturalHeight) * 100,
      },
      bottomRight: {
        x: (corners.bottomRight.x / naturalWidth) * 100,
        y: (corners.bottomRight.y / naturalHeight) * 100,
      },
      bottomLeft: {
        x: (corners.bottomLeft.x / naturalWidth) * 100,
        y: (corners.bottomLeft.y / naturalHeight) * 100,
      },
    }
  }, [corners, naturalWidth, naturalHeight])

  const polygonSvgPoints = useMemo(() => {
    if (!percentCorners) return ''
    return `${percentCorners.topLeft.x},${percentCorners.topLeft.y} ${percentCorners.topRight.x},${percentCorners.topRight.y} ${percentCorners.bottomRight.x},${percentCorners.bottomRight.y} ${percentCorners.bottomLeft.x},${percentCorners.bottomLeft.y}`
  }, [percentCorners])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isWarping && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-[#F5F6F8] dark:bg-card border-[#E4E7EB] dark:border-border rounded-xl shadow-2xl">
        {/* Cabeçalho */}
        <DialogHeader className="px-5 py-3.5 bg-white dark:bg-card border-b border-[#E4E7EB] dark:border-border flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border flex items-center justify-center text-[#C9922A] shrink-0">
              <Crop className="w-4 h-4 text-[#C9922A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm sm:text-base font-bold text-[#252B34] dark:text-foreground">
                  Editar e Enquadrar Imagem
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono px-1.5 py-0 border-[#E4E7EB] text-[#78818E]"
                >
                  CamScanner Bloco 1
                </Badge>
                {!isConfident && !isDetecting && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400"
                  >
                    Ajuste Manual Recomendado
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-[#78818E] dark:text-muted-foreground truncate max-w-md">
                {imageName} ({naturalWidth}×{naturalHeight}px)
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#78818E] hover:text-[#252B34] rounded-md"
              onClick={onClose}
              disabled={isWarping}
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Alerta de aviso ou incerteza da detecção */}
        {detectionMessage && (
          <div className="px-5 py-2 bg-amber-50/90 dark:bg-amber-950/30 border-b border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{detectionMessage}</span>
            </div>
            <button
              onClick={() => setDetectionMessage(null)}
              className="text-amber-800 hover:text-amber-950 text-[11px] underline ml-2"
            >
              Dispensar
            </button>
          </div>
        )}

        {/* Barra de Ferramentas Superior */}
        <div className="px-5 py-2.5 bg-white dark:bg-card border-b border-[#E4E7EB] dark:border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Controles de Rotação e Detecção */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs text-[#252B34] dark:text-foreground border-[#E4E7EB] hover:bg-[#FAF8F2] hover:text-[#C9922A]"
              onClick={() => rotateCanvas(-90)}
              disabled={isDetecting || isWarping || isPreviewWarp}
              title="Girar 90° à esquerda (anti-horário)"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Girar 90° Esq.
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs text-[#252B34] dark:text-foreground border-[#E4E7EB] hover:bg-[#FAF8F2] hover:text-[#C9922A]"
              onClick={() => rotateCanvas(90)}
              disabled={isDetecting || isWarping || isPreviewWarp}
              title="Girar 90° à direita (horário)"
            >
              <RotateCw className="w-3.5 h-3.5 mr-1.5" />
              Girar 90° Dir.
            </Button>

            <div className="h-4 w-px bg-[#E4E7EB] mx-1 hidden sm:block" />

            {isDetecting ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50"
                onClick={handleSkipDetection}
                title="Pular análise e ajustar cantos manualmente"
              >
                Pular detecção
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs text-[#252B34] dark:text-foreground border-[#E4E7EB] hover:bg-[#FAF8F2] hover:text-[#C9922A]"
                onClick={() => currentCanvas && runDetection(currentCanvas)}
                disabled={isWarping || isPreviewWarp}
                title="Detectar novamente as bordas do documento"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#C9922A]" />
                Detectar novamente
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2]"
              onClick={handleRestoreOriginal}
              disabled={isDetecting || isWarping}
              title="Desfaz recortes, rotações e distorções desta sessão"
            >
              <Undo2 className="w-3.5 h-3.5 mr-1.5" />
              Restaurar original
            </Button>
          </div>

          {/* Alternar Prévia do Recorte */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant={isPreviewWarp ? 'secondary' : 'outline'}
              size="sm"
              className={`h-8 px-3 text-xs font-semibold ${
                isPreviewWarp
                  ? 'bg-[#C9922A]/15 text-[#C9922A] border-[#C9922A]'
                  : 'border-[#E4E7EB] text-[#252B34] dark:text-foreground hover:bg-[#FAF8F2] hover:text-[#C9922A]'
              }`}
              onClick={togglePreviewWarp}
              disabled={isDetecting || isWarping}
            >
              {isWarping ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Eye className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isPreviewWarp ? 'Voltar para Ajuste dos Cantos' : 'Visualizar recorte'}
            </Button>
          </div>
        </div>

        {/* Barra de Correção Fina de Inclinação ("Endireitar") */}
        <div className="px-5 py-2 bg-[#FAF8F2]/60 dark:bg-card/70 border-b border-[#E4E7EB] dark:border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-lg">
            <span className="text-xs font-semibold text-[#252B34] dark:text-foreground whitespace-nowrap">
              Endireitar:
            </span>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[10px] text-[#78818E] font-mono">-15°</span>
              <Slider
                value={[fineTiltAngle]}
                min={-15}
                max={15}
                step={0.5}
                onValueChange={(val) => {
                  const angle = val[0] ?? 0
                  setFineTiltAngle(angle)
                  if (isPreviewWarp) {
                    setIsPreviewWarp(false)
                    setPreviewWarpCanvas(null)
                  }
                }}
                disabled={isDetecting || isWarping}
                className="flex-1 py-1"
              />
              <span className="text-[10px] text-[#78818E] font-mono">+15°</span>
            </div>
            <div className="min-w-[48px] text-center">
              <Badge
                variant="outline"
                className={`text-[11px] font-mono px-1.5 py-0.5 ${
                  fineTiltAngle !== 0
                    ? 'bg-[#C9922A]/15 text-[#C9922A] border-[#C9922A]/40 font-bold'
                    : 'text-[#78818E] border-[#E4E7EB]'
                }`}
              >
                {fineTiltAngle > 0
                  ? `+${fineTiltAngle.toFixed(1)}°`
                  : `${fineTiltAngle.toFixed(1)}°`}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fineTiltAngle !== 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-[#78818E] hover:text-[#252B34]"
                onClick={() => {
                  setFineTiltAngle(0)
                  if (isPreviewWarp) {
                    setIsPreviewWarp(false)
                    setPreviewWarpCanvas(null)
                  }
                }}
              >
                Zerar inclinação
              </Button>
            )}

            {isConfident && suggestedTilt !== null && Math.abs(suggestedTilt) >= 0.5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs text-[#C9922A] border-[#C9922A]/40 bg-[#FAF8F2] hover:bg-[#C9922A]/10 font-medium"
                onClick={() => {
                  setFineTiltAngle(suggestedTilt)
                  if (isPreviewWarp) {
                    setIsPreviewWarp(false)
                    setPreviewWarpCanvas(null)
                  }
                }}
                title="Aplica correção automática baseada na inclinação das bordas detectadas"
              >
                <Sparkles className="w-3 h-3 mr-1 text-[#C9922A]" />
                Auto: {suggestedTilt > 0 ? `+${suggestedTilt}°` : `${suggestedTilt}°`}
              </Button>
            )}
          </div>
        </div>

        {/* Área Central de Visualização / Manipulação do Documento */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative flex-1 bg-[#1E232A] flex items-center justify-center p-3 sm:p-5 overflow-hidden select-none touch-none min-h-[360px]"
        >
          {/* Indicador de carregamento inicial da imagem */}
          {isLoadingImage && (
            <div className="absolute inset-0 z-50 bg-[#1E232A] flex flex-col items-center justify-center text-white p-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#C9922A] mb-2" />
              <p className="text-sm font-semibold">Carregando imagem no editor...</p>
            </div>
          )}

          {/* Erro de carregamento recuperável */}
          {loadError && (
            <div className="absolute inset-0 z-50 bg-[#1E232A] flex flex-col items-center justify-center text-center p-6 text-white max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-3 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Falha ao abrir a imagem</h4>
              <p className="text-xs text-white/70 mb-4">{loadError}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-transparent border-white/30 text-white hover:bg-white/10"
                  onClick={onClose}
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#C9922A] hover:bg-[#b58324] text-white"
                  onClick={() => originalBuffer && initFromBuffer(originalBuffer)}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}

          {isDetecting && (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#C9922A] mb-3" />
              <p className="text-sm font-semibold text-center">{detectStepText}</p>
              <p className="text-xs text-white/70 mt-1 text-center">
                Identificando os 4 cantos do papel em segundo plano
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSkipDetection}
                className="mt-4 h-8 px-3 text-xs bg-black/40 hover:bg-black/60 border-white/40 text-white hover:text-white"
              >
                Pular detecção e ajustar manualmente
              </Button>
            </div>
          )}

          {isPreviewWarp ? (
            /* Modo Prévia do Documento Já Retificado e Recortado */
            <div className="relative max-h-full max-w-full flex flex-col items-center justify-center animate-fade-in">
              {previewWarpUrl ? (
                <img
                  src={previewWarpUrl}
                  alt="Prévia do recorte"
                  style={{
                    maxWidth: stageLayout.width > 0 ? `${stageLayout.width}px` : '100%',
                    maxHeight: stageLayout.height > 0 ? `${stageLayout.height}px` : '70vh',
                  }}
                  className="object-contain rounded shadow-2xl border border-white/20 block"
                />
              ) : (
                <div className="text-white text-sm">Gerando enquadramento...</div>
              )}
              <div className="mt-3 px-3 py-1 rounded-full bg-black/60 text-white text-[11px] backdrop-blur-xs flex items-center gap-2">
                <Check className="w-3 h-3 text-emerald-400" />
                Perspectiva corrigida e fundo removido (sem alterações de iluminação ou cores)
              </div>
            </div>
          ) : (
            /* Modo de Edição com Cantos Interativos e Enquadramento Responsivo Exato */
            <div
              ref={stageBoxRef}
              style={{
                width: stageLayout.width > 0 ? `${stageLayout.width}px` : 'auto',
                height: stageLayout.height > 0 ? `${stageLayout.height}px` : 'auto',
              }}
              className="relative inline-block transition-[width,height] duration-75"
            >
              {currentImageUrl && (
                <img
                  src={currentImageUrl}
                  alt="Documento em edição"
                  style={{
                    width: stageLayout.width > 0 ? `${stageLayout.width}px` : 'auto',
                    height: stageLayout.height > 0 ? `${stageLayout.height}px` : 'auto',
                  }}
                  className="block object-contain rounded shadow-lg pointer-events-none"
                  draggable={false}
                  onLoad={updateStageLayout}
                />
              )}

              {/* Linhas de grade sutis para auxílio de nivelamento quando houver inclinação fina */}
              {fineTiltAngle !== 0 && (
                <div
                  className="absolute inset-0 pointer-events-none border border-white/20"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                  }}
                />
              )}

              {/* Camada SVG: Polígono Verde Semitransparente que indica a área preservada */}
              {percentCorners && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polygon
                    points={polygonSvgPoints}
                    fill="rgba(34, 197, 94, 0.22)"
                    stroke="#22C55E"
                    strokeWidth="0.8"
                    strokeDasharray="2, 1"
                    className="drop-shadow-sm"
                  />
                </svg>
              )}

              {/* 4 Pontos de Controle Interativos e Arrastáveis */}
              {percentCorners &&
                (Object.keys(percentCorners) as CornerKey[]).map((cornerKey) => {
                  const pt = percentCorners[cornerKey]
                  const isActive = activeCorner === cornerKey

                  return (
                    <div
                      key={cornerKey}
                      onPointerDown={(e) => handlePointerDownCorner(cornerKey, e)}
                      style={{
                        left: `${pt.x}%`,
                        top: `${pt.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute z-30 cursor-grab active:cursor-grabbing p-2 group touch-none"
                      title={`Arrastar canto: ${CORNER_LABELS[cornerKey]}`}
                    >
                      {/* Ponto visual estilizado com anéis contrastantes */}
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-transform ${
                          isActive
                            ? 'scale-125 ring-4 ring-[#C9922A] bg-white'
                            : 'bg-emerald-500 hover:scale-110 ring-2 ring-white shadow-md'
                        }`}
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            isActive ? 'bg-[#C9922A]' : 'bg-white'
                          }`}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Lupa flutuante durante o arrasto de precisão */}
          {activeCorner && magnifierPos && (
            <div
              style={{
                left: Math.max(20, Math.min(window.innerWidth - 150, magnifierPos.x - 70)),
                top: Math.max(80, magnifierPos.y - 150),
              }}
              className="pointer-events-none fixed z-50 rounded-full border-2 border-white bg-black/90 p-1 shadow-2xl"
            >
              <canvas ref={magnifierCanvasRef} className="rounded-full w-[120px] h-[120px] block" />
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-black/80 text-white backdrop-blur-xs whitespace-nowrap">
                {CORNER_LABELS[activeCorner]}
              </span>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="px-5 py-3.5 bg-white dark:bg-card border-t border-[#E4E7EB] dark:border-border flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#78818E] dark:text-muted-foreground">
            <HelpCircle className="w-3.5 h-3.5 text-[#C9922A] shrink-0" />
            <span>
              Arraste os 4 círculos verdes para alinhar perfeitamente com os limites do documento.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isWarping}
              className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#252B34]"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={isDetecting || isWarping || !corners}
              className="h-9 px-5 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#C9922A]"
            >
              {isWarping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Processando enquadramento...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-2" />
                  Aplicar ajustes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
