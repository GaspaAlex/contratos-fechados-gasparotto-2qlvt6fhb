import { useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'

export function useProtocoloMigration() {
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const runMigration = async () => {
      const MIGRATION_KEY = 'migration_protocolo_datas_v1'

      if (localStorage.getItem(MIGRATION_KEY) === 'true') {
        return
      }

      // Set immediately to prevent multiple executions (loops)
      localStorage.setItem(MIGRATION_KEY, 'true')

      try {
        const records = await pb.collection('protocolo').getFullList({
          filter: "dcalculo != '' && dcontrato = ''",
        })

        const BATCH_SIZE = 10
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
          const batch = records.slice(i, i + BATCH_SIZE)
          await Promise.allSettled(
            batch.map((record) =>
              pb.collection('protocolo').update(record.id, {
                dcontrato: record.dcalculo,
                dcalculo: '',
              }),
            ),
          )
        }
      } catch (error) {
        console.error('Protocolo migration failed:', error)
      }
    }

    runMigration()
  }, [])
}
