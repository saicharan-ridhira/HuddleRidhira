'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HuddleMark } from './huddle-mark'
import { UserAvatar } from '@/components/primitives'
import { useCurrentUser } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'

/**
 * A façade, and honest about it. There is no backend in this prototype,
 * so any credentials sign you in as Sai. It exists because it is the
 * first step of the golden path (PRD §53) and because arriving at a
 * board with no sense of "who am I" makes the huddle harder to read.
 */
export function LoginForm() {
  const router = useRouter()
  const user = useCurrentUser()
  const session = useStore((state) => state.session)
  const setSession = useStore((state) => state.setSession)
  const [email, setEmail] = useState('sai@acme.com')
  const [password, setPassword] = useState('huddle')

  useEffect(() => {
    router.prefetch('/dashboard')
  }, [router])

  const signIn = () => {
    setSession({ signedIn: true })
    router.push('/dashboard')
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="flex w-full max-w-[340px] flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <HuddleMark href="/login" />
          <h1 className="mt-3 text-lg font-semibold tracking-tight">Sign in to Huddle</h1>
          <p className="text-[13px] text-muted-foreground">
            The board is the source of truth. A huddle is a guided view over it.
          </p>
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            signIn()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" size="lg" className="mt-1 w-full">
            Sign in
            <ArrowRight />
          </Button>
        </form>

        <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/40 px-3 py-2.5">
          <UserAvatar user={user} size="lg" />
          <div className="flex min-w-0 flex-col">
            <span className="text-[13px] font-medium">Prototype sign-in</span>
            <span className="text-[11px] text-muted-foreground">
              Any credentials sign you in as {user?.name ?? 'the demo user'}.
            </span>
          </div>
        </div>

        {session.signedIn && (
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="w-full">
            Continue to workspace
            <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  )
}
