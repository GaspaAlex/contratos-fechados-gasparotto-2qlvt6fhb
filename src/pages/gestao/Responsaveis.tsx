import { useState, useEffect } from 'react'
import { Plus, Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { getResponsaveis, createResponsavel, updateResponsavel } from '@/services/responsaveis'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [editNome, setEditNome] = useState('')

  const [toggleTarget, setToggleTarget] = useState<any | null>(null)

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

  const handleCreate = async () => {
    const nome = novoNome.trim()
    if (!nome) {
      toast.error('Informe o nome do responsável')
      return
    }
    try {
      await createResponsavel(nome)
      toast.success('Responsável criado com sucesso!')
      setNovoNome('')
      setIsCreateOpen(false)
      await loadData()
    } catch {
      toast.error('Erro ao criar responsável')
    }
  }

  const handleEditSave = async () => {
    if (!editTarget) return
    const nome = editNome.trim()
    if (!nome) {
      toast.error('Informe o nome do responsável')
      return
    }
    try {
      await updateResponsavel(editTarget.id, { nome })
      toast.success('Responsável atualizado com sucesso!')
      setEditTarget(null)
      setEditNome('')
      await loadData()
    } catch {
      toast.error('Erro ao atualizar responsável')
    }
  }

  const handleToggleStatus = async () => {
    if (!toggleTarget) return
    try {
      await updateResponsavel(toggleTarget.id, { ativo: !toggleTarget.ativo })
      toast.success('Status atualizado com sucesso!')
      setToggleTarget(null)
      await loadData()
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  if (!isGestor) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background p-4 md:p-8">
        <Card className="w-full max-w-sm border-0 bg-card shadow-xl">
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Acesso restrito</h2>
            <p className="text-sm text-muted-foreground">Acesso restrito a gestores.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-background p-6 md:p-8 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Responsáveis</h2>
          <Button
            onClick={() => {
              setNovoNome('')
              setIsCreateOpen(true)
            }}
            className="bg-[#C8922A] text-white hover:bg-[#b07d20] shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Responsável
          </Button>
        </div>

        <Card className="border-border/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <Skeleton className="h-6 w-48 bg-muted/50" />
                  <Skeleton className="h-6 w-24 bg-muted/50" />
                </div>
              ))}
            </div>
          ) : responsaveis.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum responsável cadastrado.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {responsaveis.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{r.nome}</span>
                    <Badge
                      className={
                        r.ativo
                          ? 'bg-green-100 text-green-700 hover:bg-green-100 border border-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-100 border border-gray-200'
                      }
                    >
                      {r.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditTarget(r)
                        setEditNome(r.nome)
                      }}
                      className="border-[#C8922A]/40 text-[#C8922A] hover:bg-[#C8922A]/10"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setToggleTarget(r)}
                      className={
                        r.ativo
                          ? 'border-red-300 text-red-600 hover:bg-red-50'
                          : 'border-green-300 text-green-600 hover:bg-green-50'
                      }
                    >
                      <Power className="mr-1 h-3.5 w-3.5" />
                      {r.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Dialog: Novo Responsável */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && setIsCreateOpen(false)}>
        <DialogContent className="sm:max-w-[425px] bg-[#FAF8F2] font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#C8922A]">Novo Responsável</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Input
              autoFocus
              placeholder="Nome do responsável"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
              className="bg-white focus-visible:ring-[#C8922A]"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              className="bg-[#C8922A] hover:bg-[#b07d20] text-white font-bold"
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Responsável */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null)
            setEditNome('')
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] bg-[#FAF8F2] font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#C8922A]">
              Editar Responsável
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Input
              autoFocus
              placeholder="Nome do responsável"
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditSave()
              }}
              className="bg-white focus-visible:ring-[#C8922A]"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditTarget(null)
                setEditNome('')
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleEditSave}
              className="bg-[#C8922A] hover:bg-[#b07d20] text-white font-bold"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: Ativar/Desativar */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.ativo ? 'Desativar' : 'Ativar'} Responsável
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente {toggleTarget?.ativo ? 'desativar' : 'ativar'} o responsável{' '}
              <span className="font-semibold text-gray-900">{toggleTarget?.nome}</span>?
              {toggleTarget?.ativo && ' Ele deixará de aparecer nos seletores de novos registros.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              className={
                toggleTarget?.ativo
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
            >
              Sim, {toggleTarget?.ativo ? 'Desativar' : 'Ativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
