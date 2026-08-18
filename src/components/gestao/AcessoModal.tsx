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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{grupoExistente ? 'Editar Acesso' : 'Novo Acesso'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Sistema Jurídico"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nivel_acesso">Nível de acesso</Label>
            <select
              id="nivel_acesso"
              value={nivelAcesso}
              onChange={(e) => setNivelAcesso(e.target.value as 'todos' | 'gestores' | 'restrito')}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="todos">Todos os colaboradores</option>
              <option value="gestores">Somente gestores</option>
              <option value="restrito">Restrito</option>
            </select>
          </div>

          {nivelAcesso === 'restrito' && (
            <div className="space-y-2">
              <Label htmlFor="usuario_restrito">
                Visível somente para <span className="text-red-500">*</span>
              </Label>
              <select
                id="usuario_restrito"
                value={usuarioRestrito}
                onChange={(e) => setUsuarioRestrito(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações opcionais..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anexo">Anexo</Label>
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
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />{' '}
                {anexoAtual ? 'Trocar anexo' : 'Selecionar anexo'}
              </Button>
              {anexoAtual && (
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {anexoAtual}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Blocos</Label>
              <Button type="button" variant="outline" size="sm" onClick={adicionarBloco}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar bloco
              </Button>
            </div>

            {blocos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum bloco adicionado. Clique em "Adicionar bloco" para começar.
              </p>
            )}

            {blocos.map((bloco, bIndex) => (
              <Card key={bIndex} className="border-dashed">
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nome</Label>
                        <Input
                          value={bloco.rotulo}
                          onChange={(e) => atualizarBloco(bIndex, { rotulo: e.target.value })}
                          placeholder="Ex: Dr. Caio"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Visível apenas para</Label>
                        <select
                          value={bloco.colaborador}
                          onChange={(e) => atualizarBloco(bIndex, { colaborador: e.target.value })}
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => removerBloco(bIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Login</Label>
                        <Input
                          value={bloco.login}
                          onChange={(e) => atualizarBloco(bIndex, { login: e.target.value })}
                          placeholder="Login (opcional)"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Senha</Label>
                        <Input
                          value={bloco.senha}
                          onChange={(e) => atualizarBloco(bIndex, { senha: e.target.value })}
                          placeholder="Senha (opcional)"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Link de acesso</Label>
                      <Input
                        value={bloco.link}
                        onChange={(e) => atualizarBloco(bIndex, { link: e.target.value })}
                        placeholder="Link de acesso (opcional)"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Observações</Label>
                      <Textarea
                        value={bloco.observacoes}
                        onChange={(e) => atualizarBloco(bIndex, { observacoes: e.target.value })}
                        placeholder="Observações (opcional)"
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {erroValidacao && <p className="text-sm text-red-500">{erroValidacao}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="bg-[#C8922A] text-white hover:bg-[#b07d20]"
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AcessoModal
