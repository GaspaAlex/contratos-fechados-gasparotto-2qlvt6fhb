import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function BaterPonto() {
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    const data = sessionStorage.getItem('ponto_session')
    if (data) {
      setSession(JSON.parse(data))
    } else {
      navigate('/gestao/ponto')
    }
  }, [navigate])

  if (!session) return null

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Registrar Ponto</h2>
        <Button
          variant="outline"
          onClick={() => {
            sessionStorage.removeItem('ponto_session')
            navigate('/gestao/ponto')
          }}
        >
          Sair da Sessão
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Olá, {session.nome}</CardTitle>
          <CardDescription>Selecione a ação desejada para registrar seu horário.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            O sistema de registro de ponto do funcionário será disponibilizado em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
