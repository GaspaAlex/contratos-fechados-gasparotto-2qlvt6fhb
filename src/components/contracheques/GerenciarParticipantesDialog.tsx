/**
 * DIALOG — GERENCIAR PARTICIPANTES DO MÓDULO CONTRACHEQUES (Build C1-B)
 * ========================================================================
 * Mesmo padrão do "Gerenciar comissões" do card de Comissões. A lista
 * suspensa "Adicionar participante" e o botão "+ Adicionar" (C1-A) foram
 * REMOVIDOS; no lugar há um único botão "+ Cadastrar novo colaborador" que
 * abre formulário simples de NOME COMPLETO. Após salvar, o cadastro nasce
 * com vínculo ativo e aparece na listagem da aba.
 *
 * DEDUPE: antes de gravar, planejarCadastroColaborador (lib pura, testada em
 * CONTRACHEQUES_P) verifica homônimos (exato, sem acento/caixa/espaços) em
 * cc_participantes, cc_colaboradores e funcionarios (Cartão de Ponto) e
 * REUTILIZA a identidade existente em vez de criar duplicado — inclusive o
 * registro antigo duplicado da Nataly. Nomes muito próximos pedem
 * confirmação explícita ("Confirmar mesmo assim").
 *
 * Cadastro próprio NÃO cria usuário de acesso, NÃO cadastra salário e NÃO
 * exige participação no Cartão de Ponto (coleção cc_colaboradores, privada).
 * RETIRAR = desativação do vínculo (histórico salarial preservado).
 */
import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import {
  planejarCadastroColaborador,
  validarCadastroColaborador,
  type ColaboradorMini,
  type FuncionarioMini,
} from '@/lib/ccParticipantes'
import {
  desativarParticipante,
  getParticipantes,
  reativarParticipante,
  type ParticipanteRecord,
} from '@/services/ccParticipantes'
import {
  criarColaboradorCC,
  getColaboradoresCC,
  type ColaboradorRecord,
} from '@/services/ccColaboradores'
import { getFuncionariosCC } from '@/services/ccSalarios'

interface GerenciarParticipantesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Recarrega a listagem da aba quando a seleção muda. */
  onChanged: () => void
}

type Etapa = 'lista' | 'formulario'

export default function GerenciarParticipantesDialog({
  open,
  onOpenChange,
  onChanged,
}: GerenciarParticipantesDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()

  const [participantes, setParticipantes] = useState<ParticipanteRecord[]>([])
  const [colaboradores, setColaboradores] = useState<ColaboradorRecord[]>([])
  const [funcionarios, setFuncionarios] = useState<FuncionarioMini[]>([])
  const [carregando, setCarregando] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null) // id em operação

  const [etapa, setEtapa] = useState<Etapa>('lista')
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmadoAproximado, setConfirmadoAproximado] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [parts, cols, funcs] = await Promise.all([
        getParticipantes(),
        getColaboradoresCC(),
        getFuncionariosCC(),
      ])
      setParticipantes(parts)
      setColaboradores(cols)
      setFuncionarios(
        funcs.map((f) => ({ id: f.id, nome: f.nome, ativo: f.ativo, perfil: f.perfil })),
      )
    } catch (e) {
      console.error(e)
      toast({
        title: 'Falha ao carregar participantes',
        description: 'Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => {
    if (open) {
      setEtapa('lista')
      setNome('')
      setConfirmadoAproximado(false)
      void carregar()
    } else {
      setOcupado(null)
    }
  }, [open, carregar])

  /** Executa o plano de cadastro vindo da lib pura. */
  const executarCadastro = async (
    plano: ReturnType<typeof planejarCadastroColaborador>,
    nomeSalvo: string,
  ) => {
    const usuarioId = user?.id ?? ''
    if (plano.acao === 'reativar' && plano.vinculoId) {
      await reativarParticipante(plano.vinculoId)
      toast({
        title: 'Participante reativado',
        description: `${nomeSalvo} voltou a aparecer na aba Contracheques.`,
      })
    } else if (plano.acao === 'reusar_cadastro' && plano.colaboradorId) {
      await criarVinculo({ colaborador: plano.colaboradorId })
      toast({
        title: 'Participante adicionado',
        description: `${nomeSalvo} já tinha cadastro no módulo e voltou à listagem.`,
      })
    } else if (plano.acao === 'reusar_funcionario' && plano.funcionarioId) {
      await criarVinculo({ funcionario: plano.funcionarioId })
      toast({
        title: 'Participante adicionado',
        description: `${nomeSalvo} já é cadastrado(a) no Cartão de Ponto — o registro existente foi reutilizado (nada foi duplicado).`,
      })
    } else if (plano.acao === 'criar' || plano.acao === 'aviso_aproximado') {
      const novo = await criarColaboradorCC({ nome: nomeSalvo, criado_por: usuarioId })
      await criarVinculo({ colaborador: novo.id })
      toast({
        title: 'Colaborador cadastrado',
        description: `${nomeSalvo} agora aparece na aba Contracheques.`,
      })
    } else {
      throw new Error('Plano de cadastro inesperado.')
    }
  }

  /** Cria vínculo ativo em cc_participantes (funcionário OU colaborador). */
  const criarVinculo = async (alvo: { funcionario?: string; colaborador?: string }) => {
    await pb.collection('cc_participantes').create({
      funcionario: alvo.funcionario ?? '',
      colaborador: alvo.colaborador ?? '',
      ativo: true,
      observacao: '',
    })
  }

  const cadastrar = async (forcarAviso = false) => {
    const erroValidacao = validarNome(nome)
    if (erroValidacao) {
      toast({
        title: 'Não foi possível cadastrar',
        description: erroValidacao,
        variant: 'destructive',
      })
      return
    }
    const plano = planejarCadastroColaborador(
      nome.trim(),
      participantes,
      funcionarios,
      colaboradores,
    )
    if (plano.acao === 'existente_ativo') {
      toast({
        title: 'Já é participante',
        description: `${plano.nomeConflito} já está na listagem — nada foi duplicado.`,
      })
      return
    }
    if (plano.acao === 'aviso_aproximado' && !forcarAviso && !confirmadoAproximado) {
      setConfirmadoAproximado(true)
      return
    }
    setSalvando(true)
    try {
      await executarCadastro(plano, nome.trim())
      setNome('')
      setConfirmadoAproximado(false)
      setEtapa('lista')
      await carregar()
      onChanged()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar o cadastro.'
      toast({ title: 'Não foi possível cadastrar', description: msg, variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const desativar = async (p: ParticipanteRecord) => {
    setOcupado(p.id)
    try {
      await desativarParticipante(p.id)
      const nomeP = nomeDoParticipante(p)
      toast({
        title: 'Participante retirado',
        description: `${nomeP} saiu da listagem; o histórico salarial dele é preservado.`,
      })
      await carregar()
      onChanged()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao retirar o participante.'
      toast({ title: 'Não foi possível retirar', description: msg, variant: 'destructive' })
    } finally {
      setOcupado(null)
    }
  }

  const reativar = async (p: ParticipanteRecord) => {
    setOcupado(p.id)
    try {
      await reativarParticipante(p.id)
      const nomeP = nomeDoParticipante(p)
      toast({
        title: 'Participante reativado',
        description: `${nomeP} voltou a aparecer na aba Contracheques.`,
      })
      await carregar()
      onChanged()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao reativar o participante.'
      toast({ title: 'Não foi possível reativar', description: msg, variant: 'destructive' })
    } finally {
      setOcupado(null)
    }
  }

  const ativos = participantes.filter((p) => p.ativo)
  const inativos = participantes.filter((p) => !p.ativo)

  /** Nome para exibição, resolvendo funcionário OU colaborador. */
  const nomeDoParticipante = (p: ParticipanteRecord): string => {
    if (p.expand?.funcionario?.nome) return p.expand.funcionario.nome
    if (p.colaborador) {
      const c = colaboradores.find((x) => x.id === p.colaborador)
      if (c) return c.nome
    }
    return 'Participante'
  }

  /** Plano reavaliado a cada render do formulário (para o aviso). */
  const planoAtual =
    etapa === 'formulario' && nome.trim()
      ? planejarCadastroColaborador(nome, participantes, funcionarios, colaboradores)
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {etapa === 'lista' ? (
          <>
            <DialogHeader>
              <DialogTitle>Gerenciar participantes</DialogTitle>
              <DialogDescription>
                Define quem aparece no controle de Contracheques. Retirar alguém não apaga o
                histórico salarial dessa pessoa nem altera o Cartão de Ponto.
              </DialogDescription>
            </DialogHeader>

            {carregando ? (
              <div className="flex items-center gap-2 py-6 text-sm text-[#78818E] dark:text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando…
              </div>
            ) : (
              <div className="space-y-4">
                <Button size="sm" className="w-full" onClick={() => setEtapa('formulario')}>
                  <Plus className="h-4 w-4 mr-1" aria-hidden /> Cadastrar novo colaborador
                </Button>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#78818E] dark:text-muted-foreground">
                    Participantes ({ativos.length})
                  </span>
                  {ativos.length === 0 ? (
                    <p className="text-xs text-[#78818E] dark:text-muted-foreground">
                      Nenhum participante ativo.
                    </p>
                  ) : (
                    ativos.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded border px-2.5 py-1.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <UserPlus className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                          <span className="truncate text-sm">{nomeDoParticipante(p)}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
                          disabled={!!ocupado || salvando}
                          onClick={() => void desativar(p)}
                        >
                          {ocupado === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" aria-hidden />
                          )}
                          <span className="ml-1">Retirar</span>
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {inativos.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-[#78818E] dark:text-muted-foreground">
                      Retirados
                    </span>
                    {inativos.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded border border-dashed px-2.5 py-1.5 opacity-70"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <UserMinus className="h-3.5 w-3.5 shrink-0 text-[#78818E]" aria-hidden />
                          <span className="truncate text-sm">{nomeDoParticipante(p)}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-xs"
                          disabled={!!ocupado || salvando}
                          onClick={() => void reativar(p)}
                        >
                          {ocupado === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                          )}
                          <span className="ml-1">Reativar</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!ocupado}>
                <X className="h-4 w-4 mr-1" aria-hidden /> Fechar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cadastrar novo colaborador</DialogTitle>
              <DialogDescription>
                Informe o nome completo. O cadastro é do módulo Contracheques: não cria usuário de
                acesso ao site, não cadastra salário e não exige Cartão de Ponto. Duplicidades são
                detectadas e reutilizadas automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cc-novo-colaborador">Nome completo</Label>
                <Input
                  id="cc-novo-colaborador"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Maria de Souza Silva"
                  autoComplete="off"
                  disabled={salvando}
                  autoFocus
                />
                {planoAtual?.acao === 'invalido' && (
                  <p className="text-xs text-destructive">{planoAtual.nomeConflito}</p>
                )}
              </div>

              {planoAtual?.acao === 'existente_ativo' && (
                <div className="flex items-start gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  <span>
                    {planoAtual.nomeConflito} já é participante ativo do módulo — não será criado
                    registro duplicado.
                  </span>
                </div>
              )}

              {planoAtual?.acao === 'aviso_aproximado' && !confirmadoAproximado && (
                <div className="flex items-start gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  <span>
                    Existe um nome parecido já cadastrado:{' '}
                    <strong>{planoAtual.nomeConflito}</strong>. Salvar vai criar um registro NOVO —
                    confirme que realmente são pessoas diferentes.
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEtapa('lista')
                  setNome('')
                  setConfirmadoAproximado(false)
                }}
                disabled={salvando}
              >
                Voltar
              </Button>
              <Button onClick={() => void cadastrar(false)} disabled={salvando || !nome.trim()}>
                {salvando && <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden />} Salvar
                {planoAtual?.acao === 'aviso_aproximado' && !confirmadoAproximado
                  ? ' mesmo assim'
                  : ''}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Validação do formulário — função pura da lib (testada nos cenários). */
function validarNome(nome: string): string | null {
  return validarCadastroColaborador(nome)
}
