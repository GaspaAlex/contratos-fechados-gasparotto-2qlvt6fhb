/**
 * DIALOG DE DETALHAMENTO DO CARD DE COMISSÕES (Build F2-B)
 * =========================================================
 * Apuração preliminar por competência: resumo, comissões por colaborador
 * (dinâmicas ou fallback antigo), listas de casos e a área de gestão (F2-A).
 * "Acumulado histórico — apuração preliminar" foi REMOVIDO (F2-B): a leitura
 * é exclusivamente da competência selecionada; dados históricos permanecem
 * no banco e nas vigências.
 */
import { CheckCircle2, HelpCircle, Info, XCircle } from 'lucide-react'
import { GestaoComissoesArea } from '@/components/protocolo/gestao/GestaoComissoesArea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/formatters'
import { formatDateBR } from '@/services/leadsAuxAcidente'
import type { ApuracaoCardComissoes } from '@/lib/apuracaoCard'
import {
  apurarComissoes,
  ROTULO_CONTINUACAO_SEM_COMISSAO,
  type CasoComissoes,
} from '@/lib/comissoes'

const SITUACAO_CASO: Record<string, { label: string; dot: string; text: string }> = {
  elegivel: { label: 'Elegível', dot: 'bg-[#3E8E5A]', text: 'text-[#3E8E5A]' },
  suspenso: {
    label: 'Suspenso (Faltando Documentos)',
    dot: 'bg-[#C77E1E]',
    text: 'text-[#C77E1E]',
  },
  ia: {
    label: 'Responsável IA — conferência necessária',
    dot: 'bg-[#4A7FA5]',
    text: 'text-[#4A7FA5]',
  },
  ambiguo: {
    label: 'Possível duplicidade — conferência',
    dot: 'bg-[#8A56AC]',
    text: 'text-[#8A56AC]',
  },
  duplicado: {
    label: ROTULO_CONTINUACAO_SEM_COMISSAO,
    dot: 'bg-[#9EA7B6]',
    text: 'text-[#9EA7B6]',
  },
  invalido: { label: 'Fora (contrato arquivado)', dot: 'bg-[#9EA7B6]', text: 'text-[#9EA7B6]' },
}

/** Rótulo da situação de um caso na lista do detalhamento. */
function rotuloSituacao(situacao: string): { label: string; dot: string; text: string } {
  return SITUACAO_CASO[situacao] || SITUACAO_CASO.elegivel
}

/** Lista de casos compacta (nome · dcalculo · situação). */
function ListaCasos({ casos }: { casos: CasoComissoes[] }) {
  if (casos.length === 0) {
    return <p className="text-xs text-[#78818E] dark:text-muted-foreground">Nenhum caso.</p>
  }
  return (
    <ul className="space-y-1.5">
      {casos.map((c) => {
        const meta = rotuloSituacao(c.situacao)
        return (
          <li
            key={c.id}
            className="rounded-md border border-[#E4E7EB] dark:border-border px-2.5 py-2"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                {c.nome}
              </span>
              <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">
                Data do Cálculo: {c.dcalculo ? formatDateBR(c.dcalculo) : '—'}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium ${meta.text}`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#78818E] dark:text-muted-foreground">
              {c.observacao}
              {c.contratoNome ? ` · Contrato: ${c.contratoNome}` : ''}
            </p>
            <p className="text-[11px] text-[#78818E] dark:text-muted-foreground">
              Status: {c.status} · Responsável: {c.responsavelNome || '—'}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-md border border-[#E4E7EB] dark:border-border px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-sm font-bold tabular-nums text-[#252B34] dark:text-foreground ${accent || ''}`}
      >
        {value}
      </p>
    </div>
  )
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Apuração completa do card (modo, linhas, meta, totais e casos). */
  card: ApuracaoCardComissoes
  mes: number
  ano: number
  /** Competência "AAAA-MM" do seletor do card. */
  competencia: string
  isGestor: boolean
  /** Recarrega a configuração quando o gestor grava a meta na área de gestão. */
  onMetaSalva: () => void
}

export function ComissoesDetalheDialog({
  open,
  onOpenChange,
  card,
  mes,
  ano,
  competencia,
  isGestor,
  onMetaSalva,
}: Props) {
  const apuracao: ReturnType<typeof apurarComissoes> = card.apuracao
  const modoDinamico = card.modo === 'dinamico'
  const suspensosCount = apuracao.casosSuspensos.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto rounded-[10px]">
        <DialogHeader>
          <DialogTitle className="text-base">Comissões — {apuracao.competencia}</DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold text-[#C9922A]">Apuração preliminar</span> — não é
            comissão aprovada para pagamento. Competência exclusivamente pela Data do Cálculo
            (dcalculo).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MiniStat label="Casos elegíveis" value={String(apuracao.quantidadeElegivel)} />
            <MiniStat label="Total da competência" value={formatCurrency(card.totalCompetencia)} />
            <MiniStat
              label="Total potencial"
              value={formatCurrency(modoDinamico ? card.totalPotencial : apuracao.totalPotencial)}
            />
            <MiniStat
              label="Suspensos (R. Docs)"
              value={String(suspensosCount)}
              accent="text-[#C77E1E]"
            />
          </div>

          {/* Comissões da competência (dinâmicas ou fallback) */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1.5">
              {modoDinamico
                ? `Comissões por colaborador — ${apuracao.competencia}`
                : 'Comissões por colaborador — distribuição fixa antiga'}
            </h3>
            <div className="rounded-md border border-[#E4E7EB] dark:border-border divide-y divide-[#E4E7EB] dark:divide-border">
              {modoDinamico &&
                card.linhas.map((linha) => (
                  <div
                    key={linha.colaboradorId}
                    className="px-2.5 py-1.5 text-xs flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5"
                  >
                    <span className="text-[#252B34] dark:text-foreground">
                      {linha.nome}
                      <span className="ml-1 text-[10px] text-[#78818E]">
                        {formatCurrency(linha.valorUnitario)}/caso
                        {linha.modalidade === 'condicionada_meta' && ' · condicionada à meta'}
                      </span>
                    </span>
                    <span
                      className={`tabular-nums font-medium ${
                        linha.integraTotal ? 'text-[#3E8E5A]' : 'text-[#E5484D]'
                      }`}
                      title={linha.motivoNaoIntegracao ?? undefined}
                    >
                      {formatCurrency(linha.valorConfirmado)}
                      {!linha.integraTotal && linha.valorPotencial > 0 && (
                        <span className="ml-1 text-[10px] font-normal text-[#78818E]">
                          (potencial {formatCurrency(linha.valorPotencial)})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              {!modoDinamico &&
                apuracao.colaboradores.map((colab) => (
                  <div
                    key={colab.nome}
                    className="flex items-center justify-between px-2.5 py-1.5 text-xs"
                  >
                    <span className="text-[#252B34] dark:text-foreground">
                      {colab.nome}
                      {colab.condicionadoMeta && (
                        <span className="text-[10px] text-[#C77E1E]"> (Condicionado à meta)</span>
                      )}
                    </span>
                    <span className="tabular-nums text-[#252B34] dark:text-foreground">
                      {formatCurrency(colab.valorBasico)}
                    </span>
                  </div>
                ))}
              <div className="flex items-center justify-between px-2.5 py-1.5 text-xs bg-[#F5F6F8] dark:bg-muted/40">
                <span className="font-semibold text-[#252B34] dark:text-foreground">
                  TOTAL DA COMPETÊNCIA
                </span>
                <span className="tabular-nums font-semibold text-[#252B34] dark:text-foreground">
                  {formatCurrency(card.totalCompetencia)}
                </span>
              </div>
            </div>
            {modoDinamico && card.meta && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#78818E] dark:text-muted-foreground">
                {card.meta.situacaoMeta === 'atingida' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#3E8E5A]" aria-hidden />
                ) : card.meta.situacaoMeta === 'nao atingida' ? (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-[#E5484D]" aria-hidden />
                ) : (
                  <HelpCircle className="h-3.5 w-3.5 shrink-0 text-[#E4A44C]" aria-hidden />
                )}
                <span>
                  Meta{' '}
                  {card.meta.metaConfigurada === null
                    ? 'não definida'
                    : formatCurrency(card.meta.metaConfigurada)}{' '}
                  · {card.meta.contratosAtivos} contrato(s) ativo(s) com Data do Contrato em{' '}
                  {apuracao.competencia}
                  {card.meta.situacaoMeta === 'atingida' ? ' — meta atingida' : ''}
                  {card.meta.situacaoMeta === 'nao atingida' ? ' — meta não atingida' : ''}
                </span>
              </p>
            )}
          </section>

          {/* Seções de casos */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1.5">
              Casos elegíveis ({apuracao.casosElegiveis.length})
            </h3>
            <ListaCasos casos={apuracao.casosElegiveis} />
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1.5">
              Suspensos — Faltando Documentos ({apuracao.casosSuspensos.length})
            </h3>
            <ListaCasos casos={apuracao.casosSuspensos} />
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1.5">
              Conferência necessária — Responsável IA ({apuracao.casosIA.length})
            </h3>
            <ListaCasos casos={apuracao.casosIA} />
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1.5">
              Possíveis duplicidades — sem fusão ({apuracao.casosAmbiguos.length})
            </h3>
            <ListaCasos casos={apuracao.casosAmbiguos} />
          </section>

          {apuracao.casosDuplicados.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1.5">
                {ROTULO_CONTINUACAO_SEM_COMISSAO} ({apuracao.casosDuplicados.length})
              </h3>
              <ListaCasos casos={apuracao.casosDuplicados} />
            </section>
          )}

          <p className="flex items-start gap-1.5 text-[11px] text-[#78818E] dark:text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Apuração preliminar de leitura — nenhum dado é gravado ou alterado.{' '}
              {modoDinamico
                ? 'Valores individuais vêm das regras vigentes cadastradas para esta competência (vigência por AAAA-MM); comissões condicionadas à meta só entram no total quando a meta está atingida.'
                : 'Valores pela distribuição fixa antiga (Bia R$ 20, Nayara R$ 20, Kaique R$ 10, Nataly R$ 20 potencial condicionado à meta).'}{' '}
              Cada caso (contrato relacionado ou cadeia de continuação) conta uma única vez, pela 1ª
              liberação elegível por Data do Cálculo; movimentações posteriores ficam sem nova
              comissão. Correspondências por telefone+tipo ambíguas não são fundidas.
            </span>
          </p>

          {isGestor && (
            <GestaoComissoesArea
              mes={mes}
              ano={ano}
              competenciaAtual={competencia}
              onMetaSalvaNoRosto={onMetaSalva}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
