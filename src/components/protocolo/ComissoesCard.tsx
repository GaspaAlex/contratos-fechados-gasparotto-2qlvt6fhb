/**
 * CARD DE COMISSÕES — ROSTO SIMPLIFICADO (Build G)
 * ================================================
 * Rosto com SOMENTE: título, ícone, seletores de mês/ano, nome + valor de cada
 * colaborador, TOTAL da competência e "Ver detalhamento". Removidos do rosto
 * (Build G): contagens de casos, selo de meta, "(condicionada à meta)",
 * "Total potencial", textos técnicos — essas informações seguem acessíveis no
 * detalhamento (ComissoesDetalheDialog).
 *
 * A lista de colaboradores segue DINÂMICA (novo colaborador cadastrado aparece
 * automaticamente). Regras intactas: competência exclusivamente pela Data do
 * Cálculo (dcalculo); comissão única por caso; suspensão de R. Docs; dinâmico
 * nunca somado ao fallback; erro de consulta nunca vira valor confirmado
 * (fail-closed). NENHUM cálculo é alterado aqui — tudo vem de apuracaoCard.ts.
 */
import { useMemo, useState } from 'react'
import { AlertTriangle, HandCoins, Loader2, Search } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/formatters'
import { monthsArray } from '@/lib/months'
import { apurarCardComissoes, type ApuracaoCardComissoes } from '@/lib/apuracaoCard'
import { COMPETENCIA_INICIO_CONTROLE, competenciaDeMesAno } from '@/lib/comissoesColaboradores'
import { type ContratoComissoesInput, type ProtocoloComissoesInput } from '@/lib/comissoes'
import { ComissoesDetalheDialog } from './ComissoesDetalheDialog'
import { useConfiguracaoComissoes } from './useConfiguracaoComissoes'

interface Props {
  protocolos: ProtocoloComissoesInput[]
  contratos: ContratoComissoesInput[]
  tiposAcaoPorId?: Map<string, { id: string; nome: string }>
}

const ANOS_DISPONIVEIS = ['2024', '2025', '2026', '2027']

/** Linha individual de colaborador no ROSTO do card — só nome + valor. */
function LinhaColaboradorRosto({ linha }: { linha: ApuracaoCardComissoes['linhas'][number] }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate text-[#E7EAF0]">{linha.nome}</span>
      <span className="shrink-0 tabular-nums font-medium text-[#E7EAF0]">
        {formatCurrency(linha.valorConfirmado)}
      </span>
    </div>
  )
}

export function ComissoesCard({ protocolos, contratos, tiposAcaoPorId }: Props) {
  const now = new Date()
  const [mes, setMes] = useState(String(now.getMonth() + 1))
  const [ano, setAno] = useState(String(now.getFullYear()))
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const isGestor = user?.perfil === 'gestor'

  const mesNum = parseInt(mes, 10)
  const anoNum = parseInt(ano, 10)
  const competencia = competenciaDeMesAno(mesNum, anoNum)
  const noControle = competencia >= COMPETENCIA_INICIO_CONTROLE

  // Cadastro dinâmico (F2-A): colaboradores, regras e meta da competência.
  const config = useConfiguracaoComissoes(mesNum, anoNum)

  // Apuração do CARD (F2-B): dinâmica quando há cadastro, fallback quando não.
  const card: ApuracaoCardComissoes = useMemo(
    () =>
      apurarCardComissoes({
        protocolos,
        contratos,
        tiposAcaoPorId,
        meses: monthsArray,
        mes: mesNum,
        ano: anoNum,
        metaCadastrada: config.metaEstado === 'pronto' ? (config.meta?.meta ?? null) : null,
        colaboradores: config.colaboradores ?? undefined,
        regras: config.regras ?? undefined,
      }),
    [
      protocolos,
      contratos,
      tiposAcaoPorId,
      mesNum,
      anoNum,
      config.meta,
      config.metaEstado,
      config.colaboradores,
      config.regras,
    ],
  )

  const modoDinamico = card.modo === 'dinamico'
  const carregandoConfig = config.estado === 'carregando'
  const erroConfig = config.estado === 'erro'

  // Falha ao consultar a configuração: valores condicionados NÃO são
  // confirmados (fail-closed) — o detalhamento explica o motivo.
  const totalExibido = carregandoConfig || erroConfig ? null : card.totalCompetencia

  return (
    <>
      <Card className="relative overflow-hidden rounded-[10px] border border-[#2E3440] bg-[#22262E] text-white shadow-sm flex flex-col">
        <CardContent className="p-4 sm:p-5 flex flex-col h-full">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#9EA7B6]">
              Comissões
            </span>
            <div className="h-7 w-7 rounded-md bg-[#2B303C] flex items-center justify-center text-[#D9A94A]">
              <HandCoins className="h-4 w-4" />
            </div>
          </div>

          {/* Seletor PRÓPRIO de competência (independente dos filtros da listagem) */}
          <div className="mb-2 flex items-center gap-1.5">
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger
                id="comissoes-mes"
                aria-label="Mês da apuração de comissões"
                className="h-7 text-[11px] rounded-md border-[#2E3440] bg-[#2B303C] text-white w-[110px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthsArray.map((m, i) => (
                  <SelectItem key={i} value={(i + 1).toString()} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger
                id="comissoes-ano"
                aria-label="Ano da apuração de comissões"
                className="h-7 text-[11px] rounded-md border-[#2E3440] bg-[#2B303C] text-white w-[80px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANOS_DISPONIVEIS.map((y) => (
                  <SelectItem key={y} value={y} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Carregando a configuração dinâmica — nenhum valor é apresentado
              como confirmado enquanto isso (fail-closed). */}
          {carregandoConfig && (
            <p className="flex items-center gap-1.5 py-1 text-[11px] text-[#9EA7B6]">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Carregando…
            </p>
          )}

          {erroConfig && (
            <div
              role="status"
              className="mb-2 rounded-md border border-[#C77E1E] bg-[#C77E1E]/10 px-2 py-1.5"
            >
              <p className="flex items-start gap-1.5 text-[11px] font-medium text-[#E4A44C]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                Falha ao consultar a configuração — valores NÃO exibidos como confirmados.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-1.5 h-6 border-[#C77E1E] px-2 text-[10px] text-[#E4A44C]"
                onClick={config.recarregar}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {!carregandoConfig && !erroConfig && (
            <>
              {/* Colaboradores (dinâmico) — SEM selo de meta, sem rótulos técnicos */}
              {modoDinamico && card.linhas.length > 0 && (
                <div className="mb-2 space-y-1 rounded-md border border-[#2E3440] bg-[#2B303C]/60 px-2.5 py-1.5">
                  {card.linhas.map((linha) => (
                    <LinhaColaboradorRosto key={linha.colaboradorId} linha={linha} />
                  ))}
                </div>
              )}

              {/* FALLBACK — competências anteriores a nov/2026 (comportamento atual) */}
              {!noControle && card.apuracao.colaboradores.length > 0 && (
                <div className="mb-2 space-y-1 rounded-md border border-[#2E3440] bg-[#2B303C]/60 px-2.5 py-1.5">
                  {card.apuracao.colaboradores.map((colab) => (
                    <div
                      key={colab.nome}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="min-w-0 truncate text-[#E7EAF0]">{colab.nome}</span>
                      <span className="shrink-0 tabular-nums font-medium text-[#E7EAF0]">
                        {formatCurrency(colab.valorBasico)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sem colaboradores com regra vigente na competência sob controle */}
              {noControle && !(modoDinamico && card.linhas.length > 0) && (
                <p className="mb-2 text-[11px] text-[#9EA7B6]">
                  Sem comissões configuradas nesta competência.
                </p>
              )}
            </>
          )}

          <div className="mt-auto">
            <p className="text-[10px] uppercase tracking-wider text-[#9EA7B6]">
              Total da competência
            </p>
            {totalExibido === null ? (
              <p className="text-[11px] text-[#7C8596]">—</p>
            ) : (
              <div
                className="text-xl sm:text-2xl font-bold tracking-tight text-[#D9A94A] tabular-nums"
                title={formatCurrency(totalExibido)}
              >
                {formatCurrency(totalExibido)}
              </div>
            )}
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-[#D9A94A] hover:bg-[#2B303C] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D9A94A]"
              >
                <Search className="h-3 w-3" /> Ver detalhamento
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG DE DETALHAMENTO — resumo, casos, conferência técnica e gestão */}
      <ComissoesDetalheDialog
        open={open}
        onOpenChange={setOpen}
        card={card}
        mes={mesNum}
        ano={anoNum}
        competencia={competencia}
        isGestor={isGestor}
        onMetaSalva={config.recarregar}
      />
    </>
  )
}
