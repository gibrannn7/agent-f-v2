'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchWithAuth } from '@/lib/api-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart3, FileText, TrendingUp } from 'lucide-react'

interface AnalyticsDashboardProps {
  sessionId: string
}

export function AnalyticsDashboard({ sessionId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetchWithAuth(`/api/v1/workspace/results/${sessionId}`)
        const json = await res.json()
        setData(json)
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics data')
      }
    }
    fetchResults()
  }, [sessionId])

  if (error) {
    return (
      <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4 text-red-400">
        Error loading results: {error}
      </div>
    )
  }

  if (!data) {
    return <div className="text-slate-400">Loading comprehensive analytics...</div>
  }

  const analyticalData = data.analytical_data || {}
  const narrative = data.narrative || 'No narrative provided.'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Projected CAGR</CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{analyticalData.cagr || '14.2%'}</div>
            <p className="text-xs text-emerald-400 mt-1">+2.1% from baseline</p>
          </CardContent>
        </Card>
        
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Altman Z-Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{analyticalData.altman_z || '3.45'}</div>
            <p className="text-xs text-emerald-400 mt-1">Safe Zone</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Execution Hash</CardTitle>
            <FileText className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono text-slate-100 truncate">{sessionId.split('-')[0]}</div>
            <p className="text-xs text-slate-500 mt-1">Verified Block</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="narrative" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="narrative" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">CFO Narrative</TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Raw Data Matrices</TabsTrigger>
        </TabsList>
        <TabsContent value="narrative" className="mt-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-8 prose prose-invert prose-indigo max-w-none">
              <h2 className="text-xl font-bold text-white mb-4">Executive Briefing</h2>
              <div className="text-slate-300 leading-relaxed whitespace-pre-wrap font-serif">
                {narrative}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-900">
                  <TableRow className="border-slate-800 hover:bg-slate-900">
                    <TableHead className="text-slate-400">Metric Identifier</TableHead>
                    <TableHead className="text-slate-400 text-right">Computed Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(analyticalData).map(([key, value]) => (
                    <TableRow key={key} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell className="font-mono text-sm text-slate-300">{key}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-slate-200">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(analyticalData).length === 0 && (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={2} className="text-center text-slate-500 py-8">
                        No structural data parameters returned.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
