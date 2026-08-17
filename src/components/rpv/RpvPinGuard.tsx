import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

interface RpvPinGuardProps {
  children: React.ReactNode
}

export function RpvPinGuard({ children }: RpvPinGuardProps) {
  const { user } = useAuth()

  if (user?.perfil === 'gestor') {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background p-4 md:p-8">
      <Card className="w-full max-w-sm border-0 bg-card shadow-xl">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">Acesso restrito a gestores.</p>
        </CardContent>
      </Card>
    </div>
  )
}
