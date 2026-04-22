import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()

    if (email === 'escritorio@advocaciagasparotto.com.br' && password === 'Capatcha*200!') {
      localStorage.setItem('gasparotto_auth', 'true')
      navigate('/')
    } else {
      setError(true)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0D0F0C] p-4">
      <div className="w-full max-w-[380px] bg-[#141710] rounded-[10px] p-[32px] border border-[#C9922A]/20 shadow-2xl">
        <div>
          <h1 className="text-[22px] text-[#C9922A] font-bold leading-tight">
            Advocacia Gasparotto
          </h1>
          <p className="text-[13px] text-[#8D9485] mt-1">Sistema de Gestão</p>
        </div>

        <form onSubmit={handleLogin} className="mt-[24px] space-y-[16px]">
          <div>
            <label className="text-[12px] text-[#8D9485] mb-[6px] block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(false)
              }}
              className="bg-[#1B1F17] border border-[#363C2E] rounded-[6px] px-[14px] py-[10px] text-[#ECEEE8] text-[13px] w-full focus:outline-none focus:border-[#C9922A] transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-[12px] text-[#8D9485] mb-[6px] block">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              className="bg-[#1B1F17] border border-[#363C2E] rounded-[6px] px-[14px] py-[10px] text-[#ECEEE8] text-[13px] w-full focus:outline-none focus:border-[#C9922A] transition-colors"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="bg-[#C9922A] text-white font-bold w-full rounded-[6px] py-[11px] text-[14px] hover:opacity-[0.88] transition-opacity"
            >
              Entrar
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
