import { useState, useMemo, Fragment } from 'react'
import { Pericia } from '@/services/pericias'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Search, Edit2, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function PericiasTable({
  data,
  onEdit,
  onDelete,
}: {
  data: Pericia[]
  onEdit: (p: Pericia) => void
  onDelete: (p: Pericia) => void
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

  const filtered = useMemo(() => {
    return data.filter((d) => {
      const matchSearch =
        d.nome.toLowerCase().includes(search.toLowerCase()) || d.nautos.includes(search)
      const matchStatus = statusFilter === 'Todos' || d.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [data, search, statusFilter])

  const grouped = useMemo(() => {
    const groups: Record<string, Pericia[]> = {}
    filtered.forEach((d) => {
      const date = parseISO(d.data)
      const key = format(date, 'MMM yyyy', { locale: ptBR }).toUpperCase()
      if (!groups[key]) groups[key] = []
      groups[key].push(d)
    })
    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    })
    const sortedGroups: Record<string, Pericia[]> = {}
    Object.keys(groups)
      .sort((a, b) => new Date(groups[a][0].data).getTime() - new Date(groups[b][0].data).getTime())
      .forEach((k) => {
        sortedGroups[k] = groups[k]
      })
    return sortedGroups
  }, [filtered])

  const renderStatus = (status: string) => {
    if (status === 'Agendado')
      return (
        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold uppercase dark:bg-emerald-500/20 dark:text-emerald-400">
          {status}
        </span>
      )
    if (status === 'Pendente')
      return (
        <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[11px] font-semibold uppercase dark:bg-amber-500/20 dark:text-amber-400">
          {status}
        </span>
      )
    return (
      <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-[11px] font-semibold uppercase dark:bg-gray-500/20 dark:text-gray-400">
        {status}
      </span>
    )
  }

  const renderCompareceu = (comp: string) => {
    if (comp === 'Não realizada')
      return <span className="text-muted-foreground font-medium">—</span>
    if (comp === 'Sim')
      return <span className="text-emerald-600 font-medium dark:text-emerald-500">{comp}</span>
    return <span className="text-rose-600 font-medium dark:text-rose-500">{comp}</span>
  }

  const renderLaudo = (laudo: string) => {
    if (laudo === 'Favorável')
      return (
        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold uppercase dark:bg-emerald-500/20 dark:text-emerald-400">
          {laudo}
        </span>
      )
    if (laudo === 'Desfavorável')
      return (
        <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 text-[11px] font-semibold uppercase dark:bg-rose-500/20 dark:text-rose-400">
          {laudo}
        </span>
      )
    return <span className="text-muted-foreground font-medium">—</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou nº processo..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 bg-background text-sm h-10 min-w-[150px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="Todos">Todos os Status</option>
          <option value="Agendado">Agendado</option>
          <option value="Pendente">Pendente</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Cliente / Processo</TableHead>
              <TableHead>Data / Hora</TableHead>
              <TableHead>Perito / Endereço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Compareceu</TableHead>
              <TableHead>Laudo</TableHead>
              <TableHead className="w-[80px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(grouped).map(([groupName, items]) => (
              <Fragment key={groupName}>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell
                    colSpan={7}
                    className="font-semibold text-xs text-muted-foreground tracking-wider py-2"
                  >
                    {groupName} &nbsp;&nbsp;{items.length}{' '}
                    {items.length === 1 ? 'PERÍCIA' : 'PERÍCIAS'}
                  </TableCell>
                </TableRow>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="align-top py-4">
                      <div className="font-semibold text-sm text-foreground">{item.nome}</div>
                      <div className="mt-1.5 bg-blue-500/15 text-blue-700 dark:text-blue-400 font-mono text-xs px-2 py-1 rounded w-fit max-w-full break-all">
                        {item.nautos}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="text-sm font-medium">
                        {format(parseISO(item.data), 'dd/MM/yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.horario || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="text-sm font-medium">{item.perito || '—'}</div>
                      <div
                        className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]"
                        title={item.endereco}
                      >
                        {item.endereco || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">{renderStatus(item.status)}</TableCell>
                    <TableCell className="align-top py-4">
                      {renderCompareceu(item.compareceu)}
                    </TableCell>
                    <TableCell className="align-top py-4">{renderLaudo(item.laudo)}</TableCell>
                    <TableCell className="align-top py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(item)}
                          className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-md dark:hover:bg-gray-800 dark:hover:text-gray-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(item)}
                          className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-md dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
            {Object.keys(grouped).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhuma perícia encontrada para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
