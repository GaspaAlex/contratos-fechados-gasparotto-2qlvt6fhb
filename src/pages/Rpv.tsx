import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getRpvs } from '@/services/rpv'
import { RpvFilters } from '@/components/rpv/RpvFilters'
import { RpvTable } from '@/components/rpv/RpvTable'
import { RpvFormModal } from '@/components/rpv/RpvFormModal'
import { RpvDashboard, calculateHonorariosEscritorio } from '@/components/rpv/RpvDashboard'
import { RpvPinGuard } from '@/components/rpv/RpvPinGuard'
import { printReport, PrintReportColumn } from '@/lib/print-report'
import { useRpvFilters } from '@/components/rpv/store'
import { MONTHS } from '@/components/rpv/constants'

export default function Rpv() {
  const [data, setData] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('Todos')
  const [status, setStatus] = useState('Todos')
  const [month, setMonth] = useState('Todos')
  const [year, setYear] = useState('Todos')

  const { quickFilter, parceriaFilter } = useRpvFilters()
  const [currentVisibleData, setCurrentVisibleData] = useState<any[]>([])

  const [formOpen, setFormOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<any>(null)

  const loadData = async () => {
    try {
      const res = await getRpvs()
      setData(res)
    } catch (e) {
      console.error('Failed to load RPVs:', e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('rpv_precatorio', () => {
    loadData()
  })

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (search) {
        const query = search.toLowerCase().trim()
        const matchName = item.nome?.toLowerCase().includes(query)
        const matchProc = item.numero_processo?.toLowerCase().includes(query)
        if (!matchName && !matchProc) return false
      }
      if (tipo !== 'Todos' && item.tipo !== tipo) return false
      if (status !== 'Todos' && item.status !== status) return false

      const [m, y] = (item.previsao_pagamento || '').split('/')
      if (month !== 'Todos' && m !== month) return false
      if (year !== 'Todos' && y !== year) return false
      return true
    })
  }, [data, search, tipo, status, month, year])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  const formatDateRecebimento = (dateStr?: string) => {
    if (!dateStr) return '-'
    const onlyDate = dateStr.split(' ')[0].split('T')[0]
    const parts = onlyDate.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const getStatusBadgeHtml = (st: string) => {
    if (!st) return '-'
    let badgeClass = 'badge-gray'
    if (st === 'Recebido') badgeClass = 'badge-recebido'
    else if (st === 'Aguardando pagamento') badgeClass = 'badge-aguardando'
    else if (st === 'Aguardando expedição') badgeClass = 'badge-amber'
    else if (st === 'Aguardando Alvará') badgeClass = 'badge-purple'
    else if (st === 'Aguardando pagto sucumbência') badgeClass = 'badge-orange'
    else if (st === 'Cálculo Impugnado') badgeClass = 'badge-red'
    else if (st === 'Cálculo apresentado') badgeClass = 'badge-aguardando'
    else if (st.includes('Precatório')) badgeClass = 'badge-purple'

    return `<span class="badge ${badgeClass}">${st}</span>`
  }

  const getTipoBadgeHtml = (t: string) => {
    if (!t) return '-'
    const badgeClass = t === 'Precatório' ? 'badge-precatorio' : 'badge-rpv'
    return `<span class="badge ${badgeClass}">${t}</span>`
  }

  const handlePrintReport = useCallback(() => {
    // Array to print: exactly the records displayed in the table (currentVisibleData)
    const recordsToPrint =
      currentVisibleData.length > 0 || filteredData.length === 0 ? currentVisibleData : filteredData

    // Build human-readable filter list
    const activeFiltersList: string[] = []

    if (search.trim()) {
      activeFiltersList.push(`Busca: "${search.trim()}"`)
    }
    if (quickFilter && quickFilter !== 'Todos') {
      if (quickFilter === 'Por Parceria' && parceriaFilter !== 'Todos os parceiros') {
        activeFiltersList.push(`Parceria: ${parceriaFilter}`)
      } else {
        activeFiltersList.push(`Filtro Rápido: ${quickFilter}`)
      }
    }
    if (tipo !== 'Todos') {
      activeFiltersList.push(`Tipo: ${tipo}`)
    }
    if (status !== 'Todos') {
      activeFiltersList.push(`Status: ${status}`)
    }
    if (month !== 'Todos') {
      const monthLabel = MONTHS.find((m) => m.value === month)?.label || month
      activeFiltersList.push(`Mês: ${monthLabel}`)
    }
    if (year !== 'Todos') {
      activeFiltersList.push(`Ano: ${year}`)
    }

    const columns: PrintReportColumn[] = [
      {
        header: '#',
        accessor: (_item, idx) => String(idx + 1),
        align: 'center',
        width: '32px',
      },
      {
        header: 'Nome / CPF',
        accessor: (item) => {
          const nome = item.nome || '-'
          const cpf = item.cpf
            ? `<div style="font-size: 9px; color: #6b7280; margin-top: 1px;">${item.cpf}</div>`
            : ''
          return `<strong>${nome}</strong>${cpf}`
        },
        align: 'left',
      },
      {
        header: 'Nº Processo',
        accessor: (item) =>
          `<span style="font-family: monospace; font-size: 10px;">${item.numero_processo || '-'}</span>`,
        align: 'left',
      },
      {
        header: 'Tipo',
        accessor: (item) => getTipoBadgeHtml(item.tipo),
        align: 'center',
        width: '85px',
      },
      {
        header: 'Status',
        accessor: (item) => getStatusBadgeHtml(item.status),
        align: 'center',
      },
      {
        header: 'Parceria',
        accessor: (item) => {
          const p = item.tipo_parceria || 'Sem parceria'
          if (p === 'Sem parceria') {
            return `<span style="color: #6b7280;">Sem parceria</span>`
          }
          return `<span class="badge badge-gold">${p}</span>`
        },
        align: 'left',
      },
      {
        header: quickFilter === 'Recebido' ? 'Recebido em' : 'Previsão Pagto',
        accessor: (item) => {
          if (item.status === 'Recebido') {
            return formatDateRecebimento(item.data_recebimento)
          }
          return item.previsao_pagamento || '-'
        },
        align: 'center',
        width: '95px',
      },
      {
        header: 'Valor RPV/Prec.',
        accessor: (item) => `<strong>${formatCurrency(item.valor_rpv)}</strong>`,
        align: 'right',
      },
      {
        header: 'Sucumbência',
        accessor: (item) => formatCurrency(item.sucumbencia),
        align: 'right',
      },
      {
        header: quickFilter === 'Recebido' ? 'Recebido' : 'Hon. Escritório',
        accessor: (item) => {
          const val =
            item.status === 'Recebido'
              ? Number(item.valor_recebido) || 0
              : calculateHonorariosEscritorio(item)
          return `<strong style="color: #C9922A;">${formatCurrency(val)}</strong>`
        },
        align: 'right',
      },
    ]

    // Summary calculations for the report
    let somaRpv = 0
    let somaSucumbencia = 0
    let somaEscritorio = 0
    let totalRecebido = 0
    let totalAReceber = 0

    recordsToPrint.forEach((r) => {
      somaRpv += Number(r.valor_rpv) || 0
      somaSucumbencia += Number(r.sucumbencia) || 0
      if (r.status === 'Recebido') {
        const rec = Number(r.valor_recebido) || 0
        totalRecebido += rec
        somaEscritorio += rec
      } else {
        const hon = calculateHonorariosEscritorio(r)
        totalAReceber += hon
        somaEscritorio += hon
      }
    })

    const summaryHtml = `
      <div style="background-color: #FAF8F2; border: 1px solid #E8DFCE; border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
        <div>
          <span style="color: #6b7280;">Soma Valor RPV/Prec:</span> <strong>${formatCurrency(somaRpv)}</strong>
          <span style="color: #d1d5db; margin: 0 8px;">|</span>
          <span style="color: #6b7280;">Soma Sucumbência:</span> <strong>${formatCurrency(somaSucumbencia)}</strong>
        </div>
        <div>
          <span style="color: #6b7280;">Total A Receber:</span> <strong style="color: #C9922A;">${formatCurrency(totalAReceber)}</strong>
          <span style="color: #d1d5db; margin: 0 8px;">|</span>
          <span style="color: #6b7280;">Total Recebido:</span> <strong style="color: #166534;">${formatCurrency(totalRecebido)}</strong>
          <span style="color: #d1d5db; margin: 0 8px;">|</span>
          <span style="color: #6b7280;">Total Honorários Escritório:</span> <strong style="color: #C9922A;">${formatCurrency(somaEscritorio)}</strong>
        </div>
      </div>
    `

    printReport({
      title: 'Relatório de RPVs e Precatórios',
      subtitle: 'Advocacia Gasparotto',
      filters: activeFiltersList,
      columns,
      data: recordsToPrint,
      orientation: 'landscape',
      totalLabel: 'Total de registros',
      customSummaryHtml: summaryHtml,
    })
  }, [
    currentVisibleData,
    filteredData,
    search,
    quickFilter,
    parceriaFilter,
    tipo,
    status,
    month,
    year,
  ])

  return (
    <RpvPinGuard>
      <div className="-m-4 sm:-m-8 p-4 sm:p-8 flex flex-col gap-6 min-h-[calc(100vh-4rem)] animate-fade-in bg-[#FAF8F2] dark:bg-[#0D0F0C]">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#C9922A]">RPV/Precatório</h1>
          <p className="text-muted-foreground">Gestão de RPVs e Precatórios</p>
        </div>

        <RpvFilters
          search={search}
          setSearch={setSearch}
          tipo={tipo}
          setTipo={setTipo}
          status={status}
          setStatus={setStatus}
          month={month}
          setMonth={setMonth}
          year={year}
          setYear={setYear}
          onAdd={() => {
            setEditRecord(null)
            setFormOpen(true)
          }}
          onPrint={handlePrintReport}
        />

        <RpvDashboard data={data} month={month} year={year} />

        <div className="flex-1 bg-white dark:bg-[#0D0F0C] border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <RpvTable
              data={filteredData}
              onEdit={(r) => {
                setEditRecord(r)
                setFormOpen(true)
              }}
              onFilteredDataChange={setCurrentVisibleData}
            />
          </div>
        </div>

        <RpvFormModal open={formOpen} onOpenChange={setFormOpen} record={editRecord} />
      </div>
    </RpvPinGuard>
  )
}
