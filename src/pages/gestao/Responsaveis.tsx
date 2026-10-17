import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Power, UserCog, UserCheck, AlertCircle, Loader2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getResponsaveis, createResponsavel, updateResponsavel } from '@/services/responsaveis'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function Responsaveis() {
  const { user } = useAuth()
  const isGestor = user?.perfil === 'gestor'

  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [salvandoCriacao, setSalvandoCriacao] = useState(false)

  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [editNome, setEditNome] = useState('')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  const [toggleTarget, setToggleTarget] = useState<any | null>(null)
  const [salvandoStatus, setSalvandoStatus] = useState(false)

  const loadData = async () => {
    try {
      const data = await getResponsaveis()
      setResponsaveis(data)
    } catch {
      toast.error('Erro ao carregar responsáveis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isGestor) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [isGestor])

  useRealtime('responsaveis', () => {
    if (isGestor) {
      loadData()
    }
  })

  const { ativosCount, inativosCount } = useMemo(() => {
    let ativos = 0
    let inativos = 0
    responsaveis.forEach((r) => {
      if (r.ativo) {
        ativos += 1
      } else {
        inativos += 1
      }
    })
    return { ativosCount: ativos, inativosCount: inativos }
  }, [responsaveis])

  const handleCreate = async () => {
    const nome = novoNome.trim()
    if (!nome) {
      toast.error('Informe o nome do responsável')
      return
    }
    setSalvandoCriacao(true)
    try {
      await createResponsavel(nome)
      toast.success('Responsável criado com sucesso!')
      setNovoNome('')
      setIsCreateOpen(false)
      await loadData()
    } catch {
      toast.error('Erro ao criar responsável')
    } finally {
      setSalvandoCriacao(false)
    }
  }

  const handleEditSave = async () => {
    if (!editTarget) return
    const nome = editNome.trim()
    if (!nome) {
      toast.error('Informe o nome do responsável')
      return
    }
    setSalvandoEdicao(true)
    try {
      await updateResponsavel(editTarget.id, { nome })
      toast.success('Responsável atualizado com sucesso!')
      setEditTarget(null)
      setEditNome('')
      await loadData()
    } catch {
      toast.error('Erro ao atualizar responsável')
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!toggleTarget) return
    setSalvandoStatus(true)
    try {
      await updateResponsavel(toggleTarget.id, { ativo: !toggleTarget.ativo })
      toast.success('Status atualizado com sucesso!')
      setToggleTarget(null)
      await loadData()
    } catch {
      toast.error('Erro ao alterar status')
    } finally {
      setSalvandoStatus(false)
    }
  }

  if (!isGestor) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background p-4 md:p-8">
        <Card className="w-full max-w-sm rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#B4453C] bg-[#B4453C]/10 px-2 py-0.5 rounded">
              ACESSO RESTRITO
            </span>
            <h2 className="text-xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
              Acesso Restrito
            </h2>
            <p className="text-xs text-[#78818E] dark:text-muted-foreground leading-relaxed">
              O módulo de gerenciamento de responsáveis é restrito aos gestores do escritório.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* 1. CABEÇALHO CORPORATIVO PADRONIZADO (GRAFITE PREMIUM 2.1) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              GESTÃO DE PESSOAS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            Responsáveis
          </h1>
          <p className="text-sm text-[#78818E] dark:text-muted-foreground">
            Cadastro e gerenciamento dos responsáveis pelos casos do escritório.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <Button
            onClick={() => {
              setNovoNome('')
              setIsCreateOpen(true)
            }}
            className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white whitespace-nowrap rounded-md shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#C9922A]"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            <span>Novo Responsável</span>
          </Button>
        </div>
      </div>

      {/* 2. PAINEL CORPORATIVO EM LISTAGEM (rounded-[10px], bordas #E4E7EB, fundo branco) */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
        {/* Cabeçalho interno corporativo */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-[#E4E7EB]/80 dark:border-border/80 flex flex-wrap items-center justify-between gap-2 bg-[#F5F6F8]/60 dark:bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-[#FAF8F2] dark:bg-muted/40 flex items-center justify-center text-[#C9922A]">
              <UserCog className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-[#252B34] dark:text-foreground tracking-tight">
              Responsáveis Cadastrados
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#78818E] dark:text-muted-foreground font-medium">
            <span className="inline-flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#3E8E5A]" />
              <strong className="text-[#252B34] dark:text-foreground font-semibold">
                {ativosCount}
              </strong>{' '}
              {ativosCount === 1 ? 'ativo' : 'ativos'}
            </span>
            {inativosCount > 0 && (
              <>
                <span className="text-[#E4E7EB] dark:text-border">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#78818E]" />
                  <strong className="text-[#252B34] dark:text-foreground font-semibold">
                    {inativosCount}
                  </strong>{' '}
                  {inativosCount === 1 ? 'inativo' : 'inativos'}
                </span>
              </>
            )}
            <span className="text-[#E4E7EB] dark:text-border">•</span>
            <span>
              <strong className="text-[#252B34] dark:text-foreground font-semibold">
                {responsaveis.length}
              </strong>{' '}
              no total
            </span>
          </div>
        </div>

        {/* Conteúdo da Listagem */}
        <div>
          {loading ? (
            <div className="divide-y divide-[#E4E7EB]/80 dark:divide-border/80">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-muted/60" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-40 sm:w-56 bg-muted/60" />
                      <Skeleton className="h-3 w-16 bg-muted/40" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-20 rounded-md bg-muted/60" />
                    <Skeleton className="h-8 w-24 rounded-md bg-muted/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : responsaveis.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#FAF8F2] dark:bg-muted/40 flex items-center justify-center text-[#C9922A]">
                <UserCog className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#252B34] dark:text-foreground">
                Nenhum responsável cadastrado
              </h3>
              <p className="text-xs text-[#78818E] dark:text-muted-foreground max-w-sm mx-auto">
                Clique no botão &quot;Novo Responsável&quot; acima para cadastrar o primeiro
                responsável pelos casos do escritório.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E4E7EB]/80 dark:divide-border/80">
              {responsaveis.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6 hover:bg-[#FAF8F2]/40 dark:hover:bg-muted/10 transition-colors"
                >
                  {/* Identificação e Status */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border flex items-center justify-center text-[#C9922A] shrink-0 font-semibold text-xs uppercase">
                      {r.nome ? r.nome.trim().charAt(0) : '?'}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-[#252B34] dark:text-foreground truncate">
                        {r.nome}
                      </span>
                      {r.ativo ? (
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold border-emerald-200 bg-emerald-50 text-[#3E8E5A] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#3E8E5A]" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-1 text-[11px] font-medium border-[#E4E7EB] dark:border-border bg-[#F5F7FA] text-[#78818E] dark:bg-muted/50 dark:text-muted-foreground px-2.5 py-0.5 rounded-full"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#78818E]" />
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditTarget(r)
                        setEditNome(r.nome)
                      }}
                      className="h-8 px-3 text-xs font-medium border-[#E4E7EB] dark:border-border hover:border-[#C9922A]/50 text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
                      title="Editar nome do responsável"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setToggleTarget(r)}
                      className={
                        r.ativo
                          ? 'h-8 px-3 text-xs font-medium border-red-200 dark:border-red-900/60 text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors'
                          : 'h-8 px-3 text-xs font-medium border-emerald-200 dark:border-emerald-900/60 text-[#3E8E5A] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-colors'
                      }
                      title={r.ativo ? 'Desativar este responsável' : 'Ativar este responsável'}
                    >
                      <Power className="mr-1.5 h-3.5 w-3.5" />
                      {r.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. MODAL NOVO RESPONSÁVEL — Grafite Premium 2.1 */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setNovoNome('')
          }
        }}
      >
        <DialogContent className="rounded-[10px] sm:max-w-[440px] border border-[#E4E7EB] dark:border-border p-6 shadow-lg bg-white dark:bg-card">
          <DialogHeader className="space-y-1 border-b border-[#E4E7EB] dark:border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
                GESTÃO DE PESSOAS
              </span>
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
              Novo Responsável
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="novo-responsavel-nome"
                className="text-xs font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground"
              >
                Nome do Responsável <span className="text-red-500">*</span>
              </Label>
              <Input
                id="novo-responsavel-nome"
                autoFocus
                placeholder="Ex: Dra. Mariana Costa"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
                disabled={salvandoCriacao}
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
              <p className="text-[11px] text-[#78818E] dark:text-muted-foreground">
                O responsável estará ativo por padrão e disponível para seleção em casos e
                contratos.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4 border-t border-[#E4E7EB] dark:border-border pt-3 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={salvandoCriacao}
              onClick={() => {
                setIsCreateOpen(false)
                setNovoNome('')
              }}
              className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md transition-colors"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={salvandoCriacao}
              onClick={handleCreate}
              className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white rounded-md shadow-sm transition-colors"
            >
              {salvandoCriacao && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL EDITAR RESPONSÁVEL — Grafite Premium 2.1 */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null)
            setEditNome('')
          }
        }}
      >
        <DialogContent className="rounded-[10px] sm:max-w-[440px] border border-[#E4E7EB] dark:border-border p-6 shadow-lg bg-white dark:bg-card">
          <DialogHeader className="space-y-1 border-b border-[#E4E7EB] dark:border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
                GESTÃO DE PESSOAS
              </span>
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
              Editar Responsável
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-responsavel-nome"
                className="text-xs font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground"
              >
                Nome do Responsável <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-responsavel-nome"
                autoFocus
                placeholder="Nome do responsável"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSave()
                }}
                disabled={salvandoEdicao}
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
              <p className="text-[11px] text-[#78818E] dark:text-muted-foreground">
                A alteração do nome é refletida nos novos seletores preservando o histórico.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4 border-t border-[#E4E7EB] dark:border-border pt-3 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={salvandoEdicao}
              onClick={() => {
                setEditTarget(null)
                setEditNome('')
              }}
              className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md transition-colors"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={salvandoEdicao}
              onClick={handleEditSave}
              className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white rounded-md shadow-sm transition-colors"
            >
              {salvandoEdicao && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. DIÁLOGO DE CONFIRMAÇÃO ATIVAR/DESATIVAR — Grafite Premium 2.1 */}
      <AlertDialog
        open={!!toggleTarget}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null)
        }}
      >
        <AlertDialogContent className="rounded-[10px] sm:max-w-[450px] border border-[#E4E7EB] dark:border-border p-6 shadow-lg bg-white dark:bg-card">
          <AlertDialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  toggleTarget?.ativo
                    ? 'bg-red-100 dark:bg-red-950/40 text-[#B4453C]'
                    : 'bg-emerald-100 dark:bg-emerald-950/40 text-[#3E8E5A]'
                }`}
              >
                {toggleTarget?.ativo ? (
                  <Power className="h-4 w-4" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
              </div>
              <div>
                <span
                  className={`text-[10px] font-bold tracking-[1.5px] uppercase block ${
                    toggleTarget?.ativo ? 'text-[#B4453C]' : 'text-[#3E8E5A]'
                  }`}
                >
                  {toggleTarget?.ativo ? 'DESATIVAÇÃO DE RESPONSÁVEL' : 'ATIVAÇÃO DE RESPONSÁVEL'}
                </span>
                <AlertDialogTitle className="text-lg font-bold text-[#252B34] dark:text-foreground">
                  {toggleTarget?.ativo ? 'Desativar' : 'Ativar'} Responsável
                </AlertDialogTitle>
              </div>
            </div>

            <AlertDialogDescription className="pt-2 text-sm text-[#78818E] dark:text-muted-foreground leading-relaxed">
              Deseja realmente {toggleTarget?.ativo ? 'desativar' : 'ativar'} o responsável{' '}
              <strong className="text-[#252B34] dark:text-foreground font-semibold">
                {toggleTarget?.nome}
              </strong>
              ?
              {toggleTarget?.ativo
                ? ' Ao desativar, ele deixará de ser exibido nos seletores de novos cadastros, sem afetar os casos já vinculados.'
                : ' Ao ativar, ele voltará a estar disponível nos seletores de novos registros.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-5 flex gap-2 sm:justify-end">
            <AlertDialogCancel
              disabled={salvandoStatus}
              className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md transition-colors"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={salvandoStatus}
              onClick={handleToggleStatus}
              className={
                toggleTarget?.ativo
                  ? 'h-9 px-4 text-xs font-semibold bg-[#B4453C] hover:bg-[#963730] text-white rounded-md shadow-sm transition-colors'
                  : 'h-9 px-4 text-xs font-semibold bg-[#3E8E5A] hover:bg-[#327349] text-white rounded-md shadow-sm transition-colors'
              }
            >
              {salvandoStatus && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Sim, {toggleTarget?.ativo ? 'Desativar' : 'Ativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  )
}
