import { useState, useEffect } from 'react'

const STORAGE_KEY = 'gasparotto_privacy_mode'

/**
 * Mascaramento central do Modo de Privacidade (1º build: escopo RPV/Precatório).
 * Mesmos valores usados na tabela, nos tooltips, na busca e no relatório impresso.
 */
export const PRIVACY_MASK = {
  nome: 'Cliente oculto',
  cpf: '•••.•••.•••-••',
  processo: '•••••••-••.••••.•.•.••••',
  observacoes: 'Observação oculta',
  busca: '••••••••••',
}

class PrivacyModeStore {
  private enabled: boolean
  private listeners = new Set<() => void>()

  constructor() {
    try {
      this.enabled = localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      this.enabled = false
    }
  }

  isEnabled = () => {
    return this.enabled
  }

  toggle = () => {
    this.enabled = !this.enabled
    try {
      localStorage.setItem(STORAGE_KEY, this.enabled ? 'true' : 'false')
    } catch {
      // localStorage indisponível: modo vale só para a sessão
    }
    this.notify()
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  private notify() {
    this.listeners.forEach((l) => l())
  }
}

export const privacyModeStore = new PrivacyModeStore()

export function usePrivacyMode() {
  const [enabled, setEnabled] = useState(() => privacyModeStore.isEnabled())

  useEffect(() => {
    const unsubscribe = privacyModeStore.subscribe(() => {
      setEnabled(privacyModeStore.isEnabled())
    })
    return () => {
      unsubscribe()
    }
  }, [])

  return {
    enabled,
    toggle: privacyModeStore.toggle,
  }
}
