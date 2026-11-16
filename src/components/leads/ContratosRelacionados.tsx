import { useCallback, useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Link2,
  Link2Off,
  Loader2,
  Phone,
  Search,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import {
  buscarContratosParaVinculo,
  buscarContratosPorTelefone,
  getContratosByIds,
  setLeadContratos,
  formatDateBR,
  formatPhoneMask,
} from '@/services/leadsAuxAcidente'
import type { ContratoFechadoResumo, LeadAuxAcidente } from '@/services/leadsAuxAcidente'

interface ContratosRelacionadosProps {
  lead: LeadAuxAcidente
  /** Recarrega a lista da página após vincular/desvincular (realtime cobre, mas garante). */
  onChanged?: () => void
}

const ContratoInfo = ({ c }: { c: ContratoFechadoResumo }) => (
  <div className="min-w-0 flex-1 space-y-0.5">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="text-xs font-semibold text-[#252B34] dark:text-foreground truncate">
        {c.nome || '—'}
      </span>
      {c.status && (
        <Badge variant="outline" className="text-[9px] font-semibold rounded px-1.5 py-0">
          {c.status}
        </Badge>
      )}
    </div>
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#78818E] dark:text-muted-foreground">
      {c.fone && <span>{formatPhoneMask(c.fone) || c.fone}</span>}
      {c.dcontrato && <span>Contrato: {formatDateBR(c.dcontrato)}</span>}
      {c.beneficio && <span className="truncate max-w-[180px]">{c.beneficio}</span>}
      {(c.campanha_origem || c.origem) && (
        <span className="truncate max-w-[160px]">{c.campanha_origem || c.origem}</span>
      )}
    </div>
  </div>
)

export function ContratosRelacionados({ lead, onChanged }: ContratosRelacionadosProps) {
  const [vinculados, setVinculados] = useState<ContratoFechadoResumo[]>([])
  const [sugestoes, setSugestoes] = useState<ContratoFechadoResumo[]>([])
  const [resultados, setResultados] = useState<ContratoFechadoResumo[] | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)

  const [buscaTelefone, setBuscaTelefone] = useState('')
  const [buscaNome, setBuscaNome] = useState('')

  const [confirmVincular, setConfirmVincular] = useState<ContratoFechadoResumo | null>(null)
  const [confirmDesvincular, setConfirmDesvincular] = useState<ContratoFechadoResumo | null>(null)
  const [dialogLoading, setDialogLoading] = useState(false)

  // Busca manual recolhida por padrão — abre apenas sob ação do usuário.
  const [buscaManualAberta, setBuscaManualAberta] = useState(false)

  const vinculadosIds = vinculados.map((c) => c.id)

  const recarregarVinculados = useCallback(async () => {
    const ids = Array.isArray(lead.contratos) ? lead.contratos : []
    try {
      const list = await getContratosByIds(ids)
      setVinculados(list)
    } catch (err) {
      console.error('Erro ao carregar contratos vinculados', err)
    }
  }, [lead.contratos])

  // Carrega vínculos atuais + sugestões pelo telefone do lead ao abrir
  useEffect(() => {
    let cancelled = false
    setSugestoes([])
    setResultados(null)
    setBuscaTelefone('')
    setBuscaNome('')
    setBuscaManualAberta(false)

    recarregarVinculados()

    const digits = (lead.telefone || '').replace(/\D/g, '')
    if (digits) {
      buscarContratosPorTelefone(lead.telefone)
        .then((list) => {
          if (!cancelled) setSugestoes(list)
        })
        .catch((err) => console.error('Erro na sugestão por telefone', err))
    }
    return () => {
      cancelled = true
    }
    // recarregarVinculados é estável por lead.contratos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id])

  const handleBuscar = async () => {
    if (!buscaTelefone.trim() && !buscaNome.trim()) return
    setCarregando(true)
    try {
      const list = await buscarContratosParaVinculo({
        telefone: buscaTelefone,
        nome: buscaNome,
      })
      setResultados(list)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao buscar contratos.')
    } finally {
      setCarregando(false)
    }
  }

  const vincular = async (contrato: ContratoFechadoResumo) => {
    if (vinculadosIds.includes(contrato.id)) return // já vinculado — nunca duplica
    setDialogLoading(true)
    setSalvandoId(contrato.id)
    try {
      await setLeadContratos(lead.id!, [...vinculadosIds, contrato.id])
      setVinculados((prev) => [...prev, contrato])
      setSugestoes((prev) => prev.filter((s) => s.id !== contrato.id))
      setResultados((prev) => prev ?? null)
      setConfirmVincular(null)
      toast.success('Contrato vinculado ao lead.')
      onChanged?.()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao vincular contrato.')
    } finally {
      setDialogLoading(false)
      setSalvandoId(null)
    }
  }

  const desvincular = async (contrato: ContratoFechadoResumo) => {
    setDialogLoading(true)
    setSalvandoId(contrato.id)
    try {
      await setLeadContratos(
        lead.id!,
        vinculadosIds.filter((id) => id !== contrato.id),
      )
      setVinculados((prev) => prev.filter((c) => c.id !== contrato.id))
      setConfirmDesvincular(null)
      toast.success('Contrato desvinculado (o contrato não foi excluído).')
      onChanged?.()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao desvincular contrato.')
    } finally {
      setDialogLoading(false)
      setSalvandoId(null)
    }
  }

  const labelCls =
    'text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground'
  const controlCls =
    'h-9 text-xs bg-white dark:bg-card border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]'

  const jaVinculado = (id: string) => vinculadosIds.includes(id)

  const renderLista = (lista: ContratoFechadoResumo[], acao: 'vincular' | 'desvincular') => (
    <div className="rounded-md border border-[#E4E7EB] dark:border-border divide-y divide-[#E4E7EB] dark:divide-border max-h-[220px] overflow-y-auto">
      {lista.map((c) => {
        const vinculado = jaVinculado(c.id)
        return (
          <div
            key={c.id}
            className={cn(
              'flex items-center gap-2 px-3 py-2',
              vinculado && 'bg-[#FAF8F2] dark:bg-muted/40',
            )}
          >
            <ContratoInfo c={c} />
            {acao === 'vincular' ? (
              <Button
                type="button"
                size="sm"
                disabled={vinculado || salvandoId !== null}
                onClick={() => setConfirmVincular(c)}
                className={cn(
                  'h-7 px-2.5 text-[11px] shrink-0 rounded-md',
                  vinculado
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-default'
                    : 'bg-[#C9922A] hover:bg-[#b07d22] text-white',
                )}
                title={
                  vinculado ? 'Este contrato já está vinculado a este lead' : 'Vincular contrato'
                }
              >
                {vinculado ? (
                  <>
                    <UserCheck className="h-3 w-3 mr-1" /> Já vinculado
                  </>
                ) : salvandoId === c.id ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Vinculando...
                  </>
                ) : (
                  <>
                    <Link2 className="h-3 w-3 mr-1" /> Vincular
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={salvandoId !== null}
                onClick={() => setConfirmDesvincular(c)}
                className="h-7 px-2.5 text-[11px] shrink-0 rounded-md text-[#B4453C] hover:text-[#B4453C] hover:bg-[#B4453C]/10"
                title="Desvincular (não exclui o contrato)"
              >
                {salvandoId === c.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Link2Off className="h-3.5 w-3.5" />
                )}
                Remover
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )

  const sugestoesDisponiveis = sugestoes.filter((s) => !jaVinculado(s.id))

  return (
    <div className="px-6 py-4 border-t border-[#E4E7EB] dark:border-border space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#252B34] dark:text-foreground">
          Contratos relacionados
        </h3>
        <span className="text-[10px] text-[#78818E] dark:text-muted-foreground">
          {vinculados.length === 0
            ? 'Nenhum contrato vinculado'
            : `${vinculados.length} ${vinculados.length === 1 ? 'contrato vinculado' : 'contratos vinculados'}`}
        </span>
      </div>

      {/* Contratos atualmente vinculados */}
      {vinculados.length > 0 ? (
        renderLista(vinculados, 'desvincular')
      ) : (
        <p className="text-xs text-[#78818E] dark:text-muted-foreground">
          Use o botão &quot;Vincular contrato manualmente&quot; para localizar contratos e
          vinculá-los a este lead.
        </p>
      )}

      {/* Sugestão pelo telefone do lead — apenas sugestão, nunca vínculo automático (dentro da expansão) */}
      {buscaManualAberta && sugestoesDisponiveis.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-[#C9922A]" />
            <span className={labelCls}>Possíveis contratos encontrados pelo telefone</span>
          </div>
          {renderLista(sugestoesDisponiveis, 'vincular')}
          <p className="text-[10px] text-[#78818E] dark:text-muted-foreground">
            Apenas sugestões — o vínculo só é salvo após sua confirmação.
          </p>
        </div>
      )}

      {/* Busca manual por telefone e/ou nome — recolhida até o usuário abrir */}
      <div className="space-y-2">
        {!buscaManualAberta ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBuscaManualAberta(true)}
            className="h-8 px-3 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A] rounded-md"
          >
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            Vincular contrato manualmente
          </Button>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className={labelCls}>Vincular contrato (busca manual)</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBuscaManualAberta(false)
                  setBuscaTelefone('')
                  setBuscaNome('')
                  setResultados(null)
                }}
                className="h-7 px-2 text-[11px] text-[#78818E] hover:text-[#C9922A] rounded-md"
              >
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                Recolher
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                inputMode="tel"
                placeholder="Telefone do contrato"
                value={buscaTelefone}
                onChange={(e) => setBuscaTelefone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                className={cn(controlCls, 'w-full sm:flex-1')}
              />
              <Input
                placeholder="Nome do cliente"
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                className={cn(controlCls, 'w-full sm:flex-1')}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={carregando || (!buscaTelefone.trim() && !buscaNome.trim())}
                onClick={handleBuscar}
                className="h-9 px-3 text-xs shrink-0 border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A] rounded-md"
              >
                {carregando ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5 mr-1" />
                )}
                Buscar
              </Button>
            </div>
            {resultados &&
              (resultados.length > 0 ? (
                renderLista(resultados, 'vincular')
              ) : (
                <p className="text-xs text-[#78818E] dark:text-muted-foreground">
                  Nenhum contrato encontrado com esses critérios.
                </p>
              ))}
          </>
        )}
      </div>

      {/* Confirmação de vínculo */}
      <AlertDialog
        open={Boolean(confirmVincular)}
        onOpenChange={(o) => !o && setConfirmVincular(null)}
      >
        <AlertDialogContent className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card sm:max-w-[440px] p-6">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-lg font-bold text-[#252B34] dark:text-foreground">
              Vincular contrato
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#78818E] dark:text-muted-foreground leading-relaxed">
              Vincular o contrato de{' '}
              <strong className="text-[#252B34] dark:text-foreground">
                {confirmVincular?.nome || '—'}
              </strong>{' '}
              a este lead? O telefone não é usado como chave — o vínculo fica registrado no lead,
              por ID, somente após a confirmação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <AlertDialogCancel
              className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border text-[#78818E] rounded-md"
              onClick={() => setConfirmVincular(null)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b07d22] text-white rounded-md"
              onClick={(e) => {
                e.preventDefault()
                if (confirmVincular) vincular(confirmVincular)
              }}
            >
              {dialogLoading ? 'Vinculando...' : 'Confirmar vínculo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de desvínculo */}
      <AlertDialog
        open={Boolean(confirmDesvincular)}
        onOpenChange={(o) => !o && setConfirmDesvincular(null)}
      >
        <AlertDialogContent className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card sm:max-w-[440px] p-6">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-lg font-bold text-[#252B34] dark:text-foreground">
              Desvincular contrato
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#78818E] dark:text-muted-foreground leading-relaxed">
              Remover o vínculo com o contrato de{' '}
              <strong className="text-[#252B34] dark:text-foreground">
                {confirmDesvincular?.nome || '—'}
              </strong>
              ? O contrato permanece cadastrado em Contratos Fechados — apenas deixa de estar
              relacionado a este lead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <AlertDialogCancel
              className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border text-[#78818E] rounded-md"
              onClick={() => setConfirmDesvincular(null)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-9 px-4 text-xs font-semibold bg-[#B4453C] text-white hover:bg-[#963730] rounded-md"
              onClick={(e) => {
                e.preventDefault()
                if (confirmDesvincular) desvincular(confirmDesvincular)
              }}
            >
              {dialogLoading ? 'Removendo...' : 'Confirmar remoção'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
