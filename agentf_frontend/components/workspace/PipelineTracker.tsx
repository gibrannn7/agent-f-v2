'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { fetchWithAuth } from '@/lib/api-client'
import { CheckCircle2, CircleDashed, Loader2 } from 'lucide-react'

interface PipelineTrackerProps {
  sessionId: string
  onComplete: () => void
}

const PHASES = [
  'Phase 1: Metadata Mapping',
  'Phase 2: Data Cleaning',
  'Phase 3: Execution Engine',
  'Phase 4: CFO Briefing'
]

export function PipelineTracker({ sessionId, onComplete }: PipelineTrackerProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState<string>('processing')

  useEffect(() => {
    const fetchStatus = async () => {
      if (status === 'completed') return;
      try {
        const res = await fetchWithAuth(`/api/v1/workspace/status/${sessionId}`)
        const data = await res.json()
        setLogs(data.logs || [])
        
        if (data.status === 'completed') {
          setStatus('completed')
          onComplete()
        }
      } catch (error) {
        console.error('Status polling failed', error)
      }
    }

    fetchStatus()
    const intervalId = setInterval(fetchStatus, 3000)
    return () => clearInterval(intervalId)
  }, [sessionId, onComplete, status])

  const logCount = logs.length
  let currentPhaseIndex = 0
  if (status === 'completed') currentPhaseIndex = 4
  else if (logCount > 4) currentPhaseIndex = 3
  else if (logCount > 2) currentPhaseIndex = 2
  else if (logCount > 0) currentPhaseIndex = 1

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-xl text-slate-100 flex items-center space-x-2">
          {status === 'completed' ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          ) : (
            <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
          )}
          <span>Orchestration Pipeline</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 p-8">
        <Progress value={(currentPhaseIndex / 4) * 100} className="h-2 bg-slate-800" />
        
        <div className="grid grid-cols-4 gap-4">
          {PHASES.map((phase, i) => {
            const isCompleted = i < currentPhaseIndex
            const isActive = i === currentPhaseIndex && status !== 'completed'
            
            return (
              <div key={i} className="flex flex-col items-center text-center space-y-3">
                {isCompleted ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                ) : (
                  <CircleDashed className="h-8 w-8 text-slate-600" />
                )}
                <span className={`text-sm font-medium ${isCompleted ? 'text-emerald-400' : isActive ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {phase}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-8 rounded-md border border-slate-800 bg-slate-950 p-4 h-48 overflow-y-auto font-mono text-xs text-slate-400 space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="border-b border-slate-800/50 pb-1">
              <span className="text-indigo-400 mr-2">{`[${i + 1}]`}</span>
              {log}
            </div>
          ))}
          {logs.length === 0 && <div>Initializing agent framework...</div>}
        </div>
      </CardContent>
    </Card>
  )
}
