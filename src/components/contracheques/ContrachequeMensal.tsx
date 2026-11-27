/**
 * CONTRACHEQUE MENSAL — Build C2-A (correção do manual)
 * ========================================================================
 * Correções C2-A sobre o build C2 (v0.0.1149):
 *   • Exclusão/edição agora operam por IDENTIDADE DA LINHA (id do registro ou
 *     índice da lista local) — antes comparavam com as CÓPIAS consolidadas de
 *     calcularDemonstrativo e nunca achavam o lançamento (excluir não removia;
 *     a edição abria vários formulários e aplicava no registro errado).
 *   • Máscara monetária em CENTAVOS nos campos de valor (FormLancamento) —
 *     "37449" → "R$ 374,49". Valores JÁ GRAVADOS nunca são reinterpretados:
 *     abrir edição mostra o valor real ("R$ 37.449,00"); só a edição expressa
 *     do proprietário muda o valor.
 *   • Salvamento por PLANO DE SINCRONIZAÇÃO (planejarSyncLancamentos): cria só
 *     o que não existe, atualiza só o que mudou de verdade e exclui por id —
 *     salvar repetidamente não duplica.
 *   • Aviso de alterações não salvas ao trocar de competência/colaborador.
 *
 * NÃO integrado (decisão): motor de Comissão/DSR (ccComissaoDsr.ts) — segue
 * disponível para o C3-B. Cálculos daqui: SOMENTE vencimentos = salário-base +
 * manuais; descontos = manuais; líquido = vencimentos − descontos.
 */
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'
import {
  calcularDemonstrativo,
  deCentavos,
  formatarCentavos,
  planejarSyncLancamentos,
  type LancamentoInput,
} from '@/lib/ccContracheque'
import {
  adicionarLancamento,
  atualizarLancamento,
  excluirLancamento,
  getLancamentos,
  obterOuCriarContracheque,
} from '@/services/ccContracheques'
import FormLancamento, { type FormLancamentoValores } from '@/components/contracheques/FormLancamento'

// ——— Tipos ———————————————————————————————————————————————————————————————
export interface LinhaLancamento {
  /** id do registro gravado (null = novo, ainda não salvo). */
  id: string | null
  natureza_tipo: 'vencimento' | 'desconto'
  natureza: string
  descricao: string
  /** SEMPRE em centavos inteiros na tela. */
  valorCentavos: number
}

interface Props {
  colaboradorId: string
  colaboradorNome: string
  mes: number
  ano: number
  salarioBase: { valor: number } | null
  salarioCentavosGravado: number | null
  /** Recarrega a lista de lançamentos do banco quando muda (key do pai). */
  lancamentosRecordKey: number
  onLancamentosAlterados: () => void
}

const NATUREZAS_VENCIMENTO = [
  'Gratificação',
  'Comissão informada manualmente',
  'DSR sobre comissões',
  'Horas extras',
  'Outros vencimentos',
]
const NATUREZAS_DESCONTO = [
  'INSS',
  'Adiantamento salarial',
  'Falta',
  'Parcela de empréstimo',
  'Outros descontos',
]

/** Linha da tela → entrada do serviço (valor em reais, float). */
const paraEntrada = (l: LinhaLancamento) => ({
  natureza_tipo: l.natureza_tipo,
  natureza: l.natureza,
  descricao: l.descricao || l.natureza || 'Lançamento',
  valor: deCentavos(l.valorCentavos),
})

/** Registro do serviço → linha da tela (valor em centavos, arredondado). */
const doRecord = (r: {
  id: string
  natureza_tipo: 'vencimento' | 'desconto'
  natureza?: string
  descricao: string
  valor?: number
}): LinhaLancamento => ({
  id: r.id,
  natureza_tipo: r.natureza_tipo,
  natureza: r.natureza || r.descricao,
  descricao: r.descricao,
  valorCentavos: Math.round((r.valor ?? 0) * 100),
})

export default function ContrachequeMensal({
  colaboradorId,
  colaboradorNome,
  mes,
  ano,
  salarioBase,
  salarioCentavosGravado,
  lancamentosRecordKey,
  onLancamentosAlterados,
}: Props) {
  const { toast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [contrachequeId, setContrachequeId] = useState<string | null>(null)
  const [linhas, setLinhas] = useState<LinhaLancamento[]>([])
  const [banco, setBanco] = useState<LinhaLancamento[]>([])
  const [adicionarTipo, setAdicionarTipo] = useState<'vencimento' | 'desconto' | null>(null)
  const [editandoKey, setEditandoKey] = useState<string | null>(null)
  const [mostrarAviso, setMostrarAviso] = useState(false)

  // ——— Carga ————————————————————————————————————————————————————————————
  useEffect(() => {
    let vivo = true
    setCarregando(true)
    ;(async () => {
      try {
        const record = await obterOuCriarContracheque({
          colaboradorId,
          mes,
          ano,
          salarioBase: salarioBase ?? undefined,
        })
        if (!vivo) return
        setContrachequeId(record.id)
        const lancs = await getLancamentos(record.id)
        if (!vivo) return
        const doBanco = lancs.map(doRecord)
        setBanco(doBanco)
        setLinhas(doBanco)
        setAdicionarTipo(null)
        setEditandoKey(null)
        setMostrarAviso(false)
      } catch (erro) {
        if (!vivo) return
        toast({
          title: 'Erro ao carregar o contracheque',
          description: getErrorMessage(erro),
          variant: 'destructive',
        })
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => {
      vivo = false
    }
    // Recarrega quando o pai muda de colaborador/competência ou pede reload.
  }, [colaboradorId, mes, ano, lancamentosRecordKey, toast])

  // ——— Cálculo puro dos totais (a partir das LINHAS DA TELA) ————————————
  const calculo = useMemo(() => {
    const entradas: LancamentoInput[] = linhas.map((l) => ({
      id: l.id ?? undefined,
      natureza_tipo: l.natureza_tipo,
      natureza: l.natureza,
      descricao: l.descricao,
      valor: deCentavos(l.valorCentavos),
    }))
    const base =
      salarioCentavosGravado !== null
        ? { valor: salarioCentavosGravado / 100 }
        : salarioBase
    return calcularDemonstrativo(base, entradas)
  }, [linhas, salarioBase, salarioCentavosGravado])

  // ——— Aviso de alterações não salvas ————————————————————————————————————
  const haAlteracoesNaoSalvas = useMemo(() => {
    const plano = planejarSyncLancamentos(
      linhas.map(paraEntrada),
      banco.map(paraEntrada),
    )
    return plano.criar.length + plano.atualizar.length + plano.excluir.length > 0
  }, [linhas, banco])

  const descartarAlteracoes = () => {
    setLinhas(banco)
    setAdicionarTipo(null)
    setEditandoKey(null)
    setMostrarAviso(false)
  }

  // ——— Mutações locais ————————————————————————————————————————————————————
  const adicionar = (tipo: 'vencimento' | 'desconto', valores: FormLancamentoValores) => {
    setLinhas((atual) => [
      ...atual,
      {
        id: null,
        natureza_tipo: valores.natureza_tipo,
        natureza: valores.natureza,
        descricao: valores.descricao,
        valorCentavos: valores.valorCentavos,
      },
    ])
    setAdicionarTipo(null)
  }

  const salvarEdicao = (key: string, valores: FormLancamentoValores) => {
    setLinhas((atual) =>
      atual.map((l, i) =>
        linhaKey(l, i) === key
          ? {
              ...l,
              natureza_tipo: valores.natureza_tipo,
              natureza: valores.natureza,
              descricao: valores.descricao,
              valorCentavos: valores.valorCentavos,
            }
          : l,
      ),
    )
    setEditandoKey(null)
  }

  /** Exclui EXATAMENTE a linha escolhida (identidade por id/índice). */
  const excluir = (key: string) => {
    setLinhas((atual) => atual.filter((l, i) => linhaKey(l, i) !== key))
  }

  // ——— Salvamento (plano de sincronização) ————————————————————————————————
  const salvar = async () => {
    if (!contrachequeId) {
      toast({
        title: 'Não foi possível salvar',
        description: 'Abra a competência novamente — o demonstrativo não está identificado.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      const plano = planejarSyncLancamentos(
        linhas.map(paraEntrada),
        banco.map(paraEntrada),
      )
      for (const l of plano.excluir) {
        await excluirLancamento(l.id)
      }
      for (const l of plano.criar) {
        await adicionarLancamento(contrachequeId, l)
      }
      for (const l of plano.atualizar) {
        await atualizarLancamento(l.id, l.dados)
      }
      const lancs = await getLancamentos(contrachequeId)
      const doBanco = lancs.map(doRecord)
      setBanco(doBanco)
      setLinhas(doBanco)
      setAdicionarTipo(null)
      setEditandoKey(null)
      setMostrarAviso(false)
      toast({
        title: 'Rascunho salvo',
        description: 'Os lançamentos deste demonstrativo foram gravados.',
      })
      onLancamentosAlterados()
    } catch (erro) {
      toast({
        title: 'Erro ao salvar o rascunho',
        description: getErrorMessage(erro),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // ——— Render ————————————————————————————————————————————————————————————
  if (carregando) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando contracheque">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {haAlteracoesNaoSalvas && !salvando && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950"
          role="status"
        >
          <span className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
            Há alterações não salvas neste demonstrativo.
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={descartarAlteracoes}>
            Descartar
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Contracheque de {colaboradorNome} — {String(mes).padStart(2, '0')}/{ano}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Vencimentos */}
          <SecaoLancamentos
            titulo="Vencimentos"
            tipo="vencimento"
            linhas={linhas}
            naturezas={NATUREZAS_VENCIMENTO}
            salarioBaseCentavos={calculo.salarioBaseCentavos}
            editandoKey={editandoKey}
            onAdicionar={() => setAdicionarTipo('vencimento')}
            onEditar={setEditandoKey}
            onExcluir={excluir}
            onSalvarEdicao={salvarEdicao}
            onCancelarEdicao={() => setEditandoKey(null)}
            adicionarAberto={adicionarTipo === 'vencimento'}
            onFecharAdicao={() => setAdicionarTipo(null)}
            onAdicionarConfirmado={adicionar}
          />

          {/* Descontos */}
          <SecaoLancamentos
            titulo="Descontos"
            tipo="desconto"
            linhas={linhas}
            naturezas={NATUREZAS_DESCONTO}
            salarioBaseCentavos={null}
            editandoKey={editandoKey}
            onAdicionar={() => setAdicionarTipo('desconto')}
            onEditar={setEditandoKey}
            onExcluir={excluir}
            onSalvarEdicao={salvarEdicao}
            onCancelarEdicao={() => setEditandoKey(null)}
            adicionarAberto={adicionarTipo === 'desconto'}
            onFecharAdicao={() => setAdicionarTipo(null)}
            onAdicionarConfirmado={adicionar}
          />

          {/* Totais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TotalBox rotulo="Total de vencimentos" centavos={calculo.totalVencimentosCentavos} destaque />
            <TotalBox rotulo="Total de descontos" centavos={calculo.totalDescontosCentavos} negativo />
            <TotalBox rotulo="Líquido" centavos={calculo.liquidoCentavos} destaque />
          </div>
          {calculo.duplicados.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Atenção: há lançamentos com natureza e valor repetidos (
              {calculo.duplicados.join('; ')}) — confira antes de salvar.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Salvar rascunho
            </Button>
            <p className="text-xs text-muted-foreground">
              O salário-base é preenchido automaticamente do cadastro; os demais valores são
              lançamentos manuais.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ——— Helpers de chave de linha ————————————————————————————————————————————
function linhaKey(l: LinhaLancamento, indice: number): string {
  return l.id ?? `novo-${indice}`
}

// ——— Seção de lançamentos (vencimentos ou descontos) ———————————————————————
interface SecaoProps {
  titulo: string
  tipo: 'vencimento' | 'desconto'
  linhas: LinhaLancamento[]
  naturezas: string[]
  salarioBaseCentavos: number | null
  editandoKey: string | null
  adicionarAberto: boolean
  onAdicionar: () => void
  onFecharAdicao: () => void
  onAdicionarConfirmado: (tipo: 'vencimento' | 'desconto', v: FormLancamentoValores) => void
  onEditar: (key: string) => void
  onExcluir: (key: string) => void
  onSalvarEdicao: (key: string, v: FormLancamentoValores) => void
  onCancelarEdicao: () => void
}

function SecaoLancamentos({
  titulo,
  tipo,
  linhas,
  naturezas,
  salarioBaseCentavos,
  editandoKey,
  adicionarAberto,
  onAdicionar,
  onFecharAdicao,
  onAdicionarConfirmado,
  onEditar,
  onExcluir,
  onSalvarEdicao,
  onCancelarEdicao,
}: SecaoProps) {
  const rotuloTipo = tipo === 'vencimento' ? 'Vencimento' : 'Desconto'
  const doTipo = linhas
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.natureza_tipo === tipo)

  return (
    <section aria-label={titulo} className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAdicionar}
          disabled={adicionarAberto || editandoKey !== null}
          aria-label={`Adicionar ${rotuloTipo.toLowerCase()}`}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Adicionar
        </Button>
      </div>

      {/* Cabeçalho */}
      <div className="hidden sm:grid grid-cols-[1fr_1fr_140px_70px] gap-2 px-2 text-xs font-medium text-muted-foreground">
        <span>Natureza</span>
        <span>Descrição</span>
        <span className="text-right">Valor</span>
        <span className="text-right">Ações</span>
      </div>

      {/* Linha do salário-base (vencimentos, apenas visual) */}
      {tipo === 'vencimento' && salarioBaseCentavos !== null && (
        <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_140px_70px] gap-2 px-2 py-1.5 rounded border text-sm">
          <span className="font-medium">Salário-base</span>
          <span className="hidden sm:block text-muted-foreground">Automático do cadastro</span>
          <span className="text-right tabular-nums">{formatarCentavos(salarioBaseCentavos)}</span>
          <span />
        </div>
      )}

      {/* Lançamentos do tipo */}
      {doTipo.map(({ l, i }) => {
        const key = linhaKey(l, i)
        const emEdicao = editandoKey === key
        if (emEdicao) {
          return (
            <FormLancamento
              key={key}
              tipo={tipo}
              naturezas={naturezas}
              inicial={{
                natureza_tipo: l.natureza_tipo,
                natureza: l.natureza,
                descricao: l.descricao,
                valorCentavos: l.valorCentavos,
              }}
              rotuloTipo={rotuloTipo}
              onConfirmar={(v) => onSalvarEdicao(key, v)}
              onCancelar={onCancelarEdicao}
            />
          )
        }
        return (
          <div
            key={key}
            className={cn(
              'grid grid-cols-2 sm:grid-cols-[1fr_1fr_140px_70px] gap-2 px-2 py-1.5 rounded border text-sm',
              l.id === null && 'border-dashed',
            )}
          >
            <span className="font-medium truncate">{l.natureza}</span>
            <span className="truncate text-muted-foreground">{l.descricao || '—'}</span>
            <span className="text-right tabular-nums">{formatarCentavos(l.valorCentavos)}</span>
            <span className="flex justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => onEditar(key)}
                aria-label={`Editar ${l.natureza}`}
                disabled={editandoKey !== null || adicionarAberto}
              >
                Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-destructive hover:text-destructive"
                onClick={() => onExcluir(key)}
                aria-label={`Excluir ${l.natureza}`}
                disabled={editandoKey !== null || adicionarAberto}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </span>
          </div>
        )
      })}

      {/* Formulário de adição (um por seção, nunca dois ao mesmo tempo) */}
      {adicionarAberto && (
        <FormLancamento
          tipo={tipo}
          naturezas={naturezas}
          rotuloTipo={rotuloTipo}
          onConfirmar={(v) => onAdicionarConfirmado(tipo, v)}
          onCancelar={onFecharAdicao}
        />
      )}
    </section>
  )
}

// ——— Caixa de total ————————————————————————————————————————————————————————
function TotalBox({
  rotulo,
  centavos,
  destaque,
  negativo,
}: {
  rotulo: string
  centavos: number
  destaque?: boolean
  negativo?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2',
        destaque && 'bg-muted/50',
      )}
    >
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={cn('text-lg font-semibold tabular-nums', negativo && 'text-destructive')}>
        {formatarCentavos(centavos)}
      </p>
    </div>
  )
}

// re-export para uso do pai (nada aqui toca o banco diretamente)
export { pb as _pbNaoUsado }
