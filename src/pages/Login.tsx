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
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#0D0F0C' }}
    >
      {/* Glow effect */}
      <div
        className="absolute top-0 left-0 w-full max-w-[600px] h-[600px] pointer-events-none -translate-x-1/4 -translate-y-1/4"
        style={{ background: 'radial-gradient(circle, rgba(201,146,42,0.13) 0%, transparent 70%)' }}
      ></div>

      <div
        className="w-full max-w-[360px] relative z-10"
        style={{
          padding: '40px',
          backgroundColor: '#12100A',
          borderRadius: '16px',
          border: '0.5px solid rgba(201,146,42,0.2)',
          boxShadow: '0 0 80px rgba(201,146,42,0.06)',
        }}
      >
        <div className="mb-[32px]">
          <div
            className="inline-block px-[8px] py-[4px] rounded-[4px] text-[10px] font-bold tracking-wider mb-[16px]"
            style={{
              backgroundColor: 'rgba(201,146,42,0.12)',
              color: '#C9922A',
              border: '0.5px solid rgba(201,146,42,0.2)',
            }}
          >
            SISTEMA INTERNO
          </div>
          <h1 className="font-bold leading-tight" style={{ color: '#F5E9D0', fontSize: '22px' }}>
            Advocacia Gasparotto
          </h1>
          <p className="mt-[4px]" style={{ color: 'rgba(245,233,208,0.45)', fontSize: '13px' }}>
            Sistema de Gestão
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-[20px]">
          <div>
            <label
              className="mb-[8px] block font-medium"
              style={{ color: 'rgba(245,233,208,0.55)', fontSize: '12px' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(false)
              }}
              className="w-full rounded-[8px] px-[16px] py-[12px] text-[14px] transition-colors focus:outline-none placeholder:text-[#F5E9D0]/30"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(201,146,42,0.25)',
                color: '#F5E9D0',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#C9922A')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(201,146,42,0.25)')}
              required
            />
          </div>

          <div>
            <label
              className="mb-[8px] block font-medium"
              style={{ color: 'rgba(245,233,208,0.55)', fontSize: '12px' }}
            >
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              className="w-full rounded-[8px] px-[16px] py-[12px] text-[14px] transition-colors focus:outline-none placeholder:text-[#F5E9D0]/30"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(201,146,42,0.25)',
                color: '#F5E9D0',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#C9922A')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(201,146,42,0.25)')}
              required
            />
          </div>

          <div className="pt-[8px]">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-[8px] py-[12px] text-[14px] font-bold transition-opacity flex items-center justify-center hover:opacity-[0.88] disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#C9922A',
                color: '#0D0F0C',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
            </button>
            {error && (
              <p className="text-[#E84040] text-[12px] mt-[12px] text-center font-medium">
                E-mail ou senha incorretos.
              </p>
            )}
          </div>
        </form>

        <div className="flex items-center gap-[12px] mt-[36px]">
          <div
            className="h-[1px] flex-1"
            style={{ backgroundColor: 'rgba(201,146,42,0.15)' }}
          ></div>
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: 'rgba(245,233,208,0.3)' }}
          >
            acesso restrito
          </span>
          <div
            className="h-[1px] flex-1"
            style={{ backgroundColor: 'rgba(201,146,42,0.15)' }}
          ></div>
        </div>
      </div>
    </div>
  )
}
