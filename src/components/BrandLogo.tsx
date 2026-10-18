import React from 'react'
import { cn } from '@/lib/utils'
import logoGasparotto from '@/assets/logo-site-gasparotto-gestao-120b3.png'

export interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  alt?: string
  /**
   * Mantido por retrocompatibilidade de API, mas a imagem original já contém "SISTEMA DE GESTÃO".
   */
  hideSubtitle?: boolean
  /**
   * Tamanho sugerido ('default' | 'compact' | 'large')
   */
  size?: 'default' | 'compact' | 'large'
}

/**
 * BrandLogo — Logomarca Oficial da Advocacia Gasparotto (Sistema de Gestão).
 *
 * Utiliza rigorosamente o arquivo PNG original da logomarca enviado pelo usuário,
 * sem recriação vetorial, sem redesenho em SVG/HTML/CSS e sem alteração de pixels.
 *
 * A imagem original já é horizontal e contém a balança dourada, "ADVOCACIA GASPAROTTO"
 * e "SISTEMA DE GESTÃO", com seu fundo institucional grafite/azul-marinho original.
 */
export function BrandLogo({
  className,
  alt = 'Advocacia Gasparotto - Sistema de Gestão',
  size = 'default',
  ...props
}: BrandLogoProps) {
  const isCompact = size === 'compact'
  const isLarge = size === 'large'

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        'relative flex items-center justify-center select-none rounded-lg',
        'bg-[#161920] border border-[#262B38]/60 shadow-[0_2px_10px_rgba(0,0,0,0.25)]',
        'transition-all overflow-hidden',
        isCompact
          ? 'p-1 w-full max-w-[200px]'
          : isLarge
            ? 'p-1.5 sm:p-2 w-full max-w-[360px]'
            : 'p-1 w-full max-w-full',
        className,
      )}
      {...props}
    >
      <img
        src={logoGasparotto}
        alt={alt}
        loading="eager"
        decoding="sync"
        className={cn(
          'w-full h-auto object-contain block select-none pointer-events-none rounded-[4px]',
          isCompact ? 'max-h-[54px]' : isLarge ? 'max-h-[110px]' : 'max-h-[82px]',
        )}
      />
    </div>
  )
}

export default BrandLogo
