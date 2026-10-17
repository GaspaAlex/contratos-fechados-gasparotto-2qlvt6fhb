import { ShieldAlert } from 'lucide-react'
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
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-lg">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-[#C77E1E]/10 flex items-center justify-center text-[#C77E1E] mb-1">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2.5 py-0.5 rounded">
            MÓDULO RESTRITO
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            Acesso Restrito
          </h2>
          <p className="text-xs text-[#78818E] dark:text-muted-foreground max-w-xs">
            A gestão de RPVs e Precatórios é restrita a administradores e gestores do Sistema
            Advocacia Gasparotto.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
