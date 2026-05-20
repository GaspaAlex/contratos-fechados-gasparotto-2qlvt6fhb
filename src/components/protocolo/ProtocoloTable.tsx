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
import { Search, Plus } from 'lucide-react'
import { ProtocoloTableRow } from './ProtocoloTableRow'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const normalizeText = (text: string) => {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const monthsArray = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function ProtocoloTable({
  data,
  tipos,
  search,
  setSearch,
  status,
  setStatus,
  origem,
  setOrigem,
  tipo,
  setTipo,
  responsavel,
  setResponsavel,
  month,
  setMonth,
  year,
  setYear,
  monthStart,
  setMonthStart,
  monthEnd,
  setMonthEnd,
  onAdd,
  onEdit,
  onDelete,
}: any) {
  const availableYears = useMemo(() => {
    const years = new Set(data.map((d: any) => (d.dprotocolo ? d.dprotocolo.substring(0, 4) : '')))
    years.delete('')
    const currentYear = new Date().getFullYear().toString()
    years.add(currentYear)
    return Array.from(years).sort().reverse()
  }, [data])

  const responsaveisList = useMemo(() => {
    const list = new Set(
      data.map((d: any) => d.expand?.responsavel?.nome || d.responsavel).filter(Boolean),
    )
    return Array.from(list).sort()
  }, [data])

  // Filters
  const filtered = data.filter((d: any) => {
    if (origem !== 'Todos' && d.origem !== origem) return false
    const searchNormalized = normalizeText(search)
    if (searchNormalized) {
      const nNome = normalizeText(d.nome)
      const nResp = normalizeText(d.expand?.responsavel?.nome)
      const nTipo = normalizeText(d.expand?.tipo_acao?.nome)
      const nAutos = normalizeText(d.nautos)

      if (
        !nNome.includes(searchNormalized) &&
        !nResp.includes(searchNormalized) &&
        !nTipo.includes(searchNormalized) &&
        !nAutos.includes(searchNormalized)
      ) {
        return false
      }
    }
    if (status !== 'Todos' && d.status !== status) return false
    if (tipo !== 'Todos' && d.expand?.tipo_acao?.nome !== tipo) return false
    const respName = d.expand?.responsavel?.nome || d.responsavel || ''
    if (responsavel !== 'Todos' && respName !== responsavel) return false

    if (year !== 'Todos') {
      if (!d.dprotocolo || d.dprotocolo.substring(0, 4) !== year) return false
    }

    const hasRange = monthStart !== 'Todos' && monthEnd !== 'Todos'

    if (hasRange) {
      const dMonth = d.dprotocolo ? parseInt(d.dprotocolo.substring(5, 7), 10) - 1 : -1
      const start = parseInt(monthStart, 10)
      const end = parseInt(monthEnd, 10)
      if (dMonth < start || dMonth > end) return false
    } else if (month !== 'Todos') {
      const dMonth = d.dprotocolo ? (parseInt(d.dprotocolo.substring(5, 7), 10) - 1).toString() : ''
      if (dMonth !== month) return false
    }

    return true
  })

  // Chronological Sorting: ascending
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = a.dprotocolo ? new Date(a.dprotocolo).getTime() : 0
      const dateB = b.dprotocolo ? new Date(b.dprotocolo).getTime() : 0
      return dateA - dateB
    })
  }, [filtered])

  // Analytics - Decisions
  const procedentes = filtered.filter((d: any) => d.decisao === 'Procedente').length
  const improcedentes = filtered.filter((d: any) => d.decisao === 'Improcedente').length
  const totalDecisoes = procedentes + improcedentes
  const percProc = totalDecisoes ? Math.round((procedentes / totalDecisoes) * 100) : 0
  const percImp = totalDecisoes ? Math.round((improcedentes / totalDecisoes) * 100) : 0

  // Grouping
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {}
    sortedFiltered.forEach((d: any) => {
      const m = d.dprotocolo ? d.dprotocolo.substring(0, 7) : '0000-00'
      if (!groups[m]) groups[m] = []
      groups[m].push(d)
    })
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [sortedFiltered])

  const cProtJud = filtered.filter((d: any) => d.status === 'Protocolado Judicial').length
  const cReqAdm = filtered.filter((d: any) => d.status === 'Requerimento Adm.').length
  const cProv = filtered.filter((d: any) => d.status === 'Prov. Inicial').length
  const cDocs = filtered.filter((d: any) => d.status === 'R. Docs').length

  const headerClass =
    'text-[10px] uppercase tracking-wider text-muted-foreground font-bold whitespace-nowrap'

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
        <p>
          Prot. Judicial: {cProtJud} | Req. Adm.: {cReqAdm} | Prov. Inicial: {cProv} | R. Docs:{' '}
          {cDocs} | Total: {filtered.length}
        </p>
      </div>

      {/* Decisions Mini-Dashboard */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            DECISÕES
          </h3>
          {totalDecisoes > 0 ? (
            <>
              <div className="h-2 w-full rounded-sm overflow-hidden flex bg-muted mb-3">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${percProc}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${percImp}%` }}
                />
              </div>
              <div className="flex gap-6 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 text-lg leading-none">●</span>
                  <span>
                    {procedentes} Procedentes ({percProc}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-rose-500 text-lg leading-none">●</span>
                  <span>
                    {improcedentes} Improcedentes ({percImp}%)
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma decisão registrada ainda</p>
          )}
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-card p-3 rounded-lg border shadow-sm">
        <div className="flex gap-3 w-full xl:w-auto flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, resp. ou autos..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-[170px] h-9 text-sm">
              <SelectValue placeholder="Todos os Benefícios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Benefícios</SelectItem>
              {tipos.map((t: any) => (
                <SelectItem key={t.id} value={t.nome}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={responsavel} onValueChange={setResponsavel}>
            <SelectTrigger className="w-[170px] h-9 text-sm">
              <SelectValue placeholder="Todos os Responsáveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Responsáveis</SelectItem>
              {responsaveisList.map((r: any) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Todos os meses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os meses</SelectItem>
              {monthsArray.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Todos os anos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os anos</SelectItem>
              {availableYears.map((y: any) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 items-center border-l pl-3 ml-1 border-muted">
            <Select value={monthStart} onValueChange={setMonthStart}>
              <SelectTrigger className="w-[100px] h-9 text-sm">
                <SelectValue placeholder="De" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">De</SelectItem>
                {monthsArray.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthEnd} onValueChange={setMonthEnd}>
              <SelectTrigger className="w-[100px] h-9 text-sm">
                <SelectValue placeholder="Até" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Até</SelectItem>
                {monthsArray.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-9 px-3 text-xs"
              onClick={() => {
                setMonthStart('Todos')
                setMonthEnd('Todos')
              }}
            >
              Limpar
            </Button>
          </div>
        </div>
        <div className="flex gap-3 w-full xl:w-auto justify-end items-center">
          <div className="flex p-1 bg-muted rounded-md overflow-hidden flex-wrap items-center">
            {[
              { value: 'Todos', label: 'Todos' },
              { value: 'Protocolado Judicial', label: 'Judicial' },
              { value: 'Requerimento Adm.', label: 'Administrativo' },
              { value: 'Prov. Inicial', label: 'Inicial' },
              { value: 'R. Docs', label: 'Docs' },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`px-3 py-1 text-xs rounded-sm transition-colors ${status === s.value ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground font-medium'}`}
              >
                {s.label}
              </button>
            ))}
            <div className="w-px h-4 bg-border mx-1" />
            {['Campanha', 'Particular'].map((o) => (
              <button
                key={o}
                onClick={() => setOrigem(origem === o ? 'Todos' : o)}
                className={`px-3 py-1 text-xs rounded-sm transition-colors ${origem === o ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground font-medium'}`}
              >
                {o}
              </button>
            ))}
          </div>
          <Button
            onClick={onAdd}
            className="bg-[#C9922A] hover:bg-[#C9922A]/90 text-white h-9 px-4 gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50 border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className={`w-10 ${headerClass}`}>#</TableHead>
              <TableHead className={headerClass}>NOME</TableHead>
              <TableHead className={headerClass}>BENEFÍCIO</TableHead>
              <TableHead className={headerClass}>RESP.</TableHead>
              <TableHead className={headerClass}>STATUS</TableHead>
              <TableHead className={headerClass}>ORIGEM</TableHead>
              <TableHead className={headerClass}>D. CONTRATO</TableHead>
              <TableHead className={headerClass}>D. PROTOCOLO</TableHead>
              <TableHead className={headerClass}>Nº AUTOS</TableHead>
              <TableHead className={`text-right ${headerClass}`}>VALOR</TableHead>
              <TableHead className={`text-right ${headerClass}`}>HONORÁRIOS (30%)</TableHead>
              <TableHead className={headerClass}>DECISÃO</TableHead>
              <TableHead className={`w-20 text-center ${headerClass}`}>AÇÕES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map(([monthStr, items]) => {
              const projCount = items.filter(
                (i) =>
                  ['Protocolado Judicial', 'Requerimento Adm.', 'Prov. Inicial'].includes(
                    i.status,
                  ) && i.decisao !== 'Improcedente',
              ).length
              const label =
                monthStr !== '0000-00'
                  ? format(parseISO(`${monthStr}-01T12:00:00Z`), 'MMMM yyyy', { locale: ptBR })
                  : 'SEM DATA'
              return (
                <React.Fragment key={monthStr}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                    <TableCell
                      colSpan={13}
                      className="text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-4"
                    >
                      <strong className="font-bold text-foreground">{label}</strong> • {projCount}{' '}
                      CASO(S) NA PROJEÇÃO
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
                <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                  Nenhum protocolo encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
