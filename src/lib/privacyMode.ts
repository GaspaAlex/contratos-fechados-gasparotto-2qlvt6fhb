import { useState, useEffect } from 'react'

const STORAGE_KEY = 'gasparotto_privacy_mode'

/**
 * Mascaramento central do Modo de Privacidade.
 * v0.0.1098: escopo ampliado de RPV/Precatório para todas as telas com dados
 * de clientes/leads (Protocolo, Contratos Fechados, Perícias, Central
 * Auxílio-Acidente, Leads Campanha/Registro). Mesmos valores usados na tabela,
 * nos tooltips, na busca e nos relatórios impressos.
 */
export const PRIVACY_MASK = {
  nome: 'Cliente oculto',
  cpf: '•••.•••.•••-••',
  telefone: '•• ••••-••••',
  email: '••••@•••••',
  endereco: 'Endereço oculto',
  processo: '•••••••-••.••••.•.•.••••',
  observacoes: 'Observação oculta',
  busca: '••••••••••',
}

/**
 * Campos canônicos que identificam clientes/leads, agrupados por tipo de
 * máscara. Usado por maskClienteRecords (mascaramento em nível de dados, que
 * cobre tabela + tooltips + busca de uma vez) e por maskField (relatórios).
 */
const FIELD_KINDS: Record<string, keyof typeof PRIVACY_MASK> = {
  nome: 'nome',
  cliente: 'nome',
  nome_completo: 'nome',
  representante_nome: 'nome',
  cpf: 'cpf',
  cpf_cnpj: 'cpf',
  fone: 'telefone',
  telefone: 'telefone',
  celular: 'telefone',
  whatsapp: 'telefone',
  email: 'email',
  endereco: 'endereco',
  numero_processo: 'processo',
  num_processo: 'processo',
  nautos: 'processo',
  observacoes: 'observacoes',
  observacao: 'observacoes',
  obs: 'observacoes',
  relato: 'observacoes',
  relatos: 'observacoes',
}

/** Máscara de um campo avulso pelo nome (para relatórios impressos). */
export function maskField(on: boolean, field: string, value?: string | null): string {
  const kind = FIELD_KINDS[field]
  if (!on || !kind || value === null || value === undefined || value === '') {
    return value ?? ''
  }
  return PRIVACY_MASK[kind]
}

/**
 * Mascara em nível de DADOS os campos identificadores de cada registro.
 * Estado interno (filtros, busca digitada, cálculos numéricos) permanece: só
 * os valores exibidos/descidos para a UI viram máscara — o mesmo padrão
 * aprovado na RPV, agora cobrindo tabelas, tooltips e busca de uma vez.
 */
export function maskClienteRecords<T extends Record<string, any>>(
  on: boolean,
  records: T[] | undefined | null,
): T[] {
  if (!on || !records || records.length === 0) return records ?? []
  return records.map((rec) => {
    let changed = false
    const out: Record<string, any> = { ...rec }
    for (const field of Object.keys(FIELD_KINDS)) {
      const v = out[field]
      if (v === null || v === undefined || v === '') continue
      if (typeof v !== 'string' && typeof v !== 'number') continue
      out[field] = PRIVACY_MASK[FIELD_KINDS[field]]
      changed = true
    }
    return changed ? (out as T) : rec
  })
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
