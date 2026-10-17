import { useEffect, useRef, useState, memo } from 'react'
import type * as pdfjsLib from 'pdfjs-dist'
import { RotateCw, RotateCcw, Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { renderPageToCanvas } from '@/lib/pdf-tools/pdf-thumbnail-service'
import { normalizeAngle } from '@/lib/pdf-tools/pdf-rotator'

export interface PageThumbnailCardProps {
  pageNumber: number
  pdfDoc: pdfjsLib.PDFDocumentProxy | null
  originalRotation?: number
  deltaRotation?: number
  isSelected: boolean
  onToggleSelect: (pageNumber: number) => void
  onRotateClockwise?: (pageNumber: number) => void
  onRotateCounterClockwise?: (pageNumber: number) => void
  disabled?: boolean
  /**
   * Modo de exibição:
   * - 'rotate': padrão atual do Rotacionar PDF (exibe botões de rotação, badges de ângulo, etc.)
   * - 'delete': modo de marcação para exclusão (borda vermelha quando marcado, ícone de lixeira/exclusão, sem botões de giro)
   */
  mode?: 'rotate' | 'delete'
  /**
   * Se true no modo 'delete', indica que a página está marcada para ser excluída
   */
  isMarkedForDeletion?: boolean
}

export const PageThumbnailCard = memo(function PageThumbnailCard({
  pageNumber,
  pdfDoc,
  originalRotation = 0,
  deltaRotation = 0,
  isSelected,
  onToggleSelect,
  onRotateClockwise,
  onRotateCounterClockwise,
  disabled = false,
  mode = 'rotate',
  isMarkedForDeletion = false,
}: PageThumbnailCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const renderSeqRef = useRef(0)

  const effectiveRotation = normalizeAngle(originalRotation + deltaRotation)
  const isModified = normalizeAngle(deltaRotation) !== 0
  const isDeleteMode = mode === 'delete'

  // Lazy loading via IntersectionObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      {
        rootMargin: '200px 0px', // Pre-renderiza um pouco antes de entrar em vista
        threshold: 0.05,
      },
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
    }
  }, [])

  // Renderização sob demanda quando estiver visível ou quando a rotação mudar
  useEffect(() => {
    if (!isVisible || !pdfDoc) return

    let isSubscribed = true
    const currentSeq = ++renderSeqRef.current

    const renderThumbnail = async () => {
      const canvas = canvasRef.current
      if (!canvas) return

      setIsRendering(true)
      setRenderError(null)

      try {
        await renderPageToCanvas(pdfDoc, pageNumber, effectiveRotation, canvas, 140)
        if (isSubscribed && renderSeqRef.current === currentSeq) {
          setIsRendering(false)
        }
      } catch (err: unknown) {
        if (isSubscribed && renderSeqRef.current === currentSeq) {
          const msg = err instanceof Error ? err.message : 'Erro ao renderizar'
          // Ignora erros de cancelamento normais se página mudar rápido
          if (!msg.toLowerCase().includes('cancelled') && !msg.toLowerCase().includes('canceled')) {
            setRenderError('Falha ao renderizar miniatura.')
          }
          setIsRendering(false)
        }
      }
    }

    renderThumbnail()

    return () => {
      isSubscribed = false
    }
  }, [isVisible, pdfDoc, pageNumber, effectiveRotation])

  return (
    <div
      ref={containerRef}
      className={`group relative flex flex-col rounded-xl border bg-card p-2.5 transition-all duration-200 select-none ${
        isDeleteMode
          ? isMarkedForDeletion
            ? 'border-destructive/80 bg-destructive/[0.04] ring-2 ring-destructive/30 shadow-sm'
            : isSelected
              ? 'border-[#C9922A] ring-2 ring-[#C9922A]/30 shadow-sm'
              : 'border-border/80 hover:border-border hover:shadow-subtle'
          : isSelected
            ? 'border-[#C9922A] ring-2 ring-[#C9922A]/30 shadow-sm'
            : 'border-border/80 hover:border-border hover:shadow-subtle'
      } ${disabled ? 'opacity-70 pointer-events-none' : ''}`}
    >
      {/* Cabeçalho do Card da Página */}
      <div className="flex items-center justify-between gap-1.5 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect(pageNumber)
            }}
            disabled={disabled}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
              isDeleteMode
                ? isMarkedForDeletion
                  ? 'bg-destructive border-destructive text-white'
                  : isSelected
                    ? 'bg-[#C9922A] border-[#C9922A] text-white'
                    : 'border-muted-foreground/40 hover:border-destructive bg-background'
                : isSelected
                  ? 'bg-[#C9922A] border-[#C9922A] text-white'
                  : 'border-muted-foreground/40 hover:border-[#C9922A] bg-background'
            }`}
            title={
              isDeleteMode
                ? isMarkedForDeletion
                  ? 'Desmarcar exclusão da página'
                  : 'Marcar página para exclusão'
                : isSelected
                  ? 'Desmarcar página'
                  : 'Selecionar página'
            }
            aria-label={`Página ${pageNumber}`}
          >
            {(isMarkedForDeletion || isSelected) && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
          <span
            className={`text-xs font-semibold truncate ${
              isDeleteMode && isMarkedForDeletion ? 'text-destructive font-bold' : 'text-foreground'
            }`}
          >
            Pág. {pageNumber}
          </span>
        </div>

        {/* Badges de Estado */}
        <div className="flex items-center gap-1 shrink-0">
          {isDeleteMode ? (
            isMarkedForDeletion ? (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold px-1.5 py-0 border-destructive/40 bg-destructive/10 text-destructive"
              >
                Excluir
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] font-normal px-1.5 py-0 border-border text-muted-foreground bg-muted/30"
              >
                Manter
              </Badge>
            )
          ) : isModified ? (
            <Badge
              variant="outline"
              className="text-[10px] font-semibold px-1.5 py-0 border-[#C9922A]/40 bg-[#C9922A]/10 text-[#C9922A]"
              title={`Rotação aplicada: +${normalizeAngle(deltaRotation)}°`}
            >
              +{normalizeAngle(deltaRotation)}°
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] font-normal px-1.5 py-0 border-border text-muted-foreground bg-muted/30"
            >
              Original
            </Badge>
          )}
        </div>
      </div>

      {/* Área da Miniatura (clique alterna seleção/exclusão da página) */}
      <div
        onClick={() => onToggleSelect(pageNumber)}
        className={`relative flex items-center justify-center min-h-[170px] max-h-[190px] w-full rounded-lg p-2 overflow-hidden cursor-pointer border transition-colors ${
          isDeleteMode && isMarkedForDeletion
            ? 'bg-destructive/[0.06] border-destructive/30 hover:bg-destructive/[0.10]'
            : 'bg-muted/40 border-border/40 hover:bg-muted/60'
        }`}
        title={
          isDeleteMode
            ? `Clique para ${isMarkedForDeletion ? 'manter' : 'marcar para exclusão'} a página ${pageNumber}`
            : `Clique para ${isSelected ? 'desmarcar' : 'selecionar'} a página ${pageNumber}`
        }
      >
        {/* Placeholder enquanto não entra no viewport */}
        {!isVisible && (
          <div className="text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
            <span className="text-[11px]">Página {pageNumber}</span>
          </div>
        )}

        {/* Canvas de renderização real */}
        <canvas
          ref={canvasRef}
          className={`max-h-[160px] max-w-[130px] rounded shadow-sm object-contain transition-all duration-200 ${
            isVisible && !isRendering && !renderError
              ? isDeleteMode && isMarkedForDeletion
                ? 'opacity-40 grayscale contrast-75'
                : 'opacity-100'
              : 'opacity-40'
          }`}
        />

        {/* Overlay de exclusão visual discreto quando marcada */}
        {isDeleteMode && isMarkedForDeletion && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/15 backdrop-blur-[0.5px] pointer-events-none transition-opacity">
            <span className="text-[11px] font-semibold text-destructive px-2 py-0.5 rounded bg-background/90 shadow-xs border border-destructive/30">
              Será excluída
            </span>
          </div>
        )}

        {/* Indicador de renderização */}
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-[1px]">
            <Loader2 className="w-4 h-4 animate-spin text-[#C9922A]" />
          </div>
        )}

        {/* Indicador de erro pontual de renderização */}
        {renderError && (
          <div className="absolute inset-2 flex flex-col items-center justify-center gap-1 bg-destructive/10 text-destructive text-center p-2 rounded">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-[10px] leading-tight font-medium">{renderError}</span>
          </div>
        )}
      </div>

      {/* Ações de Rotação por Página (somente no modo rotate) */}
      {!isDeleteMode && (
        <div className="flex items-center justify-between gap-1 pt-2 mt-auto border-t border-dashed border-border/60">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              if (onRotateCounterClockwise) onRotateCounterClockwise(pageNumber)
            }}
            disabled={disabled}
            title="Girar 90° para a esquerda (anti-horário)"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-[#C9922A]/10 hover:text-[#C9922A]"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            -90°
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              if (onRotateClockwise) onRotateClockwise(pageNumber)
            }}
            disabled={disabled}
            title="Girar 90° para a direita (horário)"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-[#C9922A]/10 hover:text-[#C9922A]"
          >
            +90°
            <RotateCw className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
})
