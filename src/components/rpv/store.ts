import { useState, useEffect } from 'react'

class FilterStore {
  quickFilter = 'Todos'
  parceriaFilter = 'Todos os parceiros'
  search = ''
  tipoFilter = 'Todos'
  statusFilter = 'Todos'
  mesFilter = 'Todos'
  anoFilter = 'Todos'
  listeners = new Set<() => void>()

  setTipoFilter = (val: string) => {
    this.tipoFilter = val
    this.notify()
  }

  setStatusFilter = (val: string) => {
    this.statusFilter = val
    this.notify()
  }

  setMesFilter = (val: string) => {
    this.mesFilter = val
    this.notify()
  }

  setAnoFilter = (val: string) => {
    this.anoFilter = val
    this.notify()
  }

  setQuickFilter = (val: string) => {
    this.quickFilter = val
    this.notify()
  }

  setParceriaFilter = (val: string) => {
    this.parceriaFilter = val
    this.notify()
  }

  setSearch = (val: string) => {
    this.search = val
    this.notify()
  }

  notify() {
    this.listeners.forEach((l) => l())
  }

  subscribe(l: () => void) {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
}

export const rpvFilterStore = new FilterStore()

export function useRpvFilters() {
  const [state, setState] = useState({
    quickFilter: rpvFilterStore.quickFilter,
    parceriaFilter: rpvFilterStore.parceriaFilter,
    search: rpvFilterStore.search,
    tipoFilter: rpvFilterStore.tipoFilter,
    statusFilter: rpvFilterStore.statusFilter,
    mesFilter: rpvFilterStore.mesFilter,
    anoFilter: rpvFilterStore.anoFilter,
  })

  useEffect(() => {
    const unsubscribe = rpvFilterStore.subscribe(() => {
      setState({
        quickFilter: rpvFilterStore.quickFilter,
        parceriaFilter: rpvFilterStore.parceriaFilter,
        search: rpvFilterStore.search,
        tipoFilter: rpvFilterStore.tipoFilter,
        statusFilter: rpvFilterStore.statusFilter,
        mesFilter: rpvFilterStore.mesFilter,
        anoFilter: rpvFilterStore.anoFilter,
      })
    })
    return unsubscribe
  }, [])

  return state
}
