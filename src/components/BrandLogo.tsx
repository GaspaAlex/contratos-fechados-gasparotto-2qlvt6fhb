import React from 'react'
import { cn } from '@/lib/utils'

export interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  alt?: string
  /**
   * Se true, oculta o subtítulo "SISTEMA DE GESTÃO" caso o chamador queira renderizar externamente.
   * O padrão é false (renderiza a composição completa).
   */
  hideSubtitle?: boolean
  /**
   * Tamanho/estilo sugerido ('default' | 'compact' | 'large')
   */
  size?: 'default' | 'compact' | 'large'
}

/**
 * Ícone vetorial da Balança da Justiça com gradiente dourado metálico rico e refinado.
 * Desenho vetorial de alta precisão inspirado na identidade aprovada da Advocacia Gasparotto.
 */
export function JusticeScalesIcon({ className = 'w-10 h-10' }: { className?: string }) {
  // Geramos id único simples ou usamos ids fixos para gradientes
  const id = 'brand-scale-gold'
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 select-none overflow-visible', className)}
      aria-hidden="true"
    >
      <defs>
        {/* Gradiente principal dourado metálico */}
        <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF1B8" />
          <stop offset="22%" stopColor="#DFAD48" />
          <stop offset="48%" stopColor="#C9922A" />
          <stop offset="72%" stopColor="#E5B957" />
          <stop offset="100%" stopColor="#8A5A12" />
        </linearGradient>

        {/* Gradiente claro para reflexos / highlights */}
        <linearGradient id={`${id}-light`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFBE0" />
          <stop offset="40%" stopColor="#F5D076" />
          <stop offset="100%" stopColor="#A8731E" />
        </linearGradient>

        {/* Gradiente escuro para profundidade e sombras do metal */}
        <linearGradient id={`${id}-dark`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8A5C14" />
          <stop offset="60%" stopColor="#4A3008" />
          <stop offset="100%" stopColor="#251602" />
        </linearGradient>

        {/* Gradiente horizontal para o travessão da balança */}
        <linearGradient id={`${id}-beam`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#E5B957" />
          <stop offset="15%" stopColor="#FFF1B8" />
          <stop offset="50%" stopColor="#AA751E" />
          <stop offset="85%" stopColor="#FFF1B8" />
          <stop offset="100%" stopColor="#E5B957" />
        </linearGradient>

        {/* Gradiente radial para os pratos côncavos */}
        <radialGradient id={`${id}-pan`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFF2C2" />
          <stop offset="35%" stopColor="#DFAD48" />
          <stop offset="75%" stopColor="#9E6916" />
          <stop offset="100%" stopColor="#543608" />
        </radialGradient>

        {/* Sombra sutil interna dos pratos */}
        <linearGradient id={`${id}-pan-rim`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFBE6" />
          <stop offset="100%" stopColor="#7E520F" />
        </linearGradient>
      </defs>

      {/* BASE DA BALANÇA: degraus moldados com acabamento clássico */}
      {/* Degrau inferior largo */}
      <path
        d="M26 89.5C26 87.5 36 86 50 86C64 86 74 87.5 74 89.5C74 91.5 64 93 50 93C36 93 26 91.5 26 89.5Z"
        fill={`url(#${id}-dark)`}
      />
      <path
        d="M27 89C27 87.5 37 86.5 50 86.5C63 86.5 73 87.5 73 89V90.5C73 92 63 93 50 93C37 93 27 92 27 90.5V89Z"
        fill={`url(#${id}-grad)`}
      />
      <ellipse cx="50" cy="88" rx="22" ry="2.2" fill={`url(#${id}-light)`} />

      {/* Degrau intermediário moldado */}
      <path
        d="M33 83.5C33 82 40 81 50 81C60 81 67 82 67 83.5V85.5C67 87 60 88 50 88C40 88 33 87 33 85.5V83.5Z"
        fill={`url(#${id}-grad)`}
      />
      <ellipse cx="50" cy="83.2" rx="16.5" ry="1.8" fill={`url(#${id}-light)`} />

      {/* Degrau superior / sino da base */}
      <path
        d="M39 77.5C39 76.5 44 75.5 50 75.5C56 75.5 61 76.5 61 77.5L64 82C60 83 40 83 36 82L39 77.5Z"
        fill={`url(#${id}-grad)`}
      />

      {/* COLUNA CENTRAL / PILAR clássico torneado */}
      {/* Anel inferior */}
      <ellipse cx="50" cy="74" rx="7.5" ry="1.6" fill={`url(#${id}-light)`} />
      <path
        d="M43 74C43 75 46 76 50 76C54 76 57 75 57 74L56.5 72.5C54.5 73.2 45.5 73.2 43.5 72.5L43 74Z"
        fill={`url(#${id}-dark)`}
      />

      {/* Fuste inferior torneado */}
      <path
        d="M45.5 59C45.5 59 44 65 43.5 72C46 73 54 73 56.5 72C56 65 54.5 59 54.5 59H45.5Z"
        fill={`url(#${id}-grad)`}
      />
      {/* Highlight vertical do fuste */}
      <path
        d="M48.5 60L47.5 71C49 71.5 51 71.5 52.5 71L51.5 60H48.5Z"
        fill={`url(#${id}-light)`}
        opacity="0.65"
      />

      {/* Bulbo / anel central */}
      <ellipse cx="50" cy="57" rx="8" ry="2" fill={`url(#${id}-light)`} />
      <path
        d="M42 57C42 59.5 45.5 61 50 61C54.5 61 58 59.5 58 57C58 54.5 54.5 53 50 53C45.5 53 42 54.5 42 57Z"
        fill={`url(#${id}-grad)`}
      />
      <ellipse cx="50" cy="56.5" rx="6.5" ry="1.4" fill={`url(#${id}-light)`} />

      {/* Fuste superior torneado */}
      <path
        d="M46 36C46 43 44 51 44.5 54C47 55 53 55 55.5 54C56 51 54 43 54 36H46Z"
        fill={`url(#${id}-grad)`}
      />
      <path
        d="M48.5 37L48 53C49.5 53.4 50.5 53.4 52 53L51.5 37H48.5Z"
        fill={`url(#${id}-light)`}
        opacity="0.7"
      />

      {/* Anel do topo abaixo do pivô */}
      <ellipse cx="50" cy="35" rx="6.5" ry="1.5" fill={`url(#${id}-light)`} />

      {/* PIVÔ E PONTEIRO CENTRAL */}
      {/* Pivô central (esfera/anel no cruzamento) */}
      <circle cx="50" cy="27" r="4.2" fill={`url(#${id}-grad)`} />
      <circle cx="49" cy="25.8" r="2.2" fill={`url(#${id}-light)`} opacity="0.85" />
      {/* Finial / topo pontiagudo ornamental */}
      <path d="M48 23L50 15L52 23H48Z" fill={`url(#${id}-light)`} />
      <circle cx="50" cy="14" r="2.2" fill={`url(#${id}-light)`} />
      {/* Ponteiro central de fidelidade */}
      <path d="M49 27L49.5 33.5L50 34.5L50.5 33.5L51 27H49Z" fill={`url(#${id}-dark)`} />

      {/* BRAÇO HORIZONTAL / TRAVESSÃO COM CURVATURA ORNAMENTAL */}
      <path
        d="M17 31C28 29.5 41 26 47 25.5V28C41 28.5 28 32 17 33.5V31Z"
        fill={`url(#${id}-beam)`}
      />
      <path
        d="M83 31C72 29.5 59 26 53 25.5V28C59 28.5 72 32 83 33.5V31Z"
        fill={`url(#${id}-beam)`}
      />
      {/* Terminais e ilhoses das pontas */}
      <circle cx="17" cy="32" r="2.8" fill={`url(#${id}-grad)`} />
      <circle cx="17" cy="31.5" r="1.4" fill={`url(#${id}-light)`} />
      <circle cx="83" cy="32" r="2.8" fill={`url(#${id}-grad)`} />
      <circle cx="83" cy="31.5" r="1.4" fill={`url(#${id}-light)`} />

      {/* CORRENTES DA ESQUERDA (3 fios com brilho) */}
      {/* Fio 1 (borda esquerda) */}
      <line
        x1="17"
        y1="33"
        x2="8.5"
        y2="52"
        stroke={`url(#${id}-light)`}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Fio 2 (centro do prato) */}
      <line
        x1="17"
        y1="33"
        x2="17"
        y2="52"
        stroke={`url(#${id}-grad)`}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Fio 3 (borda direita) */}
      <line
        x1="17"
        y1="33"
        x2="25.5"
        y2="52"
        stroke={`url(#${id}-light)`}
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* PRATO DA ESQUERDA (côncavo profundo com luz e sombra volumétrica) */}
      <g>
        {/* Corpo externo do prato */}
        <path d="M8 52C8 60 12 62.5 17 62.5C22 62.5 26 60 26 52H8Z" fill={`url(#${id}-pan)`} />
        {/* Borda / anel superior do prato (elipse) */}
        <ellipse cx="17" cy="52" rx="9" ry="2.2" fill={`url(#${id}-pan-rim)`} />
        <ellipse cx="17" cy="52.4" rx="7.8" ry="1.6" fill={`url(#${id}-dark)`} />
        {/* Reflexo na borda inferior do prato */}
        <path
          d="M10 54.5C12 60 22 60 24 54.5C22.5 61 11.5 61 10 54.5Z"
          fill={`url(#${id}-light)`}
          opacity="0.8"
        />
      </g>

      {/* CORRENTES DA DIREITA (3 fios com brilho) */}
      {/* Fio 1 (borda esquerda) */}
      <line
        x1="83"
        y1="33"
        x2="74.5"
        y2="52"
        stroke={`url(#${id}-light)`}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Fio 2 (centro do prato) */}
      <line
        x1="83"
        y1="33"
        x2="83"
        y2="52"
        stroke={`url(#${id}-grad)`}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Fio 3 (borda direita) */}
      <line
        x1="83"
        y1="33"
        x2="91.5"
        y2="52"
        stroke={`url(#${id}-light)`}
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* PRATO DA DIREITA (côncavo profundo com luz e sombra volumétrica) */}
      <g>
        {/* Corpo externo do prato */}
        <path d="M74 52C74 60 78 62.5 83 62.5C88 62.5 92 60 92 52H74Z" fill={`url(#${id}-pan)`} />
        {/* Borda / anel superior do prato (elipse) */}
        <ellipse cx="83" cy="52" rx="9" ry="2.2" fill={`url(#${id}-pan-rim)`} />
        <ellipse cx="83" cy="52.4" rx="7.8" ry="1.6" fill={`url(#${id}-dark)`} />
        {/* Reflexo na borda inferior do prato */}
        <path
          d="M76 54.5C78 60 88 60 90 54.5C88.5 61 77.5 61 76 54.5Z"
          fill={`url(#${id}-light)`}
          opacity="0.8"
        />
      </g>
    </svg>
  )
}

/**
 * BrandLogo — Painel de Marca Oficial do Sistema de Gestão Advocacia Gasparotto.
 *
 * Reconstrução 100% vetorial/HTML (SVG de alta precisão + tipografia Playfair Display/Inter)
 * substituindo arte rasterizada por arte nítida em qualquer resolução.
 *
 * Segue rigorosamente a composição aprovada da marca:
 * 1. Balança dourada metálica à esquerda
 * 2. Fundo em grafite institucional (#161920)
 * 3. Textos organizados:
 *    - "ADVOCACIA" acima, menor, com tracking amplo e dourado suave
 *    - "GASPAROTTO" logo abaixo, com fonte serifada premium elegante, harmônica e sem distorção
 * 4. "SISTEMA DE GESTÃO" abaixo, centralizado e independente, com tracking amplo e espaçamento generoso entre palavras.
 */
export function BrandLogo({
  className,
  alt = 'Advocacia Gasparotto - Sistema de Gestão',
  hideSubtitle = false,
  size = 'default',
  ...props
}: BrandLogoProps) {
  // Ajustes de escala conforme o size
  const isCompact = size === 'compact'
  const isLarge = size === 'large'

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        'relative inline-flex flex-col items-center justify-center select-none rounded-lg',
        'bg-[#161920] border border-[#262B38] shadow-[0_4px_20px_rgba(0,0,0,0.35)]',
        'text-left transition-all overflow-hidden',
        isCompact ? 'p-2' : isLarge ? 'p-5 sm:p-6' : 'px-3 py-2.5',
        className,
      )}
      {...props}
    >
      {/* Sutil brilho de fundo radial dourado/grafite para sensação de profundidade premium */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at 25% 40%, rgba(201,146,42,0.12) 0%, rgba(22,25,32,0) 70%)',
        }}
        aria-hidden="true"
      />

      {/* BLOCO PRINCIPAL: Balança à esquerda + "ADVOCACIA GASPAROTTO" à direita */}
      <div className="relative z-10 flex items-center justify-center gap-2.5 sm:gap-3 w-full">
        {/* Balança vetorial dourada à esquerda */}
        <div className="shrink-0 flex items-center justify-center">
          <JusticeScalesIcon
            className={cn(
              'drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform',
              isCompact ? 'w-8 h-8' : isLarge ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-10 h-10',
            )}
          />
        </div>

        {/* Nomes institucionais */}
        <div className="flex flex-col justify-center leading-none tracking-normal">
          {/* ADVOCACIA (menor, espaçado, dourado institucional suave) */}
          <span
            className={cn(
              'font-semibold uppercase select-none',
              isCompact
                ? 'text-[8.5px] tracking-[0.24em]'
                : isLarge
                  ? 'text-[13px] sm:text-[15px] tracking-[0.3em] mb-1'
                  : 'text-[9.5px] sm:text-[10.5px] tracking-[0.28em] mb-0.5',
            )}
            style={{
              fontFamily: '"Cinzel", "Playfair Display", -apple-system, BlinkMacSystemFont, serif',
              color: '#DFAD48',
              letterSpacing: isCompact ? '0.24em' : '0.28em',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
            }}
          >
            ADVOCACIA
          </span>

          {/* GASPAROTTO (destaque principal, serifada refinada, harmônica, com gradiente dourado nobre) */}
          <span
            className={cn(
              'font-bold select-none leading-none tracking-normal',
              isCompact
                ? 'text-[15px]'
                : isLarge
                  ? 'text-[24px] sm:text-[30px]'
                  : 'text-[18px] sm:text-[20px]',
            )}
            style={{
              fontFamily: '"Playfair Display", "Cinzel", Georgia, "Times New Roman", serif',
              letterSpacing: '0.04em',
              background:
                'linear-gradient(180deg, #FFF5D0 0%, #F5CE70 28%, #D49D32 65%, #AA7216 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))',
            }}
          >
            GASPAROTTO
          </span>
        </div>
      </div>

      {/* SISTEMA DE GESTÃO: Linha inferior independente com espaçamento ampliado entre letras e palavras */}
      {!hideSubtitle && (
        <div className="relative z-10 w-full flex items-center justify-center mt-2 pt-1.5 border-t border-[#262B38]/60">
          <span
            className={cn(
              'font-medium uppercase text-center select-none text-[#D4AF37]/90 transition-colors',
              isCompact
                ? 'text-[8px] tracking-[0.28em]'
                : isLarge
                  ? 'text-[11px] sm:text-[12px] tracking-[0.38em]'
                  : 'text-[9px] sm:text-[9.5px] tracking-[0.32em]',
            )}
            style={{
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif',
              letterSpacing: isCompact ? '0.28em' : isLarge ? '0.38em' : '0.32em',
              wordSpacing: '0.45em',
            }}
          >
            SISTEMA &nbsp;DE &nbsp;GESTÃO
          </span>
        </div>
      )}
    </div>
  )
}

export default BrandLogo
