import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  LogOut, AlertTriangle, ChevronDown, Clock, Users, CalendarDays, ArrowRight 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatMinutesToHHMM } from '@/lib/formatters'
import { getActiveFuncionariosCount, getSaldosMensais, getFuncionarioPhotoUrl } from '@/services/ponto'
import { useRealtime } from '@/hooks/use-realtime'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const YEARS = [2024, 2025, 2026, 2027]

export default function DashboardPonto() {
  const navigate = useNavigate()
  const [session, setSession] = useState<{ id: string; nome: string; perfil: string } | null>(null)
  
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  
  const [saldos, setSaldos] = useState<any[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let stored = localStorage.getItem('ponto_session')
    if (!stored) {
      // Mock session for preview purposes
      stored = JSON.stringify({ id: 'mock', nome: 'Admin Preview', perfil: 'admin' })
      localStorage.setItem('ponto_session', stored)
    }
    
    const parsed = JSON.parse(stored)
    if (parsed.perfil !== 'admin' && parsed.perfil !== 'lider') {
      navigate('/gestao/ponto')
      return
    }
    setSession(parsed)
  }, [navigate])

  const loadData = async () => {
    setLoading(true)
    try {
      const count = await getActiveFuncionariosCount()
      setActiveCount(count || 5) // Fallback for mock

      const saldosData = await getSaldosMensais(month, year)
      
      if (saldosData.length === 0) {
        // Inject mock data if empty state
        setSaldos([
          { id: '1', saldo_anterior: 120, saldo_mes: 45, saldo_total: 165, expand: { funcionario_id: { id: 'f1', nome: 'Maria Clara' } } },
          { id: '2', saldo_anterior: -30, saldo_mes: -50, saldo_total: -80, expand: { funcionario_id: { id: 'f2', nome: 'João Pedro' } } },
          { id: '3', saldo_anterior: 0, saldo_mes: 0, saldo_total: 0, expand: { funcionario_id: { id: 'f3', nome: 'Ana Souza' } } },
          { id: '4', saldo_anterior: -20, saldo_mes: -45, saldo_total: -65, expand: { funcionario_id: { id: 'f4', nome: 'Carlos Silva' } } },
        ])
      } else {
        setSaldos(saldosData)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [month, year])

  useRealtime('saldos_mensais', loadData)
  useRealtime('funcionarios', loadData)

  const handleLogout = () => {
    localStorage.removeItem('ponto_session')
    navigate('/gestao/ponto')
  }

  const positiveCount = saldos.filter(s => s.saldo_total > 0).length
  const negativeCount = saldos.filter(s => s.saldo_total < 0).length
  const criticalAlerts = saldos.filter(s => s.saldo_total < -60)

  if (!session) return null

  return (
    <div className="min-h-screen bg-[#F5F0E8] pb-10">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-[#C8922A]" />
            <h1 className="text-xl font-bold text-gray-800 hidden sm:block">Dashboard — Cartão de Ponto</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-2 border-r pr-4 border-gray-200">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#C8922A]/20 text-[#C8922A] text-xs font-medium">
                  {session.nome.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700 leading-none">{session.nome}</p>
                <p className="text-xs text-gray-500 capitalize">{session.perfil}</p>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:block">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8 space-y-8">
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#C8922A]" /> Período de Referência
          </h2>
          <div className="flex gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[140px] justify-between border-gray-200">
                  {MONTHS[month - 1]} <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[140px]">
                {MONTHS.map((m, i) => (
                  <DropdownMenuItem key={i} onClick={() => setMonth(i + 1)} className="cursor-pointer">
                    {m}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[100px] justify-between border-gray-200">
                  {year} <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[100px]">
                {YEARS.map((y) => (
                  <DropdownMenuItem key={y} onClick={() => setYear(y)} className="cursor-pointer">
                    {y}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Funcionárias Ativas</CardTitle>
              <Users className="h-4 w-4 text-[#C8922A]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-800">{activeCount}</div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Saldos Positivos</CardTitle>
              <div className="h-4 w-4 rounded-full bg-[#2E7D32]/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-[#2E7D32]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#2E7D32]">{positiveCount}</div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Saldos Negativos</CardTitle>
              <div className="h-4 w-4 rounded-full bg-[#C62828]/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-[#C62828]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#C62828]">{negativeCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Attention Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="bg-[#FFF8E1] border border-[#C8922A] rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-[#C8922A] mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Atenção — Saldos Negativos Críticos (> 1h)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {criticalAlerts.map(alert => {
                const func = alert.expand?.funcionario_id
                return (
                  <div key={alert.id} className="bg-white rounded-lg p-3 flex items-center gap-4 shadow-sm border border-yellow-100">
                    <Avatar className="h-10 w-10 border border-gray-100">
                      <AvatarImage src={getFuncionarioPhotoUrl(func)} />
                      <AvatarFallback className="bg-gray-100 text-gray-600">
                        {func?.nome?.substring(0, 2).toUpperCase() || 'NA'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{func?.nome}</p>
                      <p className="text-sm font-bold text-[#C62828]">{formatMinutesToHHMM(alert.saldo_total)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Main Table */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-100">
            <CardTitle className="text-lg text-gray-800">
              Banco de Horas — {MONTHS[month - 1]} {year}
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[80px]">Foto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Saldo Anterior</TableHead>
                  <TableHead>Saldo do Mês</TableHead>
                  <TableHead>Saldo Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white">
                {saldos.map((saldo) => {
                  const func = saldo.expand?.funcionario_id
                  const isPositive = saldo.saldo_total > 0
                  const isNegative = saldo.saldo_total < 0
                  
                  return (
                    <TableRow key={saldo.id} className="hover:bg-gray-50/50">
                      <TableCell>
                        <Avatar className="h-10 w-10 border border-gray-100">
                          <AvatarImage src={getFuncionarioPhotoUrl(func)} />
                          <AvatarFallback className="bg-[#F5F0E8] text-[#C8922A] font-medium">
                            {func?.nome?.substring(0, 2).toUpperCase() || 'NA'}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium text-gray-700">{func?.nome || 'Desconhecido'}</TableCell>
                      <TableCell className="text-gray-600">{formatMinutesToHHMM(saldo.saldo_anterior)}</TableCell>
                      <TableCell className="text-gray-600">{formatMinutesToHHMM(saldo.saldo_mes)}</TableCell>
                      <TableCell className={`font-bold ${isPositive ? 'text-[#2E7D32]' : isNegative ? 'text-[#C62828]' : 'text-gray-600'}`}>
                        {formatMinutesToHHMM(saldo.saldo_total)}
                      </TableCell>
                      <TableCell>
                        {isPositive ? (
                          <Badge className="bg-[#2E7D32] hover:bg-[#2E7D32]/90 text-white border-transparent">Positivo</Badge>
                        ) : isNegative ? (
                          <Badge className="bg-[#C62828] hover:bg-[#C62828]/90 text-white border-transparent">Negativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300 border-transparent">Zerado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="text-[#C8922A] hover:text-[#b08020] hover:bg-[#F5F0E8]">
                          <Link to={`/gestao/ponto/cartao/${func?.id}`}>
                            Ver Cartão <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {saldos.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                      Nenhum registro encontrado para o período selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  )
}
