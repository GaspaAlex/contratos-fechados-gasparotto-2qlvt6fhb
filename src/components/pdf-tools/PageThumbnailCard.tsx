import { useEffect, useRef, useState, memo } from 'react'
import type * as pdfjsLib from 'pdfjs-dist'
import {
  RotateCw,
  RotateCcw,
  Check,
  Loader2,
  AlertCircle,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { renderPageToCanvas } from '@/lib/pdf-tools/pdf-thumbnail-service'
import { normalizeAngle } from '@/lib/pdf-tools/pdf-rotator'

export interface PageThumbnailCardProps {
  /**
   * Número original da página (1-based, imutável, correspondente ao arquivo de origem).
   */
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
   * - 'delete': modo de marcação para exclusão (borda vermelha quando marcado, sem botões de giro)
   * - 'organize': modo de reordenação e exclusão (arrastar e soltar, botões mover esquerda/direita, badges de posição e exclusão)
   * - 'extract': modo de extração de páginas (destaque dourado positivo na seleção, badge 'Extrair', sem vermelho de exclusão)
   */
  mode?: 'rotate' | 'delete' | 'organize' | 'extract'
  /**
   * Se true, indica que a página está marcada para ser excluída
   */
  isMarkedForDeletion?: boolean
  /**
   * Posição atual da página na sequência visual reorganizada (1-based, ex: 1, 2, 3...)
   */
  currentPosition?: number
  /**
   * Total de páginas na grade reorganizada (para habilitar/desabilitar mover esquerda/direita)
   */
  totalCount?: number
  /**
   * Callbacks de reordenação manual (esquerda/direita)
   */
  onMoveLeft?: (originalPageNumber: number) => void
  onMoveRight?: (originalPageNumber: number) => void
  /**
   * Suporte a Drag-and-Drop nativo HTML5
   */
  draggable?: boolean
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, originalPageNumber: number) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>, originalPageNumber: number) => void
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>, originalPageNumber: number) => void
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void
  isDraggingThis?: boolean
  isDragOverThis?: boolean
  dropPositionIndicator?: 'before' | 'after' | null
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
  currentPosition,
  totalCount,
  onMoveLeft,
  onMoveRight,
  draggable = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDraggingThis = false,
  isDragOverThis = false,
  dropPositionIndicator = null,
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
  const isOrganizeMode = mode === 'organize'
  const isExtractMode = mode === 'extract'
  const hasReorderControls = isOrganizeMode || isExtractMode
  const isPositionChanged =
    hasReorderControls && typeof currentPosition === 'number' && currentPosition !== pageNumber
  const canMoveLeft = Boolean(
    onMoveLeft && typeof currentPosition === 'number' && currentPosition > 1,
  )
  const canMoveRight = Boolean(
    onMoveRight &&
    typeof currentPosition === 'number' &&
    typeof totalCount === 'number' &&
    currentPosition < totalCount,
  )

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
      draggable={draggable && !disabled}
      onDragStart={(e) => {
        if (draggable && !disabled && onDragStart) {
          onDragStart(e, pageNumber)
        }
      }}
      onDragOver={(e) => {
        if (onDragOver && !disabled) {
          onDragOver(e, pageNumber)
        }
      }}
      onDragLeave={(e) => {
        if (onDragLeave && !disabled) {
          onDragLeave(e)
        }
      }}
      onDrop={(e) => {
        if (onDrop && !disabled) {
          onDrop(e, pageNumber)
        }
      }}
      onDragEnd={(e) => {
        if (onDragEnd && !disabled) {
          onDragEnd(e)
        }
      }}
      className={`group relative flex flex-col rounded-xl border bg-card p-2.5 transition-all duration-200 select-none ${
        isDraggingThis
          ? 'opacity-40 scale-[0.98] border-dashed border-[#C9922A] shadow-md ring-2 ring-[#C9922A]/40'
          : isDragOverThis
            ? 'border-[#C9922A] ring-2 ring-[#C9922A]/50 shadow-md bg-[#C9922A]/5'
            : isExtractMode
              ? isSelected
                ? 'border-[#C9922A] bg-[#C9922A]/[0.05] ring-2 ring-[#C9922A]/50 shadow-sm'
                : isPositionChanged
                  ? 'border-[#C9922A]/60 ring-1 ring-[#C9922A]/20 shadow-xs'
                  : 'border-border/80 hover:border-[#C9922A]/40 hover:shadow-subtle'
              : isDeleteMode || isOrganizeMode
                ? isMarkedForDeletion
                  ? 'border-destructive/80 bg-destructive/[0.04] ring-2 ring-destructive/30 shadow-sm'
                  : isPositionChanged
                    ? 'border-[#C9922A]/70 ring-1 ring-[#C9922A]/30 shadow-sm'
                    : isSelected
                      ? 'border-[#C9922A] ring-2 ring-[#C9922A]/30 shadow-sm'
                      : 'border-border/80 hover:border-[#C9922A]/40 hover:shadow-subtle'
                : isSelected
                  ? 'border-[#C9922A] ring-2 ring-[#C9922A]/30 shadow-sm'
                  : 'border-border/80 hover:border-border hover:shadow-subtle'
      } ${disabled ? 'opacity-70 pointer-events-none' : ''}`}
    >
      {/* Indicador visual de inserção antes/depois no drop */}
      {isDragOverThis && dropPositionIndicator === 'before' && (
        <div
          className="absolute -left-1.5 top-0 bottom-0 w-1 bg-[#C9922A] rounded-full shadow-[0_0_8px_rgba(201,146,42,0.8)] z-30 pointer-events-none"
          aria-hidden="true"
        />
      )}
      {isDragOverThis && dropPositionIndicator === 'after' && (
        <div
          className="absolute -right-1.5 top-0 bottom-0 w-1 bg-[#C9922A] rounded-full shadow-[0_0_8px_rgba(201,146,42,0.8)] z-30 pointer-events-none"
          aria-hidden="true"
        />
      )}
      {/* Cabeçalho do Card da Página */}
      <div className="flex items-center justify-between gap-1.5 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Alça visual de arraste nos modos com suporte a reordenação */}
          {hasReorderControls && (
            <div
              className="text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded transition-colors"
              title="Arraste para reordenar esta página"
              aria-label={`Alça para arrastar página ${pageNumber}`}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect(pageNumber)
            }}
            disabled={disabled}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              isExtractMode
                ? isSelected
                  ? 'bg-[#C9922A] border-[#C9922A] text-white'
                  : 'border-muted-foreground/40 hover:border-[#C9922A] bg-background'
                : isDeleteMode || isOrganizeMode
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
              isExtractMode
                ? isSelected
                  ? 'Desmarcar página para extração'
                  : 'Selecionar página para extração'
                : isDeleteMode || isOrganizeMode
                  ? isMarkedForDeletion
                    ? 'Desmarcar exclusão da página'
                    : 'Marcar página para exclusão'
                  : isSelected
                    ? 'Desmarcar página'
                    : 'Selecionar página'
            }
            aria-label={`Página original ${pageNumber}`}
          >
            {(isExtractMode ? isSelected : isMarkedForDeletion || isSelected) && (
              <Check className="w-3 h-3 stroke-[3]" />
            )}
          </button>

          <div className="flex flex-col min-w-0 leading-tight">
            {hasReorderControls && typeof currentPosition === 'number' ? (
              <>
                <span
                  className={`text-xs font-bold truncate ${
                    isExtractMode
                      ? isSelected
                        ? 'text-[#C9922A]'
                        : 'text-foreground'
                      : isMarkedForDeletion
                        ? 'text-destructive'
                        : 'text-foreground'
                  }`}
                  title={`Posição atual na sequência: ${currentPosition}`}
                >
                  Posição #{currentPosition}
                </span>
                <span
                  className="text-[10px] text-muted-foreground truncate"
                  title={`Página original do documento: ${pageNumber}`}
                >
                  Orig. {pageNumber}
                </span>
              </>
            ) : (
              <span
                className={`text-xs font-semibold truncate ${
                  isDeleteMode && isMarkedForDeletion
                    ? 'text-destructive font-bold'
                    : 'text-foreground'
                }`}
              >
                Pág. {pageNumber}
              </span>
            )}
          </div>
        </div>

        {/* Badges de Estado */}
        <div className="flex items-center gap-1 shrink-0">
          {isExtractMode ? (
            isSelected ? (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold px-1.5 py-0 border-[#C9922A]/60 bg-[#C9922A]/15 text-[#C9922A]"
                title="Esta página será incluída no PDF extraído"
              >
                Extrair
              </Badge>
            ) : isPositionChanged ? (
              <Badge
                variant="outline"
                className="text-[10px] font-medium px-1.5 py-0 border-[#C9922A]/30 bg-[#C9922A]/5 text-[#C9922A]"
                title={`Página original ${pageNumber} movida para posição ${currentPosition}`}
              >
                Movida
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] font-normal px-1.5 py-0 border-border text-muted-foreground bg-muted/30"
              >
                #{currentPosition}
              </Badge>
            )
          ) : isOrganizeMode ? (
            isMarkedForDeletion ? (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold px-1.5 py-0 border-destructive/40 bg-destructive/10 text-destructive"
              >
                Excluir
              </Badge>
            ) : isPositionChanged ? (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold px-1.5 py-0 border-[#C9922A]/50 bg-[#C9922A]/10 text-[#C9922A]"
                title={`Página original ${pageNumber} movida para posição ${currentPosition}`}
              >
                Movida
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] font-normal px-1.5 py-0 border-border text-muted-foreground bg-muted/30"
              >
                #{currentPosition}
              </Badge>
            )
          ) : isDeleteMode ? (
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
          isExtractMode
            ? isSelected
              ? 'bg-[#C9922A]/[0.08] border-[#C9922A]/40 hover:bg-[#C9922A]/[0.12]'
              : 'bg-muted/40 border-border/40 hover:bg-muted/60'
            : (isDeleteMode || isOrganizeMode) && isMarkedForDeletion
              ? 'bg-destructive/[0.06] border-destructive/30 hover:bg-destructive/[0.10]'
              : 'bg-muted/40 border-border/40 hover:bg-muted/60'
        }`}
        title={
          isExtractMode
            ? `Página original ${pageNumber} (Posição ${currentPosition}). Clique para ${
                isSelected ? 'desmarcar da extração' : 'selecionar para extração'
              } ou arraste para reordenar.`
            : isOrganizeMode
              ? `Página original ${pageNumber} (Posição ${currentPosition}). Clique para ${
                  isMarkedForDeletion ? 'manter' : 'marcar para exclusão'
                } ou arraste para reordenar.`
              : isDeleteMode
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
          className={`max-h-[160px] max-w-[130px] rounded shadow-sm object-contain transition-all duration-200 pointer-events-none ${
            isVisible && !isRendering && !renderError
              ? isExtractMode
                ? isSelected
                  ? 'opacity-100'
                  : 'opacity-70'
                : (isDeleteMode || isOrganizeMode) && isMarkedForDeletion
                  ? 'opacity-40 grayscale contrast-75'
                  : 'opacity-100'
              : 'opacity-40'
          }`}
        />

        {/* Overlay de exclusão visual discreto quando marcada para exclusão (modo delete/organize) */}
        {!isExtractMode && (isDeleteMode || isOrganizeMode) && isMarkedForDeletion && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/15 backdrop-blur-[0.5px] pointer-events-none transition-opacity">
            <span className="text-[11px] font-semibold text-destructive px-2 py-0.5 rounded bg-background/90 shadow-xs border border-destructive/30">
              Será excluída
            </span>
          </div>
        )}

        {/* Overlay sutil positivo de extração quando selecionada (modo extract) */}
        {isExtractMode && isSelected && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <span className="text-[10px] font-bold text-[#C9922A] px-1.5 py-0.5 rounded bg-background/95 shadow-xs border border-[#C9922A]/40 flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" />
              Extrair
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

      {/* Controles de Reordenação Alternativos (Modos organize e extract: mover esquerda / direita) */}
      {hasReorderControls && (
        <div className="flex items-center justify-between gap-1 pt-2 mt-auto border-t border-dashed border-border/60">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              if (onMoveLeft) onMoveLeft(pageNumber)
            }}
            disabled={disabled || !canMoveLeft}
            title={
              canMoveLeft
                ? `Mover página original ${pageNumber} para a esquerda (posição ${(currentPosition || 1) - 1})`
                : 'Primeira página da sequência'
            }
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-[#C9922A]/10 hover:text-[#C9922A] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
            <span className="text-[11px]">Anterior</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              if (onMoveRight) onMoveRight(pageNumber)
            }}
            disabled={disabled || !canMoveRight}
            title={
              canMoveRight
                ? `Mover página original ${pageNumber} para a direita (posição ${(currentPosition || 1) + 1})`
                : 'Última página da sequência'
            }
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-[#C9922A]/10 hover:text-[#C9922A] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <span className="text-[11px]">Próxima</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>
      )}

      {/* Ações de Rotação por Página (somente no modo rotate) */}
      {!isDeleteMode && !isOrganizeMode && (
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
