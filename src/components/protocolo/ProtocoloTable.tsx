import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, CheckCircle2 } from 'lucide-react'
import { ProtocoloTableRow } from './ProtocoloTableRow'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function ProtocoloTable({ data, tipos, onAdd, onEdit, onDelete }: any) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Todos')
  const [tipo, setTipo] = useState('Todos')

  // Filters
  const filtered = data.filter((d: any) => {
    if (
      search &&
      !d.nome.toLowerCase().includes(search.toLowerCase()) &&
      !d.nautos?.includes(search)
    )
      return false
    if (status !== 'Todos' && d.status !== status) return false
    if (tipo !== 'Todos' && d.expand?.tipo_acao?.nome !== tipo) return false
    return true
  })

  // Analytics
  const decTotal =
    filtered.filter((d: any) => d.decisao === 'Procedente' || d.decisao === 'Improcedente')
      .length || 1
  const percProc = (filtered.filter((d: any) => d.decisao === 'Procedente').length / decTotal) * 100
  const percImp =
    (filtered.filter((d: any) => d.decisao === 'Improcedente').length / decTotal) * 100

  const typeStats = useMemo(() => {
    const stats: Record<string, { total: number; proc: number }> = {}
    filtered.forEach((d: any) => {
      const t = d.expand?.tipo_acao?.nome || 'Sem Tipo'
      if (!stats[t]) stats[t] = { total: 0, proc: 0 }
      stats[t].total++
      if (d.decisao === 'Procedente') stats[t].proc++
    })
    return stats
  }, [filtered])

  // Grouping
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {}
    filtered.forEach((d: any) => {
      const m = d.dprotocolo ? format(parseISO(d.dprotocolo), 'yyyy-MM') : '0000-00'
      if (!groups[m]) groups[m] = []
      groups[m].push(d)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const cProt = filtered.filter((d: any) => d.status === 'Protocolado').length
  const cProv = filtered.filter((d: any) => d.status === 'Prov. Inicial').length
  const cDocs = filtered.filter((d: any) => d.status === 'R. Docs').length

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-muted-foreground">
        Protocolados: {cProt} | Prov. Inicial: {cProv} | R. Docs: {cDocs} | Total: {filtered.length}
      </p>

      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
        <div className="flex gap-2 w-full xl:w-auto">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os tipos</SelectItem>
              {tipos.map((t: any) => (
                <SelectItem key={t.id} value={t.nome}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 w-full xl:w-auto justify-end">
          <div className="flex gap-1 p-1 bg-muted rounded-md flex-wrap">
            {['Todos', 'Protocolado', 'Prov. Inicial', 'R. Docs'].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${status === s ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:bg-background/50'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <Button onClick={onAdd} className="bg-[#C9922A] hover:bg-[#C9922A]/90 text-white gap-2">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>

      <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${percProc}%` }}
          title={`Procedente: ${percProc.toFixed(1)}%`}
        />
        <div
          className="h-full bg-rose-500 transition-all duration-500"
          style={{ width: `${percImp}%` }}
          title={`Improcedente: ${percImp.toFixed(1)}%`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm pb-1">
        <span className="text-muted-foreground font-semibold text-xs mr-2">POR TIPO:</span>
        {Object.entries(typeStats).map(([t, s]) => (
          <button
            key={t}
            onClick={() => setTipo(tipo === t ? 'Todos' : t)}
            className={`px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${tipo === t ? 'bg-[#C9922A] text-white border-[#C9922A]' : 'bg-card hover:bg-muted'}`}
          >
            <span>{t}</span>
            <span className="bg-background/40 px-1.5 rounded-sm text-xs border">{s.total}</span>
            {s.proc > 0 && (
              <span className="text-emerald-500 dark:text-emerald-400 text-xs flex items-center gap-0.5">
                <CheckCircle2 className="h-3 w-3" />
                {s.proc}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>NOME</TableHead>
              <TableHead>TIPO</TableHead>
              <TableHead>RESP.</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>D. CONTRATO</TableHead>
              <TableHead>D. PROTOCOLO</TableHead>
              <TableHead>PRAZO</TableHead>
              <TableHead>Nº AUTOS</TableHead>
              <TableHead className="text-right">VALOR</TableHead>
              <TableHead className="text-right">HONORÁRIOS (30%)</TableHead>
              <TableHead>DECISÃO</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map(([month, items]) => {
              const projCount = items.filter(
                (i) =>
                  ['Protocolado', 'Prov. Inicial'].includes(i.status) &&
                  i.decisao !== 'Improcedente',
              ).length
              const label =
                month !== '0000-00'
                  ? format(parseISO(`${month}-01T12:00:00Z`), 'MMMM yyyy', { locale: ptBR })
                  : 'Sem Data'
              return (
                <React.Fragment key={month}>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell
                      colSpan={13}
                      className="font-bold text-xs uppercase text-muted-foreground py-2"
                    >
                      {label} • {projCount} CASO(S) NA PROJEÇÃO
                    </TableCell>
                  </TableRow>
                  {items.map((item, idx) => (
                    <ProtocoloTableRow
                      key={item.id}
                      item={item}
                      index={idx + 1}
                      onEdit={() => onEdit(item)}
                      onDelete={() => onDelete(item)}
                    />
                  ))}
                </React.Fragment>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  Nenhum protocolo encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
