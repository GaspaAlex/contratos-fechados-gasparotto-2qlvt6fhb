/**
 * ITEM DE COLABORADOR (Build F2-A) — exibe dados + histórico de vigências
 * e ações do gestor (nova regra futura, encerrar vigência, ativar/desativar).
 * NÃO existe exclusão física: desativar não apaga regras históricas.
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, History, Loader2, Power, PlusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type {
  ColaboradorComissionadoRecord,
  RegraComissaoRecord,
} from '@/services/comissoesColaboradores'
import { MODALIDADE_LABELS, dataCurtaBR, rotuloCompetencia } from './gestaoLabels'

interface Props {
  colaborador: ColaboradorComissionadoRecord
  regras: RegraComissaoRecord[]
  competenciaAtual: string
  salvandoId: string | null
  onAdicionarRegra: (colaborador: ColaboradorComissionadoRecord) => void
  onEncerrarVigencia: (regra: RegraComissaoRecord) => void
  onAlternarAtivo: (colaborador: ColaboradorComissionadoRecord) => void
}

const ordenarRegras = (regras: RegraComissaoRecord[]) =>
  [...regras].sort((a, b) => a.vigencia_inicio.localeCompare(b.vigencia_inicio))

export function GestaoColaboradorItem({
  colaborador,
  regras,
  competenciaAtual,
  salvandoId,
  onAdicionarRegra,
  onEncerrarVigencia,
  onAlternarAtivo,
}: Props) {
  const [expandido, setExpandido] = useState(false)
  const minhas = ordenarRegras(regras)
  const ocupado = salvandoId === colaborador.id
  const vigente = minhas.filter((r) => r.vigencia_inicio <= competenciaAtual)
  const regraVigente = vigente.length > 0 ? vigente[vigente.length - 1] : null

  return (
    <div className="rounded-md border border-[#E4E7EB] dark:border-border">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          aria-expanded={expandido}
          aria-label={`${expandido ? 'Ocultar' : 'Ver'} histórico de ${colaborador.nome}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#78818E] hover:bg-[#F5F6F8] dark:hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9922A]"
        >
          {expandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="min-w-[140px] flex-1">
          <span className="text-sm font-medium text-[#252B34] dark:text-foreground">
            {colaborador.nome}
          </span>
          {!colaborador.ativo && (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              Inativo
            </Badge>
          )}
        </div>

        <div className="text-xs text-[#78818E] dark:text-muted-foreground tabular-nums">
          {regraVigente
            ? `R$ ${Number(regraVigente.valor).toFixed(2).replace('.', ',')}/caso · ${MODALIDADE_LABELS[regraVigente.modalidade]} · desde ${rotuloCompetencia(regraVigente.vigencia_inicio)}`
            : 'Sem regra vigente'}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="sr-only" id={`lbl-ativo-${colaborador.id}`}>
            {colaborador.ativo ? 'Desativar' : 'Reativar'} {colaborador.nome}
          </span>
          <Switch
            checked={colaborador.ativo}
            disabled={ocupado}
            aria-labelledby={`lbl-ativo-${colaborador.id}`}
            onCheckedChange={() => onAlternarAtivo(colaborador)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[11px]"
            disabled={ocupado}
            onClick={() => onAdicionarRegra(colaborador)}
          >
            <PlusCircle className="h-3.5 w-3.5" aria-hidden />
            Nova regra
          </Button>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-[#E4E7EB] dark:border-border px-3 py-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
            <History className="h-3.5 w-3.5" aria-hidden />
            Histórico de vigências
          </div>
          {minhas.length === 0 ? (
            <p className="text-xs text-[#78818E] dark:text-muted-foreground">
              Nenhuma regra cadastrada para este colaborador.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {minhas.map((r) => {
                const encerrada = Boolean(r.vigencia_fim)
                const anterior = r.vigencia_inicio < competenciaAtual
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-2 rounded bg-[#F5F6F8] dark:bg-muted/40 px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-medium text-[#252B34] dark:text-foreground tabular-nums">
                      {rotuloCompetencia(r.vigencia_inicio)}
                      {encerrada ? ` — ${rotuloCompetencia(r.vigencia_fim!)}` : ' — em vigor'}
                    </span>
                    <span className="text-[#78818E] dark:text-muted-foreground">
                      R$ {Number(r.valor).toFixed(2).replace('.', ',')} ·{' '}
                      {MODALIDADE_LABELS[r.modalidade]}
                    </span>
                    {!encerrada && anterior && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-6 px-2 text-[11px] text-[#C77E1E] hover:text-[#C77E1E]"
                        disabled={ocupado}
                        onClick={() => onEncerrarVigencia(r)}
                      >
                        Encerrar vigência
                      </Button>
                    )}
                    <span className="sr-only">Cadastrada em {dataCurtaBR(r.created)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/** Formulário embutido de nova regra para um colaborador existente. */
export function GestaoNovaRegraForm({
  colaborador,
  onGravar,
  onCancelar,
  salvando,
}: {
  colaborador: ColaboradorComissionadoRecord
  onGravar: (dados: {
    valor: number
    modalidade: 'fixa' | 'condicionada_meta'
    competencia: string
  }) => void
  onCancelar: () => void
  salvando: boolean
}) {
  const [valor, setValor] = useState('')
  const [modalidade, setModalidade] = useState<'fixa' | 'condicionada_meta'>('fixa')
  const [competencia, setCompetencia] = useState('')

  const gravar = () => {
    const v = Number(valor.replace(',', '.'))
    if (!Number.isFinite(v) || v <= 0) return
    if (!/^\d{4}-\d{2}$/.test(competencia)) return
    onGravar({ valor: v, modalidade, competencia })
  }

  return (
    <div className="rounded-md border border-[#C9922A]/50 bg-[#D9A94A]/5 px-3 py-2.5 space-y-2.5">
      <p className="text-xs font-semibold text-[#252B34] dark:text-foreground">
        Nova regra para {colaborador.nome}
      </p>
      <div className="grid gap-2.5 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor={`nr-valor-${colaborador.id}`} className="text-[11px]">
            Valor por caso (R$)
          </Label>
          <Input
            id={`nr-valor-${colaborador.id}`}
            type="number"
            inputMode="decimal"
            min={0.01}
            step={0.01}
            value={valor}
            autoComplete="off"
            onChange={(e) => setValor(e.target.value)}
            className="h-8 text-sm"
            disabled={salvando}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`nr-mod-${colaborador.id}`} className="text-[11px]">
            Modalidade
          </Label>
          <Select
            value={modalidade}
            onValueChange={(v) => setModalidade(v as 'fixa' | 'condicionada_meta')}
          >
            <SelectTrigger
              id={`nr-mod-${colaborador.id}`}
              className="h-8 text-sm"
              disabled={salvando}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixa">Fixa</SelectItem>
              <SelectItem value="condicionada_meta">Condicionada à meta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`nr-comp-${colaborador.id}`} className="text-[11px]">
            Início (AAAA-MM)
          </Label>
          <Input
            id={`nr-comp-${colaborador.id}`}
            inputMode="numeric"
            placeholder="2027-01"
            value={competencia}
            autoComplete="off"
            onChange={(e) => setCompetencia(e.target.value)}
            className="h-8 text-sm"
            disabled={salvando}
            aria-describedby={`nr-comp-help-${colaborador.id}`}
          />
          <p
            id={`nr-comp-help-${colaborador.id}`}
            className="text-[10px] text-[#78818E] dark:text-muted-foreground"
          >
            Formato AAAA-MM, ex.: 2027-01.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-7"
          disabled={
            salvando ||
            !valor ||
            !/^\d{4}-\d{2}$/.test(competencia) ||
            Number(valor.replace(',', '.')) <= 0
          }
          onClick={gravar}
        >
          {salvando && <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />}
          {salvando ? 'Salvando…' : 'Gravar nova regra'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7"
          onClick={onCancelar}
          disabled={salvando}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
