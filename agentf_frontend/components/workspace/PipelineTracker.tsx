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
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isAutoScroll, setIsAutoScroll] = useState(true)

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      setIsAutoScroll(isAtBottom);
    }
  };

  useEffect(() => {
    if (isAutoScroll && scrollContainerRef.current) {
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
    <Card className="border-slate-800/80 bg-[#050505] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <CardContent className="p-0">
        <div className="bg-[#0A0A0A] border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
            </div>
            <span className="text-slate-500 text-[10px] font-mono ml-4 select-none uppercase tracking-widest">agent_f_sandbox_env</span>
          </div>
          <div className="text-[10px] font-mono font-bold tracking-wider">
            {status === 'connecting' && <span className="text-yellow-500 animate-pulse">ESTABLISHING_LINK...</span>}
            {status === 'processing' && <span className="text-emerald-500 animate-pulse">EXECUTING_MODELS</span>}
            {status === 'completed' && <span className="text-indigo-400">PIPELINE_COMPLETE</span>}
            {status === 'error' && <span className="text-red-500">SYS_HALT</span>}
          </div>
        </div>
        
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="p-6 font-mono text-xs h-[600px] overflow-y-auto overflow-x-hidden leading-relaxed"
        >
          {streamData.map((block, idx) => (
             <div key={idx} className="mb-1 text-emerald-400">
               <ReactMarkdown
                 remarkPlugins={[remarkGfm]}
                 components={{
                   code({node, className, children, ...props}) {
                     const match = /language-(\w+)/.exec(className || '')
                     return match ? (
                       <div className="my-4 rounded border border-slate-800 overflow-hidden shadow-md">
                         <div className="bg-[#0A0A0A] px-4 py-2 text-[10px] text-slate-500 border-b border-slate-800 uppercase tracking-widest">
                           {match[1]}
                         </div>
                         <code className="block bg-[#050505] p-4 text-emerald-400 overflow-x-auto" {...props}>
                           {children}
                         </code>
                       </div>
                     ) : (
                       <code className="bg-slate-800/40 px-1.5 py-0.5 rounded text-emerald-300 border border-slate-700/50" {...props}>
                         {children}
                       </code>
                     )
                   },
                   p({children}) {
                     const textContent = React.Children.toArray(children).join('');
                     
                     // Frontend Auto-Coloring Override
                     if (textContent.includes('[SYSTEM ERROR]')) {
                       return <p className="mb-2 whitespace-pre-wrap text-red-500 font-bold">{children}</p>;
                     }
                     if (textContent.includes('[SYSTEM]')) {
                       return <p className="mb-2 whitespace-pre-wrap text-slate-400 font-sans tracking-wide">{children}</p>;
                     }
                     // Default: Force Emerald color for raw text assuming it's unformatted code/logic.
                     return <p className="mb-2 whitespace-pre-wrap text-emerald-400">{children}</p>;
                   }
                 }}
               >
                 {block.content}
               </ReactMarkdown>
             </div>
          ))}

          {status === 'processing' && (
            <span className="animate-pulse text-emerald-500 font-bold">_</span>
          )}
          
          {status === 'error' && (
            <div className="mt-6 text-red-400 text-xs font-mono border border-red-900/50 bg-red-950/20 p-4 rounded uppercase tracking-wider">
              [PROCESS TERMINATED]<br />
              The analytical pipeline encountered an unrecoverable exception.
            </div>
          )}

          {status === 'completed' && (
            <div className="mt-6 text-emerald-400 text-xs font-mono border border-emerald-900/50 bg-emerald-950/20 p-4 rounded uppercase tracking-wider animate-pulse">
              [PROCESS COMPLETED]<br />
              Handing over architecture to analytical dashboard...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}