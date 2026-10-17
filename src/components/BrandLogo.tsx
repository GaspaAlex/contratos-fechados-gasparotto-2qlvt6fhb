import logoFile from '@/assets/logo-site-gasparotto-gestao-2dbbf.png'
import { cn } from '@/lib/utils'

export interface BrandLogoProps {
  className?: string
  alt?: string
}

/**
 * BrandLogo — Componente central de identidade visual da Advocacia Gasparotto.
 * Renderiza a nova logomarca institucional oficial horizontal (balança dourada/marrom
 * e tipografia Advocacia Gasparotto) preservando proporções originais, nitidez e transparência.
 */
export function BrandLogo({ className, alt = 'Advocacia Gasparotto' }: BrandLogoProps) {
  return (
    <img
      src={logoFile}
      alt={alt}
      className={cn('w-full h-auto object-contain block select-none', className)}
      loading="eager"
      decoding="async"
    />
  )
}

export default BrandLogo
