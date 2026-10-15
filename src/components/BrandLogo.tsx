import logoFile from '@/assets/logo-site-gasparotto-gestao-d729c.png'
import { cn } from '@/lib/utils'

export interface BrandLogoProps {
  className?: string
  alt?: string
}

/**
 * BrandLogo — Componente central de identidade visual da Advocacia Gasparotto.
 * Renderiza a logo oficial horizontal preservando proporções originais e transparência.
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
