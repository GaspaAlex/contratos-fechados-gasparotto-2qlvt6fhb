import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getFuncionarioByPin, getFuncionarioByUserId } from '@/services/funcionarios'
import { Loader2, KeyRound } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function Ponto() {
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [colaboradorCheckDone, setColaboradorCheckDone] = useState(false)
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    if (user?.perfil === 'gestor') {
      sessionStorage.setItem(
        'ponto_session',
        JSON.stringify({ id: user.id, nome: user.name, perfil: 'admin' }),
      )
      navigate('/gestao/ponto/dashboard')
    }
    if (user?.perfil === 'colaborador' && !colaboradorCheckDone) {
      getFuncionarioByUserId(user.id)
        .then((func) => {
          if (func && func.ativo) {
            sessionStorage.setItem('ponto_session', JSON.stringify(func))
            navigate('/gestao/ponto/registrar')
          } else {
            setColaboradorCheckDone(true)
          }
        })
        .catch(() => {
          setColaboradorCheckDone(true)
        })
      return // importante: não continua
    }
    if (user?.perfil !== 'gestor' && user?.perfil !== 'colaborador') {
      if (!colaboradorCheckDone) setColaboradorCheckDone(true)
    }
  }, [user, authLoading, navigate])

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (pin.length !== 4) {
      toast.error('O PIN deve ter 4 dígitos.')
      return
    }

    setIsLoading(true)
    try {
      const func = await getFuncionarioByPin(pin)
      if (!func) {
        toast.error('PIN inválido ou funcionário não encontrado.')
        setPin('')
        setIsLoading(false)
        return
      }

      if (!func.ativo) {
        toast.error('Este usuário está inativo.')
        setPin('')
        setIsLoading(false)
        return
      }

      sessionStorage.setItem('ponto_session', JSON.stringify(func))

      // Dedicated redirection for Admin and Leader profiles
      if (func.perfil === 'admin' || func.perfil === 'lider') {
        navigate('/gestao/ponto/dashboard')
      } else {
        navigate('/gestao/ponto/registrar')
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePadClick = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num)
    }
  }

  const handleClear = () => {
    setPin('')
  }

  if (
    authLoading ||
    user?.perfil === 'gestor' ||
    (user?.perfil === 'colaborador' && !colaboradorCheckDone)
  ) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background p-4 font-sans">
      <Card className="w-full max-w-md border border-border shadow-2xl rounded-[24px] overflow-hidden bg-card">
        <div className="bg-primary p-8 text-center text-primary-foreground">
          <KeyRound className="mx-auto mb-4 h-12 w-12 opacity-80" />
          <CardTitle className="text-2xl font-bold tracking-wider">REGISTRO DE PONTO</CardTitle>
          <p className="mt-2 text-primary-foreground/90">Insira seu PIN para acessar</p>
        </div>
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="flex justify-center">
              <div className="flex gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 text-2xl font-bold transition-all ${
                      pin.length > i
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted text-transparent'
                    }`}
                  >
                    {pin.length > i ? '•' : ''}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant="outline"
                  className="h-16 text-2xl font-bold rounded-xl border-border bg-card text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                  onClick={() => handlePadClick(num.toString())}
                >
                  {num}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                className="h-16 text-sm font-bold rounded-xl border-border bg-card text-muted-foreground hover:bg-muted uppercase"
                onClick={handleClear}
              >
                Limpar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-16 text-2xl font-bold rounded-xl border-border bg-card text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                onClick={() => handlePadClick('0')}
              >
                0
              </Button>
              <Button
                type="button"
                className="h-16 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md uppercase"
                onClick={() => handleLogin()}
                disabled={pin.length !== 4 || isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Acesso restrito aos colaboradores da Advocacia Gasparotto.</p>
      </div>
    </div>
  )
}
