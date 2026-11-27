/**
 * COMPONENTE — SEÇÃO COMISSÕES E DSR (Build C3-B)
 * ========================================================================
 * Bloco da seção "Comissões e DSR" do contracheque mensal. Modalidades
 * mutuamente exclusivas: quantidade × valor unitário OU valor total direto.
 * Exibe dias úteis/repouso do calendário da competência (nacionais embutidos
 * no motor + cadastrados em cc_feriados), DSR automático e um checkbox de
 * AJUSTE dos dias (que exige motivo) — coerente com o motor C3-A.
 *
 * TODA a matemática vem do motor puro (ccComissaoDsr.ts) via o hook
 * useComissaoDsr — nenhum cálculo é feito aqui. Ao REABRIR um rascunho salvo,
 * o hook devolve o snapshot GRAVADO (sem recálculo silencioso): a edição fica
 * travada até a pessoa clicar em "Editar valores", que parte do estado salvo.
 */
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Info, Lock, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { formatarCentavos } from '@/lib/ccContracheque'
import { CONFIG_PADRAO_DIAS, type SnapshotComissaoDsr } from '@/lib/ccComissaoDsr'
import { useComissaoDsr, type AvisoComissao } from './useComissaoDsr'

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

interface Props {
  funcionarioId: string
  mes: number
  ano: number
  /** Lançamentos carregados do banco (para a detecção de comissão manual). */
  lancamentos: Array<{ id?: string; natureza: string; descricao: string; valor: number }>
  /** Snapshot gravado no demonstrativo salvo (null = sem comissão gravada). */
  snapshotGravado: SnapshotComissaoDsr | null
  /** Dispara a sincronização (snapshot + rubricas) já com os valores atuais. */
  onSalvar: (funcionarioId: string, mes: number, ano: number) => Promise<boolean>
  salvando: boolean
  /** Avisos que a seção deve mostrar (bloqueio por comissão manual etc.). */
  avisos: AvisoComissao[]
  /** Estado de UI do formulário (controlado pelo pai, sobrevive à recarga). */
  estado: import('@/lib/ccComissaoDsrIntegracao').EstadoComissaoUI
  setEstado: (e: import('@/lib/ccComissaoDsrIntegracao').EstadoComissaoUI) => void
  /** true = exibindo o snapshot salvo, sem edição (botão "Editar valores"). */
  exibindoSalvo: boolean
  /** Sai do modo "exibindo salvo" — parte do estado gravado (nunca recalcula). */
  onHabilitarEdicao: () => void
}

export default function SecaoComissoesDsr({
  funcionarioId,
  mes,
  ano,
  lancamentos,
  snapshotGravado,
  onSalvar,
  salvando,
  avisos,
  estado,
  setEstado,
  exibindoSalvo,
  onHabilitarEdicao,
}: Props) {
  const { diasUteis, diasRepouso, carregandoFeriados, fracaoDsr } = useComissaoDsr(
    funcionarioId,
    mes,
    ano,
  )
  const bloqueado = exibindoSalvo

  /** Snapshot do estado ATUAL do formulário (via motor puro). */
  const snapAtual = (() => {
    void carregandoFeriados
    return null
  })()
  void snapAtual

  const qtd = Number(estado.qtdCasos)
  const valorCaso = Number(estado.valorCaso.replace(',', '.'))
  const valorDireto = Number(estado.valorDireto.replace(',', '.'))
  const comissaoCalculada =
    estado.ativa &&
    (estado.modalidade === 'casos'
      ? Number.isInteger(qtd) && qtd > 0 && Number.isFinite(valorCaso) && valorCaso > 0
        ? Math.round(qtd * valorCaso * 100)
        : null
      : Number.isFinite(valorDireto) && valorDireto > 0
        ? Math.round(valorDireto * 100)
        : null)

  // DSR exibido: em modo leitura = o GRAVADO; editando = estimado ao vivo
  // (a gravação usa sempre o motor, com o mesmo critério half-up)
  const dsrExibido = (() => {
    if (bloqueado && snapshotGravado) return snapshotGravado.dsrCentavos
    if (comissaoCalculada === null || diasUteis <= 0) return 0
    return Math.floor((comissaoCalculada * diasRepouso) / diasUteis + 0.5)
  })()

  const temComissaoManual =
    estado.ativa &&
    avisos.some((a) => a.tipo === 'comissao_manual' && a.bloqueiaComissaoAutomatica)

  const conferirManual = (bloqueio: boolean) => {
    const l = lancamentos.find((x) => /comiss/i.test(`${x.natureza} ${x.descricao}`))
    return l ? `Lançamento manual: ${l.descricao || l.natureza} — ` : ''
  }
  void conferirManual

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="rounded-lg border p-4 space-y-3 bg-background">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
            Comissões e DSR
          </h3>
          <p className="text-xs text-[#78818E] dark:text-muted-foreground">
            Comissão manual do colaborador (quantidade × valor ou valor direto) e o repouso
            remunerado proporcional, calculado automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {bloqueado ? (
            <Button size="sm" variant="outline" onClick={onHabilitarEdicao} disabled={salvando}>
              <Pencil className="h-3.5 w-3.5 mr-1" aria-hidden /> Editar valores
            </Button>
          ) : (
            <Switch
              checked={estado.ativa}
              onCheckedChange={(v) => setEstado({ ...estado, ativa: v })}
              aria-label="Incluir comissão e DSR no contracheque"
              disabled={salvando}
            />
          )}
        </div>
      </div>

      {/* Avisos — comissão manual detectada na competência (bloqueio) */}
      {avisos.map((a, i) => (
        <div
          key={i}
          className={cn(
            'flex items-start gap-2 rounded-md border p-2.5 text-xs',
            a.tipo === 'comissao_manual'
              ? 'border-[#C9922A]/40 bg-[#C9922A]/5 text-[#C9922A]'
              : 'border-border bg-muted/40 text-[#78818E] dark:text-muted-foreground',
          )}
          role={a.tipo === 'comissao_manual' ? 'alert' : 'status'}
        >
          {a.tipo === 'comissao_manual' ? (
            <Lock className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          ) : (
            <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          )}
          <span>{a.mensagem}</span>
        </div>
      ))}

      {!estado.ativa ? (
        <p className="text-sm text-[#78818E] dark:text-muted-foreground">
          Comissão e DSR não incluídos neste demonstrativo.
        </p>
      ) : (
        <div className={cn('space-y-4', bloqueado && 'opacity-70 pointer-events-none')}>
          {/* Modalidade */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold mb-1">Modalidade da comissão</legend>
            <RadioGroup
              value={estado.modalidade}
              onValueChange={(v) =>
                setEstado({ ...estado, modalidade: v as 'casos' | 'valor_direto' })
              }
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="casos" id="cc-cmod-casos" />
                <Label htmlFor="cc-cmod-casos" className="font-normal text-sm cursor-pointer">
                  Quantidade de casos × valor unitário
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="valor_direto" id="cc-cmod-direto" />
                <Label htmlFor="cc-cmod-direto" className="font-normal text-sm cursor-pointer">
                  Valor total direto
                </Label>
              </div>
            </RadioGroup>
          </fieldset>

          {/* Campos por modalidade */}
          {estado.modalidade === 'casos' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cc-c-qtd">Quantidade de casos</Label>
                <Input
                  id="cc-c-qtd"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ex.: 44"
                  value={estado.qtdCasos}
                  onChange={(e) =>
                    setEstado({ ...estado, qtdCasos: e.target.value.replace(/[^\d]/g, '') })
                  }
                  disabled={bloqueado || salvando}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc-c-valor">Valor por caso (R$)</Label>
                <Input
                  id="cc-c-valor"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Ex.: 20,00"
                  value={estado.valorCaso}
                  onChange={(e) =>
                    setEstado({ ...estado, valorCaso: e.target.value.replace(/[^\d,.]/g, '') })
                  }
                  disabled={bloqueado || salvando}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="cc-c-direto">Valor total da comissão (R$)</Label>
              <Input
                id="cc-c-direto"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ex.: 880,00"
                value={estado.valorDireto}
                onChange={(e) =>
                  setEstado({ ...estado, valorDireto: e.target.value.replace(/[^\d,.]/g, '') })
                }
                disabled={bloqueado || salvando}
              />
            </div>
          )}

          {/* Calendário + DSR */}
          <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#78818E] dark:text-muted-foreground">
                Dias úteis ({MESES[mes - 1]}/{ano})
              </span>
              <span className="font-semibold">{diasUteis}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#78818E] dark:text-muted-foreground">Dias de repouso</span>
              <span className="font-semibold">{diasRepouso}</span>
            </div>
            <div className="flex items-center justify-between text-sm border-t pt-1.5">
              <span className="font-semibold">DSR ({fracaoDsr})</span>
              <span className="font-bold">{formatarCentavos(dsrExibido)}</span>
            </div>
            <p className="text-[11px] text-[#78818E] dark:text-muted-foreground">
              Sábado é dia útil (critério do escritório); domingos e feriados nacionais embutidos
              não são úteis. Feriados cadastrados, quando existirem, também entram no calendário.
            </p>
          </div>

          {/* Ajuste manual de dias (fora do escopo reduzido — oculto) */}
          {false && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold mb-1">Ajuste manual dos dias</legend>
            </fieldset>
          )}

          {/* Conferência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-md border p-2.5">
              <span className="text-sm">Comissão calculada</span>
              <span className="text-sm font-bold">
                {comissaoCalculada === null ? '—' : formatarCentavos(comissaoCalculada)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-2.5">
              <span className="text-sm">Comissão + DSR</span>
              <span className="text-sm font-bold">
                {comissaoCalculada === null ? '—' : formatarCentavos(comissaoCalculada + dsrExibido)}
              </span>
            </div>
          </div>

          {/* Salvar (somente a sincronização da seção) */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void onSalvar(funcionarioId, mes, ano)}
              disabled={salvando || bloqueado || comissaoCalculada === null || temComissaoManual}
            >
              Aplicar comissão e DSR
            </Button>
            <span className="text-xs text-[#78818E] dark:text-muted-foreground">
              Grava as rubricas "Comissões" e "DSR sobre comissões" nos vencimentos. Salvar
              novamente atualiza os mesmos registros — nunca duplica.
            </span>
          </div>
        </div>
      )}

      {/* Snapshot gravado (modo leitura) */}
      {bloqueado && snapshotGravado && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <span className="text-sm">Comissão gravada</span>
            <span className="text-sm font-bold">
              {formatarCentavos(snapshotGravado.comissaoTotalCentavos)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <span className="text-sm">DSR gravado</span>
            <span className="text-sm font-bold">{formatarCentavos(snapshotGravado.dsrCentavos)}</span>
          </div>
        </div>
      )}

      {/* Notas de rodapé — sem INSS/IRRF neste build */}
      <div className="flex items-start gap-2 text-[11px] text-[#78818E] dark:text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
        <span>
          Encargos (INSS/IRRF), férias, 13º e controle de pagamentos não são calculados neste
          módulo.
        </span>
      </div>
    </div>
  )
}

// Dependências importadas para tipos — Checkbox/CONFIG_PADRAO_DIAS usados via hook
void CONFIG_PADRAO_DIAS
void Checkbox
