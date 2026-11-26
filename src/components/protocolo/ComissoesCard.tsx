/**
 * CARD DE COMISSÕES — ROSTO DINÂMICO (Build F2-B)
 * ===============================================
 * Rosto: casos elegíveis, valor individual de cada colaborador (regras
 * dinâmicas vigentes), situação da meta e TOTAL DA COMPETÊNCIA.
 * O detalhamento (apuração preliminar + listas de casos + gestão F2-A)
 * vive em ComissoesDetalheDialog. "Acumulado apurado" foi REMOVIDO.
 *
 * Regras mantidas: competência exclusivamente pela Data do Cálculo
 * (dcalculo); comissão única por caso; suspensão de R. Docs; dinâmico
 * nunca somado ao fallback; erro de consulta nunca vira valor confirmado.
 */
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  HandCoins,
  HelpCircle,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react'
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
import {
  apurarComissoes,
  type ContratoComissoesInput,
  type ProtocoloComissoesInput,
} from '@/lib/comissoes'
import { ComissoesDetalheDialog } from './ComissoesDetalheDialog'
import { useConfiguracaoComissoes } from './useConfiguracaoComissoes'

interface Props {
  protocolos: ProtocoloComissoesInput[]
  contratos: ContratoComissoesInput[]
  tiposAcaoPorId?: Map<string, { id: string; nome: string }>
}

const ANOS_DISPONIVEIS = ['2024', '2025', '2026', '2027']

/** Linha individual de colaborador no ROSTO do card (modo dinâmico). */
function LinhaColaboradorRosto({ linha }: { linha: ApuracaoCardComissoes['linhas'][number] }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate text-[#E7EAF0]">
        {linha.nome}
        {linha.modalidade === 'condicionada_meta' && (
          <span className="ml-1 text-[10px] text-[#C9922A]">(condicionada à meta)</span>
        )}
      </span>
      {linha.integraTotal ? (
        <span className="shrink-0 tabular-nums font-medium text-[#3E8E5A]">
          {formatCurrency(linha.valorConfirmado)}
        </span>
      ) : (
        <span
          className="shrink-0 tabular-nums font-medium text-[#E5484D]"
          title={linha.motivoNaoIntegracao ?? undefined}
        >
          {formatCurrency(0)}
        </span>
      )}
    </div>
  )
}

/** Selo da situação da meta no rosto. */
function SeloMeta({ card }: { card: ApuracaoCardComissoes }) {
  if (!card.noControle || !card.meta) return null
  const { situacaoMeta, metaConfigurada, contratosAtivos } = card.meta
  if (situacaoMeta === 'atingida') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#3E8E5A]/15 px-2 py-0.5 text-[11px] font-medium text-[#5BBF7E]">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Meta atingida
      </span>
    )
  }
  if (situacaoMeta === 'nao atingida') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md bg-[#E5484D]/15 px-2 py-0.5 text-[11px] font-medium text-[#F26D6D]"
        title={`Contratos ativos: ${contratosAtivos} de ${metaConfigurada}`}
      >
        <XCircle className="h-3.5 w-3.5" aria-hidden />
        Meta não atingida
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-[#E4A44C]/15 px-2 py-0.5 text-[11px] font-medium text-[#E4A44C]"
      title="Nenhuma meta cadastrada para esta competência"
    >
      <HelpCircle className="h-3.5 w-3.5" aria-hidden />
      Meta não definida
    </span>
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

  // Apuração ANTIGA — base das listas do detalhamento e fallback das
  // competências anteriores a nov/2026 (comportamento atual preservado).
  const apuracao = useMemo(
    () => apurarComissoes(protocolos, contratos, mesNum, anoNum, [...monthsArray], tiposAcaoPorId),
    [protocolos, contratos, mesNum, anoNum, tiposAcaoPorId],
  )

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

  // Falha ao consultar a META: valores condicionados NÃO são confirmados
  // (fail-closed) e o card avisa — nunca apresenta como "meta não definida".
  const erroMeta = config.metaEstado === 'erro' && noControle

  const totalExibido = carregandoConfig || erroConfig ? null : card.totalCompetencia
  const suspensosCount = apuracao.casosSuspensos.length
  const conferenciaCount = apuracao.casosIA.length + apuracao.casosAmbiguos.length

  return (
    <>
      <Card className="relative overflow-hidden rounded-[10px] border border-[#2E3440] bg-[#22262E] text-white shadow-sm flex flex-col justify-between">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#9EA7B6]">
                Comissões
              </span>
              <div className="h-7 w-7 rounded-md bg-[#2B303C] flex items-center justify-center text-[#D9A94A]">
                <HandCoins className="h-4 w-4" />
              </div>
            </div>

            {/* Seletor PRÓPRIO de competência (independente dos filtros da listagem) */}
            <div className="mb-3 flex items-center gap-1.5">
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

            <p className="text-[11px] text-[#7C8596] mb-3">
              Competência por Data do Cálculo (dcalculo)
            </p>

            {/* ROSTO DINÂMICO — casos, colaboradores, meta e total */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#A5ADB9]">
                <span className="tabular-nums font-medium text-white">
                  {apuracao.quantidadeElegivel} caso(s) elegível(is)
                </span>
                {suspensosCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[#E4A44C]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#E4A44C]" />
                    {suspensosCount} suspenso(s) — R. Docs
                  </span>
                )}
                {conferenciaCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[#7FA8D9]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7FA8D9]" />
                    {conferenciaCount} em conferência
                  </span>
                )}
              </div>

              {carregandoConfig && (
                <p className="flex items-center gap-1.5 py-1 text-[11px] text-[#9EA7B6]">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Carregando configuração de comissões…
                </p>
              )}

              {erroConfig && (
                <div
                  role="status"
                  className="rounded-md border border-[#C77E1E] bg-[#C77E1E]/10 px-2 py-1.5"
                >
                  <p className="flex items-start gap-1.5 text-[11px] font-medium text-[#E4A44C]">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                    Falha ao consultar a configuração — valores NÃO exibidos como confirmados.
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#9EA7B6]">{config.erro}</p>
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
                  {modoDinamico && card.linhas.length > 0 && (
                    <div className="space-y-1 rounded-md border border-[#2E3440] bg-[#2B303C]/60 px-2.5 py-2">
                      {card.linhas.map((linha) => (
                        <LinhaColaboradorRosto key={linha.colaboradorId} linha={linha} />
                      ))}
                    </div>
                  )}

                  {modoDinamico && card.linhas.length === 0 && (
                    <p className="text-[11px] text-[#9EA7B6]">
                      Nenhuma regra vigente nesta competência — nenhum valor apurado.
                    </p>
                  )}

                  {/* FALLBACK — competências anteriores a nov/2026 (comportamento atual) */}
                  {!noControle && (
                    <div className="space-y-1 rounded-md border border-[#2E3440] bg-[#2B303C]/60 px-2.5 py-2">
                      {apuracao.colaboradores.map((colab) => (
                        <div
                          key={colab.nome}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="min-w-0 truncate text-[#E7EAF0]">
                            {colab.nome}
                            {colab.condicionadoMeta && (
                              <span className="ml-1 text-[10px] text-[#C9922A]">
                                (condicionada à meta)
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 tabular-nums font-medium text-[#E7EAF0]">
                            {formatCurrency(colab.valorBasico)}
                          </span>
                        </div>
                      ))}
                      <p className="text-[10px] text-[#7C8596]">
                        Distribuição fixa antiga — competência anterior a nov/2026, fora do novo
                        controle.
                      </p>
                    </div>
                  )}

                  {/* Sem cadastro configurado na competência sob novo controle */}
                  {noControle && !modoDinamico && (
                    <p className="text-[11px] text-[#9EA7B6]">
                      {card.avisos[0] ?? 'Sem configuração dinâmica nesta competência.'}
                    </p>
                  )}

                  {erroMeta && (
                    <p className="flex items-start gap-1.5 text-[10px] text-[#E4A44C]">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" aria-hidden />
                      Meta não pôde ser consultada — comissões condicionadas ficam FORA do total.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-end justify-between gap-2">
              <div>
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
              </div>
              <SeloMeta card={card} />
            </div>
            {modoDinamico &&
              !carregandoConfig &&
              !erroConfig &&
              card.totalPotencial > card.totalCompetencia && (
                <p className="mt-0.5 text-[10px] text-[#7C8596] tabular-nums">
                  Potencial (se a meta for cumprida): {formatCurrency(card.totalPotencial)}
                </p>
              )}
            <div className="mt-2 flex justify-end">
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

      {/* DIALOG DE DETALHAMENTO — apuração preliminar + gestão F2-A */}
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
