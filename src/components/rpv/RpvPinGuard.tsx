import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Delete } from 'lucide-react'

interface RpvPinGuardProps {
  children: React.ReactNode
}

export function RpvPinGuard({ children }: RpvPinGuardProps) {
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    const isAuth = sessionStorage.getItem('rpv_autenticado')
    if (isAuth === 'true') {
      setAuthenticated(true)
    }
  }, [])

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setError(false)
      const newPin = pin + digit
      setPin(newPin)

      if (newPin.length === 4) {
        if (newPin === '2683') {
          sessionStorage.setItem('rpv_autenticado', 'true')
          setAuthenticated(true)
        } else {
          setError(true)
          setTimeout(() => setPin(''), 500)
        }
      }
    }
  }

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1))
      setError(false)
    }
  }

  if (authenticated) {
    return <>{children}</>
  }

  return (
    <div
      className="-m-4 sm:-m-8 p-4 sm:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] animate-fade-in"
      style={{ backgroundColor: '#FAF8F2' }}
    >
      <Card className="w-full max-w-md shadow-lg border-0 bg-white">
        <CardHeader className="space-y-2 pb-6 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-[#C9922A]">
            RPV / PRECATÓRIO
          </CardTitle>
          <p className="text-muted-foreground text-sm">Insira seu PIN para acessar</p>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex justify-center gap-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={cn(
                  'w-14 h-16 rounded-xl border-2 flex items-center justify-center text-3xl transition-all duration-200',
                  pin.length > index
                    ? 'border-[#C9922A] bg-[#C9922A]/10 text-[#C9922A]'
                    : 'border-gray-200',
                  error && 'border-red-500 bg-red-50 text-red-500',
                )}
              >
                {pin.length > index ? '•' : ''}
              </div>
            ))}
          </div>

          <div className="h-5 flex items-center justify-center">
            {error && (
              <p className="text-red-500 text-sm font-medium animate-fade-in">
                PIN incorreto. Tente novamente.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-16 text-2xl font-medium rounded-2xl hover:bg-[#C9922A] hover:text-white hover:border-[#C9922A] transition-colors"
                onClick={() => handleDigit(num.toString())}
              >
                {num}
              </Button>
            ))}
            <div className="col-start-2">
              <Button
                variant="outline"
                className="h-16 w-full text-2xl font-medium rounded-2xl hover:bg-[#C9922A] hover:text-white hover:border-[#C9922A] transition-colors"
                onClick={() => handleDigit('0')}
              >
                0
              </Button>
            </div>
            <div className="col-start-3">
              <Button
                variant="outline"
                className="h-16 w-full text-2xl font-medium rounded-2xl text-gray-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                onClick={handleDelete}
              >
                <Delete className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
