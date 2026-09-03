'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store/store'

/**
 * Hydration gate.
 *
 * The store persists to localStorage and seeds relative to `new Date()`.
 * Both would produce different values on the server than in the browser,
 * so persistence is deferred (`skipHydration`) and nothing renders until
 * the browser copy is in place. First run has no saved state, so the
 * demo data is installed here instead.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const finish = () => {
      const state = useStore.getState()
      if (state.order.workItemIds.length === 0) state.resetDemoData()
      state.markHydrated()
      setReady(true)
    }

    const unsubscribe = useStore.persist.onFinishHydration(finish)
    void useStore.persist.rehydrate()

    // A rehydrate that resolves synchronously fires before we subscribe.
    if (useStore.persist.hasHydrated()) finish()

    return unsubscribe
  }, [])

  if (!ready) return <BootSplash />

  return <>{children}</>
}

function BootSplash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        Loading workspace
      </div>
    </div>
  )
}
