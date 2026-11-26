import { useMemo, useState } from 'react'
import { HandCoins, Info, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/formatters'
import { monthsArray } from '@/lib/months'
import { formatDateBR } from '@/services/leadsAuxAcidente'
import {
  apurarComissoes,
  COLABORADOR_CONDICIONADO_META,
  ROTULO_CONTINUACAO_SEM_COMISSAO,
  TOTAL_BASICO_POR_CASO,
  TOTAL_POTENCIAL_POR_CASO,
  type ApuracaoComissoes,
  type CasoComissoes,
  type ContratoComissoesInput,
  type ProtocoloComissoesInput,
} from '@/lib/comissoes'

interface Props {
  protocolos: ProtocoloComissoesInput[]
  contratos: ContratoComissoesInput[]
  tiposAcaoPorId?: Map<string, { id: string; nome: string }>
}

const ANOS_DISPONIVEIS = ['2024', '2025', '2026', '2027']

const SITUACAO_META: Record<string, { label: string; dot: string; text: string }> = {
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
  return SITUACAO_META[situacao] || SITUACAO_META.elegivel
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

export function ComissoesCard({ protocolos, contratos, tiposAcaoPorId }: Props) {
  const now = new Date()
  const [mes, setMes] = useState(String(now.getMonth() + 1))
  const [ano, setAno] = useState(String(now.getFullYear()))
  const [open, setOpen] = useState(false)

  const apuracao: ApuracaoComissoes = useMemo(
    () =>
      apurarComissoes(
        protocolos,
        contratos,
        parseInt(mes, 10),
        parseInt(ano, 10),
        monthsArray,
        tiposAcaoPorId,
      ),
    [protocolos, contratos, mes, ano, tiposAcaoPorId],
  )

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
              Apuração preliminar — competência por Data do Cálculo
            </p>
          </div>

          <div>
            <div
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#D9A94A] tabular-nums"
              title={formatCurrency(apuracao.totalBasico)}
            >
              {formatCurrency(apuracao.totalBasico)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#A5ADB9]">
              <span className="tabular-nums">
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
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-[#D9A94A] hover:bg-[#2B303C] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D9A94A]"
              >
                <Search className="h-3 w-3" /> Ver detalhamento
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG DE DETALHAMENTO — apuração PRELIMINAR */}
      <Dialog open={open} onOpenChange={setOpen}>
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
              <MiniStat label="Total básico" value={formatCurrency(apuracao.totalBasico)} />
              <MiniStat label="Total potencial" value={formatCurrency(apuracao.totalPotencial)} />
              <MiniStat
                label="Suspensos (R. Docs)"
                value={String(suspensosCount)}
                accent="text-[#C77E1E]"
              />
            </div>

            {/* Valores por colaborador */}
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1.5">
                Valores por colaborador (por caso)
              </h3>
              <div className="rounded-md border border-[#E4E7EB] dark:border-border divide-y divide-[#E4E7EB] dark:divide-border">
                <div className="flex items-center justify-between px-2.5 py-1.5 text-xs">
                  <span className="text-[#252B34] dark:text-foreground">Bia</span>
                  <span className="tabular-nums text-[#252B34] dark:text-foreground">R$ 20,00</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-xs">
                  <span className="text-[#252B34] dark:text-foreground">Nayara</span>
                  <span className="tabular-nums text-[#252B34] dark:text-foreground">R$ 20,00</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-xs">
                  <span className="text-[#252B34] dark:text-foreground">Kaique</span>
                  <span className="tabular-nums text-[#252B34] dark:text-foreground">R$ 10,00</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-xs">
                  <span className="text-[#252B34] dark:text-foreground">
                    Nataly <span className="text-[10px] text-[#C77E1E]">(Condicionado à meta)</span>
                  </span>
                  <span className="tabular-nums text-[#252B34] dark:text-foreground">R$ 20,00</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-xs bg-[#F5F6F8] dark:bg-muted/40">
                  <span className="font-semibold text-[#252B34] dark:text-foreground">
                    Total por caso — básico
                  </span>
                  <span className="tabular-nums font-semibold text-[#252B34] dark:text-foreground">
                    {formatCurrency(TOTAL_BASICO_POR_CASO)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-xs">
                  <span className="font-semibold text-[#252B34] dark:text-foreground">
                    Total por caso — potencial
                  </span>
                  <span className="tabular-nums font-semibold text-[#252B34] dark:text-foreground">
                    {formatCurrency(TOTAL_POTENCIAL_POR_CASO)}
                  </span>
                </div>
              </div>
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
                Apuração preliminar de leitura — nenhum dado é gravado ou alterado. Valores por
                colaborador: Bia R$ 20, Nayara R$ 20, Kaique R$ 10, Nataly R$ 20 potencial
                (condicionado à meta mensal, não incluído no total estimado). Cada caso (contrato
                relacionado ou cadeia de continuação) conta uma única vez, pela 1ª liberação
                elegível por Data do Cálculo; movimentações posteriores ficam sem nova comissão.
                Correspondências por telefone+tipo ambíguas não são fundidas.
              </span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
