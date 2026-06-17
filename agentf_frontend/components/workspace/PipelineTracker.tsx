'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface StreamToken {
  type: string;
  content: string;
}

interface PipelineTrackerProps {
  sessionId: string
  onComplete: (log: StreamToken[]) => void
}

export function PipelineTracker({ sessionId, onComplete }: PipelineTrackerProps) {
  const [streamData, setStreamData] = useState<StreamToken[]>([])
  const [status, setStatus] = useState<'connecting' | 'processing' | 'completed' | 'error'>('connecting')
  
  // UX Scroll Engine Refactoring
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isAutoScroll, setIsAutoScroll] = useState(true)

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      // Menghentikan auto-scroll jika pengguna sedang membaca log ke atas
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      setIsAutoScroll(isAtBottom);
    }
  };

  useEffect(() => {
    if (isAutoScroll && scrollContainerRef.current) {
      // Direct DOM mutation untuk menghilangkan efek bouncing animasi
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [streamData, isAutoScroll])

  useEffect(() => {
    if (status === 'completed') {
      const timer = setTimeout(() => {
        onComplete(streamData);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, streamData, onComplete])

  useEffect(() => {
    let eventSource: EventSource

    const connectToStream = async () => {
      try {
        eventSource = new EventSource(`http://127.0.0.1:8000/api/v1/workspace/stream/${sessionId}`)

        eventSource.onopen = () => {
          setStatus('processing')
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'error') {
              setStatus('error')
              setStreamData(prev => [...prev, { type: 'output', content: `\n[SYSTEM ERROR]: ${data.token}\n` }])
              eventSource.close()
            } else if (data.type === 'completed') {
              setStatus('completed')
              eventSource.close()
            } else {
              // Strict Deep Cloning Immutability
              setStreamData((prev) => {
                if (prev.length === 0) {
                  return [{ type: data.type || 'output', content: data.token }];
                }
                const lastItem = prev[prev.length - 1];
                if (lastItem.type === (data.type || 'output')) {
                  const newArray = prev.slice(0, -1);
                  return [...newArray, { ...lastItem, content: lastItem.content + data.token }];
                } else {
                  return [...prev, { type: data.type || 'output', content: data.token }];
                }
              });
            }
          } catch (err) {
            console.error("Stream Parse Error", err)
          }
        }

        eventSource.onerror = () => {
          setStatus('error')
          setStreamData(prev => [...prev, { type: 'output', content: '\n[SYSTEM ERROR]: Stream connection forcefully closed by the host.\n' }])
          eventSource.close()
        }
      } catch (err) {
         setStatus('error')
      }
    }

    connectToStream()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [sessionId])

  return (
    <Card className="border-slate-800 bg-[#050505] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <CardContent className="p-0">
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span className="text-slate-400 text-xs font-mono ml-4 select-none">agent-f_orchestrator_sandbox</span>
          </div>
          <div className="text-xs font-mono font-semibold">
            {status === 'connecting' && <span className="text-yellow-400 animate-pulse">CONNECTING...</span>}
            {status === 'processing' && <span className="text-emerald-400 animate-pulse">EXECUTING_MODELS</span>}
            {status === 'completed' && <span className="text-indigo-400">PIPELINE_COMPLETE</span>}
            {status === 'error' && <span className="text-red-500">SYS_HALT</span>}
          </div>
        </div>
        
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="p-6 font-mono text-sm h-[600px] overflow-y-auto overflow-x-hidden"
        >
          {streamData.map((block, idx) => (
             <div key={idx} className="mb-1 text-emerald-300">
               <ReactMarkdown
                 remarkPlugins={[remarkGfm]}
                 components={{
                   code({node, className, children, ...props}) {
                     const match = /language-(\w+)/.exec(className || '')
                     return match ? (
                       <div className="my-4 rounded-md border border-slate-800 overflow-hidden">
                         <div className="bg-slate-900 px-4 py-1 text-xs text-slate-400 border-b border-slate-800">
                           {match[1]}
                         </div>
                         <code className="block bg-[#0A0A0A] p-4 text-emerald-400 overflow-x-auto" {...props}>
                           {children}
                         </code>
                       </div>
                     ) : (
                       <code className="bg-slate-800/50 px-1.5 py-0.5 rounded text-emerald-200" {...props}>
                         {children}
                       </code>
                     )
                   },
                   p({children}) {
                     return <p className="mb-2 whitespace-pre-wrap">{children}</p>
                   }
                 }}
               >
                 {block.content}
               </ReactMarkdown>
             </div>
          ))}

          {status === 'processing' && (
            <span className="animate-pulse text-green-400 font-bold">_</span>
          )}
          
          {status === 'error' && (
            <div className="mt-4 text-red-500 font-bold border border-red-500/30 bg-red-500/10 p-4 rounded-md">
              [PROCESS TERMINATED]
              <br />
              The analytical pipeline encountered an unrecoverable exception or hard timeout.
            </div>
          )}

          {status === 'completed' && (
            <div className="mt-4 text-emerald-400 font-bold border border-emerald-500/30 bg-emerald-500/10 p-4 rounded-md animate-pulse">
              [PROCESS COMPLETED]
              <br />
              Handing over to Analytical Dashboard...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}