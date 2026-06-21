'use client'

import React from 'react'
import { WorkspaceTerminal } from '@/components/workspace/WorkspaceTerminal'

export default function WorkspacePage() {
  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto p-4 md:p-8 min-h-full">
      <WorkspaceTerminal />
    </div>
  )
}