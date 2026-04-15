import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MonthlyGrid } from '@/components/dashboard/MonthlyGrid'
import { RDocsDashboard } from '@/components/dashboard/RDocsDashboard'
import { ContractsTable } from '@/components/dashboard/ContractsTable'
import { PartnershipsSummary } from '@/components/dashboard/PartnershipsSummary'

export default function Index() {
  const [year, setYear] = useState('2026')

  return (
    <div className="mx-auto w-full max-w-[1400px] animate-fade-in-up">
      {/* Header Section */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Contratos Fechados
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">Registro de fechamentos mensais</p>
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="bg-card text-foreground shadow-sm border-primary/20 focus:ring-primary">
              <SelectValue placeholder="Selecione o ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <MonthlyGrid />
      <RDocsDashboard />
      <ContractsTable />
      <PartnershipsSummary />
    </div>
  )
}
