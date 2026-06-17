'use client'

import React, { useState } from 'react'
import { FileUploadZone } from '@/components/workspace/FileUploadZone'
import { PipelineTracker } from '@/components/workspace/PipelineTracker'
import { AnalyticsDashboard } from '@/components/workspace/AnalyticsDashboard'

interface StreamToken {
  type: string;
  content: string;
}

export default function WorkspacePage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [executionLog, setExecutionLog] = useState<StreamToken[]>([])

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto p-8">
      <div className="flex flex-col space-y-2 border-b border-slate-800 pb-6">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-100">AGENT-F Orchestration Cockpit</h2>
        <p className="text-slate-400">Initialize the multi-agent analytical sequence by uploading enterprise data payloads.</p>
      </div>

      {!sessionId && (
        <FileUploadZone onSessionCreated={(id) => {
          setSessionId(id)
          setIsCompleted(false)
          setExecutionLog([])
        }} />
      )}

      {/* PipelineTracker mengeksekusi onComplete dengan membawa array memori log */}
      {sessionId && !isCompleted && (
        <PipelineTracker 
          sessionId={sessionId} 
          onComplete={(logData) => {
            setExecutionLog(logData)
            setIsCompleted(true)
          }} 
        />
      )}

      {/* Memori log dioperasikan ke Dashboard untuk dirender statis di tab Audit Trail */}
      {sessionId && isCompleted && (
        <AnalyticsDashboard 
          sessionId={sessionId} 
          executionLog={executionLog} 
        />
      )}
    </div>
  )
}