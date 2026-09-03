import type { Metadata } from 'next'
import { StoreProvider } from '@/components/providers/store-provider'
import { LoginForm } from '@/components/layout/login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <StoreProvider>
      <LoginForm />
    </StoreProvider>
  )
}
