import { useState, useEffect, useMemo } from 'react'
import { getPericias, type Pericia } from '@/services/pericias'
import { useRealtime } from '@/hooks/use-realtime'
import { Dashboard } from './pericias/Dashboard'
import { Summary } from './pericias/Summary'
import { PericiasTable } from './pericias/Table'
import { FormModal } from './pericias/FormModal'
import { DeleteModal } from './pericias/DeleteModal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function Pericias() {
  const [data, setData] = useState<Pericia[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Pericia | null>(null)
  const [deletingItem, setDeletingItem] = useState<Pericia | null>(null)

  const loadData = async () => {
    try {
      const items = await getPericias()
      setData(items)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('pericias', loadData)

  const years = useMemo(() => {
    const allYears = data.map((d) => new Date(d.data).getFullYear())
    const unique = Array.from(new Set(allYears))
    const current = new Date().getFullYear()
    if (!unique.includes(current)) unique.push(current)
    return unique.sort((a, b) => b - a)
  }, [data])

  const yearData = useMemo(
    () => data.filter((d) => new Date(d.data).getFullYear() === year),
    [data, year],
  )

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Perícias</h1>
          <p className="text-muted-foreground mt-1">Acompanhamento de perícias ativas</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button
            onClick={() => {
              setEditingItem(null)
              setFormModalOpen(true)
            }}
            className="bg-[#C9922A] hover:bg-[#b07f24] text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Perícia
          </Button>
        </div>
      </div>

      <Dashboard data={yearData} year={year} />
      <Summary data={yearData} />
      <PericiasTable
        data={yearData}
        onEdit={(p) => {
          setEditingItem(p)
          setFormModalOpen(true)
        }}
        onDelete={(p) => setDeletingItem(p)}
      />

      <FormModal open={formModalOpen} onOpenChange={setFormModalOpen} item={editingItem} />
      <DeleteModal item={deletingItem} onClose={() => setDeletingItem(null)} />
    </div>
  )
}
