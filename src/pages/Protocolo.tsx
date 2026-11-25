import React, { useState, useEffect, useMemo } from 'react'
import { getProtocolos } from '@/services/protocolo'
import { getContratos } from '@/services/contratos'
import type { ContratoComissoesInput } from '@/lib/comissoes'
import { loadAbrirEmProtocoloEntry } from '@/lib/abrirEmProtocolo'
import { getTiposAcao, getResponsaveis } from '@/services/lookups'
import { useRealtime } from '@/hooks/use-realtime'
import { usePrivacyMode } from '@/lib/privacyMode'
import { toast } from 'sonner'
import { ProtocoloDashboard } from '@/components/protocolo/ProtocoloDashboard'
import { ProtocoloTable } from '@/components/protocolo/ProtocoloTable'
import { ProtocoloDialog, ProtocoloDeleteDialog } from '@/components/protocolo/ProtocoloDialogs'

export default function Protocolo() {
  const [data, setData] = useState<any[]>([])
  const [contratosFechados, setContratosFechados] = useState<ContratoComissoesInput[]>([])
  const [tipos, setTipos] = useState<any[]>([])
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [mesmoCasoOriginal, setMesmoCasoOriginal] = useState<any>(null)
  const [delOpen, setDelOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [preselectId, setPreselectId] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<any>(null)

  // Filters State
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Todos')
  const [origem, setOrigem] = useState('Todos')
  const [parceiro, setParceiro] = useState('Todos')
  const [tipo, setTipo] = useState('Todos')
  const [responsavel, setResponsavel] = useState('Todos')
  const [month, setMonth] = useState('Todos')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [monthStart, setMonthStart] = useState('Todos')
  const [monthEnd, setMonthEnd] = useState('Todos')

  const { enabled: privacyOn } = usePrivacyMode()

  // Tipos de ação indexados por id — usado pela deduplicação fone+tipo do
  // card Comissões (Build 1).
  const tiposPorId = useMemo(() => {
    const m = new Map<string, { id: string; nome: string }>()
    for (const t of tipos) m.set(t.id, { id: t.id, nome: t.nome })
    return m
  }, [tipos])

  // Modo de Privacidade ativo: fecha sem salvar qualquer modal já aberto
  useEffect(() => {
    if (privacyOn && (open || delOpen)) {
      setOpen(false)
      setDelOpen(false)
      setSelected(null)
      setItemToDelete(null)
      toast.info('Modo de Privacidade ativado — janela fechada sem salvar.')
    }
  }, [privacyOn, open, delOpen])

  const loadData = async () => {
    try {
      const [p, t, r] = await Promise.all([getProtocolos(), getTiposAcao(), getResponsaveis()])
      setData(p)
      setTipos(t)
      setResponsaveis(r)
    } catch (e) {
      console.error('Failed to load data', e)
    }
  }

  // Card Comissões (Build 1): carrega contratos_fechados SOMENTE PARA LEITURA,
  // para deduplicação por vínculo contrato (relation + fone+tipo). Nada é
  // gravado; realtime já cobre atualização (useRealtime abaixo).
  const loadContratos = async () => {
    try {
      const c = await getContratos()
      setContratosFechados(c as unknown as ContratoComissoesInput[])
    } catch (e) {
      console.error('Failed to load contratos_fechados for comissoes', e)
    }
  }

  useEffect(() => {
    loadData()
    loadContratos()
  }, [])

  // Ação "Abrir em Protocolo" (Contratos Fechados): consome a entrada vinda
  // via sessionStorage — registro existente para edição ou prefill para
  // criação confirmável (nada é gravado sem o usuário confirmar o formulário).
  useEffect(() => {
    const entry = loadAbrirEmProtocoloEntry()
    if (!entry) return
    if (entry.kind === 'registro') {
      setPreselectId(entry.id)
      setPrefill(null)
    } else {
      setPrefill(entry.prefill)
      setPreselectId(null)
    }
    // Abre o formulário de Protocolo — sem isto a entrada era consumida e o
    // usuário apenas navegava para /protocolo sem o dialog aparecer.
    setOpen(true)
  }, [])
  useRealtime('protocolo', loadData)
  // Mudança arquivado ↔ válido e exclusão de contrato atualizam indicadores e
  // tabela sem F5 (a relação `contratos` depende de contratos_fechados).
  useRealtime('contratos_fechados', loadData)

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Cabeçalho Corporativo Harmonizado com Visão Geral (Grafite Premium 2.1) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
            GESTÃO DE CASOS
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
          Protocolo
        </h1>
        <p className="text-sm text-[#78818E] dark:text-muted-foreground">
          Gestão de processos em fase de protocolo, prazos, acompanhamento e projeção de honorários.
        </p>
      </div>

      <ProtocoloDashboard
        data={data}
        tipo={tipo}
        responsavel={responsavel}
        origem={origem}
        parceiro={parceiro}
        month={month}
        year={year}
        monthStart={monthStart}
        monthEnd={monthEnd}
        status={status}
        contratosFechados={contratosFechados}
        tiposAcaoPorId={tiposPorId}
      />

      <ProtocoloTable
        data={data}
        tipos={tipos}
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        origem={origem}
        setOrigem={setOrigem}
        parceiro={parceiro}
        setParceiro={setParceiro}
        tipo={tipo}
        setTipo={setTipo}
        responsavel={responsavel}
        setResponsavel={setResponsavel}
        month={month}
        setMonth={setMonth}
        year={year}
        setYear={setYear}
        monthStart={monthStart}
        setMonthStart={setMonthStart}
        monthEnd={monthEnd}
        setMonthEnd={setMonthEnd}
        onAdd={() => {
          if (privacyOn) {
            toast.error('Desative o Modo de Privacidade para editar registros.')
            return
          }
          setPreselectId(null)
          setPrefill(null)
          setSelected(null)
          setMesmoCasoOriginal(null)
          setOpen(true)
        }}
        onEdit={(item: any) => {
          if (privacyOn) {
            toast.error('Desative o Modo de Privacidade para editar registros.')
            return
          }
          setPreselectId(null)
          setPrefill(null)
          setSelected(item)
          setMesmoCasoOriginal(null)
          setOpen(true)
        }}
        onNovoMesmoCaso={(item: any) => {
          if (privacyOn) {
            toast.error('Desative o Modo de Privacidade para editar registros.')
            return
          }
          setPreselectId(null)
          setPrefill(null)
          setSelected(null)
          setMesmoCasoOriginal(item)
          setOpen(true)
        }}
        onDelete={(item: any) => {
          if (privacyOn) {
            toast.error('Desative o Modo de Privacidade para excluir registros.')
            return
          }
          setItemToDelete(item)
          setDelOpen(true)
        }}
      />

      <ProtocoloDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) {
            setPreselectId(null)
            setPrefill(null)
            setSelected(null)
            setMesmoCasoOriginal(null)
          }
        }}
        item={selected}
        preselectId={preselectId}
        prefill={prefill}
        modoMesmoCaso={!!mesmoCasoOriginal && !selected}
        mesmoCasoOriginal={mesmoCasoOriginal}
        tipos={tipos}
        responsaveis={responsaveis}
        onSaved={loadData}
      />
      <ProtocoloDeleteDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        item={itemToDelete}
        onDeleted={loadData}
      />
    </div>
  )
}
