import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Gavel } from 'lucide-react'

export default function Pericias() {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Perícias</h1>
        <p className="text-muted-foreground mt-1">Acompanhamento de perícias ativas</p>
      </div>

      <Card className="bg-card text-card-foreground shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Gavel className="h-5 w-5 text-primary" />
            Em desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Esta página estará disponível em breve.</p>
        </CardContent>
      </Card>
    </div>
  )
}
