import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Funcionarios() {
  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Funcionários</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Funcionários</CardTitle>
          <CardDescription>Módulo em desenvolvimento</CardDescription>
        </CardHeader>
        <CardContent>
          O sistema de gestão de funcionários será disponibilizado em breve.
        </CardContent>
      </Card>
    </div>
  )
}
