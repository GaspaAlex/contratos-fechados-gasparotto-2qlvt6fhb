/**
 * GESTÃO DA META MENSAL (Build F2-A) — formulário de uma competência.
 * ===================================================================
 * Usa o serviço do Build E1 (salvarMeta / getMetaPorCompetencia) e os
 * seletores de mês/ano JÁ EXISTENTES no card (recebidos via props — a
 * competência configurada é sempre a selecionada no rosto do card).
 * NUNCA cadastra meta automaticamente: mês sem meta = "Meta não definida".
 */
import { useEffect, useState } from 'react'
import { Loader2, Save, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getMetaPorCompetencia, salvarMeta, type ComissoesMeta } from '@/services/comissoesMetas'
import { rotuloCompetencia, MESES_NOMES } from './gestaoLabels'

interface Props {
  mes: number
  ano: number
  /** Recarrega as metas no painel pai após salvar (sem recarregar a página). */
  onMetaSalva: (meta: ComissoesMeta) => void
  onErro: (mensagem: string) => void
}

type EstadoMeta = 'carregando' | 'inexistente' | 'existente' | 'erro'

export function GestaoMetaForm({ mes, ano, onMetaSalva, onErro }: Props) {
  const [estado, setEstado] = useState<EstadoMeta>('carregando')
  const [metaAtual, setMetaAtual] = useState<number | ''>('')
  const [metaId, setMetaId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)

  const competencia = `${ano}-${String(mes).padStart(2, '0')}`

  // Carrega a meta da competência selecionada no card. Falha de API é ERRO
  // (nunca tratada como "sem meta").
  useEffect(() => {
    let cancelado = false
    setEstado('carregando')
    setErroCarregamento(null)
    getMetaPorCompetencia(mes, ano)
      .then((meta) => {
        if (cancelado) return
        if (meta) {
          setMetaId(meta.id)
          setMetaAtual(meta.meta)
          setEstado('existente')
        } else {
          setMetaId(null)
          setMetaAtual('')
          setEstado('inexistente')
        }
      })
      .catch((e) => {
        if (cancelado) return
        setEstado('erro')
        setErroCarregamento(e instanceof Error ? e.message : 'Falha ao consultar a meta.')
      })
    return () => {
      cancelado = true
    }
  }, [mes, ano])

  const salvar = async () => {
    if (salvando) return
    const valor = typeof metaAtual === 'number' ? metaAtual : Number(metaAtual)
    if (!Number.isFinite(valor) || valor < 0 || !Number.isInteger(valor)) {
      onErro('Informe um número inteiro de contratos (ex.: 50) ou limpe o campo.')
      return
    }
    setSalvando(true)
    try {
      const salva = await salvarMeta({ mes, ano, meta: valor })
      setMetaId(salva.id)
      setMetaAtual(salva.meta)
      setEstado('existente')
      onMetaSalva(salva)
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Erro inesperado ao salvar a meta.')
    } finally {
      setSalvando(false)
    }
  }

  const rotulo = rotuloCompetencia(competencia, true)

  return (
    <div className="rounded-md border border-[#E4E7EB] dark:border-border p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-[#C9922A]" />
        <h4 className="text-xs font-semibold text-[#252B34] dark:text-foreground">
          Meta mensal — {rotulo}
        </h4>
      </div>

      <p className="text-[11px] text-[#78818E] dark:text-muted-foreground">
        A competência configurada é <span className="font-semibold">{rotulo}</span> (selecionada no
        topo do card). Cada competência tem meta independente. Referência do escritório:{' '}
        <span className="font-semibold">50 contratos</span>. Mês sem meta cadastrada permanece “Meta
        não definida”.
      </p>

      {estado === 'carregando' && (
        <p className="flex items-center gap-2 text-xs text-[#78818E] dark:text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando meta da competência…
        </p>
      )}

      {estado === 'erro' && (
        <div
          role="status"
          className="rounded-md border border-[#C77E1E] bg-[#C77E1E]/10 px-2.5 py-2"
        >
          <p className="text-xs font-medium text-[#C77E1E]">
            Falha ao consultar a meta — não é possível afirmar se existe configuração.
          </p>
          <p className="mt-0.5 text-[11px] text-[#78818E] dark:text-muted-foreground">
            {erroCarregamento}
          </p>
        </div>
      )}

      {(estado === 'existente' || estado === 'inexistente') && (
        <div className="space-y-2">
          <div className="grid gap-1.5">
            <Label
              htmlFor="gestao-meta-valor"
              className="text-[11px] text-[#78818E] dark:text-muted-foreground"
            >
              Meta de contratos fechados — {rotulo}
            </Label>
            <Input
              id="gestao-meta-valor"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="Ex.: 50"
              value={metaAtual}
              onChange={(e) => setMetaAtual(e.target.value === '' ? '' : Number(e.target.value))}
              className="h-9 max-w-[180px] text-sm"
              disabled={salvando}
            />
            <p className="text-[11px] text-[#78818E] dark:text-muted-foreground">
              {estado === 'existente'
                ? `Meta atual: ${metaId ? metaAtual : metaAtual} contrato(s). Salvando atualiza esta competência somente.`
                : 'Nenhuma meta cadastrada para esta competência — situação atual: “Meta não definida”.'}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={salvar}
            disabled={salvando}
            className="h-8 gap-1.5"
          >
            {salvando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden />
            )}
            {salvando ? 'Salvando…' : 'Salvar meta'}
          </Button>
        </div>
      )}
    </div>
  )
}

/** Rótulo curto do mês para listagens (exportado para reuso). */
export const nomeMes = (idx: number) => MESES_NOMES[idx]
