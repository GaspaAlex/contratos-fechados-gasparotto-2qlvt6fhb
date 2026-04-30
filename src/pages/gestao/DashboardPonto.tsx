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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#C8922A]" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#C8922A]/10 flex items-center justify-center border-2 border-[#C8922A]/20">
            <Users className="w-6 h-6 text-[#C8922A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Ponto</h1>
            <p className="text-sm font-medium text-muted-foreground capitalize mt-1">
              {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy - HH:mm:ss", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {(session?.perfil === 'lider' || session?.perfil === 'admin') && (
            <Button
              onClick={handleRegistrarPonto}
              className="bg-[#C8922A] hover:bg-[#b07c21] text-white rounded-xl h-11 px-5 shadow-sm transition-colors font-bold"
            >
              <Clock className="w-4 h-4 mr-2" />
              <span>Registrar Meu Ponto</span>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-[#C8922A] text-[#C8922A] hover:bg-[#C8922A] hover:text-white rounded-xl h-11 px-5 shadow-sm transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="font-bold">Sair</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="rounded-[24px] border-0 shadow-sm overflow-hidden bg-card">
          <CardHeader className="bg-muted/50 border-b pb-4">
            <CardTitle className="text-lg flex items-center">
              <Users className="w-5 h-5 mr-3 text-[#C8922A]" />
              Equipe
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {funcionarios.map((func) => (
                <div
                  key={func.id}
                  className="p-4 rounded-2xl border flex flex-col gap-4 bg-background hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        func.foto
                          ? func.foto.startsWith('http')
                            ? func.foto
                            : `${import.meta.env.VITE_POCKETBASE_URL}/api/files/funcionarios/${func.id}/${func.foto}`
                          : 'https://img.usecurling.com/ppl/thumbnail?gender=female'
                      }
                      alt={func.nome}
                      className="w-12 h-12 rounded-full object-cover border-2"
                    />
                    <div>
                      <div className="font-bold text-foreground">{func.nome}</div>
                      <div className="text-sm text-muted-foreground capitalize">{func.perfil}</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-[#C8922A]/30 text-[#C8922A] hover:bg-[#C8922A]/10 hover:text-[#C8922A]"
                    onClick={() => navigate(`/gestao/ponto/cartao/${func.id}`)}
                  >
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Ver Cartão
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
