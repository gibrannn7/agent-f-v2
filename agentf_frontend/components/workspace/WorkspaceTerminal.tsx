'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'
import { FileSpreadsheet, Loader2, Send, Paperclip, ChevronDown, Check, X, Maximize2, Minimize2, Lock, LogOut } from 'lucide-react'
import { PipelineTracker } from '@/components/workspace/PipelineTracker'
import { AnalyticsDashboard } from '@/components/workspace/AnalyticsDashboard'

interface StreamToken {
  type: string;
  content: string;
}

interface Interaction {
  id: string;
  prompt: string;
  sessionId: string;
  status: 'running' | 'completed';
  executionLog?: StreamToken[];
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const TIERS = {
  FREE: 0,
  STANDARD: 1,
  PRO: 2,
  ENTERPRISE: 3
}

const AI_MODELS = [
  { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B (Groq)', tier: TIERS.FREE },
  { id: 'llama-4-scout', name: 'Llama 4 Scout (Groq)', tier: TIERS.FREE },
  { id: 'qwen3.5-plus', name: 'Qwen 3.5 Plus (Aliyun)', tier: TIERS.STANDARD },
  { id: 'qwen3-max', name: 'Qwen 3 Max (Aliyun)', tier: TIERS.STANDARD },
  { id: 'qwen3.7-plus', name: 'Qwen 3.7 Plus (Aliyun)', tier: TIERS.PRO },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 PRO (Reasoning)', tier: TIERS.PRO },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 PRO (High)', tier: TIERS.ENTERPRISE },
  { id: 'claude-opus-4.8', name: 'Claude Opus 4.8', tier: TIERS.ENTERPRISE }
]

export function WorkspaceTerminal() {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [customPrompt, setCustomPrompt] = useState('')
  const [newsEnabled, setNewsEnabled] = useState(false)
  const [engine, setEngine] = useState('qwen/qwen3.6-27b')
  const [userTier, setUserTier] = useState<number>(TIERS.FREE) // Simulated subscription tier
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isScrollable, setIsScrollable] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  
  const [previewData, setPreviewData] = useState<string[][][]>([])
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [greeting, setGreeting] = useState('')
  const [typedGreeting, setTypedGreeting] = useState('')

  const [interactions, setInteractions] = useState<Interaction[]>([])

  const [userRole, setUserRole] = useState('')
  const [analysisGoal, setAnalysisGoal] = useState('')
  const [usePersona, setUsePersona] = useState(true)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setIsAuthenticated(false)
        setIsAuthLoading(false)
        return
      }

      setIsAuthenticated(true)
      const metadata = session.user.user_metadata
      if (!metadata?.role) {
        router.push('/onboarding')
        return
      }

      setUserRole(metadata.role)
      setAnalysisGoal(metadata.goal || '')
      setUserTier(metadata.tier !== undefined ? metadata.tier : TIERS.FREE)
      setIsAuthLoading(false)
    }

    initAuth()
  }, [router, supabase.auth])

  const requireAuth = (callback: () => void) => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }
    callback()
  }

  useEffect(() => {
    const hour = new Date().getHours()

    let text = 'Good Evening'
    if (hour < 12) text = 'Good Morning'
    else if (hour < 18) text = 'Good Afternoon'

    setGreeting(`${text}, ${userRole || 'Analyst'}.`)
  }, [userRole])

  useEffect(() => {
    if (!greeting) return;
    
    setTypedGreeting('')
    const startDelay = setTimeout(() => {
      let index = 0

      const typing = setInterval(() => {
        setTypedGreeting(greeting.slice(0, index + 1))
        index++

        if (index >= greeting.length) {
          clearInterval(typing)
        }
      }, 50)

      return () => clearInterval(typing)
    }, 1000)

    return () => clearTimeout(startDelay)
  }, [greeting])
  useEffect(() => {
    const handlePersonaToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      setUsePersona(customEvent.detail);
    };
    window.addEventListener('personaToggle', handlePersonaToggle);
    
    // Initial load from local storage
    const stored = localStorage.getItem('agentf_usePersona');
    if (stored !== null) {
      setUsePersona(stored === 'true');
    }

    return () => window.removeEventListener('personaToggle', handlePersonaToggle);
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelected(Array.from(e.target.files))
    }
  }

  const handleFilesSelected = async (selectedFiles: File[]) => {
    setError(null)
    const validFiles = selectedFiles.filter(f => f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))
    if (validFiles.length === 0) {
      setError('Only CSV and XLSX files are supported.')
      return
    }
    
    setFiles(prev => [...prev, ...validFiles])

    const newPreviews = await Promise.all(validFiles.map(async (f) => {
      if (f.name.endsWith('.csv')) {
        try {
          const text = await f.text()
          const lines = text.split('\n').filter(line => line.trim() !== '').slice(0, 5)
          return lines.map(line => line.split(',').slice(0, 6))
        } catch (err) {
          return []
        }
      } else {
        return [
          ['ID', 'Category', 'Metric', 'Value', 'Status'],
          ['1001', 'Revenue', 'Q1_Growth', '+14.2%', 'Nominal'],
          ['1002', 'Opex', 'Marketing', '$2.4M', 'Review'],
          ['1003', 'Liquidity', 'Ratio', '1.8', 'Healthy']
        ]
      }
    }))

    setPreviewData(prev => [...prev, ...newPreviews])
    if (files.length === 0) {
      setActiveFileIndex(0)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewData(prev => prev.filter((_, i) => i !== index))
    if (activeFileIndex >= index && activeFileIndex > 0) {
      setActiveFileIndex(activeFileIndex - 1)
    } else if (files.length - 1 === 0) {
      setActiveFileIndex(0)
    }
  }

  const handleUpload = async () => {
    requireAuth(async () => {
      if (files.length === 0 && !customPrompt.trim()) return

      const selectedModelInfo = AI_MODELS.find(m => m.id === engine)
      if (selectedModelInfo && userTier < selectedModelInfo.tier) {
        setError(`Akses ditolak: Model ${selectedModelInfo.name} memerlukan tier langganan yang lebih tinggi.`)
        return
      }

      try {
        setIsUploading(true)
        setError(null)

        const formData = new FormData()
        files.forEach(file => {
          formData.append('files', file)
        })
        if (customPrompt.trim()) {
          formData.append('user_custom_prompt', customPrompt.trim())
        }
        formData.append('news_toggle', String(newsEnabled))
        formData.append('engine_selection', engine)
        
        if (usePersona) {
          if (userRole) formData.append('user_role', userRole)
          if (analysisGoal) formData.append('analysis_goal', analysisGoal)
        }

        if (interactions.length > 0) {
          formData.append('parent_session_id', interactions[interactions.length - 1].sessionId)
        }

        const res = await fetch('/api/v1/pipeline/process', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (data.session_id) {
          setInteractions(prev => [...prev, {
            id: Date.now().toString(),
            prompt: customPrompt.trim() || 'Process dataset with default orchestration.',
            sessionId: data.session_id,
            status: 'running'
          }])
          setCustomPrompt('')
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
          }
          setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }, 100);
        } else {
          throw new Error('No session ID returned from orchestration server.')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to upload files and initialize pipeline.')
      } finally {
        setIsUploading(false)
      }
    })
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center w-full">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <>
    <div className={`flex flex-col items-center ${interactions.length > 0 ? 'justify-start mt-4' : 'justify-center mt-12'} w-full max-w-6xl mx-auto space-y-8 px-4 transition-all duration-500 ${isFullscreen ? 'h-[85vh]' : 'min-h-[65vh]'}`}>
      
      {/* Greetings Text Container - Fixed height to prevent layout shift */}
      {interactions.length === 0 && (
        <div className={`flex flex-col items-center justify-center transition-all duration-500 overflow-hidden ${files.length > 0 || isFullscreen ? 'h-0 opacity-0' : 'h-24 opacity-100'}`}>
          <h1 className="text-5xl font-bold tracking-tight text-slate-100">
            {typedGreeting}
          </h1>
          <p className="text-slate-500 font-mono text-sm uppercase tracking-widest mt-3">Enterprise analytical sandbox is standing by.</p>
        </div>
      )}

      {/* CHAT HISTORY / INTERACTIONS AREA */}
      {interactions.length > 0 && (
        <div className="w-full space-y-12 mb-4 animate-in fade-in duration-500">
          {interactions.map(interaction => (
            <div key={interaction.id} className="space-y-6">
               {/* User Prompt */}
               <div className="flex justify-end w-full max-w-4xl mx-auto">
                  <div className="max-w-[85%] bg-[#0A0A0A] border border-slate-700/50 text-slate-300 px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md font-sans text-sm">
                     {interaction.prompt}
                  </div>
               </div>

               {/* Assistant Tracker / Dashboard */}
               <div className="w-full max-w-6xl mx-auto">
                 {interaction.status === 'running' ? (
                    <PipelineTracker 
                      sessionId={interaction.sessionId} 
                      onComplete={(log) => {
                        setInteractions(prev => prev.map(inter => 
                          inter.id === interaction.id 
                            ? { ...inter, status: 'completed', executionLog: log } 
                            : inter
                        ))
                      }} 
                    />
                 ) : (
                    <AnalyticsDashboard 
                      sessionId={interaction.sessionId} 
                      executionLog={interaction.executionLog || []} 
                    />
                 )}
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Post-Upload Animation Area */}
      {files.length > 0 && !isFullscreen && (
        <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            {files.map((f, i) => (
              <div 
                key={i} 
                onClick={() => { setActiveFileIndex(i); setShowPreview(true); }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full border cursor-pointer transition-all duration-300 text-xs font-mono whitespace-nowrap shadow-sm select-none ${
                  activeFileIndex === i 
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' 
                    : 'bg-[#050505] border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                }`}
              >
                <FileSpreadsheet className={`h-3.5 w-3.5 ${activeFileIndex === i ? 'text-indigo-400' : ''}`} />
                <span>{f.name}</span>
                <span className="text-[10px] opacity-50 px-1">{formatBytes(f.size)}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(i) }} 
                  className={`ml-2 rounded-full p-0.5 transition-colors ${activeFileIndex === i ? 'hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-200' : 'hover:bg-slate-800 text-slate-600 hover:text-red-400'}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {showPreview && previewData[activeFileIndex]?.length > 0 && (
            <Card className="border-slate-800/80 bg-[#0A0A0A] shadow-2xl overflow-hidden animate-in fade-in duration-300 relative group">
              <button 
                onClick={() => setShowPreview(false)} 
                className="absolute top-2 right-2 p-1.5 bg-slate-900 border border-slate-700 rounded-md text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Hide Preview"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800/50 bg-[#050505]">
                      {previewData[activeFileIndex][0].map((header, idx) => (
                        <th key={idx} className="px-4 py-3 font-medium text-slate-400 whitespace-nowrap">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {previewData[activeFileIndex].slice(1).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/20 transition-colors">
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-3 text-slate-300 whitespace-nowrap">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Input Prompt Container */}
      <div className={`w-full max-w-4xl relative group transition-all duration-500 ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
        <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000 ${isFullscreen ? 'hidden' : ''}`}></div>
        <div className={`relative flex flex-col bg-[#050505] border border-slate-800/80 rounded-xl shadow-2xl p-2 transition-all focus-within:border-slate-600/80 ${isFullscreen ? 'h-full flex-1' : ''}`}>
          <div className={`flex items-end px-2 py-2 ${isFullscreen ? 'flex-1 items-start' : ''}`}>
            {/* Attachment Button */}
            <button 
              type="button"
              onClick={() => requireAuth(() => fileInputRef.current?.click())}
              className="p-2 mb-0.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800/50 rounded-lg transition-colors shrink-0"
              title="Attach Financial Matrix"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            {/* Main Auto-expanding Textarea */}
            <textarea
              ref={textareaRef}
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value)
                if (!isFullscreen) {
                  e.target.style.height = 'auto'
                  const scrollH = e.target.scrollHeight
                  e.target.style.height = Math.min(scrollH, 120) + 'px'
                  setIsScrollable(scrollH > 120)
                }
              }}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleUpload()
                }
              }}
              rows={1}
              placeholder="Instruct the AI Analyst..."
              className={`flex-1 bg-transparent border-none text-slate-200 px-4 py-2 focus:outline-none focus:ring-0 placeholder:text-slate-600 resize-none scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent ${
                isFullscreen 
                  ? 'h-full max-h-none text-base' 
                  : 'max-h-[120px] text-sm'
              }`}
              style={{ height: isFullscreen ? '100%' : 'auto', minHeight: '40px' }}
            />

            {/* Fullscreen Toggle Button */}
            {(isScrollable || isFullscreen) && (
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 mb-0.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800/50 rounded-lg transition-colors shrink-0 animate-in fade-in duration-300"
                title={isFullscreen ? "Minimize" : "Full Screen"}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => requireAuth(() => {
                if (files.length === 0) {
                  setError("Mohon upload file data terlebih dahulu untuk menggunakan Sandbox Analytics.");
                  return;
                }
                handleUpload();
              })}
              disabled={isUploading}
              className={`p-2.5 ml-2 mb-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition-all duration-300 flex items-center justify-center shrink-0 shadow-sm ${
                files.length === 0 
                  ? 'opacity-30 cursor-not-allowed' 
                  : 'hover:bg-indigo-600 hover:text-white hover:border-indigo-500'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
              title={files.length === 0 ? "Mohon upload file data terlebih dahulu" : "Execute Pipeline"}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800/50 mt-1 shrink-0">
            <div className="flex items-center space-x-4">
              {/* Dropdown Engine */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => requireAuth(() => setIsDropdownOpen(!isDropdownOpen))}
                  className="flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                >
                  <span className="truncate">{AI_MODELS.find(m => m.id === engine)?.name || engine}</span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </button>
                
                {/* Modal Menu */}
                {isDropdownOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div 
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                      onClick={() => setIsDropdownOpen(false)}
                    ></div>
                    
                    {/* Modal Content */}
                    <div className="relative w-full max-w-md bg-[#0A0A0A] border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-[#050505]">
                        <span className="text-sm font-medium text-slate-200">Select AI Engine</span>
                        <button onClick={() => setIsDropdownOpen(false)} className="text-slate-500 hover:text-slate-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="overflow-y-auto max-h-[60vh] p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                        {AI_MODELS.map((model) => {
                           const isLocked = userTier < model.tier;
                           const tierName = Object.keys(TIERS).find(k => TIERS[k as keyof typeof TIERS] === model.tier);
                           return (
                             <button
                                key={model.id}
                                onClick={() => { if (!isLocked) { setEngine(model.id); setIsDropdownOpen(false) } }}
                                className={`w-full text-left px-4 py-3 text-xs font-mono rounded-lg transition-colors flex items-center justify-between group/item ${
                                  isLocked 
                                    ? 'text-slate-600 cursor-not-allowed bg-transparent' 
                                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                                } ${engine === model.id ? 'bg-indigo-500/10 border border-indigo-500/30' : 'border border-transparent'}`}
                             >
                                <div className="flex flex-col space-y-1">
                                  <span className="flex items-center space-x-2">
                                    {isLocked && <Lock className="w-3.5 h-3.5 text-slate-600" />}
                                    <span className="text-sm font-medium">{model.name}</span>
                                  </span>
                                  <span className={`text-[10px] uppercase tracking-wider ${isLocked ? 'text-slate-700' : 'text-slate-500'}`}>
                                    {isLocked ? `Requires ${tierName} Tier` : `Available on ${tierName} Tier`}
                                  </span>
                                </div>
                                {!isLocked && engine === model.id && <Check className="h-4 w-4 text-indigo-400" />}
                             </button>
                           )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* News Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => requireAuth(() => setNewsEnabled(!newsEnabled))}
                  className={`text-xs font-mono px-3 py-1 rounded transition-colors ${
                    newsEnabled 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                      : 'bg-transparent text-slate-600 border border-slate-800 hover:text-slate-400'
                  }`}
                >
                  News API
                </button>
              </div>
            </div>
          </div>
        </div>
        <input
          type="file"
          multiple
          accept=".csv,.xlsx"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-md text-sm mt-4 animate-in fade-in duration-300 w-full max-w-4xl text-center">
          {error}
        </div>
      )}
    </div>

    {/* FORCE LOGIN MODAL */}
    {showLoginModal && (
      <div className="fixed inset-0 z-[99] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
        <div className="relative w-full max-w-sm bg-[#0A0A0A] border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6 text-center animate-in zoom-in-95 duration-200">
           <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
             <LogOut className="w-6 h-6 text-indigo-400 rotate-180" />
           </div>
           <h3 className="text-xl font-bold text-slate-100 mb-2">Authentication Required</h3>
           <p className="text-sm text-slate-400 mb-6">You need to log in to access compute resources, upload files, and execute pipeline operations.</p>
           
           <div className="flex flex-col space-y-3">
             <button 
               onClick={() => router.push('/login')}
               className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
             >
               Sign In with Google
             </button>
             <button 
               onClick={() => setShowLoginModal(false)}
               className="w-full bg-transparent hover:bg-slate-800 text-slate-400 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
             >
               Cancel
             </button>
           </div>
        </div>
      </div>
    )}
    </>
  )
}
