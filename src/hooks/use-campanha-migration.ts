import { useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'

const MIGRATION_KEY = 'skip_migration_campanha_origem_v1'

export function useCampanhaMigration() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const runMigration = async () => {
      try {
        if (localStorage.getItem(MIGRATION_KEY) === 'true') {
          return
        }

        const records = await pb.collection('contratos_fechados').getFullList({
          filter: "origem = 'Campanha' && (campanha_origem = '' || campanha_origem = null)",
        })

        for (const record of records) {
          try {
            await pb.collection('contratos_fechados').update(record.id, {
              campanha_origem: 'Aux. Acidente',
            })
          } catch (err) {
            console.error(`Failed to migrate record ${record.id}:`, err)
          }
        }

        localStorage.setItem(MIGRATION_KEY, 'true')
      } catch (error) {
        console.error('Background migration failed:', error)
      }
    }

    runMigration()
  }, [])
}
