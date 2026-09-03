import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  // Next writes its own AGENTS.md/CLAUDE.md on dev start. This repo keeps
  // hand-written guidance in README.md instead, so the generated pair is
  // suppressed rather than committed and quietly regenerated.
  agentRules: false,
}

export default nextConfig
