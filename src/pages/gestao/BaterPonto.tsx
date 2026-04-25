import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { LogOut, Clock, CalendarDays, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const timeToMins = (time: string) => {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const formatHoursMins = (mins: number) => {
  if (mins === 0) return '0h 00min'
  const isNeg = mins < 0
  const absMins = Math.abs(mins)
  const h = Math.floor(absMins / 60)
  const m = absMins % 60
  return `${isNeg ? '-' : '+'}${h}h ${m.toString().padStart(2, '0')}min`
}

export default function BaterPonto() {
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [todayRecord, setTodayRecord] = useState<any>(null)
  const [monthlyRecord, setMonthlyRecord] = useState<any>(null)
  const [monthlySum, setMonthlySum] = useState(0)
  const [loading, setLoading] = useState(true)
  const [confirmPunch, setConfirmPunch] = useState<{
    field: string
    label: string
    time: string
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const data = sessionStorage.getItem('ponto_session')
    if (data) {
      const parsed = JSON.parse(data)
      setSession(parsed)
      loadData(parsed)
    } else {
      navigate('/gestao/ponto')
    }
  }, [navigate])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const loadData = async (userSession: any) => {
    try {
      const now = new Date()
      const todayStr = format(now, 'yyyy-MM-dd')

      const records = await pb.collection('registros').getFullList({
        filter: `funcionario_id = "${userSession.id}" && data >= "${todayStr} 00:00:00" && data <= "${todayStr} 23:59:59"`,
      })
      if (records.length > 0) {
        setTodayRecord(records[0])
      } else {
        setTodayRecord(null)
      }

      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      const monthly = await pb.collection('saldos_mensais').getFullList({
        filter: `funcionario_id = "${userSession.id}" && mes = ${currentMonth} && ano = ${currentYear}`,
      })
      setMonthlyRecord(monthly.length > 0 ? monthly[0] : null)

      const startOfMonthStr = format(new Date(currentYear, currentMonth - 1, 1), 'yyyy-MM-dd')
      const endOfMonthStr = format(new Date(currentYear, currentMonth, 0), 'yyyy-MM-dd')

      const allMonthRecords = await pb.collection('registros').getFullList({
        filter: `funcionario_id = "${userSession.id}" && data >= "${startOfMonthStr} 00:00:00" && data <= "${endOfMonthStr} 23:59:59"`,
      })

      const sum = allMonthRecords.reduce((acc, r) => acc + (r.saldo_dia || 0), 0)
      setMonthlySum(sum)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('ponto_session')
    navigate('/gestao/ponto')
  }

  const handleRegister = async () => {
    if (!confirmPunch || !session) return
    const { field, time } = confirmPunch

    setConfirmPunch(null)
    setIsProcessing(true)

    try {
      const now = new Date()
      const todayStr = format(now, 'yyyy-MM-dd')

      let recordId = todayRecord?.id
      let updateData: any = {
        [field]: time,
      }

      if (!recordId) {
        updateData.funcionario_id = session.id
        updateData.data = `${todayStr} 12:00:00.000Z`
        updateData.dia_semana = format(now, 'EEEE', { locale: ptBR })
        updateData.tipo_dia = 'normal'
      }

      let e1 = field === 'entrada1' ? time : todayRecord?.entrada1
      let s1 = field === 'saida1' ? time : todayRecord?.saida1
      let e2 = field === 'entrada2' ? time : todayRecord?.entrada2
      let s2 = field === 'saida2' ? time : todayRecord?.saida2

      let horas_trabalhadas = 0
      if (e1 && s1) {
        horas_trabalhadas += timeToMins(s1) - timeToMins(e1)
      }
      if (e2 && s2) {
        horas_trabalhadas += timeToMins(s2) - timeToMins(e2)
      }

      const carga = (session.carga_diaria || 8) * 60
      let saldo_dia = 0
      if (s1) {
        saldo_dia = horas_trabalhadas - carga
      }

      updateData.horas_trabalhadas = horas_trabalhadas
      updateData.saldo_dia = saldo_dia

      if (recordId) {
        await pb.collection('registros').update(recordId, updateData)
      } else {
        await pb.collection('registros').create(updateData)
      }

      await loadData(session)
    } catch (e) {
      console.error(e)
    } finally {
      setIsProcessing(false)
    }
  }

  const getPhotoUrl = () => {
    if (!session?.foto) return 'https://img.usecurling.com/ppl/thumbnail?gender=female'
    if (session.foto.startsWith('http')) return session.foto
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/funcionarios/${session.id}/${session.foto}`
  }

  const getNextStep = () => {
    if (!todayRecord) return 'entrada1'
    if (!todayRecord.saida1) return 'saida1'
    if (!todayRecord.entrada2) return 'entrada2'
    if (!todayRecord.saida2) return 'saida2'
    return null
  }
  const nextStep = getNextStep()

  const renderPunchButton = (field: string, label: string) => {
    const isNext = nextStep === field
    const recordTime = todayRecord?.[field]
    const isDone = !!recordTime

    return (
      <div className="flex flex-col items-center relative z-10" key={field}>
        <button
          disabled={!isNext || isProcessing}
          onClick={() => {
            setConfirmPunch({
              field,
              label,
              time: format(new Date(), 'HH:mm'),
            })
          }}
          className={`h-20 w-20 md:h-24 md:w-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
            isNext
              ? 'bg-[#C8922A] text-white shadow-xl hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-[#C8922A]/20'
              : isDone
                ? 'bg-[#2E7D32]/10 text-[#2E7D32] border-2 border-[#2E7D32]/30 opacity-90 cursor-default'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span className="font-bold text-xs md:text-sm">{label}</span>
        </button>
        <span
          className={`mt-3 text-sm md:text-base font-bold ${isDone ? 'text-gray-800' : 'text-gray-400'}`}
        >
          {isDone ? recordTime : '--:--'}
        </span>
      </div>
    )
  }

  if (!session || loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F5F0E8] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#C8922A]" />
      </div>
    )
  }

  const cargaStr = `${session.carga_diaria || 8}h 00min`
  const workedMin = todayRecord?.horas_trabalhadas || 0
  const dailyBalance = todayRecord?.saldo_dia || 0

  const prevBalance = monthlyRecord?.saldo_anterior || 0
  const monthBalance = monthlySum
  const totalBalance = prevBalance + monthBalance

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F0E8] overflow-y-auto font-sans text-gray-900">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-white p-6 md:p-8 rounded-[24px] shadow-sm gap-6">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 text-center md:text-left">
            <img
              src={getPhotoUrl()}
              alt={session.nome}
              className="w-20 h-20 rounded-full object-cover border-4 border-[#C8922A]/20"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{session.nome}</h1>
              <p className="text-gray-500 font-medium capitalize mt-1 text-sm md:text-base">
                {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="text-center md:text-right">
              <div className="text-4xl md:text-5xl font-black tracking-tight text-[#C8922A] font-mono">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <p className="text-sm text-gray-400 font-semibold mt-1 uppercase tracking-wider">
                Horário Local
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-[#C8922A] text-[#C8922A] hover:bg-[#C8922A] hover:text-white rounded-xl h-12 px-6 shadow-sm transition-colors"
            >
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline font-bold">Sair</span>
            </Button>
          </div>
        </div>

        {/* Punch Registration */}
        <div className="bg-white rounded-[24px] shadow-sm p-8 md:p-12 relative overflow-hidden">
          <h2 className="text-xl font-bold text-gray-400 uppercase tracking-wider mb-10 text-center">
            Registro de Ponto Sequencial
          </h2>

          <div className="relative flex justify-center items-center max-w-2xl mx-auto">
            {/* Connecting Line */}
            <div className="absolute top-10 md:top-12 left-[10%] right-[10%] h-1 bg-gray-100 z-0"></div>

            <div className="flex justify-between w-full relative z-10">
              {renderPunchButton('entrada1', 'Entrada 1')}
              {renderPunchButton('saida1', 'Saída 1')}
              {renderPunchButton('entrada2', 'Entrada 2')}
              {renderPunchButton('saida2', 'Saída 2')}
            </div>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Daily Card */}
          <Card className="rounded-[24px] border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-lg flex items-center text-gray-700">
                <Clock className="w-5 h-5 mr-3 text-[#C8922A]" />
                Desempenho Diário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Horas Trabalhadas</span>
                <span className="text-xl font-bold text-gray-800">
                  {formatHoursMins(workedMin).replace('+', '').replace('-', '')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Meta Diária</span>
                <span className="text-lg font-bold text-gray-400">{cargaStr}</span>
              </div>
              <div className="pt-4 mt-2 border-t border-gray-100 flex justify-between items-end">
                <span className="text-gray-800 font-bold uppercase text-sm tracking-wider">
                  Saldo do Dia
                </span>
                <span
                  className={`text-3xl font-black tracking-tight ${dailyBalance >= 0 ? 'text-[#2E7D32]' : 'text-[#C62828]'}`}
                >
                  {formatHoursMins(dailyBalance)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Card */}
          <Card className="rounded-[24px] border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-lg flex items-center text-gray-700">
                <CalendarDays className="w-5 h-5 mr-3 text-[#C8922A]" />
                Acúmulo Mensal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Saldo Anterior</span>
                <span
                  className={`text-xl font-bold ${prevBalance >= 0 ? 'text-[#2E7D32]' : 'text-[#C62828]'}`}
                >
                  {formatHoursMins(prevBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Saldo do Mês</span>
                <span
                  className={`text-xl font-bold ${monthBalance >= 0 ? 'text-[#2E7D32]' : 'text-[#C62828]'}`}
                >
                  {formatHoursMins(monthBalance)}
                </span>
              </div>
              <div className="pt-4 mt-2 border-t border-gray-100 flex justify-between items-end">
                <span className="text-gray-800 font-bold uppercase text-sm tracking-wider">
                  Saldo Total
                </span>
                <span
                  className={`text-3xl font-black tracking-tight ${totalBalance >= 0 ? 'text-[#2E7D32]' : 'text-[#C62828]'}`}
                >
                  {formatHoursMins(totalBalance)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={!!confirmPunch}
        onOpenChange={(open) => !open && !isProcessing && setConfirmPunch(null)}
      >
        <AlertDialogContent className="rounded-2xl sm:rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Confirmar Registro</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-600 mt-2">
              Deseja confirmar o registro de{' '}
              <strong className="text-gray-900 font-bold">{confirmPunch?.label}</strong> às{' '}
              <strong className="text-[#C8922A] font-bold text-lg">{confirmPunch?.time}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={isProcessing} className="rounded-xl h-12 px-6">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegister}
              disabled={isProcessing}
              className="bg-[#C8922A] hover:bg-[#b07c21] text-white rounded-xl h-12 px-8 font-bold"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
