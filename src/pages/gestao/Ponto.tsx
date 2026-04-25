import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { Clock } from 'lucide-react'

export default function Ponto() {
  const [time, setTime] = useState(new Date())
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [adminPin, setAdminPin] = useState('')

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [employeePin, setEmployeePin] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (employeeModalOpen) {
      pb.collection('funcionarios')
        .getFullList({ filter: 'ativo = true', sort: 'nome' })
        .then(setEmployees)
        .catch(() => toast.error('Erro ao carregar funcionários'))
    } else {
      setSelectedEmployee(null)
      setEmployeePin('')
    }
  }, [employeeModalOpen])

  useEffect(() => {
    if (!adminModalOpen) setAdminPin('')
  }, [adminModalOpen])

  const handleAdminPinComplete = async (pin: string) => {
    try {
      const user = await pb.collection('funcionarios').getFirstListItem(`pin = "${pin}"`)

      if (user.perfil === 'funcionaria') {
        toast.error('PIN inválido ou sem permissão')
        setAdminPin('')
        return
      }
      if (!user.ativo) {
        toast.error('Usuário inativo. Contate o administrador.')
        setAdminPin('')
        return
      }
      if (user.perfil === 'admin' || user.perfil === 'lider') {
        sessionStorage.setItem(
          'ponto_session',
          JSON.stringify({
            id: user.id,
            nome: user.nome,
            perfil: user.perfil,
            foto: user.foto,
          }),
        )
        setAdminModalOpen(false)
        navigate('/dashboard')
      } else {
        toast.error('PIN inválido ou sem permissão')
        setAdminPin('')
      }
    } catch (e) {
      toast.error('PIN inválido ou sem permissão')
      setAdminPin('')
    }
  }

  const handleEmployeePinComplete = async (pin: string) => {
    if (!selectedEmployee) return
    try {
      const user = await pb
        .collection('funcionarios')
        .getFirstListItem(`id = "${selectedEmployee.id}" && pin = "${pin}"`)
      if (user) {
        sessionStorage.setItem(
          'ponto_session',
          JSON.stringify({
            id: user.id,
            nome: user.nome,
            perfil: user.perfil,
            foto: user.foto,
          }),
        )
        setEmployeeModalOpen(false)
        navigate('/gestao/ponto/registrar')
      }
    } catch (e) {
      toast.error('PIN incorreto. Tente novamente.')
      setEmployeePin('')
    }
  }

  const formattedDate = format(time, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center rounded-2xl border shadow-sm relative overflow-hidden"
      style={{ backgroundColor: '#F5F0E8', minHeight: 'calc(100vh - 6rem)' }}
    >
      <div className="absolute top-12 text-center w-full px-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 tracking-tight uppercase">
          Advocacia Gasparotto
        </h1>
        <p className="text-gray-600 mt-2 text-lg">{capitalizedDate}</p>
      </div>

      <div className="flex flex-col items-center justify-center mt-20 px-4 w-full">
        <div className="text-6xl sm:text-8xl font-bold text-gray-800 tracking-tighter mb-12 flex items-center justify-center gap-4 w-full">
          <Clock className="w-14 h-14 sm:w-20 sm:h-20 text-[#C8922A] shrink-0" />
          <span className="tabular-nums">{format(time, 'HH:mm:ss')}</span>
        </div>

        <h2 className="text-2xl font-semibold mb-8 text-gray-700 text-center">
          Acesso ao Cartão de Ponto
        </h2>

        <div className="flex flex-col gap-5 w-full max-w-[280px]">
          <Button
            onClick={() => setEmployeeModalOpen(true)}
            style={{ backgroundColor: '#C8922A' }}
            className="hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-full h-14 text-lg font-medium text-white shadow-md w-full"
          >
            Registrar Meu Ponto
          </Button>
          <Button
            onClick={() => setAdminModalOpen(true)}
            variant="outline"
            className="hover:bg-white/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-full h-14 text-lg font-medium text-[#C8922A] border-2 border-[#C8922A] bg-transparent w-full"
          >
            Acesso Admin / Líder
          </Button>
        </div>
      </div>

      {/* Admin Modal */}
      <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Identificação</DialogTitle>
            <DialogDescription className="text-center">
              Acesso exclusivo para administradores e líderes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <p className="text-center text-sm text-gray-500 mb-4">Digite seu PIN de 4 dígitos</p>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={adminPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setAdminPin(val)
                if (val.length === 4) handleAdminPinComplete(val)
              }}
              className="text-center text-4xl tracking-[1em] pl-[1em] h-16 w-56 mx-auto font-mono rounded-xl focus-visible:ring-[#C8922A]"
              placeholder="****"
              autoFocus
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Modal */}
      <Dialog open={employeeModalOpen} onOpenChange={setEmployeeModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {selectedEmployee
                ? `Identificação - ${selectedEmployee.nome}`
                : 'Selecione seu perfil'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {selectedEmployee
                ? 'Insira seu PIN para registrar o ponto.'
                : 'Encontre seu nome na lista abaixo.'}
            </DialogDescription>
          </DialogHeader>

          {!selectedEmployee ? (
            <ScrollArea className="h-[60vh] sm:h-96 pr-4 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="flex flex-col items-center p-4 border rounded-2xl hover:bg-gray-50 hover:border-[#C8922A] hover:shadow-sm transition-all group"
                  >
                    <Avatar className="h-20 w-20 mb-3 border-2 border-transparent group-hover:border-[#C8922A] transition-colors">
                      <AvatarImage
                        src={
                          emp.foto
                            ? pb.files.getURL(emp, emp.foto)
                            : `https://img.usecurling.com/ppl/thumbnail?seed=${emp.id}`
                        }
                      />
                      <AvatarFallback className="text-lg bg-[#F5F0E8] text-[#C8922A]">
                        {emp.nome.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-center text-gray-700 group-hover:text-gray-900 leading-tight">
                      {emp.nome}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <Avatar className="h-24 w-24 mb-6 border-4 border-[#C8922A] shadow-md">
                <AvatarImage
                  src={
                    selectedEmployee.foto
                      ? pb.files.getURL(selectedEmployee, selectedEmployee.foto)
                      : `https://img.usecurling.com/ppl/thumbnail?seed=${selectedEmployee.id}`
                  }
                />
                <AvatarFallback className="text-2xl bg-[#F5F0E8] text-[#C8922A]">
                  {selectedEmployee.nome.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-gray-500 mb-4">Digite seu PIN de 4 dígitos</p>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={employeePin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  setEmployeePin(val)
                  if (val.length === 4) handleEmployeePinComplete(val)
                }}
                className="text-center text-4xl tracking-[1em] pl-[1em] h-16 w-56 mx-auto font-mono rounded-xl focus-visible:ring-[#C8922A]"
                placeholder="****"
                autoFocus
              />
              <Button
                variant="ghost"
                className="mt-8 text-gray-500 hover:text-gray-800"
                onClick={() => {
                  setSelectedEmployee(null)
                  setEmployeePin('')
                }}
              >
                Voltar para a lista
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
