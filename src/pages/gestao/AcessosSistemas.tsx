import { useEffect, useState, useMemo } from 'react'
import {
  Copy,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Users,
  Paperclip,
  AlertTriangle,
  KeyRound,
  User,
  Info,
} from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { getGrupos, deleteGrupo } from '@/services/acessos'
import { AcessoModal } from '@/components/gestao/AcessoModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { normalizeSearchText } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
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
  const [searchTerm, setSearchTerm] = useState('')
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

  const handleCopy = async (valor: string, label = 'Valor') => {
    try {
      await navigator.clipboard.writeText(valor)
      toast.success(`${label} copiado!`)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteGrupo(deleteTarget)
      toast.success('Acesso excluído com sucesso!')
      setDialogOpen(false)
      setDeleteTarget(null)
      await loadGrupos()
    } catch {
      toast.error('Erro ao excluir acesso')
    }
  }

  const maskValue = (valor: string) => {
    if (!valor) return ''
    return '•'.repeat(Math.min(Math.max(valor.length, 8), 16))
  }

  const normalizedQuery = normalizeSearchText(searchTerm)

  const gruposFiltrados = useMemo(() => {
    return grupos.filter((grupo) => {
      if (!normalizedQuery) return true

      if (normalizeSearchText(grupo.titulo || '').includes(normalizedQuery)) {
        return true
      }

      if (normalizeSearchText(grupo.observacoes || '').includes(normalizedQuery)) {
        return true
      }

      const blocos = grupo.expand?.acessos_blocos_via_grupo ?? []
      return blocos.some((bloco: any) => {
        return (
          normalizeSearchText(bloco.rotulo || '').includes(normalizedQuery) ||
          normalizeSearchText(bloco.login || '').includes(normalizedQuery) ||
          normalizeSearchText(bloco.link || '').includes(normalizedQuery) ||
          normalizeSearchText(bloco.observacoes || '').includes(normalizedQuery)
        )
      })
    })
  }, [grupos, normalizedQuery])

  // Distribuição ordenada em 2 colunas para layout masonry sem espaços vazios
  const { colLeft, colRight } = useMemo(() => {
    const left: any[] = []
    const right: any[] = []
    gruposFiltrados.forEach((item, index) => {
      if (index % 2 === 0) {
        left.push(item)
      } else {
        right.push(item)
      }
    })
    return { colLeft: left, colRight: right }
  }, [gruposFiltrados])

  const renderBadgeNivel = (nivel: string) => {
    if (nivel === 'restrito') {
      return (
        <Badge
          variant="outline"
          className="inline-flex items-center gap-1 text-[11px] font-semibold border-amber-300/80 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60 px-2 py-0.5 rounded-full"
        >
          <ShieldAlert className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          Restrito
        </Badge>
      )
    }
    if (nivel === 'gestores') {
      return (
        <Badge
          variant="outline"
          className="inline-flex items-center gap-1 text-[11px] font-semibold border-[#C9922A]/40 bg-[#C9922A]/10 text-[#C9922A] dark:bg-[#C9922A]/20 dark:text-[#E0AD45] dark:border-[#C9922A]/50 px-2 py-0.5 rounded-full"
        >
          <ShieldCheck className="h-3 w-3 text-[#C9922A]" />
          Somente gestores
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="inline-flex items-center gap-1 text-[11px] font-medium border-[#E4E7EB] dark:border-border bg-[#F5F7FA] text-[#4B5563] dark:bg-muted/50 dark:text-muted-foreground px-2 py-0.5 rounded-full"
      >
        <Users className="h-3 w-3 text-[#78818E]" />
        Todos os colaboradores
      </Badge>
    )
  }

  const renderCard = (grupo: any) => {
    const blocos = [...(grupo.expand?.acessos_blocos_via_grupo ?? [])].sort((a, b) => {
      const ra = a.rotulo?.trim()
      const rb = b.rotulo?.trim()
      if (!ra && !rb) return 0
      if (!ra) return 1
      if (!rb) return -1
      return ra.localeCompare(rb, 'pt-BR', { sensitivity: 'base' })
    })

    const anexoNome = Array.isArray(grupo.anexo) ? grupo.anexo[0] : grupo.anexo
    const anexoUrl = anexoNome ? pb.files.getURL(grupo, anexoNome) : null

    return (
      <div
        key={grupo.id}
        className="group relative flex flex-col rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm hover:shadow-md hover:border-[#C9922A]/40 transition-all duration-200"
      >
        {/* Topo / Cabeçalho do Card */}
        <div className="p-5 pb-4 border-b border-[#E4E7EB]/70 dark:border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center text-[10px] font-bold tracking-[1.2px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
                  SISTEMA / CONTA
                </span>
                {renderBadgeNivel(grupo.nivel_acesso)}
              </div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#252B34] dark:text-foreground break-words leading-tight">
                {grupo.titulo}
              </h3>
            </div>

            {isGestor && (
              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
                  onClick={() => {
                    setGrupoEditando(grupo)
                    setModalOpen(true)
                  }}
                  title="Editar este acesso"
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
                      className="h-8 w-8 text-[#78818E] hover:text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                      onClick={() => {
                        setDeleteTarget(grupo.id)
                        setDialogOpen(true)
                      }}
                      title="Excluir este acesso"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[10px] sm:max-w-[450px] border border-[#E4E7EB] dark:border-border p-6 shadow-lg bg-white dark:bg-card">
                    <AlertDialogHeader className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-[#B4453C] shrink-0">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#B4453C] block">
                            AÇÃO IRREVERSÍVEL
                          </span>
                          <AlertDialogTitle className="text-lg font-bold text-[#252B34] dark:text-foreground">
                            Excluir Acesso
                          </AlertDialogTitle>
                        </div>
                      </div>
                      <AlertDialogDescription className="pt-2 text-sm text-[#78818E] dark:text-muted-foreground leading-relaxed">
                        Tem certeza que deseja excluir o acesso{' '}
                        <strong className="text-[#252B34] dark:text-foreground">
                          {grupo.titulo}
                        </strong>
                        ? Todos os blocos de credenciais associados também serão removidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-5 flex gap-2 sm:justify-end">
                      <AlertDialogCancel className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md transition-colors">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleConfirmDelete}
                        className="h-9 px-4 text-xs font-semibold bg-[#B4453C] text-white hover:bg-[#963730] rounded-md shadow-sm transition-colors"
                      >
                        Excluir permanentemente
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>

        {/* Corpo do Card: Blocos de Credenciais */}
        <div className="p-5 space-y-4 flex-1">
          {blocos.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-xs text-[#78818E] dark:text-muted-foreground italic">
                Nenhum bloco de credencial cadastrado para este sistema.
              </p>
            </div>
          ) : (
            blocos.map((bloco: any, bIndex: number) => {
              const loginKey = `${bloco.id ?? bIndex}-login`
              const senhaKey = `${bloco.id ?? bIndex}-senha`
              const loginValor = bloco.login ?? ''
              const senhaValor = bloco.senha ?? ''
              const observacoesValor = bloco.observacoes ?? ''
              const senhaVisivel = visiblePasswords[senhaKey]

              return (
                <div
                  key={bloco.id ?? bIndex}
                  className="rounded-lg border border-[#E4E7EB]/90 dark:border-border/80 bg-[#FAF8F2]/60 dark:bg-muted/20 p-3.5 space-y-3 transition-colors"
                >
                  {/* Título do Bloco e Link */}
                  {(bloco.rotulo || bloco.link) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E7EB]/70 dark:border-border/60 pb-2.5">
                      {bloco.rotulo ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C9922A] bg-[#C9922A]/15 px-2 py-0.5 rounded">
                          <User className="h-3 w-3" />
                          {bloco.rotulo}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                          Credencial {bIndex + 1}
                        </span>
                      )}

                      {bloco.link && (
                        <a
                          href={bloco.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#C9922A] hover:text-[#9e7019] hover:underline transition-colors break-all max-w-full"
                          title="Abrir link de acesso"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[240px]">{bloco.link}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Campos de Login e Senha */}
                  {(loginValor || senhaValor) && (
                    <div className="space-y-2 pt-0.5">
                      {loginValor && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 rounded-md bg-white dark:bg-card px-3 py-2 border border-[#E4E7EB] dark:border-border">
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3 text-[#78818E]" />
                              LOGIN
                            </span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0 flex-1">
                            <span className="text-xs font-mono font-medium text-[#252B34] dark:text-foreground break-all select-all">
                              {loginValor}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded shrink-0 transition-colors"
                              onClick={() => handleCopy(loginValor, 'Login')}
                              title="Copiar login"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {senhaValor && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 rounded-md bg-white dark:bg-card px-3 py-2 border border-[#E4E7EB] dark:border-border">
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground flex items-center gap-1">
                              <KeyRound className="h-3 w-3 text-[#78818E]" />
                              SENHA
                            </span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-1.5 min-w-0 flex-1">
                            <span className="text-xs font-mono font-medium text-[#252B34] dark:text-foreground break-all select-all">
                              {senhaVisivel ? senhaValor : maskValue(senhaValor)}
                            </span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded transition-colors"
                                onClick={() => togglePassword(senhaKey)}
                                title={senhaVisivel ? 'Ocultar senha' : 'Exibir senha'}
                              >
                                {senhaVisivel ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded transition-colors"
                                onClick={() => handleCopy(senhaValor, 'Senha')}
                                title="Copiar senha"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Observações específicas do bloco */}
                  {observacoesValor && (
                    <div className="pt-1">
                      <div className="rounded-md bg-white/70 dark:bg-card/70 border border-[#E4E7EB]/80 dark:border-border/70 p-2.5 text-xs text-[#4B5563] dark:text-muted-foreground whitespace-pre-wrap leading-relaxed break-words">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground block mb-1">
                          OBSERVAÇÃO DO BLOCO:
                        </span>
                        {observacoesValor}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé: Observações Gerais e Anexo */}
        {(grupo.observacoes || anexoUrl) && (
          <div className="px-5 py-3.5 border-t border-[#E4E7EB]/70 dark:border-border/60 bg-[#FAF8F2]/40 dark:bg-muted/10 rounded-b-[10px] space-y-2">
            {grupo.observacoes && (
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-[#C9922A] shrink-0 mt-0.5" />
                <div className="text-xs text-[#4B5563] dark:text-muted-foreground leading-relaxed whitespace-pre-wrap break-words flex-1">
                  <strong className="text-[#252B34] dark:text-foreground font-semibold">
                    Informações adicionais:
                  </strong>{' '}
                  {grupo.observacoes}
                </div>
              </div>
            )}

            {anexoUrl && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E4E7EB]/60 dark:border-border/50">
                <span className="text-[11px] text-[#78818E] dark:text-muted-foreground flex items-center gap-1.5 truncate">
                  <Paperclip className="h-3.5 w-3.5 text-[#C9922A] shrink-0" />
                  <span className="truncate">{anexoNome}</span>
                </span>
                <a
                  href={anexoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#C9922A] hover:text-[#9e7019] hover:underline transition-colors shrink-0"
                >
                  Ver anexo <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up pb-10 space-y-6">
      {/* 1. CABEÇALHO CORPORATIVO PADRONIZADO (GRAFITE PREMIUM 2.1) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              GESTÃO DE PESSOAS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            Acesso Sistemas
          </h1>
          <p className="text-sm text-[#78818E] dark:text-muted-foreground">
            Central de acessos, credenciais e informações institucionais.
          </p>
        </div>

        {isGestor && (
          <Button
            onClick={() => {
              setGrupoEditando(null)
              setModalOpen(true)
            }}
            className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white whitespace-nowrap rounded-md shadow-sm transition-colors self-start sm:self-center"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Novo Acesso
          </Button>
        )}
      </div>

      {/* 2. BARRA DE BUSCA CORPORATIVA — Grafite Premium 2.1 */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#78818E] dark:text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por sistema, usuário, login, link ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[#78818E] dark:text-muted-foreground">
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="h-8 px-2 text-xs text-[#78818E] hover:text-[#C9922A]"
              >
                Limpar busca
              </Button>
            )}
            <span className="font-medium">
              {gruposFiltrados.length}{' '}
              {gruposFiltrados.length === 1 ? 'acesso listado' : 'acessos listados'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. ESTADOS DE CARREGAMENTO / VAZIO / CARDS MASONRY */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9922A]" />
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
            Carregando acessos corporativos...
          </p>
        </div>
      ) : grupos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
          <div className="h-12 w-12 rounded-full bg-[#FAF8F2] dark:bg-muted/40 flex items-center justify-center text-[#C9922A]">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#252B34] dark:text-foreground">
            Nenhum acesso cadastrado
          </h3>
          <p className="text-xs text-[#78818E] dark:text-muted-foreground max-w-sm">
            Os acessos e credenciais registrados para a equipe corporativa serão listados aqui.
          </p>
        </div>
      ) : gruposFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
          <Search className="h-8 w-8 text-[#78818E]" />
          <h3 className="text-base font-bold text-[#252B34] dark:text-foreground">
            Nenhum acesso encontrado
          </h3>
          <p className="text-xs text-[#78818E] dark:text-muted-foreground">
            Não encontramos nenhum resultado para &quot;{searchTerm}&quot;. Tente outros termos.
          </p>
        </div>
      ) : (
        /* DISTRIBUIÇÃO DOS CARDS MASONRY EM DUAS COLUNAS INDEPENDENTES */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Coluna 1 (Esquerda) */}
          <div className="flex flex-col gap-6">{colLeft.map(renderCard)}</div>

          {/* Coluna 2 (Direita) */}
          <div className="flex flex-col gap-6">{colRight.map(renderCard)}</div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE ACESSO */}
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
