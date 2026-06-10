import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import React from 'react'

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if ((error || !data?.user) && process.env.NODE_ENV !== 'development') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-white">AGENT-F Workspace</h1>
        <div className="text-sm text-slate-400">Enterprise Orchestration Matrix</div>
      </header>
      <main className="mx-auto max-w-7xl p-6">
        {children}
      </main>
    </div>
  )
}
