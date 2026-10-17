import { useState, useEffect } from 'react'
import { Plus, Users, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import {
  getFuncionarios,
  createFuncionario,
  updateFuncionario,
  checkPinUnique,
  deleteFuncionario,
} from '@/services/funcionarios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { FuncionarioCard } from './components/FuncionarioCard'
import { FuncionarioFormDialog } from './components/FuncionarioFormDialog'

export default function Funcionarios() {
  const { user } = useAuth()
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [selectedFuncionario, setSelectedFuncionario] = useState<any>(null)

  const isGestor = user?.perfil === 'gestor'

  const loadData = async () => {
    try {
      const data = await getFuncionarios()
      setFuncionarios(data)
    } catch {
      toast.error('Erro ao carregar funcionários')
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

  useRealtime('funcionarios', () => {
    if (isGestor) loadData()
  })

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
            <p className="text-xs text-[#78818E] dark:text-muted-foreground">
              Este módulo de gestão de funcionários é de acesso restrito aos gestores do escritório.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  const calcularCargaDiaria = (entrada: string, saida: string) => {
    const [hE, mE] = entrada.split(':').map(Number)
    const [hS, mS] = saida.split(':').map(Number)
    let diff = hS * 60 + mS - (hE * 60 + mE)
    if (diff < 0) diff += 24 * 60
    return Math.max(0, diff - 90)
  }

  const handleSave = async (data: any, fotoFile: File | null) => {
    try {
      const isUnique = await checkPinUnique(data.pin, selectedFuncionario?.id)
      if (!isUnique) return false

      const formData = new FormData()
      formData.append('nome', data.nome)
      formData.append('perfil', data.perfil)
      formData.append('pin', data.pin)
      if (data.perfil === 'admin') {
        formData.append('horario_entrada', '')
        formData.append('horario_saida', '')
        formData.append('carga_diaria', '0')
      } else {
        formData.append('horario_entrada', data.horario_entrada)
        formData.append('horario_saida', data.horario_saida)
        formData.append(
          'carga_diaria',
          calcularCargaDiaria(data.horario_entrada, data.horario_saida).toString(),
        )
      }

      if (!selectedFuncionario) formData.append('ativo', 'true')
      if (fotoFile) formData.append('foto', fotoFile)

      if (selectedFuncionario) {
        await updateFuncionario(selectedFuncionario.id, formData)
        toast.success('Atualizado com sucesso!')
      } else {
        await createFuncionario(formData)
        toast.success('Criado com sucesso!')
      }
      setIsModalOpen(false)
      return true
    } catch {
      toast.error('Erro ao salvar')
      return false
    }
  }

  const handleToggleStatus = async () => {
    if (!selectedFuncionario) return
    try {
      await updateFuncionario(selectedFuncionario.id, { ativo: !selectedFuncionario.ativo })
      toast.success(`Status atualizado com sucesso!`)
      setIsAlertOpen(false)
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  const handleDelete = async () => {
    if (!selectedFuncionario) return
    try {
      await deleteFuncionario(selectedFuncionario.id)
      toast.success('Funcionário excluído com sucesso!')
      setIsDeleteAlertOpen(false)
      setSelectedFuncionario(null)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir funcionário')
    }
  }

  const ativosCount = funcionarios.filter((f) => f.ativo).length

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* 1. CABEÇALHO CORPORATIVO PADRONIZADO (GRAFITE PREMIUM 2.1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              GESTÃO DE PESSOAS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            Funcionários
          </h1>
          <p className="text-sm text-[#78818E] dark:text-muted-foreground">
            Cadastro e gerenciamento dos colaboradores do escritório.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <Button
            onClick={() => {
              setSelectedFuncionario(null)
              setIsModalOpen(true)
            }}
            className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white whitespace-nowrap rounded-md shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#C9922A]"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            <span>Novo Funcionário</span>
          </Button>
        </div>
      </div>

      {/* 2. BLOCO DE QUADRO DE COLABORADORES */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
        {/* Barra de título do bloco com contadores discretos */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-[#E4E7EB]/80 dark:border-border/80 flex flex-wrap items-center justify-between gap-2 bg-[#F5F6F8]/60 dark:bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-[#FAF8F2] dark:bg-muted/40 flex items-center justify-center text-[#C9922A]">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-[#252B34] dark:text-foreground tracking-tight">
              Quadro de Colaboradores
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#78818E] dark:text-muted-foreground font-medium">
            <span className="inline-flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#3E8E5A]" />
              <strong className="text-[#252B34] dark:text-foreground font-semibold">
                {ativosCount}
              </strong>{' '}
              ativos
            </span>
            <span className="text-[#E4E7EB] dark:text-border">•</span>
            <span>
              <strong className="text-[#252B34] dark:text-foreground font-semibold">
                {funcionarios.length}
              </strong>{' '}
              no total
            </span>
          </div>
        </div>

        {/* Grade de 4 colunas no desktop, 2 colunas em tablet e 1 coluna em celular */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="rounded-[10px] border border-[#E4E7EB] dark:border-border p-4 space-y-4 bg-white dark:bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-14 h-14 rounded-full bg-muted/60" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-16 bg-muted/60" />
                      <Skeleton className="h-4 w-32 bg-muted/60" />
                    </div>
                  </div>
                  <Skeleton className="h-12 w-full rounded-md bg-muted/40" />
                  <Skeleton className="h-8 w-full rounded-md bg-muted/60" />
                </div>
              ))}
            </div>
          ) : funcionarios.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#FAF8F2] dark:bg-muted/40 flex items-center justify-center text-[#C9922A]">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#252B34] dark:text-foreground">
                Nenhum colaborador cadastrado
              </h3>
              <p className="text-xs text-[#78818E] dark:text-muted-foreground max-w-sm mx-auto">
                Clique no botão &quot;Novo Funcionário&quot; acima para cadastrar o primeiro membro
                da equipe.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {funcionarios.map((f) => (
                <FuncionarioCard
                  key={f.id}
                  func={f}
                  onEdit={(func: any) => {
                    setSelectedFuncionario(func)
                    setIsModalOpen(true)
                  }}
                  onToggleStatus={(func: any) => {
                    setSelectedFuncionario(func)
                    setIsAlertOpen(true)
                  }}
                  onDelete={(func: any) => {
                    setSelectedFuncionario(func)
                    setIsDeleteAlertOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. MODAIS PRESERVADOS INTEGRALMENTE (sem redesenho conforme requisito 7) */}
      <FuncionarioFormDialog
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        funcionario={selectedFuncionario}
        onSubmit={handleSave}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedFuncionario?.ativo ? 'Desativar' : 'Ativar'} Funcionário
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente {selectedFuncionario?.ativo ? 'desativar' : 'ativar'} o acesso de{' '}
              <span className="font-semibold text-gray-900">{selectedFuncionario?.nome}</span>?
              {selectedFuncionario?.ativo && ' Ele não poderá mais acessar o sistema.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              className={
                selectedFuncionario?.ativo
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
            >
              Sim, {selectedFuncionario?.ativo ? 'Desativar' : 'Ativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção!</AlertDialogTitle>
            <AlertDialogDescription>
              Ao excluir{' '}
              <span className="font-semibold text-gray-900">{selectedFuncionario?.nome}</span>,
              todos os seus registros de ponto e saldos serão permanentemente removidos. Esta ação
              não pode ser desfeita. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#C62828] hover:bg-[#b71c1c] text-white"
            >
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
