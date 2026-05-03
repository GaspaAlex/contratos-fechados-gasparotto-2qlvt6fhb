import { useState, useEffect } from 'react'

class FilterStore {
  quickFilter = 'Todos'
  parceriaFilter = 'Todos os parceiros'
  listeners = new Set<() => void>()

  setQuickFilter = (val: string) => {
    this.quickFilter = val
    this.notify()
  }

  setParceriaFilter = (val: string) => {
    this.parceriaFilter = val
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
  })

  useEffect(() => {
    const unsubscribe = rpvFilterStore.subscribe(() => {
      setState({
        quickFilter: rpvFilterStore.quickFilter,
        parceriaFilter: rpvFilterStore.parceriaFilter,
      })
    })
    return unsubscribe
  }, [])

  return state
}
