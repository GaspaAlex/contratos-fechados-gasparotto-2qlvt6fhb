import { useState, useEffect } from 'react'

class FilterStore {
  quickFilter = 'Todos'
  parceriaFilter = 'Todos os parceiros'
  search = ''
  listeners = new Set<() => void>()

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
  })

  useEffect(() => {
    const unsubscribe = rpvFilterStore.subscribe(() => {
      setState({
        quickFilter: rpvFilterStore.quickFilter,
        parceriaFilter: rpvFilterStore.parceriaFilter,
        search: rpvFilterStore.search,
      })
    })
    return unsubscribe
  }, [])

  return state
}
