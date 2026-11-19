import { useState, useEffect, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, FilterX, Pencil, Plus, Search, Trash2, Phone } from 'lucide-react'
import {
  deleteLeadAux,
  getLeadsAux,
  ORIGEM_LABELS,
  STATUS_FUNIL_LABELS,
  MOTIVO_DESQUALIFICACAO_OPTIONS,
  INVALIDATING_STATUSES,
  motivoInvalidante,
  formatPhoneMask,
  formatDateBR,
  responsavelId,
  isContratoValidoAuxAcidente,
} from '@/services/leadsAuxAcidente'
import type { ContratoFechadoResumo } from '@/services/leadsAuxAcidente'
import type {
  LeadAuxAcidente,
  OrigemLead,
  Responsivo,
  StatusFunil,
} from '@/services/leadsAuxAcidente'
import { getResponsaveisAtivos } from '@/services/responsaveis'
import { AuxAcidenteModal } from '@/components/leads/AuxAcidenteModal'
import { AuxAcidenteCards } from '@/components/leads/AuxAcidenteCards'
import { AuxAcidenteFunil } from '@/components/leads/AuxAcidenteFunil'
import { AuxAcidenteComparativoOrigens } from '@/components/leads/AuxAcidenteComparativoOrigens'
import { AuxAcidenteEvolucaoTempo } from '@/components/leads/AuxAcidenteEvolucaoTempo'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { usePrivacyMode, PRIVACY_MASK } from '@/lib/privacyMode'
import { PrivacyText } from '@/components/privacy/PrivacyText'
import { cn } from '@/lib/utils'
import { normalizeSearchText } from '@/lib/utils'
import type { RecordModel } from 'pocketbase'

type ResponsaveisMap = Record<string, string>

/** Motivos que caracterizam desqualificação AUTOMÁTICA por contrato invalidante. */
const MOTIVOS_INVALIDANTES = new Set(INVALIDATING_STATUSES.map((i) => i.motivo_desqualificacao))

const STATUS_COLORS: Record<StatusFunil, string> = {
  qualificando:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900',
  qualificado:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900',
  desqualificado:
    'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900',
}

const RESPONSIVO_LABELS: Record<string, string> = {
  sim: 'Sim',
  nao: 'Não',
}

export default function LeadsAuxAcidente() {
  const [leads, setLeads] = useState<LeadAuxAcidente[]>([])
  const [responsaveis, setResponsaveis] = useState<{ id: string; nome: string }[]>([])
  const [loading, setLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<LeadAuxAcidente | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<LeadAuxAcidente | null>(null)

  const [deleteLoading, setDeleteLoading] = useState(false)

  // Filtros combináveis
  const [buscaTelefone, setBuscaTelefone] = useState('')
  const [buscaNome, setBuscaNome] = useState('')
  const [filtroOrigem, setFiltroOrigem] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [filtroResponsivo, setFiltroResponsivo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroDe, setFiltroDe] = useState('')
  const [filtroAte, setFiltroAte] = useState('')

  const { toast } = useToast()
  const { enabled: privacyOn } = usePrivacyMode()

  // Modo de Privacidade (padrão RPV/Perícias/Contratos Fechados): bloqueia a
  // abertura de modais que exibem dados reais do lead.
  const bloqueadoPrivacidade = () => {
    toast({
      variant: 'destructive',
      title: 'Indisponível no Modo de Privacidade',
      description: 'Desative o Modo de Privacidade para abrir o cadastro/edição do lead.',
    })
  }

  const handleAdd = () => {
    if (privacyOn) return bloqueadoPrivacidade()
    setSelectedRecord(null)
    setModalOpen(true)
  }

  const handleEdit = (row: LeadAuxAcidente) => {
    if (privacyOn) return bloqueadoPrivacidade()
    setSelectedRecord(row)
    setModalOpen(true)
  }

  // Solicitação de exclusão: com o Modo de Privacidade ativo o modal de exclusão
  // é bloqueado (o mesmo guard de handleAdd/handleEdit); fora dele, abre o modal
  // padrão, que já exibe o telefone mascarado quando privacyOn.
  const handleDeleteRequest = (row: LeadAuxAcidente) => {
    if (privacyOn) return bloqueadoPrivacidade()
    setRecordToDelete(row)
    setDeleteModalOpen(true)
  }

  // Modal aberto quando o modo é ativado: fecha sem salvar, com aviso.
  useEffect(() => {
    if (privacyOn && (modalOpen || deleteModalOpen)) {
      setModalOpen(false)
      setSelectedRecord(null)
      setDeleteModalOpen(false)
      setRecordToDelete(null)
      toast({
        title: 'Modo de Privacidade ativado',
        description: 'Modais abertos foram fechados sem salvar.',
      })
    }
  }, [privacyOn, modalOpen, deleteModalOpen, toast])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getLeadsAux()
      setLeads(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os leads de Auxílio-Acidente.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useRealtime<LeadAuxAcidente>('leads_aux_acidente', loadData)
  // Contratos Fechados também afetam os cards (contrato válido = Aux. Acidente +
  // status não arquivado). Mudança de status (ex.: Concluído ↔ Litispendência),
  // criação e exclusão de contrato recarregam os leads EXPANDIDOS — os cards
  // (e a tabela) recalculam sem F5, sem polling. IDs órfãos (relation apontando
  // para contrato excluído) voltam sem registro no expand e não contam.
  useRealtime<RecordModel>('contratos_fechados', loadData)

  useEffect(() => {
    getResponsaveisAtivos()
      .then((res) => setResponsaveis(res.map((r) => ({ id: r.id, nome: r.nome }))))
      .catch((err) => console.error('Erro ao buscar responsáveis', err))
  }, [])

  const responsaveisMap: ResponsaveisMap = useMemo(() => {
    const map: ResponsaveisMap = {}
    for (const r of responsaveis) map[r.id] = r.nome
    for (const l of leads) {
      const id = responsavelId(l)
      if (id && !map[id]) {
        const nome = l.expand?.responsavel?.nome
        if (nome) map[id] = nome
      }
    }
    return map
  }, [responsaveis, leads])

  const hasActiveFilters =
    Boolean(buscaTelefone) ||
    Boolean(buscaNome) ||
    Boolean(filtroOrigem) ||
    Boolean(filtroResponsavel) ||
    Boolean(filtroResponsivo) ||
    Boolean(filtroStatus) ||
    Boolean(filtroDe) ||
    Boolean(filtroAte)

  const clearFilters = () => {
    setBuscaTelefone('')
    setBuscaNome('')
    setFiltroOrigem('')
    setFiltroResponsavel('')
    setFiltroResponsivo('')
    setFiltroStatus('')
    setFiltroDe('')
    setFiltroAte('')
  }

  const filteredLeads = useMemo(() => {
    const telDigits = buscaTelefone.replace(/\D/g, '')
    const nomeNorm = normalizeSearchText(buscaNome)
    const de = filtroDe // 'YYYY-MM-DD'
    const ate = filtroAte

    return leads.filter((l) => {
      if (telDigits && !l.telefone.replace(/\D/g, '').includes(telDigits)) return false
      if (nomeNorm && !normalizeSearchText(l.nome || '').includes(nomeNorm)) return false
      if (filtroOrigem && l.origem_lead !== filtroOrigem) return false
      if (filtroResponsavel) {
        const id = responsavelId(l)
        if (id !== filtroResponsavel) return false
      }
      if (filtroResponsivo && (l.responsivo || '') !== filtroResponsivo) return false
      if (filtroStatus && l.status_funil !== filtroStatus) return false

      const dataPart = String(l.data_entrada || '')
        .split(' ')[0]
        .split('T')[0]
      if (de && dataPart < de) return false
      if (ate && dataPart > ate) return false
      return true
    })
  }, [
    leads,
    buscaTelefone,
    buscaNome,
    filtroOrigem,
    filtroResponsavel,
    filtroResponsivo,
    filtroStatus,
    filtroDe,
    filtroAte,
  ])

  const confirmDelete = async () => {
    if (!recordToDelete) return
    setDeleteLoading(true)
    try {
      await deleteLeadAux(recordToDelete.id)
      toast({ title: 'Sucesso', description: 'Lead removido com sucesso.' })
      setDeleteModalOpen(false)
      setRecordToDelete(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível remover o lead.',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const responsivoDisplay = (r: Responsivo | '' | undefined): string => {
    if (r === 'sim' || r === 'nao') return RESPONSIVO_LABELS[r]
    return 'Não avaliado'
  }

  const motivoDisplay = (l: LeadAuxAcidente): string => {
    if (!l.motivo_desqualificacao) return '—'
    const found = MOTIVO_DESQUALIFICACAO_OPTIONS.find((o) => o.value === l.motivo_desqualificacao)
    if (!found) return l.motivo_desqualificacao
    if (found.value === 'outros' && l.motivo_desqualificacao_outro) {
      return `${found.label}: ${l.motivo_desqualificacao_outro}`
    }
    return found.label
  }

  /**
   * Rótulo do motivo na desqualificação AUTOMÁTICA por status invalidante:
   * "Litispendência" / "Sem Qualidade" / "Possui Advogado" conforme a causa
   * (labels curtos de INVALIDATING_STATUSES; fallback para o label do option).
   */
  const motivoInvalidanteLabel = (l: LeadAuxAcidente): string => {
    const found = INVALIDATING_STATUSES.find(
      (i) => i.motivo_desqualificacao === l.motivo_desqualificacao,
    )
    if (found) return found.label
    return motivoDisplay(l)
  }

  const labelCls =
    'text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mb-1 block'
  const controlCls =
    'h-9 w-full text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]'

  return (
    <div className="animate-fade-in-up pb-10 space-y-6">
      {/* 1. CABEÇALHO CORPORATIVO PADRONIZADO (GRAFITE PREMIUM 2.1) */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="inline-flex w-fit items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
            CAPTAÇÃO DE LEADS
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            Central Auxílio-Acidente
          </h1>
          <p className="text-sm text-[#78818E] dark:text-muted-foreground">
            Acompanhamento dos leads e atendimentos de Auxílio-Acidente.
          </p>
        </div>
        <Button
          onClick={handleAdd}
          className="w-full sm:w-auto h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b07d22] text-white rounded-md shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Novo Lead
        </Button>
      </div>

      {/* 2. ÁREA DE FILTROS SUPERIORES (padrão Leads Campanha) */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-end justify-between">
          <div className="flex flex-wrap items-end gap-2.5">
            {/* Busca por telefone */}
            <div className="w-full sm:w-[170px]">
              <label className={labelCls}>Telefone</label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#78818E]" />
                <Input
                  placeholder="Buscar telefone"
                  value={privacyOn && buscaTelefone ? PRIVACY_MASK.busca : buscaTelefone}
                  onChange={(e) => setBuscaTelefone(e.target.value)}
                  className="h-9 pl-8 text-xs bg-white dark:bg-card border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
                />
              </div>
            </div>

            {/* Busca por nome */}
            <div className="w-full sm:w-[190px]">
              <label className={labelCls}>Nome</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#78818E]" />
                <Input
                  placeholder="Buscar nome"
                  value={privacyOn && buscaNome ? PRIVACY_MASK.busca : buscaNome}
                  onChange={(e) => setBuscaNome(e.target.value)}
                  className="h-9 pl-8 text-xs bg-white dark:bg-card border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
                />
              </div>
            </div>

            {/* Origem */}
            <div className="w-full sm:w-[130px]">
              <label className={labelCls}>Origem</label>
              <Select
                value={filtroOrigem}
                onValueChange={(v) => setFiltroOrigem(v === ' ' ? '' : v)}
              >
                <SelectTrigger className={controlCls}>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" " className="text-xs">
                    Todas as origens
                  </SelectItem>
                  {Object.entries(ORIGEM_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Responsável */}
            <div className="w-full sm:w-[160px]">
              <label className={labelCls}>Responsável</label>
              <Select
                value={filtroResponsavel}
                onValueChange={(v) => setFiltroResponsavel(v === ' ' ? '' : v)}
              >
                <SelectTrigger className={controlCls}>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" " className="text-xs">
                    Todos os responsáveis
                  </SelectItem>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Responsivo */}
            <div className="w-full sm:w-[140px]">
              <label className={labelCls}>Responsivo</label>
              <Select
                value={filtroResponsivo}
                onValueChange={(v) => setFiltroResponsivo(v === ' ' ? '' : v)}
              >
                <SelectTrigger className={controlCls}>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" " className="text-xs">
                    Todos
                  </SelectItem>
                  <SelectItem value="nao-avaliado" className="text-xs">
                    Não avaliado
                  </SelectItem>
                  <SelectItem value="sim" className="text-xs">
                    Sim
                  </SelectItem>
                  <SelectItem value="nao" className="text-xs">
                    Não
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="w-full sm:w-[140px]">
              <label className={labelCls}>Status</label>
              <Select
                value={filtroStatus}
                onValueChange={(v) => setFiltroStatus(v === ' ' ? '' : v)}
              >
                <SelectTrigger className={controlCls}>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" " className="text-xs">
                    Todos os status
                  </SelectItem>
                  {Object.entries(STATUS_FUNIL_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período De */}
            <div className="w-full sm:w-[135px]">
              <label className={labelCls}>De (data entrada)</label>
              <Input
                type="date"
                value={filtroDe}
                onChange={(e) => setFiltroDe(e.target.value)}
                className="h-9 text-xs bg-white dark:bg-card border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
              />
            </div>

            {/* Período Até */}
            <div className="w-full sm:w-[135px]">
              <label className={labelCls}>Até (data entrada)</label>
              <Input
                type="date"
                value={filtroAte}
                onChange={(e) => setFiltroAte(e.target.value)}
                className="h-9 text-xs bg-white dark:bg-card border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
              />
            </div>

            {/* Botão Limpar */}
            {hasActiveFilters && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A] transition-colors"
                  onClick={clearFilters}
                  title="Limpar filtros"
                >
                  <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. CARDS PRINCIPAIS DO DASHBOARD (mesma lista filtrada da tabela) */}
      <AuxAcidenteCards leads={filteredLeads} loading={loading} />

      {/* 4. FUNIL COMERCIAL (mesma lista filtrada — reage aos mesmos filtros/realtime) */}
      <AuxAcidenteFunil leads={filteredLeads} loading={loading} />

      {/* 4.1 COMPARATIVO POR ORIGEM — Enlead × Campanha (Item 19): mesma lista
          filtrada (sem consulta extra), realtime herdado da página. O filtro
          Origem controla a exibição: Todas → dois painéis; Enlead/Campanha →
          apenas a origem filtrada (nunca comparar com origem excluída). */}
      <AuxAcidenteComparativoOrigens
        leads={filteredLeads}
        origemFiltro={filtroOrigem}
        loading={loading}
      />

      {/* 4.2 EVOLUÇÃO POR PERÍODO (Item 20): recolhível, recolhida por padrão —
          mesmo conjunto filtrado, realtime herdado da página. */}
      <AuxAcidenteEvolucaoTempo leads={filteredLeads} loading={loading} />

      {/* 5. TABELA DE LEADS */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E4E7EB] dark:border-border flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#252B34] dark:text-foreground">
            Leads ({filteredLeads.length})
          </h2>
          {loading && (
            <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">
              Carregando...
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E4E7EB] dark:border-border bg-[#FAF8F2] dark:bg-muted/40 text-left">
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px] text-[#78818E] whitespace-nowrap">
                  Data
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px] text-[#78818E] whitespace-nowrap">
                  Telefone
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px] text-[#78818E] whitespace-nowrap">
                  Nome
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px] text-[#78818E] whitespace-nowrap">
                  Origem
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px] text-[#78818E] whitespace-nowrap">
                  Responsável
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px] text-[#78818E] whitespace-nowrap">
                  Responsivo
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px] text-[#78818E] whitespace-nowrap">
                  Status
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px] text-[#78818E] whitespace-nowrap">
                  Motivo
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px] text-[#78818E] whitespace-nowrap">
                  Contrato
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px] text-[#78818E] whitespace-nowrap text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-[#78818E]">
                    {loading ? 'Carregando leads...' : 'Nenhum lead encontrado.'}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((l) => {
                  const respId = responsavelId(l)

                  // DESQUALIFICAÇÃO AUTOMÁTICA POR STATUS INVALIDANTE — aparência
                  // semelhante às linhas arquivadas de Contratos Fechados
                  // (ContractsTable): acinzentada, texto reduzido e tachado onde é
                  // coerente. Telefone, status, motivo e ações permanecem legíveis.
                  const autoInvalidado =
                    l.status_funil === 'desqualificado' &&
                    MOTIVOS_INVALIDANTES.has(l.motivo_desqualificacao || '')

                  // Contratos relacionados EXPANDIDOS: válidos vs. inválidos
                  // (arquivados/invalidantes/órfãos) — a relation é histórico.
                  const expandContratos: ContratoFechadoResumo[] = Array.isArray(
                    l.expand?.contratos,
                  )
                    ? (l.expand?.contratos as ContratoFechadoResumo[])
                    : []
                  const qtdValidos = expandContratos.filter((c) =>
                    isContratoValidoAuxAcidente(c),
                  ).length
                  const contratoInvalido = expandContratos.find(
                    (c) => !isContratoValidoAuxAcidente(c),
                  )

                  return (
                    <tr
                      key={l.id}
                      className={cn(
                        'border-b border-[#E4E7EB] dark:border-border last:border-0 hover:bg-[#FAF8F2] dark:hover:bg-muted/30 transition-colors',
                        autoInvalidado &&
                          'text-[#78818E] opacity-65 hover:bg-[#F5F6F8]/50 dark:hover:bg-muted/20',
                      )}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap text-[#252B34] dark:text-foreground">
                        <span
                          className={cn(autoInvalidado && 'text-xs text-[#78818E] line-through')}
                        >
                          {formatDateBR(l.data_entrada)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[#252B34] dark:text-foreground">
                        <span className={cn(autoInvalidado && 'text-xs text-[#78818E]')}>
                          {privacyOn ? (
                            <PrivacyText
                              value={formatPhoneMask(l.telefone) || l.telefone}
                              mask={PRIVACY_MASK.telefone}
                            />
                          ) : (
                            formatPhoneMask(l.telefone) || l.telefone || '—'
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[#252B34] dark:text-foreground">
                        <span
                          className={cn(autoInvalidado && 'text-xs text-[#78818E] line-through')}
                        >
                          {privacyOn ? (
                            <PrivacyText value={l.nome || '—'} />
                          ) : l.nome ? (
                            l.nome
                          ) : (
                            '—'
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-semibold rounded',
                            l.origem_lead === 'enlead'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
                              : 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
                          )}
                        >
                          {ORIGEM_LABELS[l.origem_lead] || l.origem_lead || '—'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[#252B34] dark:text-foreground">
                        {(respId && responsaveisMap[respId]) || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[#252B34] dark:text-foreground">
                        {responsivoDisplay(l.responsivo)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            STATUS_COLORS[l.status_funil] || '',
                          )}
                        >
                          {STATUS_FUNIL_LABELS[l.status_funil] || l.status_funil}
                        </span>
                      </td>
                      <td
                        className="px-3 py-2.5 max-w-[220px] truncate text-[#78818E] dark:text-muted-foreground"
                        title={motivoDisplay(l)}
                      >
                        {autoInvalidado ? motivoInvalidanteLabel(l) : motivoDisplay(l)}
                      </td>
                      {/* Coluna Contrato: válidos contam normalmente; quando não há
                          nenhum contrato válido mas existe histórico inválido
                          (arquivado/invalidante), mostra indicação DISCRETA do status
                          real — sem contabilizá-lo como fechamento/contrato válido. */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {(() => {
                          if (qtdValidos > 0) {
                            return (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold rounded bg-[#C9922A]/10 text-[#C9922A] border-[#C9922A]/30"
                              >
                                {qtdValidos} {qtdValidos === 1 ? 'contrato' : 'contratos'}
                              </Badge>
                            )
                          }
                          if (contratoInvalido) {
                            const invalidante =
                              expandContratos.find((c) => motivoInvalidante(c.status)) ||
                              contratoInvalido
                            const st = (invalidante.status || '').trim()
                            const inv = INVALIDATING_STATUSES.find(
                              (i) => i.status.toLowerCase() === st.toLowerCase(),
                            )
                            return (
                              <span
                                className="text-[10px] text-[#78818E] dark:text-muted-foreground opacity-80 italic"
                                title={
                                  (inv ? inv.status : 'Arquivado') +
                                  ' — histórico (fora dos indicadores)'
                                }
                              >
                                {inv ? inv.label : 'Arquivado'}
                              </span>
                            )
                          }
                          return (
                            <span className="text-[#78818E] dark:text-muted-foreground">—</span>
                          )
                        })()}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-[#78818E] hover:text-[#C9922A] hover:bg-[#C9922A]/10"
                            onClick={() => handleEdit(l)}
                            title={privacyOn ? 'Indisponível no Modo de Privacidade' : 'Editar'}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-[#78818E] hover:text-[#B4453C] hover:bg-[#B4453C]/10"
                            onClick={() => handleDeleteRequest(l)}
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      <AuxAcidenteModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={loadData}
        lead={selectedRecord}
      />

      {/* MODAL DE EXCLUSÃO NO PADRÃO CORPORATIVO ALERTA VERMELHO (Grafite Premium 2.1) */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="rounded-[10px] sm:max-w-[450px] border border-[#E4E7EB] dark:border-border p-6 shadow-lg bg-white dark:bg-card">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-[#B4453C] shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#B4453C] block">
                  AÇÃO IRREVERSÍVEL
                </span>
                <DialogTitle className="text-lg font-bold text-[#252B34] dark:text-foreground">
                  Excluir Lead
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="pt-2 text-sm text-[#78818E] dark:text-muted-foreground leading-relaxed">
              Deseja realmente remover o lead{' '}
              <strong className="text-[#252B34] dark:text-foreground">
                {recordToDelete
                  ? privacyOn
                    ? PRIVACY_MASK.telefone
                    : formatPhoneMask(recordToDelete.telefone) || recordToDelete.telefone
                  : ''}
              </strong>
              ? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md transition-colors"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={deleteLoading}
              className="h-9 px-4 text-xs font-semibold bg-[#B4453C] text-white hover:bg-[#963730] rounded-md shadow-sm transition-colors"
              onClick={confirmDelete}
            >
              {deleteLoading ? 'Excluindo...' : 'Excluir permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
