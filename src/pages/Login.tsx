import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(false)

    const { error: authError } = await signIn(email, password)

    if (!authError) {
      navigate('/')
    } else {
      setError(true)
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[380px] bg-card rounded-[10px] p-[32px] border border-[#C9922A]/20 shadow-2xl">
        <div>
          <h1 className="text-[22px] text-primary font-bold leading-tight">Advocacia Gasparotto</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Sistema de Gestão</p>
        </div>

        <form onSubmit={handleLogin} className="mt-[24px] space-y-[16px]">
          <div>
            <label className="text-[12px] text-muted-foreground mb-[6px] block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(false)
              }}
              className="bg-background border border-border rounded-[6px] px-[14px] py-[10px] text-foreground text-[13px] w-full focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-[12px] text-muted-foreground mb-[6px] block">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              className="bg-background border border-border rounded-[6px] px-[14px] py-[10px] text-foreground text-[13px] w-full focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#C9922A] text-white font-bold w-full rounded-[6px] py-[11px] text-[14px] hover:opacity-[0.88] transition-opacity flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
            </button>
            {error && (
              <p className="text-[#E84040] text-[12px] mt-[8px] text-center">
                E-mail ou senha incorretos.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
