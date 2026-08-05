import { useRef } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import type { Dispatch, SetStateAction } from 'react'

interface OptimisticRealtimeOptions {
  preserveExpand?: boolean
  shouldInclude?: (record: any) => boolean
}

export function useOptimisticRealtime(
  collectionName: string,
  setData: Dispatch<SetStateAction<any[]>>,
  enabled: boolean = true,
  options?: OptimisticRealtimeOptions,
) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useRealtime(
    collectionName,
    (e) => {
      if (!enabled) return
      const opts = optionsRef.current

      if (e.action === 'create') {
        if (opts?.shouldInclude && !opts.shouldInclude(e.record)) return
        setData((prev) => (prev.some((i) => i.id === e.record.id) ? prev : [...prev, e.record]))
      } else if (e.action === 'update') {
        setData((prev) => {
          if (opts?.shouldInclude && !opts.shouldInclude(e.record)) {
            return prev.filter((i) => i.id !== e.record.id)
          }
          return prev.map((i) => {
            if (i.id !== e.record.id) return i
            if (opts?.preserveExpand && (i as any).expand) {
              return { ...i, ...e.record, expand: (i as any).expand }
            }
            return { ...i, ...e.record }
          })
        })
      } else if (e.action === 'delete') {
        setData((prev) => prev.filter((i) => i.id !== e.record.id))
      }
    },
    enabled,
  )
}
