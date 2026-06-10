'use client'

import React, { useState } from 'react'
import { FileUploadZone } from '@/components/workspace/FileUploadZone'
import { PipelineTracker } from '@/components/workspace/PipelineTracker'
import { AnalyticsDashboard } from '@/components/workspace/AnalyticsDashboard'

export default function WorkspacePage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-white">Data Orchestration</h2>
        <p className="text-slate-400">Upload enterprise data payloads to initiate the multi-agent analytical sequence.</p>
      </div>

      {!sessionId && (
        <FileUploadZone onSessionCreated={(id) => setSessionId(id)} />
      )}

      {sessionId && !isCompleted && (
        <PipelineTracker 
          sessionId={sessionId} 
          onComplete={() => setIsCompleted(true)} 
        />
      )}

      {sessionId && isCompleted && (
        <AnalyticsDashboard sessionId={sessionId} />
      )}
    </div>
  )
}
