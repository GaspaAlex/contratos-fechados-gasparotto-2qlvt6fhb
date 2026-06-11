import { useState } from 'react'
import { Plus, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function LeadsRegistro() {
  const [activeTab, setActiveTab] = useState<'DER' | 'AUX. ACIDENTE'>('DER')
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))

  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return format(d, 'yyyy-MM')
  })

  return (
    <div className="flex flex-col h-full bg-[#FAF8F2] min-h-[calc(100vh-8rem)] rounded-xl overflow-hidden p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sans">Registro de Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os registros individuais de leads.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] bg-white border-muted font-sans">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent className="font-sans">
              {months.map((m) => {
                const [year, month] = m.split('-')
                const date = new Date(parseInt(year), parseInt(month) - 1)
                return (
                  <SelectItem key={m} value={m} className="capitalize">
                    {format(date, 'MMMM yyyy', { locale: ptBR })}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Button className="bg-[#C9922A] hover:bg-[#b07d22] text-white font-sans font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-border/50">
        <button
          onClick={() => setActiveTab('DER')}
          className={`pb-3 px-4 text-sm font-semibold tracking-wide transition-colors relative font-sans ${
            activeTab === 'DER' ? 'text-[#C9922A]' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          DER
          {activeTab === 'DER' && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#C9922A] rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('AUX. ACIDENTE')}
          className={`pb-3 px-4 text-sm font-semibold tracking-wide transition-colors relative font-sans ${
            activeTab === 'AUX. ACIDENTE'
              ? 'text-[#C9922A]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          AUX. ACIDENTE
          {activeTab === 'AUX. ACIDENTE' && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#C9922A] rounded-t-full" />
          )}
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-border/50 shadow-sm p-8 flex items-center justify-center animate-fade-in-up duration-500">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-[#FAF8F2] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#C9922A]/20">
            <ClipboardList className="w-8 h-8 text-[#C9922A]" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2 font-sans">Em construção</h3>
          <p className="text-muted-foreground font-sans">
            A listagem de registros da aba{' '}
            <span className="font-semibold text-foreground">{activeTab}</span> estará disponível em
            breve.
          </p>
        </div>
      </div>
    </div>
  )
}
