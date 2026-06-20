'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { fetchWithAuth } from '@/lib/api-client'
import { FileSpreadsheet, Loader2, Send, Paperclip, ChevronDown, Check, X, Maximize2, Minimize2 } from 'lucide-react'

interface FileUploadZoneProps {
  onSessionCreated: (sessionId: string) => void
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function FileUploadZone({ onSessionCreated }: FileUploadZoneProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [customPrompt, setCustomPrompt] = useState('')
  const [newsEnabled, setNewsEnabled] = useState(false)
  const [engine, setEngine] = useState('Deepseek V4 PRO (Reasoning)')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isScrollable, setIsScrollable] = useState(false)
  
  const [previewData, setPreviewData] = useState<string[][][]>([])
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [greeting, setGreeting] = useState('')
  const [typedGreeting, setTypedGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()

    let text = 'Good Evening'
    if (hour < 12) text = 'Good Morning'
    else if (hour < 18) text = 'Good Afternoon'

    setGreeting(text)

    const startDelay = setTimeout(() => {
      let index = 0

      const typing = setInterval(() => {
        setTypedGreeting(text.slice(0, index + 1))
        index++

        if (index >= text.length) {
          clearInterval(typing)
        }
      }, 50)

      return () => clearInterval(typing)
    }, 1000)

    return () => clearTimeout(startDelay)
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
    if (files.length === 0) {
      setError('Mohon upload file data terlebih dahulu untuk menggunakan Sandbox Analytics.')
      return
    }
    setIsUploading(true)
    setError(null)
    setIsFullscreen(false)

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      if (customPrompt.trim()) {
        formData.append('user_custom_prompt', customPrompt.trim())
      }
      formData.append('news_toggle', String(newsEnabled))
      formData.append('engine_selection', engine)

      const res = await fetchWithAuth('/api/v1/pipeline/process', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (data.session_id) {
        onSessionCreated(data.session_id)
      } else {
        throw new Error('No session ID returned from orchestration server.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload files and initialize pipeline.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center w-full max-w-4xl mx-auto space-y-8 px-4 transition-all duration-500 ${isFullscreen ? 'h-[85vh]' : 'min-h-[65vh] mt-12'}`}>
      
      {/* Greetings Text Container - Fixed height to prevent layout shift */}
      <div className={`flex flex-col items-center justify-center transition-all duration-500 overflow-hidden ${files.length > 0 || isFullscreen ? 'h-0 opacity-0' : 'h-24 opacity-100'}`}>
        <h1 className="text-5xl font-bold tracking-tight text-slate-100">
          {typedGreeting}
          {typedGreeting.length === greeting.length && ', Users'}
        </h1>
        <p className="text-slate-500 font-mono text-sm uppercase tracking-widest mt-3">Enterprise analytical sandbox is standing by.</p>
      </div>

      {/* Post-Upload Animation Area */}
      {files.length > 0 && !isFullscreen && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            {files.map((f, i) => (
              <div 
                key={i} 
                onClick={() => setActiveFileIndex(i)}
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

          {previewData[activeFileIndex]?.length > 0 && (
            <Card className="border-slate-800/80 bg-[#0A0A0A] shadow-2xl overflow-hidden animate-in fade-in duration-300">
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
      <div className={`w-full relative group transition-all duration-500 ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
        <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000 ${isFullscreen ? 'hidden' : ''}`}></div>
        <div className={`relative flex flex-col bg-[#050505] border border-slate-800/80 rounded-xl shadow-2xl p-2 transition-all focus-within:border-slate-600/80 ${isFullscreen ? 'h-full flex-1' : ''}`}>
          <div className={`flex items-end px-2 py-2 ${isFullscreen ? 'flex-1 items-start' : ''}`}>
            {/* Attachment Button */}
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
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
              onClick={() => {
                if (files.length === 0) {
                  setError("Mohon upload file data terlebih dahulu untuk menggunakan Sandbox Analytics.");
                  return;
                }
                handleUpload();
              }}
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
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                >
                  <span>{engine}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                
                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsDropdownOpen(false)}
                    ></div>
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#0A0A0A] border border-slate-800 rounded-md shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-bottom-2">
                      <div className="px-3 py-2 border-b border-slate-800/50 mb-1">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500">Select AI Engine</span>
                      </div>
                      {["Deepseek V4 PRO (Reasoning)", "Llama 3.3 70B Versatile", "Gemini 3.1 PRO (High)", "Claude Opus 4.8", "Qwen 3.7 Max"].map((eng) => (
                        <button
                          key={eng}
                          onClick={() => { setEngine(eng); setIsDropdownOpen(false) }}
                          className="w-full text-left px-4 py-2.5 text-xs font-mono text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 transition-colors flex items-center justify-between group/item"
                        >
                          {eng}
                          {engine === eng && <Check className="h-3 w-3 text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* External Data Stream Toggle */}
              <div className="flex items-center space-x-2 border-l border-slate-800/50 pl-4">
                <button
                  type="button"
                  onClick={() => setNewsEnabled(!newsEnabled)}
                  className={`text-xs font-mono px-3 py-1 rounded transition-colors ${
                    newsEnabled 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                      : 'bg-transparent text-slate-600 border border-slate-800 hover:text-slate-400'
                  }`}
                >
                  News API
                </button>
                <div className="relative group/info cursor-help">
                  <span className="text-slate-500 text-[10px] font-bold w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center group-hover/info:text-indigo-400 group-hover/info:border-indigo-400 transition-colors rotate-180">
                    !
                  </span>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-[#0A0A0A] border border-slate-800 shadow-xl rounded text-[10px] text-slate-300 opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-10">
                    aktifkan fitur ini untuk melihat api news
                  </div>
                </div>
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

      {error && (
        <div className="w-full rounded border border-red-900/50 bg-red-950/30 p-4 text-xs font-mono text-red-400 animate-in fade-in shrink-0">
      {error}
        </div>
      )}
    </div>
  )
}