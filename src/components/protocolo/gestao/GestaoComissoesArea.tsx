/**
 * ÁREA DE GESTÃO DE COMISSÕES (Build F2-A)
 * ========================================
 * Área administrativa EXCLUSIVA do perfil gestor, renderizada no DETALHAMENTO
 * do card de Comissões (dialog). Preserva integralmente o rosto do card e a
 * apuração atual — nada aqui alimenta o cálculo exibido (isso é o F2-B).
 *
 * Responsabilidades: cadastrar colaboradores e regras (sem exclusão física),
 * histórico de vigências, encerramento de vigência, ativar/desativar, meta
 * mensal por competência e botão idempotente "Cadastrar equipe padrão".
 * Estados de carregamento/inexistência/erro são DISTINTOS: falha de API nunca
 * vira lista vazia.
 */
import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck, Users } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import {
  criarColaboradorComissionado,
  criarRegraComissao,
  encerrarVigenciaRegra,
  getColaboradoresComissionados,
  getRegrasComissao,
  setColaboradorAtivo,
  type ColaboradorComissionadoRecord,
  type RegraComissaoRecord,
} from '@/services/comissoesColaboradores'
import type { ComissoesMeta } from '@/services/comissoesMetas'
import { MODALIDADE_OPTIONS, MESES_NOMES, rotuloCompetencia } from './gestaoLabels'
import { GestaoMetaForm } from './GestaoMetaForm'
import { GestaoColaboradorItem, GestaoNovaRegraForm } from './GestaoColaboradorItem'
import { GestaoEquipePadraoDialog } from './GestaoEquipePadraoDialog'
import {
  planejarEquipePadrao,
  VIGENCIA_INICIO_PADRAO,
  type PlanoEquipePadrao,
} from '@/lib/equipePadrao'
import { competenciaAtualPadrao } from '@/lib/comissoesColaboradores'

interface Props {
  mes: number
  ano: number
  /** Competência exibida no rosto do card (AAAA-MM) — meta e regras vigentes. */
  competenciaAtual: string
  /** Opcional: notifica o card (pai) que a meta de uma competência foi salva. */
  onMetaSalvaNoRosto?: (meta: ComissoesMeta) => void
}

type EstadoCarga = 'carregando' | 'pronto' | 'erro'

const ANOS = [2026, 2027, 2028]

export function GestaoComissoesArea({ mes, ano, competenciaAtual, onMetaSalvaNoRosto }: Props) {
  const { toast } = useToast()
  const [estado, setEstado] = useState<EstadoCarga>('carregando')
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [colaboradores, setColaboradores] = useState<ColaboradorComissionadoRecord[]>([])
  const [regras, setRegras] = useState<RegraComissaoRecord[]>([])
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)
  const [regraAbertaPara, setRegraAbertaPara] = useState<string | null>(null)
  const [dialogEquipe, setDialogEquipe] = useState(false)
  const [salvandoEquipe, setSalvandoEquipe] = useState(false)

  // ---- Carregamento (id empotente e reexecutável após qualquer gravação) ----
  const carregar = useCallback(async () => {
    setEstado((atual) => (atual === 'pronto' ? 'pronto' : 'carregando'))
    try {
      const [cols, rgs] = await Promise.all([getColaboradoresComissionados(), getRegrasComissao()])
      setColaboradores(cols)
      setRegras(rgs)
      setMensagemErro(null)
      setEstado('pronto')
    } catch (e) {
      setEstado('erro')
      setMensagemErro(e instanceof Error ? e.message : 'Falha ao consultar a configuração.')
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // ---- Novo colaborador ----------------------------------------------------
  const [novoNome, setNovoNome] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [novoModalidade, setNovoModalidade] = useState<'fixa' | 'condicionada_meta'>('fixa')
  const [novoCompetencia, setNovoCompetencia] = useState(VIGENCIA_INICIO_PADRAO)
  const [salvandoNovo, setSalvandoNovo] = useState(false)

  const gravarNovoColaborador = async () => {
    if (salvandoNovo) return
    const nome = novoNome.trim()
    const valor = Number(novoValor.replace(',', '.'))
    if (nome.length < 2) {
      toast({
        title: 'Nome inválido',
        description: 'Informe o nome do colaborador (mínimo 2 letras).',
        variant: 'destructive',
      })
      return
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe o valor por caso (ex.: 20,00).',
        variant: 'destructive',
      })
      return
    }
    setSalvandoNovo(true)
    try {
      const criado = await criarColaboradorComissionado({ nome })
      await criarRegraComissao({
        colaborador: criado.id,
        valor,
        modalidade: novoModalidade,
        vigencia_inicio: novoCompetencia,
      })
      toast({ title: `Colaborador ${nome} cadastrado com a regra inicial.` })
      setNovoNome('')
      setNovoValor('')
      setNovoModalidade('fixa')
      setNovoCompetencia(VIGENCIA_INICIO_PADRAO)
      setNovoAberto(false)
      await carregar()
    } catch (e) {
      toast({
        title: 'Erro ao cadastrar o colaborador',
        description: e instanceof Error ? e.message : 'Erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNovo(false)
    }
  }

  // ---- Nova regra para colaborador existente -------------------------------
  const gravarNovaRegra = async (
    colaborador: ColaboradorComissionadoRecord,
    dados: { valor: number; modalidade: 'fixa' | 'condicionada_meta'; competencia: string },
  ) => {
    setSalvandoId(colaborador.id)
    try {
      await criarRegraComissao({
        colaborador: colaborador.id,
        valor: dados.valor,
        modalidade: dados.modalidade,
        vigencia_inicio: dados.competencia,
      })
      toast({
        title: `Nova regra gravada para ${colaborador.nome} a partir de ${rotuloCompetencia(dados.competencia)}.`,
      })
      setRegraAbertaPara(null)
      await carregar()
    } catch (e) {
      toast({
        title: 'Erro ao gravar a regra',
        description: e instanceof Error ? e.message : 'Erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoId(null)
    }
  }

  // ---- Encerrar vigência ----------------------------------------------------
  const encerrarVigencia = async (regra: RegraComissaoRecord) => {
    const competenciaAgora = competenciaAtualPadrao()
    // Encerra na competência corrente (inclusiva); se a regra começa no futuro,
    // o encerramento fecha na própria competência de início.
    const fim = regra.vigencia_inicio > competenciaAgora ? regra.vigencia_inicio : competenciaAgora
    setSalvandoId(regra.colaborador)
    try {
      await encerrarVigenciaRegra(regra.id, fim)
      toast({
        title: `Vigência encerrada em ${rotuloCompetencia(fim)} — histórico preservado.`,
      })
      await carregar()
    } catch (e) {
      toast({
        title: 'Erro ao encerrar a vigência',
        description: e instanceof Error ? e.message : 'Erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoId(null)
    }
  }

  // ---- Ativar/desativar ----------------------------------------------------
  const alternarAtivo = async (colaborador: ColaboradorComissionadoRecord) => {
    setSalvandoId(colaborador.id)
    try {
      await setColaboradorAtivo(colaborador.id, !colaborador.ativo)
      toast({
        title: colaborador.ativo
          ? `${colaborador.nome} desativado — histórico e regras preservados.`
          : `${colaborador.nome} reativado.`,
      })
      await carregar()
    } catch (e) {
      toast({
        title: 'Erro ao alterar o status',
        description: e instanceof Error ? e.message : 'Erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoId(null)
    }
  }

  // ---- Equipe padrão (idempotente) ------------------------------------------
  const confirmarEquipePadrao = async (plano: PlanoEquipePadrao) => {
    if (salvandoEquipe) return
    if (!plano.podeGravarDireto) {
      toast({
        title: 'Existem conflitos a decidir',
        description:
          'Ajuste as regras conflitantes manualmente antes de cadastrar a equipe padrão — nada foi sobrescrito.',
        variant: 'destructive',
      })
      return
    }
    setSalvandoEquipe(true)
    try {
      let criados = 0
      let regrasCriadas = 0
      // Verificação PRÉVIA no momento da gravação (relê o banco): mesmo que os
      // dados mudaram desde a abertura do diálogo, nada é duplicado.
      const [cols, rgs] = await Promise.all([getColaboradoresComissionados(), getRegrasComissao()])
      const planoAtual = planejarEquipePadrao({
        colaboradores: cols,
        regras: rgs,
        vigenciaInicio: VIGENCIA_INICIO_PADRAO,
      })
      if (!planoAtual.podeGravarDireto) {
        toast({
          title: 'Conflito detectado na confirmação',
          description: planoAtual.resumo,
          variant: 'destructive',
        })
        return
      }
      for (const item of planoAtual.itens) {
        if (item.acao !== 'criar') continue
        const criado = await criarColaboradorComissionado({ nome: item.def.nome })
        await criarRegraComissao({
          colaborador: criado.id,
          valor: item.def.valor,
          modalidade: item.def.modalidade,
          vigencia_inicio: planoAtual.competencias,
        })
        criados++
      }
      // Colaborador já existia e faltava apenas a regra padrão.
      for (const item of planoAtual.itens) {
        if (item.acao !== 'ignorar' || item.regraJaExiste) continue
        const col = cols.find(
          (c) => c.nome.trim().toLowerCase() === item.def.nome.trim().toLowerCase(),
        )
        if (!col) continue
        const jaTem = rgs.some(
          (r) => r.colaborador === col.id && r.vigencia_inicio === planoAtual.competencias,
        )
        if (jaTem) continue
        await criarRegraComissao({
          colaborador: col.id,
          valor: item.def.valor,
          modalidade: item.def.modalidade,
          vigencia_inicio: planoAtual.competencias,
        })
        regrasCriadas++
      }
      toast({
        title: 'Equipe padrão cadastrada',
        description: `${criados} colaborador(es) e ${regrasCriadas} regra(s) gravada(s). Executar novamente não duplica nada.`,
      })
      setDialogEquipe(false)
      await carregar()
    } catch (e) {
      // Falha parcial: retomar é seguro (verificação prévia relê o estado real).
      toast({
        title: 'Falha no cadastro da equipe padrão',
        description:
          (e instanceof Error ? e.message : 'Erro inesperado.') +
          ' Reabra o diálogo e confirme novamente — os itens já gravados não serão duplicados.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoEquipe(false)
    }
  }

  return (
    <div className="mt-4 border-t border-[#2E3440] pt-4">
      {/* Cabeçalho */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#D9A94A]" aria-hidden />
        <h3 className="text-sm font-semibold text-[#D9A94A]">Área de Gestão de Comissões</h3>
        <span className="text-[11px] text-[#7C8596]">Exclusiva do perfil gestor</span>
      </div>

      {/* EQUIPE PADRÃO */}
      <div className="mb-4 rounded-md border border-[#2E3440] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-white">Equipe padrão</p>
            <p className="text-[11px] text-[#7C8596]">
              Bia, Nayara, Kaique e Nataly — cadastro idempotente, nunca sobrescreve valores
              divergentes.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setDialogEquipe(true)}
            disabled={salvandoEquipe}
            className="gap-1.5"
          >
            {salvandoEquipe ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Users className="h-3.5 w-3.5" aria-hidden />
            )}
            Cadastrar equipe padrão
          </Button>
        </div>
      </div>

      {/* META */}
      <div className="mb-4">
        <GestaoMetaForm
          mes={mes}
          ano={ano}
          onMetaSalva={onMetaSalvaNoRosto}
          onErro={(mensagem) =>
            toast({ title: 'Erro na meta', description: mensagem, variant: 'destructive' })
          }
        />
      </div>

      {/* COLABORADORES */}
      <div className="rounded-md border border-[#2E3440] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-white">Colaboradores comissionados</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-[#2E3440] text-[11px] text-[#D9A94A] hover:bg-[#2B303C] hover:text-[#D9A94A]"
            onClick={() => setNovoAberto((v) => !v)}
            aria-expanded={novoAberto}
          >
            Adicionar colaborador
          </Button>
        </div>

        {novoAberto && (
          <div className="mb-3 rounded-md border border-[#C9922A]/50 bg-[#D9A94A]/5 p-3 space-y-2.5">
            <p className="text-xs font-semibold text-white">Novo colaborador</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="gestao-novo-nome" className="text-[11px] text-[#9EA7B6]">
                  Nome
                </Label>
                <Input
                  id="gestao-novo-nome"
                  value={novoNome}
                  autoComplete="off"
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="h-8 text-sm"
                  disabled={salvandoNovo}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="gestao-novo-valor" className="text-[11px] text-[#9EA7B6]">
                  Valor por caso (R$)
                </Label>
                <Input
                  id="gestao-novo-valor"
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step={0.01}
                  value={novoValor}
                  autoComplete="off"
                  onChange={(e) => setNovoValor(e.target.value)}
                  className="h-8 text-sm"
                  disabled={salvandoNovo}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="gestao-novo-mod" className="text-[11px] text-[#9EA7B6]">
                  Modalidade
                </Label>
                <Select
                  value={novoModalidade}
                  onValueChange={(v) => setNovoModalidade(v as 'fixa' | 'condicionada_meta')}
                >
                  <SelectTrigger
                    id="gestao-novo-mod"
                    className="h-8 text-sm"
                    disabled={salvandoNovo}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALIDADE_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="gestao-novo-comp" className="text-[11px] text-[#9EA7B6]">
                  Competência inicial
                </Label>
                <div className="flex gap-1.5">
                  <Select
                    value={novoCompetencia.split('-')[1]}
                    onValueChange={(v) =>
                      setNovoCompetencia(`${novoCompetencia.split('-')[0]}-${v}`)
                    }
                  >
                    <SelectTrigger
                      id="gestao-novo-comp"
                      className="h-8 text-sm"
                      disabled={salvandoNovo}
                      aria-label="Mês da competência inicial"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES_NOMES.map((nome, idx) => (
                        <SelectItem key={idx} value={String(idx + 1).padStart(2, '0')}>
                          {nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={novoCompetencia.split('-')[0]}
                    onValueChange={(v) =>
                      setNovoCompetencia(`${v}-${novoCompetencia.split('-')[1]}`)
                    }
                  >
                    <SelectTrigger
                      className="h-8 w-[90px] text-sm"
                      disabled={salvandoNovo}
                      aria-label="Ano da competência inicial"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANOS.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={gravarNovoColaborador}
                disabled={salvandoNovo || novoNome.trim().length < 2 || !novoValor}
              >
                {salvandoNovo && <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />}
                {salvandoNovo ? 'Salvando…' : 'Gravar colaborador'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-[#9EA7B6]"
                onClick={() => setNovoAberto(false)}
                disabled={salvandoNovo}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Estados distintos: carregando / erro / lista */}
        {estado === 'carregando' && (
          <p className="flex items-center gap-2 py-2 text-xs text-[#9EA7B6]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Carregando colaboradores…
          </p>
        )}
        {estado === 'erro' && (
          <div
            role="status"
            className="rounded-md border border-[#C77E1E] bg-[#C77E1E]/10 px-2.5 py-2"
          >
            <p className="text-xs font-medium text-[#C77E1E]">
              Falha ao consultar a configuração — não é possível afirmar se existem colaboradores
              cadastrados.
            </p>
            <p className="mt-0.5 text-[11px] text-[#9EA7B6]">{mensagemErro}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 h-7 border-[#C77E1E] text-[11px] text-[#C77E1E]"
              onClick={carregar}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {estado === 'pronto' && colaboradores.length === 0 && (
          <p className="py-2 text-xs text-[#9EA7B6]">
            Nenhum colaborador cadastrado — use “Cadastrar equipe padrão” ou adicione manualmente.
          </p>
        )}
        {estado === 'pronto' && colaboradores.length > 0 && (
          <ul className="space-y-1.5">
            {colaboradores.map((colaborador) => (
              <li key={colaborador.id}>
                <GestaoColaboradorItem
                  colaborador={colaborador}
                  regras={regras.filter((r) => r.colaborador === colaborador.id)}
                  competenciaAtual={competenciaAtual}
                  salvandoId={salvandoId}
                  onAdicionarRegra={(c) =>
                    setRegraAbertaPara(regraAbertaPara === c.id ? null : c.id)
                  }
                  onEncerrarVigencia={encerrarVigencia}
                  onAlternarAtivo={alternarAtivo}
                />
                {regraAbertaPara === colaborador.id && (
                  <div className="mt-1.5">
                    <GestaoNovaRegraForm
                      colaborador={colaborador}
                      salvando={salvandoId === colaborador.id}
                      onGravar={(dados) => gravarNovaRegra(colaborador, dados)}
                      onCancelar={() => setRegraAbertaPara(null)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <GestaoEquipePadraoDialog
        open={dialogEquipe}
        onOpenChange={setDialogEquipe}
        colaboradores={colaboradores}
        regras={regras}
        salvando={salvandoEquipe}
        onConfirmar={confirmarEquipePadrao}
      />
    </div>
  )
}
