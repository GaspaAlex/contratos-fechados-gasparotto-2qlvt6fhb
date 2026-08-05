import { useEffect, useRef, type ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export function useSessionRecovery() {
  const { user } = useAuth()
  const wasDisconnectedRef = useRef(false)

  useEffect(() => {
    if (!user) return

    const checkHealth = async () => {
      if (!pb.authStore.isValid) {
        if (!wasDisconnectedRef.current) {
          wasDisconnectedRef.current = true
          toast.warning('Sessão expirada. Reconectando...', { duration: 3000 })
        }
        return
      }

      try {
        await pb.collection('users').authRefresh()
        if (wasDisconnectedRef.current) {
          wasDisconnectedRef.current = false
          toast.success('Conexão restabelecida', { duration: 2000 })
        }
      } catch {
        if (!wasDisconnectedRef.current) {
          wasDisconnectedRef.current = true
          toast.warning('Conexão perdida. Tentando reconectar...', { duration: 3000 })
        }
      }
    }

    const interval = setInterval(checkHealth, 5 * 60 * 1000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkHealth()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user])
}

export function SessionRecovery({ children }: { children: ReactNode }) {
  useSessionRecovery()
  return <>{children}</>
}
