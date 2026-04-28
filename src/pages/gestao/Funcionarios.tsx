import { useState, useEffect, useCallback } from 'react'
import { Plus, Lock, Delete, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getFuncionarios,
  createFuncionario,
  updateFuncionario,
  checkPinUnique,
  deleteFuncionario,
  getFuncionarioByPin,
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
  const [isAdmin, setIsAdmin] = useState(false)
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [selectedFuncionario, setSelectedFuncionario] = useState<any>(null)
  const [session, setSession] = useState<any>(null)

  const [pin, setPin] = useState('')
  const [isCheckingPin, setIsCheckingPin] = useState(false)

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
    // Remove persistent session checks to require PIN every time the tab is accessed.
    setLoading(false)
  }, [])

  useRealtime('funcionarios', () => {
    if (isAdmin) loadData()
  })

  const checkPin = useCallback(async (enteredPin: string) => {
    if (enteredPin.length !== 4) return
    setIsCheckingPin(true)
    try {
      const func = await getFuncionarioByPin(enteredPin)
      if (!func) {
        toast.error('PIN incorreto.')
        setPin('')
        return
      }
      if ((func.perfil !== 'admin' && func.perfil !== 'lider') || !func.ativo) {
        toast.error('Acesso não autorizado.')
        setPin('')
        return
      }
      setSession(func)
      setIsAdmin(true)
      setLoading(true)
      loadData()
    } catch {
      toast.error('Erro ao verificar PIN.')
      setPin('')
    } finally {
      setIsCheckingPin(false)
    }
  }, [])

  const handlePinInput = useCallback(
    (digit: string) => {
      if (pin.length < 4 && !isCheckingPin) setPin((p) => p + digit)
    },
    [pin, isCheckingPin],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAdmin || isCheckingPin) return
      if (/^[0-9]$/.test(e.key)) {
        handlePinInput(e.key)
      } else if (e.key === 'Backspace') {
        setPin((p) => p.slice(0, -1))
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        setPin('')
      } else if (e.key === 'Enter' && pin.length === 4) {
        checkPin(pin)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAdmin, isCheckingPin, handlePinInput, pin, checkPin])

  if (!isAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-[#F5F0E8] p-4 md:p-8">
        <Card className="relative w-full max-w-sm overflow-hidden rounded-[24px] border-0 bg-white shadow-xl animate-in fade-in zoom-in duration-500">
          {isCheckingPin && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <Loader2 className="h-10 w-10 animate-spin text-[#C8922A]" />
            </div>
          )}

          <div className="bg-[#C8922A] px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <Lock className="h-8 w-8 text-[#C8922A]" />
            </div>
            <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
            <p className="mt-1 text-white/90">Insira seu PIN para continuar</p>
          </div>

          <div className="p-8">
            <div className="mb-8 flex justify-center space-x-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex h-14 w-12 items-center justify-center rounded-xl border-2 text-2xl font-bold transition-all ${
                    pin.length > i
                      ? 'border-[#C8922A] bg-[#C8922A]/10 text-[#C8922A]'
                      : 'border-gray-200 bg-gray-50 text-transparent'
                  }`}
                >
                  {pin.length > i ? '•' : ''}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  className="h-14 rounded-xl border-gray-200 text-xl font-semibold transition-colors hover:bg-[#C8922A] hover:text-white"
                  onClick={() => handlePinInput(num.toString())}
                  disabled={isCheckingPin}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="outline"
                className="h-14 rounded-xl border-gray-200 text-lg font-semibold transition-colors hover:bg-red-50 hover:text-red-600"
                onClick={() => setPin('')}
                disabled={isCheckingPin || pin.length === 0}
              >
                C
              </Button>
              <Button
                variant="outline"
                className="h-14 rounded-xl border-gray-200 text-xl font-semibold transition-colors hover:bg-[#C8922A] hover:text-white"
                onClick={() => handlePinInput('0')}
                disabled={isCheckingPin}
              >
                0
              </Button>
              <Button
                variant="outline"
                className="h-14 rounded-xl border-gray-200 transition-colors hover:bg-gray-100 hover:text-gray-900"
                onClick={() => setPin((p) => p.slice(0, -1))}
                disabled={isCheckingPin || pin.length === 0}
              >
                <Delete className="h-6 w-6" />
              </Button>
            </div>

            <Button
              className="mt-6 h-14 w-full rounded-xl bg-[#C8922A] text-lg font-bold text-white shadow-sm transition-colors hover:bg-[#b07d20]"
              onClick={() => checkPin(pin)}
              disabled={pin.length < 4 || isCheckingPin}
            >
              ENTRAR
            </Button>
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
