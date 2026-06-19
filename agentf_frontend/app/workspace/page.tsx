'use client'

import React, { useState, useEffect } from 'react'
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
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    let timeGreeting = 'Good evening'
    if (hour >= 5 && hour < 12) timeGreeting = 'Good morning'
    else if (hour >= 12 && hour < 18) timeGreeting = 'Good afternoon'
    
    setGreeting(`${timeGreeting}, Users.`)
  }, [])

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto p-8 space-y-8 min-h-full">
      
      {!sessionId && (
        <div className="flex flex-col space-y-1 mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-200">{greeting}</h2>
          <p className="text-sm text-slate-500">Enterprise analytical sandbox is standing by.</p>
        </div>
      )}

      {!sessionId && (
        <FileUploadZone onSessionCreated={(id) => {
          setSessionId(id)
          setIsCompleted(false)
          setExecutionLog([])
        }} />
      )}

      {sessionId && !isCompleted && (
        <PipelineTracker 
          sessionId={sessionId} 
          onComplete={(logData) => {
            setExecutionLog(logData)
            setIsCompleted(true)
          }} 
        />
      )}

      {sessionId && isCompleted && (
        <AnalyticsDashboard 
          sessionId={sessionId} 
          executionLog={executionLog} 
        />
      )}
    </div>
  )
}