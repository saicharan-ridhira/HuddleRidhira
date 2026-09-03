import { AppShell } from '@/components/layout/app-shell'
import { StoreProvider } from '@/components/providers/store-provider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  )
}
