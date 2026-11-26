/**
 * DIALOG DE DETALHAMENTO DO CARD DE COMISSÕES (Build G — visual simplificado)
 * ===========================================================================
 * Resumo da competência (meta como QUANTIDADE de contratos, nunca R$),
 * relação de casos simplificada (cliente + Data do Cálculo), seção recolhida
 * "Conferência técnica" (duplicidades, continuações, conferência — nada é
 * apagado, apenas recolhido) e a área administrativa do gestor (F2-A)
 * recolhida atrás de um botão discreto "Gerenciar comissões".
 *
 * Cálculos intactos: os valores vêm de apuracaoCard.ts / comissoes.ts —
 * este componente é exclusivamente presentacional.
 */
import { useState } from 'react'
import { CheckCircle2, HelpCircle, Printer, Settings2, XCircle } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
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
import { imprimirRelatorioComissoes } from '@/components/protocolo/impressaoComissoes'
import type { ApuracaoCardComissoes } from '@/lib/apuracaoCard'
import { ROTULO_CONTINUACAO_SEM_COMISSAO, type CasoComissoes } from '@/lib/comissoes'

/** Linha simples de caso: nome do cliente + Data do Cálculo (+ indicação de suspensos). */
function ListaCasos({ casos, suspensa }: { casos: CasoComissoes[]; suspensa?: boolean }) {
  if (casos.length === 0) {
    return <p className="text-xs text-[#78818E] dark:text-muted-foreground">Nenhum caso.</p>
  }
  return (
    <ul className="divide-y divide-[#E4E7EB] dark:divide-border rounded-md border border-[#E4E7EB] dark:border-border">
      {casos.map((c) => (
        <li
          key={c.id}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-2.5 py-1.5"
        >
          <span className="text-xs font-medium text-[#252B34] dark:text-foreground">{c.nome}</span>
          <span className="text-[11px] text-[#78818E] dark:text-muted-foreground tabular-nums">
            {c.dcalculo ? formatDateBR(c.dcalculo) : '—'}
          </span>
          {suspensa && (
            <span className="w-full text-[11px] font-medium text-[#C77E1E] sm:w-auto">
              Faltando Documentos
            </span>
          )}
        </li>
      ))}
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

/** Situação da meta como TEXTO (quantidade de contratos, nunca R$).
 */
function SituacaoMetaResumo({ card }: { card: ApuracaoCardComissoes }) {
  const situacaoMeta = card.meta?.situacaoMeta ?? 'nao definida'
  const situacao =
    situacaoMeta === 'atingida'
      ? 'Meta atingida'
      : situacaoMeta === 'nao atingida'
        ? 'Meta não atingida'
        : 'Meta não definida'
  const cor =
    situacaoMeta === 'atingida'
      ? 'text-[#3E8E5A]'
      : situacaoMeta === 'nao atingida'
        ? 'text-[#E5484D]'
        : 'text-[#78818E] dark:text-muted-foreground'
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${cor}`}>
      {situacaoMeta === 'atingida' ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      ) : situacaoMeta === 'nao atingida' ? (
        <XCircle className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <HelpCircle className="h-3.5 w-3.5" aria-hidden />
      )}
      <span>
        Situação: {situacao}
        {situacaoMeta === 'atingida' && card.meta
          ? ` — Realizados: ${card.meta.contratosAtivos} de ${card.meta.metaConfigurada} contratos`
          : ''}
      </span>
    </span>
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
  const apuracao = card.apuracao
  const modoDinamico = card.modo === 'dinamico'
  const [gestaoAberta, setGestaoAberta] = useState(false)

  // "Total potencial" só quando difere do total confirmado (senão repete).
  const totalPotencial = modoDinamico ? card.totalPotencial : apuracao.totalPotencial
  const mostraPotencial = modoDinamico && card.totalPotencial > card.totalCompetencia

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto rounded-[10px]">
        <DialogHeader>
          <DialogTitle className="text-base">COMISSÕES — {apuracao.competencia}</DialogTitle>
          <DialogDescription className="text-xs">
            Resumo da competência — apuração preliminar, nenhum dado é gravado ou alterado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* IMPRESSÃO / PDF — abre a impressão do navegador com o RELATÓRIO DE
              COMISSÕES da competência selecionada (mesmos valores do card). */}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 px-2 text-[11px] text-[#78818E] hover:bg-[#C9922A]/10 hover:text-[#C9922A]"
              onClick={() => imprimirRelatorioComissoes(card)}
              aria-label="Imprimir ou salvar em PDF o relatório de comissões da competência"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden />
              Imprimir / Salvar PDF
            </Button>
          </div>

          {/* RESUMO DA COMPETÊNCIA */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <MiniStat label="Casos elegíveis" value={String(apuracao.quantidadeElegivel)} />
            <MiniStat
              label="Casos suspensos"
              value={String(apuracao.casosSuspensos.length)}
              accent="text-[#C77E1E]"
            />
            {/* Meta é QUANTIDADE de contratos — nunca valor em R$. */}
            <MiniStat
              label="Meta de contratos"
              value={card.meta?.metaConfigurada != null ? String(card.meta.metaConfigurada) : '—'}
            />
            <MiniStat
              label="Contratos ativos fechados"
              value={String(card.meta?.contratosAtivos ?? 0)}
              accent={card.meta?.situacaoMeta === 'atingida' ? 'text-[#3E8E5A]' : undefined}
            />
            <MiniStat
              label="Total da competência"
              value={formatCurrency(card.totalCompetencia)}
              accent="text-[#C9922A]"
            />
          </div>

          <SituacaoMetaResumo card={card} />

          {/* COMISSÕES POR COLABORADOR */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1.5">
              Valor por colaborador
            </h3>
            <div className="rounded-md border border-[#E4E7EB] dark:border-border divide-y divide-[#E4E7EB] dark:divide-border">
              {modoDinamico &&
                card.linhas.map((linha) => (
                  <div
                    key={linha.colaboradorId}
                    className="px-2.5 py-1.5 text-xs flex items-center justify-between gap-2"
                  >
                    <span className="text-[#252B34] dark:text-foreground">{linha.nome}</span>
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
                    <span className="text-[#252B34] dark:text-foreground">{colab.nome}</span>
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
            {mostraPotencial && (
              <p className="mt-1.5 text-[11px] text-[#78818E] dark:text-muted-foreground">
                Potencial se a meta for cumprida: {formatCurrency(totalPotencial)}
              </p>
            )}
          </section>

          {/* RELAÇÃO DE CASOS — simplificada */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1.5">
              Casos elegíveis ({apuracao.casosElegiveis.length})
            </h3>
            <ListaCasos casos={apuracao.casosElegiveis} />
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1.5">
              Casos suspensos ({apuracao.casosSuspensos.length})
            </h3>
            <ListaCasos casos={apuracao.casosSuspensos} suspensa />
          </section>

          {/* CONFERÊNCIA TÉCNICA — recolhida por padrão */}
          <Accordion
            type="single"
            collapsible
            className="rounded-md border border-[#E4E7EB] dark:border-border px-3"
          >
            <AccordionItem value="conferencia" className="border-0">
              <AccordionTrigger className="py-2 text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground hover:no-underline">
                Conferência técnica
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="space-y-3">
                  {apuracao.casosIA.length === 0 &&
                  apuracao.casosAmbiguos.length === 0 &&
                  apuracao.casosDuplicados.length === 0 ? (
                    <p className="text-xs text-[#78818E] dark:text-muted-foreground">
                      Nenhum caso em conferência técnica nesta competência.
                    </p>
                  ) : (
                    <>
                      {apuracao.casosIA.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-[#4A7FA5] mb-1">
                            Em conferência — Responsável IA ({apuracao.casosIA.length})
                          </h4>
                          <ListaCasos casos={apuracao.casosIA} />
                        </div>
                      )}
                      {apuracao.casosAmbiguos.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-[#8A56AC] mb-1">
                            Possíveis duplicidades ({apuracao.casosAmbiguos.length})
                          </h4>
                          <ListaCasos casos={apuracao.casosAmbiguos} />
                        </div>
                      )}
                      {apuracao.casosDuplicados.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground mb-1">
                            {ROTULO_CONTINUACAO_SEM_COMISSAO} ({apuracao.casosDuplicados.length})
                          </h4>
                          <ListaCasos casos={apuracao.casosDuplicados} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* ÁREA ADMINISTRATIVA — recolhida atrás de botão discreto (só gestor) */}
          {isGestor && (
            <div className="border-t border-[#E4E7EB] dark:border-border pt-3">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2 text-[11px] text-[#C9922A] hover:bg-[#C9922A]/10 hover:text-[#C9922A]"
                onClick={() => setGestaoAberta((v) => !v)}
                aria-expanded={gestaoAberta}
              >
                <Settings2 className="h-3.5 w-3.5" aria-hidden />
                Gerenciar comissões
              </Button>
              {gestaoAberta && (
                <div className="mt-2">
                  <GestaoComissoesArea
                    mes={mes}
                    ano={ano}
                    competenciaAtual={competencia}
                    onMetaSalvaNoRosto={onMetaSalva}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
