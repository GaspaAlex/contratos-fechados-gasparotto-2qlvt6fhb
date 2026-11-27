/**
 * COMPONENTE — CONTRACHEQUE MENSAL (Build C2)
 * ========================================================================
 * Primeira versão funcional do contracheque mensal da aba Contracheques:
 * seleção de colaborador + competência, salário-base vindo do HISTÓRICO de
 * vigências (cc_salarios) da competência escolhida, lançamentos manuais de
 * vencimentos e descontos (natureza + descrição + valor), totais e líquido
 * recalculados ao vivo (matemática em centavos) e salvamento como RASCUNHO
 * (cc_contracheques + cc_lancamentos — no máximo um tipo 'folha' por
 * colaborador por competência).
 *
 * NÃO implementado neste build (por decisão): encargos legais, comissões
 * automáticas, fechamento/pagamento, impressão/PDF. Todos os demonstrativos
 * ficam em status 'rascunho'. Nenhuma consulta a protocolo/comissoes_*.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  calcularDemonstrativo,
  formatarCentavos,
  paraCentavos,
  salarioVigenteNaCompetencia,
  validarLancamento,
  type LancamentoInput,
} from '@/lib/ccContracheque'
import {
  adicionarLancamento,
  atualizarLancamento,
  buscarContracheque,
  excluirLancamento,
  getContrachequesDoColaborador,
  getLancamentos,
  obterOuCriarContracheque,
  type ContrachequeRecord,
  type LancamentoRecord,
} from '@/services/ccContracheques'
import type { ParticipanteResolvido } from '@/services/ccParticipantes'
import { formatarSalario, type SalarioRecord } from '@/services/ccSalarios'

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

const NATUREZAS_VENCIMENTO = [
  'Gratificação',
  'Comissão informada manualmente',
  'Diferença salarial',
  'Outros vencimentos',
]
const NATUREZAS_DESCONTO = [
  'Adiantamento salarial',
  'Desconto autorizado',
  'Parcela de empréstimo',
  'Outros descontos',
]

/** Lançamento em edição no rascunho local (ainda não salvo, ou salvo com id). */
interface LancamentoRascunho {
  id?: string
  natureza_tipo: 'vencimento' | 'desconto'
  natureza: string
  descricao: string
  valor: number
}

/** Converte texto pt-BR ("1.234,56") em número; NaN se inválido. */
function parseValorBR(texto: string): number {
  const limpo = texto.trim().replace(/\s/g, '').replace(/R\$/i, '')
  if (!limpo) return NaN
  return Number(limpo.replace(/\./g, '').replace(',', '.'))
}

interface Props {
  funcionarios: ParticipanteResolvido[]
  salarios: SalarioRecord[]
}

export default function ContrachequeMensal({ funcionarios, salarios }: Props) {
  const { toast } = useToast()

  const hoje = new Date()
  const [funcionarioId, setFuncionarioId] = useState('')
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())

  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [contracheque, setContracheque] = useState<ContrachequeRecord | null>(null)
  const [competenciasSalvas, setCompetenciasSalvas] = useState<ContrachequeRecord[]>([])
  const [lancamentos, setLancamentos] = useState<LancamentoRascunho[]>([])

  // Formulário de novo lançamento
  const [novoTipo, setNovoTipo] = useState<'vencimento' | 'desconto'>('vencimento')
  const [novaNatureza, setNovaNatureza] = useState(NATUREZAS_VENCIMENTO[0])
  const [novaDescricao, setNovaDescricao] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [adicionando, setAdicionando] = useState(false)

  // Edição inline
  const [editandoChave, setEditandoChave] = useState<string | null>(null)
  const [editTipo, setEditTipo] = useState<'vencimento' | 'desconto'>('vencimento')
  const [editNatureza, setEditNatureza] = useState('')
  const [editDescricao, setEditDescricao] = useState('')
  const [editValor, setEditValor] = useState('')

  const funcionario = useMemo(
    () => funcionarios.find((f) => (f.funcionarioId ?? f.colaboradorId ?? '') === funcionarioId),
    [funcionarios, funcionarioId],
  )

  /** Carrega demonstrativo existente da competência + lista de competências salvas. */
  const carregarDemonstrativo = useCallback(
    async (fid: string, m: number, a: number) => {
      setCarregando(true)
      try {
        const [existente, todos] = await Promise.all([
          buscarContracheque(fid, m, a),
          getContrachequesDoColaborador(fid),
        ])
        setCompetenciasSalvas(todos)
        if (existente) {
          setContracheque(existente)
          const its = await getLancamentos(existente.id)
          setLancamentos(
            its.map((l: LancamentoRecord) => ({
              id: l.id,
              natureza_tipo: l.natureza_tipo,
              natureza: l.natureza || '',
              descricao: l.descricao,
              valor: l.valor,
            })),
          )
        } else {
          setContracheque(null)
          setLancamentos([])
        }
      } catch (e) {
        console.error(e)
        toast({
          title: 'Falha ao carregar',
          description: 'Não foi possível carregar o demonstrativo desta competência.',
          variant: 'destructive',
        })
      } finally {
        setCarregando(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!funcionarioId) {
      setContracheque(null)
      setLancamentos([])
      setCompetenciasSalvas([])
      return
    }
    void carregarDemonstrativo(funcionarioId, mes, ano)
  }, [funcionarioId, mes, ano, carregarDemonstrativo])

  /** Vigência salarial que cobre a competência selecionada (histórico, não "hoje"). */
  const salarioVigente = useMemo(() => {
    if (!funcionarioId) return undefined
    return salarioVigenteNaCompetencia(salarios, funcionarioId, mes, ano)
  }, [salarios, funcionarioId, mes, ano])

  /**
   * Salário-base (em reais) ou null = não cadastrado na competência:
   *  - demonstrativo salvo COM salário → vale o snapshot gravado (nunca muda
   *    silenciosamente, mesmo que o cadastro salarial mude depois);
   *  - demonstrativo salvo como "não cadastrado" ou novo → a vigência que
   *    cobre a competência (rascunho incompleto pode ser completado ao salvar).
   */
  const salarioBaseReais: number | null = useMemo(() => {
    if (contracheque && !contracheque.salario_nao_cadastrado) {
      return paraCentavos(Number(contracheque.salario_base)) !== null
        ? Number(contracheque.salario_base)
        : null
    }
    if (!salarioVigente) return null
    return paraCentavos(Number(salarioVigente.valor)) !== null ? Number(salarioVigente.valor) : null
  }, [contracheque, salarioVigente])

  const calculo = useMemo(
    () =>
      calcularDemonstrativo(
        salarioBaseReais === null ? undefined : { valor: salarioBaseReais },
        lancamentos,
      ),
    [salarioBaseReais, lancamentos],
  )

  /** Snapshot divergente do cadastro (aviso — o gravado continua valendo). */
  const snapshotDivergente =
    !!contracheque &&
    !contracheque.salario_nao_cadastrado &&
    !!salarioVigente &&
    paraCentavos(Number(contracheque.salario_base)) !== paraCentavos(Number(salarioVigente.valor))

  /** Rascunho salvo sem salário que agora tem vigência no cadastro. */
  const salarioPreenchivel = !!contracheque?.salario_nao_cadastrado && salarioBaseReais !== null

  const naturezasLista = novoTipo === 'vencimento' ? NATUREZAS_VENCIMENTO : NATUREZAS_DESCONTO

  const mudarTipoNovo = (t: 'vencimento' | 'desconto') => {
    setNovoTipo(t)
    setNovaNatureza(t === 'vencimento' ? NATUREZAS_VENCIMENTO[0] : NATUREZAS_DESCONTO[0])
  }

  const adicionar = () => {
    const valorNum = parseValorBR(novoValor)
    const dados: LancamentoInput = {
      natureza_tipo: novoTipo,
      natureza: novaNatureza,
      descricao: novaDescricao,
      valor: valorNum,
    }
    const erro = validarLancamento(dados)
    if (erro) {
      toast({ title: 'Lançamento inválido', description: erro, variant: 'destructive' })
      return
    }
    setLancamentos((atual) => [
      ...atual,
      {
        natureza_tipo: novoTipo,
        natureza: novaNatureza,
        descricao: novaDescricao.trim(),
        valor: valorNum,
      },
    ])
    setNovaDescricao('')
    setNovoValor('')
    setAdicionando(false)
  }

  const iniciarEdicao = (l: LancamentoRascunho, chave: string) => {
    setEditandoChave(chave)
    setEditTipo(l.natureza_tipo)
    setEditNatureza(l.natureza)
    setEditDescricao(l.descricao)
    setEditValor(l.valor.toFixed(2).replace('.', ','))
  }

  const confirmarEdicao = () => {
    if (!editandoChave) return
    const valorNum = parseValorBR(editValor)
    const naturezaFinal =
      editNatureza || (editTipo === 'vencimento' ? NATUREZAS_VENCIMENTO[0] : NATUREZAS_DESCONTO[0])
    const erro = validarLancamento({
      natureza_tipo: editTipo,
      natureza: naturezaFinal,
      descricao: editDescricao,
      valor: valorNum,
    })
    if (erro) {
      toast({ title: 'Lançamento inválido', description: erro, variant: 'destructive' })
      return
    }
    setLancamentos((atual) =>
      atual.map((l) =>
        (l.id ?? `novo-${atual.findIndex((x) => x === l)}`) === editandoChave
          ? {
              ...l,
              natureza_tipo: editTipo,
              natureza: naturezaFinal,
              descricao: editDescricao.trim(),
              valor: valorNum,
            }
          : l,
      ),
    )
    setEditandoChave(null)
  }

  /** Salva o rascunho: cria/reusa o demonstrativo e sincroniza os lançamentos. */
  const salvarRascunho = async () => {
    if (!funcionario || !funcionarioId) return
    for (const l of lancamentos) {
      const erro = validarLancamento(l)
      if (erro) {
        toast({
          title: 'Lançamento inválido',
          description: `${l.descricao}: ${erro}`,
          variant: 'destructive',
        })
        return
      }
    }
    setSalvando(true)
    try {
      // Snapshot: preserva o gravado; completa só quando era "não cadastrado".
      const salarioBaseGravado =
        contracheque && !contracheque.salario_nao_cadastrado
          ? Number(contracheque.salario_base)
          : salarioBaseReais === null
            ? 0
            : salarioBaseReais
      const flagSemSalario = contracheque
        ? contracheque.salario_nao_cadastrado && salarioBaseReais === null
        : salarioBaseReais === null

      const demo = await obterOuCriarContracheque({
        funcionarioId,
        funcionarioNome: funcionario.nome,
        mes,
        ano,
        salarioBase: salarioBaseGravado,
        salarioNaoCadastrado: flagSemSalario,
      })

      // Sincroniza lançamentos com o banco (uma única leitura):
      // cria novos, atualiza editados e exclui os removidos da tela.
      const atuais = await getLancamentos(demo.id)
      const naTelaIds = new Set(lancamentos.filter((l) => l.id).map((l) => l.id!))
      for (const l of lancamentos) {
        if (l.id) {
          const rec = atuais.find((r) => r.id === l.id)
          if (
            rec &&
            (rec.descricao !== l.descricao ||
              rec.valor !== l.valor ||
              rec.natureza_tipo !== l.natureza_tipo ||
              (rec.natureza || '') !== l.natureza)
          ) {
            await atualizarLancamento(l.id, {
              natureza_tipo: l.natureza_tipo,
              natureza: l.natureza,
              descricao: l.descricao,
              valor: l.valor,
            })
          }
        } else {
          await adicionarLancamento(demo.id, l)
        }
      }
      for (const rec of atuais) {
        if (!naTelaIds.has(rec.id)) await excluirLancamento(rec.id)
      }

      toast({
        title: 'Rascunho salvo',
        description: `Contracheque de ${funcionario.nome} — ${MESES[mes - 1]}/${ano}.`,
      })
      await carregarDemonstrativo(funcionarioId, mes, ano)
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : 'Falha ao salvar o rascunho.'
      toast({ title: 'Não foi possível salvar', description: msg, variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const anos = Array.from({ length: 6 }, (_, i) => hoje.getFullYear() - 3 + i)

  const renderLancamentoRow = (l: LancamentoRascunho, tipo: 'vencimento' | 'desconto') => {
    if (l.natureza_tipo !== tipo) return null
    const chave = l.id ?? `novo-${lancamentos.findIndex((x) => x === l)}`
    const emEdicao = editandoChave === chave
    if (emEdicao) {
      const listaEdicao = editTipo === 'vencimento' ? NATUREZAS_VENCIMENTO : NATUREZAS_DESCONTO
      return (
        <div key={chave} className="py-2 border-b border-border/50 last:border-0">
          <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr_130px_auto] gap-2 items-end">
            <div className="space-y-1">
              <Label htmlFor={`ed-nat-${chave}`} className="text-xs">
                Natureza
              </Label>
              <Select value={editNatureza || listaEdicao[0]} onValueChange={setEditNatureza}>
                <SelectTrigger id={`ed-nat-${chave}`} className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {listaEdicao.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`ed-desc-${chave}`} className="text-xs">
                Descrição
              </Label>
              <Input
                id={`ed-desc-${chave}`}
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`ed-val-${chave}`} className="text-xs">
                Valor (R$)
              </Label>
              <Input
                id={`ed-val-${chave}`}
                inputMode="decimal"
                value={editValor}
                onChange={(e) => setEditValor(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                className="h-9"
                onClick={confirmarEdicao}
                aria-label="Confirmar edição"
              >
                <Save className="h-3.5 w-3.5" aria-hidden />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9"
                onClick={() => setEditandoChave(null)}
                aria-label="Cancelar edição"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div
        key={chave}
        className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{l.descricao || l.natureza}</p>
          <p className="text-xs text-[#78818E] dark:text-muted-foreground truncate">
            {l.natureza}
            {l.descricao && l.natureza ? '' : ''}
            {!l.id ? ' · ainda não salvo' : ''}
          </p>
        </div>
        <span className="text-sm font-semibold whitespace-nowrap">
          {formatarCentavos(paraCentavos(l.valor) ?? 0)}
        </span>
        <div className="flex gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => iniciarEdicao(l, chave)}
            aria-label={`Editar lançamento ${l.descricao || l.natureza}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive"
            onClick={() => setLancamentos((atual) => atual.filter((x) => x !== l))}
            aria-label={`Remover lançamento ${l.descricao || l.natureza}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Contracheque mensal</CardTitle>
        <p className="text-xs text-[#78818E] dark:text-muted-foreground">
          Demonstrativo de vencimentos e descontos por competência. Versão rascunho — encargos
          legais serão calculados em build futuro.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Seleção colaborador + competência */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cc-mensal-colab">Colaborador</Label>
            <Select value={funcionarioId} onValueChange={setFuncionarioId}>
              <SelectTrigger id="cc-mensal-colab" aria-label="Selecionar colaborador">
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {funcionarios.map((f) => (
                  <SelectItem key={f.vinculoId} value={f.funcionarioId ?? f.colaboradorId ?? ''}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cc-mensal-mes">Mês</Label>
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger id="cc-mensal-mes" aria-label="Selecionar mês">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((nome, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cc-mensal-ano">Ano</Label>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger id="cc-mensal-ano" aria-label="Selecionar ano">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {competenciasSalvas.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[#78818E] dark:text-muted-foreground">
              Competências salvas deste colaborador:
            </span>
            {competenciasSalvas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setMes(c.competencia_mes)
                  setAno(c.competencia_ano)
                }}
                className={cn(
                  'text-xs rounded border px-2 py-0.5 hover:bg-muted transition-colors',
                  c.competencia_mes === mes && c.competencia_ano === ano
                    ? 'border-[#C9922A] text-[#C9922A] font-semibold'
                    : 'text-[#78818E] dark:text-muted-foreground',
                )}
              >
                {String(c.competencia_mes).padStart(2, '0')}/{c.competencia_ano}
              </button>
            ))}
          </div>
        )}

        {!funcionarioId ? (
          <p className="text-sm text-[#78818E] dark:text-muted-foreground py-4">
            Selecione um colaborador para montar o contracheque da competência.
          </p>
        ) : carregando ? (
          <div className="flex items-center gap-2 py-6 text-sm text-[#78818E] dark:text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando demonstrativo…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Demonstrativo */}
            <div className="rounded-lg border p-4 space-y-3 bg-background">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#C9922A] font-semibold">
                    Advocacia Gasparotto
                  </p>
                  <h3 className="text-lg font-bold">{funcionario?.nome}</h3>
                  <p className="text-xs text-[#78818E] dark:text-muted-foreground">
                    Competência: {MESES[mes - 1]}/{ano}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-xs font-semibold rounded-full px-2.5 py-1 w-fit',
                    contracheque
                      ? 'bg-[#C9922A]/10 text-[#C9922A]'
                      : 'bg-muted text-[#78818E] dark:text-muted-foreground',
                  )}
                >
                  {contracheque ? 'Rascunho salvo' : 'Não salvo'}
                </span>
              </div>

              {/* Avisos */}
              {salarioBaseReais === null && (
                <p className="flex items-start gap-2 text-sm text-[#C9922A]">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
                  Salário não cadastrado para esta competência.
                </p>
              )}
              {salarioPreenchivel && (
                <p className="text-xs text-[#78818E] dark:text-muted-foreground">
                  Vigência salarial encontrada para esta competência — salve o rascunho para
                  registrar o salário-base no demonstrativo.
                </p>
              )}
              {snapshotDivergente && (
                <p className="text-xs text-[#78818E] dark:text-muted-foreground">
                  Salário-base preservado do salvamento (
                  {formatarSalario(contracheque!.salario_base)}); o cadastro hoje indica{' '}
                  {formatarSalario(salarioVigente!.valor)} para esta competência.
                </p>
              )}
              {calculo.duplicados.length > 0 && (
                <p className="text-xs text-destructive">
                  Possíveis lançamentos duplicados: {calculo.duplicados.join('; ')}.
                </p>
              )}
              {contracheque && (
                <p className="text-xs text-[#78818E] dark:text-muted-foreground italic">
                  Rascunho parcial — encargos legais ainda não calculados.
                </p>
              )}

              {/* Vencimentos */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1">
                  Vencimentos
                </p>
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-sm">Salário-base</span>
                  <span className="text-sm font-semibold">
                    {salarioBaseReais === null
                      ? '—'
                      : formatarCentavos(Math.round(salarioBaseReais * 100))}
                  </span>
                </div>
                {calculo.vencimentos.map((v) => renderLancamentoRow(v, 'vencimento'))}
                {calculo.vencimentos.length === 0 && (
                  <p className="text-xs text-[#78818E] dark:text-muted-foreground py-1">
                    Nenhum vencimento manual lançado.
                  </p>
                )}
              </div>

              {/* Descontos */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1">
                  Descontos
                </p>
                {calculo.descontos.map((d) => renderLancamentoRow(d, 'desconto'))}
                {calculo.descontos.length === 0 && (
                  <p className="text-xs text-[#78818E] dark:text-muted-foreground py-1">
                    Nenhum desconto lançado.
                  </p>
                )}
              </div>

              {/* Totais */}
              <div className="border-t pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Total de Vencimentos</span>
                  <span className="font-semibold">
                    {formatarCentavos(calculo.totalVencimentosCentavos)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Total de Descontos</span>
                  <span className="font-semibold">
                    {formatarCentavos(calculo.totalDescontosCentavos)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Valor Líquido</span>
                  <span
                    className={cn(
                      calculo.liquidoCentavos < 0 ? 'text-destructive' : 'text-[#C9922A]',
                    )}
                  >
                    {formatarCentavos(calculo.liquidoCentavos)}
                  </span>
                </div>
                <p className="text-[11px] text-[#78818E] dark:text-muted-foreground">
                  Valor de demonstração (rascunho) — não é ordem de pagamento.
                </p>
              </div>
            </div>

            {/* Formulário de novo lançamento */}
            {adicionando ? (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr_130px_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="cc-novo-tipo" className="text-xs">
                      Tipo
                    </Label>
                    <Select
                      value={novoTipo}
                      onValueChange={(v) => mudarTipoNovo(v as 'vencimento' | 'desconto')}
                    >
                      <SelectTrigger id="cc-novo-tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vencimento">Vencimento</SelectItem>
                        <SelectItem value="desconto">Desconto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cc-novo-natureza" className="text-xs">
                      Natureza
                    </Label>
                    <Select value={novaNatureza} onValueChange={setNovaNatureza}>
                      <SelectTrigger id="cc-novo-natureza">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {naturezasLista.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-1">
                    <Label htmlFor="cc-novo-desc" className="text-xs">
                      Descrição (opcional)
                    </Label>
                    <Input
                      id="cc-novo-desc"
                      value={novaDescricao}
                      onChange={(e) => setNovaDescricao(e.target.value)}
                      maxLength={120}
                      placeholder="Detalhe, se quiser"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cc-novo-valor" className="text-xs">
                      Valor (R$)
                    </Label>
                    <Input
                      id="cc-novo-valor"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-1 sm:col-span-4 justify-end">
                    <Button size="sm" onClick={adicionar}>
                      <Plus className="h-3.5 w-3.5 mr-1" aria-hidden /> Adicionar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAdicionando(false)
                        setNovaDescricao('')
                        setNovoValor('')
                      }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" aria-hidden /> Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAdicionando(true)}>
                <Plus className="h-4 w-4 mr-1" aria-hidden /> Adicionar lançamento
              </Button>
            )}

            {/* Salvar rascunho */}
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void salvarRascunho()} disabled={salvando}>
                {salvando ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4 mr-1" aria-hidden />
                )}
                Salvar rascunho
              </Button>
              <span className="text-xs text-[#78818E] dark:text-muted-foreground">
                Máximo de um demonstrativo por colaborador/competência — salvar novamente abre o
                mesmo registro.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
