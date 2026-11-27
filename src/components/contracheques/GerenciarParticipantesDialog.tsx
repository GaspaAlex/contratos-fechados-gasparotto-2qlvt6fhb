/**
 * DIALOG — GERENCIAR PARTICIPANTES DO MÓDULO CONTRACHEQUES (Build C1-A)
 * ========================================================================
 * Área discreta (mesmo padrão do "Gerenciar comissões" do card de Comissões):
 * adiciona e RETIRA funcionários da listagem da aba Contracheques.
 *
 * RETIRAR = desativação do vínculo (ativo=false) — o histórico salarial
 * eventual em cc_salarios é PRESERVADO e o funcionário segue cadastrado no
 * Cartão de Ponto (collection funcionarios intocada).
 *
 * Regras de segurança ficam no backend: só o usuário autorizado consegue
 * gravar (cc_participantes tem as mesmas 5 regras exclusivas de cc_salarios).
 */
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, RotateCcw, UserMinus, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  adicionarParticipante,
  desativarParticipante,
  getFuncionariosDisponiveis,
  getParticipantes,
  reativarParticipante,
  type ParticipanteRecord,
} from '@/services/ccParticipantes'
import type { FuncionarioCC } from '@/services/ccSalarios'

interface GerenciarParticipantesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Recarrega a listagem da aba quando a seleção muda. */
  onChanged: () => void
}

export default function GerenciarParticipantesDialog({
  open,
  onOpenChange,
  onChanged,
}: GerenciarParticipantesDialogProps) {
  const { toast } = useToast()
  const [participantes, setParticipantes] = useState<ParticipanteRecord[]>([])
  const [disponiveis, setDisponiveis] = useState<FuncionarioCC[]>([])
  const [carregando, setCarregando] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null) // id em operação
  const [novoFuncionarioId, setNovoFuncionarioId] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const parts = await getParticipantes()
      setParticipantes(parts)
      setDisponiveis(await getFuncionariosDisponiveis(parts))
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
    if (open) void carregar()
    else {
      setNovoFuncionarioId('')
      setOcupado(null)
    }
  }, [open, carregar])

  const adicionar = async () => {
    if (!novoFuncionarioId) {
      toast({
        title: 'Selecione um funcionário',
        description: 'Escolha quem passa a participar do controle de Contracheques.',
        variant: 'destructive',
      })
      return
    }
    const f = disponiveis.find((d) => d.id === novoFuncionarioId)
    setOcupado(novoFuncionarioId)
    try {
      await adicionarParticipante(novoFuncionarioId)
      toast({
        title: 'Participante adicionado',
        description: `${f?.nome ?? 'Funcionário'} agora aparece na aba Contracheques.`,
      })
      setNovoFuncionarioId('')
      await carregar()
      onChanged()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao adicionar o participante.'
      toast({ title: 'Não foi possível adicionar', description: msg, variant: 'destructive' })
    } finally {
      setOcupado(null)
    }
  }

  const desativar = async (p: ParticipanteRecord) => {
    setOcupado(p.id)
    try {
      await desativarParticipante(p.id)
      const nome = p.expand?.funcionario?.nome ?? 'Participante'
      toast({
        title: 'Participante retirado',
        description: `${nome} saiu da listagem; o histórico salarial dele é preservado e o cadastro no Cartão de Ponto permanece intacto.`,
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
      const nome = p.expand?.funcionario?.nome ?? 'Participante'
      toast({
        title: 'Participante reativado',
        description: `${nome} voltou a aparecer na aba Contracheques.`,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar participantes</DialogTitle>
          <DialogDescription>
            Define quem aparece no controle de Contracheques. O cadastro do Cartão de Ponto não é
            alterado e retirar alguém não apaga o histórico salarial dessa pessoa.
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <div className="flex items-center gap-2 py-6 text-sm text-[#78818E] dark:text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Adicionar novo participante */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#78818E] dark:text-muted-foreground">
                Adicionar participante
              </span>
              <div className="flex gap-2">
                <select
                  aria-label="Funcionário para adicionar"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={novoFuncionarioId}
                  onChange={(e) => setNovoFuncionarioId(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {disponiveis.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={() => void adicionar()}
                  disabled={!novoFuncionarioId || !!ocupado}
                >
                  {ocupado === novoFuncionarioId ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden />
                  )}
                  <span className="ml-1">Adicionar</span>
                </Button>
              </div>
            </div>

            {/* Participantes ativos */}
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
                      <span className="truncate text-sm">{p.expand?.funcionario?.nome}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
                      disabled={!!ocupado}
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

            {/* Participantes retirados (reativar sem duplicar) */}
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
                      <span className="truncate text-sm">{p.expand?.funcionario?.nome}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-xs"
                      disabled={!!ocupado}
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
        <p className={cn('text-[11px] text-[#78818E] dark:text-muted-foreground')}>
          As alterações valem só para a listagem da aba Contracheques — nada muda no Cartão de
          Ponto.
        </p>
      </DialogContent>
    </Dialog>
  )
}
