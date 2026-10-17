import { useEffect, useRef, useState } from 'react'
import { Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  createBloco,
  createGrupo,
  deleteBloco,
  getColaboradores,
  updateBloco,
  updateGrupo,
} from '@/services/acessos'

interface BlocoLocal {
  id?: string
  rotulo: string
  colaborador: string
  login: string
  senha: string
  link: string
  observacoes: string
}

interface AcessoModalProps {
  isOpen: boolean
  onClose: () => void
  grupoExistente: any | null
  onSaved: () => void
}

export function AcessoModal({ isOpen, onClose, grupoExistente, onSaved }: AcessoModalProps) {
  const [titulo, setTitulo] = useState('')
  const [nivelAcesso, setNivelAcesso] = useState<'todos' | 'gestores' | 'restrito'>('todos')
  const [usuarioRestrito, setUsuarioRestrito] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [anexoFile, setAnexoFile] = useState<File | null>(null)
  const [anexoAtual, setAnexoAtual] = useState<string>('')
  const [blocos, setBlocos] = useState<BlocoLocal[]>([])
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [erroValidacao, setErroValidacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setErroValidacao('')
    setAnexoFile(null)
    if (grupoExistente) {
      setTitulo(grupoExistente.titulo ?? '')
      setNivelAcesso((grupoExistente.nivel_acesso as 'todos' | 'gestores' | 'restrito') ?? 'todos')
      const ur = grupoExistente.usuario_restrito
      setUsuarioRestrito(Array.isArray(ur) ? (ur[0] ?? '') : ((ur as string) ?? ''))
      setObservacoes(grupoExistente.observacoes ?? '')
      const nomeAnexo = grupoExistente.anexo
      setAnexoAtual(Array.isArray(nomeAnexo) ? (nomeAnexo[0] ?? '') : ((nomeAnexo as string) ?? ''))
      const blocosExpandidos = grupoExistente.expand?.acessos_blocos_via_grupo ?? []
      setBlocos(
        blocosExpandidos.map((b: any) => ({
          id: b.id,
          rotulo: b.rotulo ?? '',
          colaborador: b.colaborador ?? '',
          login: b.login ?? '',
          senha: b.senha ?? '',
          link: b.link ?? '',
          observacoes: b.observacoes ?? '',
        })),
      )
    } else {
      setTitulo('')
      setNivelAcesso('todos')
      setUsuarioRestrito('')
      setObservacoes('')
      setAnexoAtual('')
      setBlocos([])
    }
  }, [isOpen, grupoExistente])

  useEffect(() => {
    if (!isOpen) return
    getColaboradores()
      .then(setColaboradores)
      .catch(() => {
        toast.error('Não foi possível carregar a lista de colaboradores.')
      })
  }, [isOpen])

  const handleAnexoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAnexoFile(file)
      setAnexoAtual(file.name)
    }
  }

  const adicionarBloco = () => {
    setBlocos((prev) => [
      ...prev,
      { rotulo: '', colaborador: '', login: '', senha: '', link: '', observacoes: '' },
    ])
  }

  const removerBloco = (index: number) => {
    setBlocos((prev) => prev.filter((_, i) => i !== index))
  }

  const atualizarBloco = (index: number, patch: Partial<BlocoLocal>) => {
    setBlocos((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  }

  const validar = (): boolean => {
    if (!titulo.trim()) {
      setErroValidacao('O título é obrigatório.')
      return false
    }
    if (nivelAcesso === 'restrito' && !usuarioRestrito) {
      setErroValidacao('Selecione para qual usuário o acesso restrito será visível.')
      return false
    }
    for (const bloco of blocos) {
      const temConteudo = bloco.login.trim() || bloco.senha.trim() || bloco.observacoes.trim()
      if (!temConteudo) {
        setErroValidacao(
          'Cada bloco precisa ter pelo menos um entre login, senha ou observações preenchido.',
        )
        return false
      }
    }
    setErroValidacao('')
    return true
  }

  const handleSalvar = async () => {
    if (!validar()) return
    setSalvando(true)
    try {
      const formData = new FormData()
      formData.append('titulo', titulo.trim())
      formData.append('nivel_acesso', nivelAcesso)
      formData.append('usuario_restrito', nivelAcesso === 'restrito' ? usuarioRestrito : '')
      formData.append('observacoes', observacoes)
      if (anexoFile) {
        formData.append('anexo', anexoFile)
      }

      let grupoId: string
      const blocosOriginaisIds: string[] = grupoExistente
        ? (grupoExistente.expand?.acessos_blocos_via_grupo ?? []).map((b: any) => b.id)
        : []

      if (grupoExistente) {
        await updateGrupo(grupoExistente.id, formData)
        grupoId = grupoExistente.id
      } else {
        const novoGrupo = await createGrupo(formData)
        grupoId = novoGrupo.id
      }

      // Sincroniza blocos
      const idsMantidos = new Set<string>()
      for (const bloco of blocos) {
        const payload: any = {
          rotulo: bloco.rotulo.trim(),
          login: bloco.login.trim(),
          senha: bloco.senha.trim(),
          link: bloco.link.trim(),
          observacoes: bloco.observacoes.trim(),
        }
        if (bloco.colaborador) {
          payload.colaborador = bloco.colaborador
        }

        if (bloco.id) {
          idsMantidos.add(bloco.id)
          await updateBloco(bloco.id, payload)
        } else {
          await createBloco({ grupo: grupoId, ...payload })
        }
      }

      // Remove blocos que sumiram
      for (const idOriginal of blocosOriginaisIds) {
        if (!idsMantidos.has(idOriginal)) {
          await deleteBloco(idOriginal)
        }
      }

      toast.success('Acesso salvo com sucesso!')
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar o acesso. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-[10px] sm:max-w-2xl max-h-[90vh] overflow-y-auto border border-[#E4E7EB] dark:border-border p-6 shadow-lg bg-white dark:bg-card">
        <DialogHeader className="space-y-1 border-b border-[#E4E7EB] dark:border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              GESTÃO DE PESSOAS
            </span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            {grupoExistente ? 'Editar Acesso' : 'Novo Acesso'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="titulo"
              className="text-xs font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground"
            >
              Título / Nome do Sistema *
            </Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: ADVBOX, Prazoprev, E-Proc..."
              className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="nivel_acesso"
              className="text-xs font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground"
            >
              Nível de acesso
            </Label>
            <select
              id="nivel_acesso"
              value={nivelAcesso}
              onChange={(e) => setNivelAcesso(e.target.value as 'todos' | 'gestores' | 'restrito')}
              className="flex h-9 w-full items-center justify-between rounded-md border border-[#E4E7EB] dark:border-border bg-white dark:bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C9922A]"
            >
              <option value="todos">Todos os colaboradores</option>
              <option value="gestores">Somente gestores</option>
              <option value="restrito">Restrito</option>
            </select>
          </div>

          {nivelAcesso === 'restrito' && (
            <div className="space-y-1.5">
              <Label
                htmlFor="usuario_restrito"
                className="text-xs font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground"
              >
                Visível somente para <span className="text-red-500">*</span>
              </Label>
              <select
                id="usuario_restrito"
                value={usuarioRestrito}
                onChange={(e) => setUsuarioRestrito(e.target.value)}
                className="flex h-9 w-full items-center justify-between rounded-md border border-[#E4E7EB] dark:border-border bg-white dark:bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C9922A]"
              >
                <option value="">Selecione um usuário...</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {nivelAcesso === 'restrito' && !usuarioRestrito && (
                <p className="text-xs text-red-500">
                  É necessário selecionar um usuário para o acesso restrito.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor="observacoes"
              className="text-xs font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground"
            >
              Observações Gerais / Orientações
            </Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais, observações institucionais ou instruções de uso..."
              rows={3}
              className="text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="anexo"
              className="text-xs font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground"
            >
              Documento Anexo (Opcional)
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleAnexoChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A]"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />{' '}
                {anexoAtual ? 'Trocar anexo' : 'Selecionar anexo'}
              </Button>
              {anexoAtual && (
                <span className="text-xs text-[#78818E] dark:text-muted-foreground truncate max-w-[220px]">
                  {anexoAtual}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-t border-[#E4E7EB] dark:border-border pt-3">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-[#252B34] dark:text-foreground">
                  Blocos de Credenciais
                </Label>
                <p className="text-[11px] text-[#78818E] dark:text-muted-foreground">
                  Adicione logins, senhas e links por usuário ou setor.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarBloco}
                className="h-8 px-3 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar bloco
              </Button>
            </div>

            {blocos.length === 0 && (
              <p className="text-xs text-[#78818E] dark:text-muted-foreground italic py-2">
                Nenhum bloco adicionado. Clique em &quot;Adicionar bloco&quot; para cadastrar
                credenciais.
              </p>
            )}

            {blocos.map((bloco, bIndex) => (
              <Card
                key={bIndex}
                className="rounded-lg border border-[#E4E7EB] dark:border-border bg-[#FAF8F2]/60 dark:bg-muted/20 shadow-none"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                          Nome / Rótulo
                        </Label>
                        <Input
                          value={bloco.rotulo}
                          onChange={(e) => atualizarBloco(bIndex, { rotulo: e.target.value })}
                          placeholder="Ex: Dr. Caio, Comercial..."
                          className="h-8 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card focus-visible:ring-[#C9922A]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                          Visível apenas para
                        </Label>
                        <select
                          value={bloco.colaborador}
                          onChange={(e) => atualizarBloco(bIndex, { colaborador: e.target.value })}
                          className="flex h-8 w-full items-center justify-between rounded-md border border-[#E4E7EB] dark:border-border bg-white dark:bg-card px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#C9922A]"
                        >
                          <option value="">Todos com acesso a este grupo</option>
                          {colaboradores.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#78818E] hover:text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded shrink-0"
                      onClick={() => removerBloco(bIndex)}
                      title="Remover este bloco"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                          Login
                        </Label>
                        <Input
                          value={bloco.login}
                          onChange={(e) => atualizarBloco(bIndex, { login: e.target.value })}
                          placeholder="Login ou e-mail"
                          className="h-8 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card focus-visible:ring-[#C9922A]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                          Senha
                        </Label>
                        <Input
                          value={bloco.senha}
                          onChange={(e) => atualizarBloco(bIndex, { senha: e.target.value })}
                          placeholder="Senha de acesso"
                          className="h-8 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card focus-visible:ring-[#C9922A]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                        Link de Acesso (URL)
                      </Label>
                      <Input
                        value={bloco.link}
                        onChange={(e) => atualizarBloco(bIndex, { link: e.target.value })}
                        placeholder="https://exemplo.com.br"
                        className="h-8 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card focus-visible:ring-[#C9922A]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                        Observações do Bloco
                      </Label>
                      <Textarea
                        value={bloco.observacoes}
                        onChange={(e) => atualizarBloco(bIndex, { observacoes: e.target.value })}
                        placeholder="Observações específicas para esta credencial..."
                        rows={2}
                        className="text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card focus-visible:ring-[#C9922A]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {erroValidacao && (
            <p className="text-xs font-medium text-[#B4453C] bg-red-50 dark:bg-red-950/30 p-2.5 rounded-md border border-red-200 dark:border-red-900/50">
              {erroValidacao}
            </p>
          )}
        </div>

        <DialogFooter className="mt-4 border-t border-[#E4E7EB] dark:border-border pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={salvando}
            className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md transition-colors"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white rounded-md shadow-sm transition-colors"
          >
            {salvando && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AcessoModal
