'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { fetchWithAuth } from '@/lib/api-client'
import { UploadCloud, FileSpreadsheet, Loader2, Globe } from 'lucide-react'

interface FileUploadZoneProps {
  onSessionCreated: (sessionId: string) => void
}

export function FileUploadZone({ onSessionCreated }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [customPrompt, setCustomPrompt] = useState('')
  const [newsToggle, setNewsToggle] = useState(false)
  
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
      formData.append('news_toggle', String(newsToggle))

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
      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <CardContent className="p-8 space-y-8">
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-900/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="mb-4 h-12 w-12 text-slate-400" />
            <h3 className="mb-2 text-lg font-medium text-slate-200">
              Drag & Drop Enterprise Data Payloads
            </h3>
            <p className="mb-6 text-sm text-slate-400">
              Strictly supports raw .CSV and .XLSX matrices
            </p>
            <Button type="button" variant="secondary" disabled={isUploading}>
              Browse Files
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
            <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900/80 p-6">
            <h4 className="text-sm font-medium text-slate-300">Strategic Constraints (Optional)</h4>
            
            <div className="space-y-2">
              <label htmlFor="custom-prompt" className="text-xs text-slate-400 block">
                Analysis Notes / Custom Constraints
              </label>
              <textarea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Focus exclusively on Q3 liquidity risks. Ignore APAC region data."
                className="w-full min-h-[100px] rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-slate-400" />
                <div className="flex flex-col">
                  <span className="text-sm text-slate-200">Incorporate Macro Economic Context (NewsAPI)</span>
                  <span className="text-xs text-slate-500">Enable real-time hybrid external synthesis</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={newsToggle}
                  onChange={(e) => setNewsToggle(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-300">Selected Payloads</h4>
                <div className="grid gap-3">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-800 p-3">
                      <div className="flex items-center space-x-3">
                        <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
                        <span className="text-sm text-slate-200">{f.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(i)
                        }}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>



              <div className="flex justify-end pt-4">
                <Button onClick={handleUpload} disabled={isUploading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[180px]">
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing Pipeline
                    </>
                  ) : (
                    'Run Analysis'
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
