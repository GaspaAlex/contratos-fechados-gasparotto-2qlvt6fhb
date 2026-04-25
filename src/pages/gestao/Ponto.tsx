import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Ponto() {
  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Cartão de Ponto</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Ponto</CardTitle>
          <CardDescription>Módulo em desenvolvimento</CardDescription>
        </CardHeader>
        <CardContent>O sistema de gestão de ponto será disponibilizado em breve.</CardContent>
      </Card>
    </div>
  )
}
