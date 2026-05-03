import { Scale } from 'lucide-react'

export default function Rpv() {
  return (
    <div className="flex flex-col gap-6 h-full animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">RPV/Precatório</h1>
        <p className="text-muted-foreground">Gestão de RPVs e Precatórios</p>
      </div>

      <div className="flex-1 bg-card border rounded-xl flex items-center justify-center shadow-sm p-8">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Scale className="w-8 h-8 text-[#C9922A]" />
          </div>
          <div className="text-center">
            <h3 className="font-medium text-foreground text-lg">Módulo em Desenvolvimento</h3>
            <p className="text-sm mt-1 max-w-[300px]">
              A área de gestão de RPVs e Precatórios estará disponível em breve.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
