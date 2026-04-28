import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
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
  const navigate = useNavigate()

  const [isAdmin, setIsAdmin] = useState(false)
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [selectedFuncionario, setSelectedFuncionario] = useState<any>(null)
  const [session, setSession] = useState<any>(null)

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
    const data = sessionStorage.getItem('ponto_session')
    if (data) {
      const parsed = JSON.parse(data)
      setSession(parsed)
      if (parsed.perfil === 'admin' || parsed.perfil === 'lider') {
        setIsAdmin(true)
      }
    } else {
      navigate('/gestao/ponto')
    }
    loadData()
  }, [navigate])
  useRealtime('funcionarios', () => {
    loadData()
  })

  if (!isAdmin) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center bg-[#F5F0E8] p-8">
        <Card className="w-full max-w-md p-6 text-center">
          <h2 className="text-2xl font-bold text-red-600">Acesso Restrito</h2>
          <p className="mt-2 text-gray-600">Acesso restrito.</p>
        </Card>
      </div>
    )
  }

  const calcularCargaDiaria = (entrada: string, saida: string) => {
    const [hE, mE] = entrada.split(':').map(Number)
    const [hS, mS] = saida.split(':').map(Number)
    let diff = hS * 60 + mS - (hE * 60 + mE)
    if (diff < 0) diff += 24 * 60
    return Math.max(0, diff - 60)
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
    if (selectedFuncionario.id === session?.id) {
      toast.error('Você não pode excluir sua própria conta.')
      setIsDeleteAlertOpen(false)
      return
    }
    try {
      await deleteFuncionario(selectedFuncionario.id)
      toast.success('Funcionário excluído com sucesso!')
      setIsDeleteAlertOpen(false)
      setSelectedFuncionario(null)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir funcionário')
    }
  }

  return (
    <div className="flex-1 bg-[#F5F0E8] p-6 md:p-8 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Gerenciar Funcionários
          </h2>
          <Button
            onClick={() => {
              setSelectedFuncionario(null)
              setIsModalOpen(true)
            }}
            className="bg-[#C8922A] text-white hover:bg-[#b07d20] shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Funcionário
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl bg-white/50" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            {funcionarios.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500">
                Nenhum funcionário cadastrado.
              </div>
            )}
          </div>
        )}

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
    </div>
  )
}
