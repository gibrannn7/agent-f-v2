'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { fetchWithAuth } from '@/lib/api-client'
import { UploadCloud, FileSpreadsheet, Loader2, Globe } from 'lucide-react'

interface FileUploadZoneProps {
  onSessionCreated: (sessionId: string) => void
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function FileUploadZone({ onSessionCreated }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [customPrompt, setCustomPrompt] = useState('')
  const [newsToggle, setNewsToggle] = useState('disable')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      handleFilesSelected(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelected(Array.from(e.target.files))
    }
  }

  const handleFilesSelected = (selectedFiles: File[]) => {
    setError(null)
    const validFiles = selectedFiles.filter(f => f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))
    if (validFiles.length === 0) {
      setError('Only CSV and XLSX files are supported.')
      return
    }
    setFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      if (customPrompt.trim()) {
        formData.append('user_custom_prompt', customPrompt.trim())
      }
      formData.append('news_toggle', String(newsToggle === 'enable'))

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
    <div className="space-y-6">
      <Card className="border-slate-800/80 bg-[#0A0A0A] shadow-xl">
        <CardContent className="p-8 space-y-8">
          <div
            className={`flex flex-col items-center justify-center rounded-lg border border-dashed p-12 transition-all cursor-pointer ${
              isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-900/30'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="mb-4 h-10 w-10 text-slate-500" />
            <h3 className="mb-2 text-sm font-medium text-slate-300">
              Drag & Drop Financial Matrices
            </h3>
            <p className="mb-6 text-xs text-slate-500 uppercase tracking-wider">
              Strictly .CSV or .XLSX
            </p>
            <Button 
              type="button" 
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-6 py-2 rounded shadow-none" 
              disabled={isUploading}
            >
              Browse Local System
            </Button>
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
            <div className="rounded border border-red-900/50 bg-red-950/30 p-4 text-xs font-mono text-red-400">
              [SYSTEM ERROR]: {error}
            </div>
          )}

          <div className="space-y-4 rounded border border-slate-800/80 bg-[#050505] p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Execution Parameters</h4>
            
            <div className="space-y-2">
              <label htmlFor="custom-prompt" className="text-xs text-slate-500 block">
                Target Constraints
              </label>
              <textarea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Focus exclusively on Q3 liquidity risks."
                className="w-full min-h-[80px] rounded border border-slate-800 bg-[#0A0A0A] p-3 text-xs font-mono text-slate-300 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-y transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
              <div className="flex items-center space-x-3">
                <Globe className="h-4 w-4 text-slate-500" />
                <div className="flex flex-col">
                  <span className="text-xs text-slate-300">Macro Economic Context (NewsAPI)</span>
                  <span className="text-[10px] text-slate-500">External market synthesis integration</span>
                </div>
              </div>
              <select
                value={newsToggle}
                onChange={(e) => setNewsToggle(e.target.value)}
                className="bg-[#0A0A0A] border border-slate-800 text-slate-300 text-xs rounded block p-2 outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                <option value="disable">Disable</option>
                <option value="enable">Enable Integration</option>
              </select>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-slate-800/50">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Queued Payloads</h4>
                <div className="grid gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded border border-slate-800/80 bg-[#050505] p-3 transition-colors hover:border-slate-700">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <FileSpreadsheet className="h-4 w-4 text-indigo-500/70 shrink-0" />
                        <div className="flex flex-col truncate">
                          <span className="text-xs text-slate-300 font-mono truncate">{f.name}</span>
                          <span className="text-[10px] text-slate-600">{formatBytes(f.size)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(i)
                        }}
                        className="text-[10px] uppercase font-bold text-slate-500 hover:text-red-400 transition-colors ml-4 shrink-0"
                      >
                        Drop
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-8 py-2 h-auto rounded shadow-lg shadow-indigo-900/20"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Executing Pipeline
                    </>
                  ) : (
                    'Initialize Pipeline'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}