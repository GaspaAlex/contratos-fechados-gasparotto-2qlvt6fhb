import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Key } from 'lucide-react'

interface RpvPinGuardProps {
  children: React.ReactNode
}

export function RpvPinGuard({ children }: RpvPinGuardProps) {
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setError(false)
      setPin(pin + digit)
    }
  }

  const handleClear = () => {
    setPin('')
    setError(false)
  }

  const handleEnter = () => {
    if (pin === '2683') {
      setAuthenticated(true)
    } else {
      setError(true)
      setPin('')
    }
  }

  if (authenticated) {
    return <>{children}</>
  }

  return (
    <div className="-m-4 sm:-m-8 p-4 sm:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] animate-fade-in bg-background">
      <Card className="w-full max-w-md shadow-lg border-0 bg-card overflow-hidden">
        <div className="bg-[#C9922A] p-8 text-center text-white flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mb-1">
            <Key className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">RPV / PRECATÓRIO</h2>
          <p className="text-white/90 text-sm">Insira seu PIN para acessar</p>
        </div>
        <CardContent className="p-8 space-y-8">
          <div className="flex justify-center gap-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={cn(
                  'w-14 h-16 rounded-xl border-2 flex items-center justify-center text-3xl transition-all duration-200',
                  pin.length > index
                    ? 'border-[#C9922A] bg-[#C9922A]/10 text-[#C9922A]'
                    : 'border-border dark:border-border',
                  error && 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-500',
                )}
              >
                {pin.length > index ? '•' : ''}
              </div>
            ))}
          </div>

          <div className="h-6 flex items-center justify-center">
            {error && (
              <p className="text-red-500 text-sm font-medium animate-fade-in">
                PIN incorreto. Tente novamente.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-[300px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-14 sm:h-16 text-2xl font-medium rounded-2xl hover:bg-[#C9922A] hover:text-white hover:border-[#C9922A] transition-colors bg-card text-foreground border-border"
                onClick={() => handleDigit(num.toString())}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-14 sm:h-16 text-sm font-bold rounded-2xl text-muted-foreground hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors bg-card border-border"
              onClick={handleClear}
            >
              LIMPAR
            </Button>
            <Button
              variant="outline"
              className="h-14 sm:h-16 text-2xl font-medium rounded-2xl hover:bg-[#C9922A] hover:text-white hover:border-[#C9922A] transition-colors bg-card text-foreground border-border"
              onClick={() => handleDigit('0')}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-14 sm:h-16 text-sm font-bold rounded-2xl text-[#C9922A] border-[#C9922A] hover:bg-[#C9922A] hover:text-white transition-colors"
              onClick={handleEnter}
            >
              ENTRAR
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
