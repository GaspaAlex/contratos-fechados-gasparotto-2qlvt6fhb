import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LogOut, Clock, Users, Loader2, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function DashboardPonto() {
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const data = sessionStorage.getItem('ponto_session')
    if (data) {
      const parsed = JSON.parse(data)
      if (parsed.perfil !== 'admin' && parsed.perfil !== 'lider') {
        navigate('/gestao/ponto')
        return
      }
      setSession(parsed)
      loadData()
    } else {
      navigate('/gestao/ponto')
    }
  }, [navigate])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fixNatalyBalance = async () => {
      try {
        const flagKey = 'fix_nataly_may_2026_done'
        if (localStorage.getItem(flagKey)) return

        const funcs = await pb.collection('funcionarios').getFullList({
          filter: 'nome = "Nataly Tayna Figueiredo da Silva"',
        })
        const nataly = funcs[0]
        if (!nataly) return

        const aprilBalances = await pb.collection('saldos_mensais').getFullList({
          filter: `funcionario_id = "${nataly.id}" && mes = 4 && ano = 2026`,
        })
        const aprilBalance = aprilBalances[0]

        const mayBalances = await pb.collection('saldos_mensais').getFullList({
          filter: `funcionario_id = "${nataly.id}" && mes = 5 && ano = 2026`,
        })
        const mayBalance = mayBalances[0]

        if (aprilBalance && mayBalance) {
          const newSaldoAnterior = aprilBalance.saldo_total
          const newSaldoTotal = newSaldoAnterior + mayBalance.saldo_mes

          if (
            mayBalance.saldo_anterior !== newSaldoAnterior ||
            mayBalance.saldo_total !== newSaldoTotal
          ) {
            await pb.collection('saldos_mensais').update(mayBalance.id, {
              saldo_anterior: newSaldoAnterior,
              saldo_total: newSaldoTotal,
            })
          }
        }

        localStorage.setItem(flagKey, 'true')
      } catch (error) {
        console.error('Erro ao corrigir saldo da Nataly:', error)
      }
    }

    if (session) {
      fixNatalyBalance()
    }
  }, [session])

  const loadData = async () => {
    try {
      const funcs = await pb.collection('funcionarios').getFullList({
        filter: 'ativo = true && perfil != "admin"',
        sort: 'nome',
      })
      setFuncionarios(funcs)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useRealtime('funcionarios', () => {
    loadData()
  })

  const handleLogout = () => {
    sessionStorage.removeItem('ponto_session')
    navigate('/gestao/ponto')
  }

  const handleRegistrarPonto = () => {
    navigate('/gestao/ponto/registrar')
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9922A]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* 1. CABEÇALHO CORPORATIVO PADRONIZADO (GRAFITE PREMIUM 2.1) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              GESTÃO DE PESSOAS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            Cartão de Ponto
          </h1>
          <p className="text-sm text-[#78818E] dark:text-muted-foreground">
            Painel corporativo da equipe, controle de jornadas e acesso aos cartões individuais.
          </p>
        </div>

        {/* Data/Hora atual e Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          <div className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-[#E4E7EB] dark:border-border bg-white dark:bg-card text-xs text-[#78818E] dark:text-muted-foreground shadow-xs">
            <Clock className="w-3.5 h-3.5 text-[#C9922A]" />
            <span className="capitalize font-medium tabular-nums">
              {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy • HH:mm:ss", { locale: ptBR })}
            </span>
          </div>

          {(session?.perfil === 'lider' || session?.perfil === 'admin') && (
            <Button
              onClick={handleRegistrarPonto}
              className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white whitespace-nowrap rounded-md shadow-sm transition-colors"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              <span>Registrar Meu Ponto</span>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleLogout}
            className="h-9 px-3.5 text-xs font-medium border-[#E4E7EB] dark:border-border hover:bg-red-50 dark:hover:bg-red-950/30 text-[#78818E] hover:text-[#B4453C] rounded-md transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            <span>Sair</span>
          </Button>
        </div>
      </div>

      {/* 2. BLOCO EQUIPE */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
        {/* Barra de título do bloco */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-[#E4E7EB]/80 dark:border-border/80 flex flex-wrap items-center justify-between gap-2 bg-[#F5F6F8]/60 dark:bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-[#FAF8F2] dark:bg-muted/40 flex items-center justify-center text-[#C9922A]">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-[#252B34] dark:text-foreground tracking-tight">
              Colaboradores da Equipe
            </h2>
          </div>
          <span className="text-xs text-[#78818E] dark:text-muted-foreground font-medium">
            {funcionarios.length}{' '}
            {funcionarios.length === 1 ? 'colaborador ativo' : 'colaboradores ativos'}
          </span>
        </div>

        {/* Grade de colaboradores */}
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funcionarios.map((func) => (
              <div
                key={func.id}
                className="group relative flex flex-col justify-between p-4 rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card hover:border-[#C9922A]/40 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <img
                      src={
                        func.foto
                          ? func.foto.startsWith('http')
                            ? func.foto
                            : `${import.meta.env.VITE_POCKETBASE_URL}/api/files/funcionarios/${func.id}/${func.foto}`
                          : 'https://img.usecurling.com/ppl/thumbnail?gender=female'
                      }
                      alt={func.nome}
                      className="w-12 h-12 rounded-full object-cover border border-[#E4E7EB] dark:border-border ring-2 ring-[#C9922A]/15"
                    />
                    {func.ativo && (
                      <span
                        className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#3E8E5A] ring-2 ring-white dark:ring-card"
                        title="Ativo"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-[#252B34] dark:text-foreground truncate group-hover:text-[#C9922A] transition-colors">
                      {func.nome}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center text-[10px] font-medium tracking-wider uppercase text-[#78818E] dark:text-muted-foreground bg-[#F5F6F8] dark:bg-muted/50 px-1.5 py-0.5 rounded border border-[#E4E7EB]/70 dark:border-border/60">
                        {func.perfil || 'Colaborador'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E4E7EB]/70 dark:border-border/60">
                  <Button
                    variant="outline"
                    className="w-full h-8 text-xs font-semibold rounded-md border-[#E4E7EB] dark:border-border hover:border-[#C9922A]/50 text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 transition-colors"
                    onClick={() => navigate(`/gestao/ponto/cartao/${func.id}`)}
                  >
                    <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-[#C9922A]" />
                    Ver Cartão
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
