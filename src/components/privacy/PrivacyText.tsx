import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { PRIVACY_MASK, usePrivacyMode } from '@/lib/privacyMode'

interface PrivacyTextProps {
  /** Valor real a ser ocultado quando o Modo de Privacidade estiver ativo */
  value: string | number | null | undefined
  /** O que exibir no lugar quando o modo estiver ativo (padrão: Cliente oculto) */
  mask?: string
  className?: string
  /** Mantém o título/tooltip do span (apenas quando o modo está desligado) */
  titleWhenVisible?: boolean
  as?: 'span' | 'div'
}

/**
 * Renderiza o texto normal com o Modo de Privacidade desligado, ou o valor
 * mascarado com o modo ativo — sem nunca manter o valor real no DOM
 * (nada de tooltip, title, aria-label ou seleção/cópia enquanto mascarado).
 */
export function PrivacyText({
  value,
  mask = PRIVACY_MASK.nome,
  className,
  titleWhenVisible = false,
  as = 'span',
}: PrivacyTextProps) {
  const { enabled } = usePrivacyMode()
  const [visibleValue, setVisibleValue] = useState(value)

  // Mantém o último valor real em memória para restaurar integralmente
  // ao desligar o modo (inclusive se o item sumir da lista durante o modo).
  useEffect(() => {
    if (value !== null && value !== undefined && String(value) !== '') {
      setVisibleValue(value)
    }
  }, [value])

  const display = enabled
    ? mask
    : visibleValue === null || visibleValue === undefined || visibleValue === ''
      ? ''
      : String(visibleValue)

  const Tag = as

  return (
    <Tag
      className={cn(className, enabled && 'select-none')}
      title={
        enabled || !titleWhenVisible
          ? undefined
          : titleWhenVisible
            ? String(visibleValue ?? '')
            : undefined
      }
      aria-hidden={enabled ? 'true' : undefined}
      aria-label={enabled ? undefined : titleWhenVisible ? String(visibleValue ?? '') : undefined}
    >
      {display}
    </Tag>
  )
}
