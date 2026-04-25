import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function CartaoPonto() {
  const { funcionarioId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F5F0E8] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate('/gestao/ponto/dashboard')}
          className="bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Dashboard
        </Button>

        <Card className="border-none shadow-sm">
          <CardHeader className="border-b border-gray-100 bg-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#C8922A]/10 rounded-lg">
                <Clock className="h-6 w-6 text-[#C8922A]" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">Cartão de Ponto Detalhado</CardTitle>
                <CardDescription>
                  Visualização em construção para ID: {funcionarioId}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 text-center bg-white rounded-b-xl">
            <div className="max-w-md mx-auto py-12">
              <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Visão Detalhada em Breve</h3>
              <p className="text-gray-500">
                Esta tela exibirá todos os registros diários (entradas, saídas, atestados) do
                funcionário selecionado, permitindo edições e ajustes finos por parte da liderança.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
