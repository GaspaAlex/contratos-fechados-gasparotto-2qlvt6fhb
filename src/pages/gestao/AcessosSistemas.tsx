import { useEffect, useState } from 'react'
import { Copy, Eye, EyeOff, KeyRound, Lock, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { getGrupos, deleteGrupo } from '@/services/acessos'
import { AcessoModal } from '@/components/gestao/AcessoModal'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

export default function AcessosSistemas() {
  const { user } = useAuth()
  const isGestor = user?.perfil === 'gestor'

  const [grupos, setGrupos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [grupoEditando, setGrupoEditando] = useState<any | null>(null)

  const loadGrupos = async () => {
    try {
      const data = await getGrupos()
      setGrupos(data)
    } catch {
      toast.error('Erro ao carregar acessos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGrupos()
  }, [])

  const togglePassword = (key: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleCopy = async (valor: string) => {
    try {
      await navigator.clipboard.writeText(valor)
      toast.success('Valor copiado!')
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteGrupo(deleteTarget)
      toast.success('Grupo excluído com sucesso!')
      setDialogOpen(false)
      setDeleteTarget(null)
      await loadGrupos()
    } catch {
      toast.error('Erro ao excluir grupo')
    }
  }

  const maskValue = (valor: string) => {
    if (!valor) return ''
    return '•'.repeat(valor.length)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Acesso Sistemas</h2>
        {isGestor && (
          <Button
            onClick={() => {
              setGrupoEditando(null)
              setModalOpen(true)
            }}
            className="bg-[#C8922A] text-white hover:bg-[#b07d20] shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Acesso
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Carregando acessos...</p>
        </div>
      ) : grupos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Lock className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Nenhum acesso cadastrado</h3>
          <p className="text-sm text-muted-foreground">Os acessos cadastrados aparecerão aqui.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {grupos.map((grupo) => {
            const blocos = [...(grupo.expand?.acessos_blocos_via_grupo ?? [])].sort((a, b) => {
              const ra = a.rotulo?.trim()
              const rb = b.rotulo?.trim()
              if (!ra && !rb) return 0
              if (!ra) return 1
              if (!rb) return -1
              return ra.localeCompare(rb, 'pt-BR', { sensitivity: 'base' })
            })
            return (
              <Card key={grupo.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <CardTitle className="text-xl font-bold text-foreground">
                    {grupo.titulo}
                  </CardTitle>
                  {isGestor && (
                    <div className="flex flex-wrap items-center gap-2">
                      {grupo.nivel_acesso === 'todos' ? (
                        <Badge variant="secondary">Todos os colaboradores</Badge>
                      ) : grupo.nivel_acesso === 'gestores' ? (
                        <Badge variant="secondary">Somente gestores</Badge>
                      ) : grupo.nivel_acesso === 'restrito' ? (
                        <Badge className="bg-amber-700 text-white hover:bg-amber-700">
                          Restrito
                        </Badge>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setGrupoEditando(grupo)
                          setModalOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog
                        open={dialogOpen && deleteTarget === grupo.id}
                        onOpenChange={(open) => {
                          setDialogOpen(open)
                          if (!open) setDeleteTarget(null)
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteTarget(grupo.id)
                              setDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir grupo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este grupo?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleConfirmDelete}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex-1">
                  {Array.isArray(blocos) &&
                    blocos.map((bloco: any, bIndex: number) => {
                      const loginKey = `${bloco.id ?? bIndex}-login`
                      const senhaKey = `${bloco.id ?? bIndex}-senha`
                      const loginValor = bloco.login ?? ''
                      const senhaValor = bloco.senha ?? ''
                      const observacoesValor = bloco.observacoes ?? ''
                      const senhaVisivel = visiblePasswords[senhaKey]
                      return (
                        <div key={bloco.id ?? bIndex}>
                          {bloco.rotulo && (
                            <h4 className="font-semibold text-sm text-foreground mt-4 mb-2">
                              <span className="inline-block rounded bg-[#C9922A]/15 px-2 py-0.5 text-[#C9922A] font-semibold">
                                {bloco.rotulo}
                              </span>
                            </h4>
                          )}
                          {bloco.link && (
                            <a
                              href={bloco.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block underline text-primary text-sm mb-2"
                            >
                              {bloco.link}
                            </a>
                          )}
                          {(loginValor || senhaValor) && (
                            <div className="space-y-2">
                              {loginValor && (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground text-sm">Login</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">
                                      {loginValor}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleCopy(loginValor)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {senhaValor && (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground text-sm">Senha</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">
                                      {senhaVisivel ? senhaValor : maskValue(senhaValor)}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => togglePassword(senhaKey)}
                                    >
                                      {senhaVisivel ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleCopy(senhaValor)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {observacoesValor && (
                            <p className="text-sm text-muted-foreground italic whitespace-pre-line mt-2">
                              {observacoesValor}
                            </p>
                          )}
                        </div>
                      )
                    })}
                </CardContent>

                {grupo.observacoes && (
                  <CardFooter className="border-t pt-4">
                    <p className="text-muted-foreground text-sm italic">
                      Observações: {grupo.observacoes}
                    </p>
                  </CardFooter>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <AcessoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        grupoExistente={grupoEditando}
        onSaved={loadGrupos}
      />

      <Toaster />
    </div>
  )
}
