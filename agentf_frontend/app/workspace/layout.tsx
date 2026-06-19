import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import React from 'react'
// Perbaikan path: Menggunakan relative path karena file berada di folder yang sama
import { Sidebar } from './Sidebar'

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
    <div className="flex h-screen bg-[#050505] text-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#050505] relative z-10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,1)]">
        {children}
      </main>
    </div>
  )
}