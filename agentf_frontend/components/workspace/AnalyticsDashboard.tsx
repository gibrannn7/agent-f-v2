'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchWithAuth } from '@/lib/api-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, Terminal, Activity, Layers, ShieldAlert } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface StreamToken {
  type: string;
  content: string;
}

interface AnalyticsDashboardProps {
  sessionId: string
  executionLog: StreamToken[]
}

type WidgetType = 'z_score' | 'dupont' | 'generic';

interface WidgetData {
  id: string;
  type: WidgetType;
  title: string;
  value?: string | number;
  badge?: { text: string; colorClass: string };
  subMetrics?: { label: string; value: string }[];
}

const BLACKLIST_KEYS = ['_charts', 'macro_analysis', 'interpretation', 'volatility_note', 'highlight_metrics', 'summary', 'cfo_narrative'];

// Helper 1: Format penamaan key
const formatKey = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

// Helper 2: Safe Numeric Parser (Strict Runtime Casting)
const parseNumeric = (val: any): number | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) return Number(val);
  return null;
};

// Helper 3: Evaluasi Status Z-Score
const getZScoreBadge = (val: number) => {
  if (val > 2.99) return { text: "SAFE ZONE", colorClass: "text-emerald-400 bg-emerald-400/10 border-emerald-500/30" };
  if (val >= 1.81) return { text: "GREY ZONE", colorClass: "text-yellow-400 bg-yellow-400/10 border-yellow-500/30" };
  return { text: "DISTRESS ZONE", colorClass: "text-rose-400 bg-rose-400/10 border-rose-500/30" };
};

// Helper 4: Evaluasi Status Generic
const evaluateGenericBadge = (key: string, value: number) => {
  const keyLower = key.toLowerCase();
  if (keyLower.includes('volatility') || keyLower.includes('risk') || keyLower.includes('std')) {
    if (value > 0.05) return { text: "HIGH RISK EXPOSURE", colorClass: "text-rose-400 bg-rose-400/10 border-rose-500/30" };
    return { text: "STANDARD VARIANCE", colorClass: "text-emerald-400 bg-emerald-400/10 border-emerald-500/30" };
  }
  if (keyLower.includes('profit') || keyLower.includes('margin') || keyLower.includes('cagr') || keyLower.includes('revenue') || keyLower.includes('growth')) {
    if (value > 0) return { text: "POSITIVE YIELD", colorClass: "text-emerald-400 bg-emerald-400/10 border-emerald-500/30" };
    if (value < 0) return { text: "NEGATIVE YIELD", colorClass: "text-rose-400 bg-rose-400/10 border-rose-500/30" };
    return { text: "NEUTRAL", colorClass: "text-slate-400 bg-slate-800/50 border-slate-700" };
  }
  return { text: "TRACKED KPI", colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" };
};

// Ekstraktor KPI Utama
const extractWidgets = (data: any): WidgetData[] => {
  const widgets: WidgetData[] = [];
  if (!data || typeof data !== 'object') return widgets;

  const processedKeys = new Set<string>();

  // 1. Ekstraksi Spesifik: Altman Z-Score
  const zScoreKey = Object.keys(data).find(k => k.toLowerCase().includes('altman') || k.toLowerCase().includes('z_score'));
  if (zScoreKey) {
    processedKeys.add(zScoreKey);
    const zData = data[zScoreKey];
    let zVal: number | null = null;
    
    zVal = parseNumeric(zData);
    if (zVal === null) zVal = parseNumeric(zData?.summary?.Z_Score);
    if (zVal === null) zVal = parseNumeric(zData?.summary?.z_score);
    if (zVal === null) zVal = parseNumeric(zData?.latest_z_score);
    if (zVal === null && typeof zData === 'object' && zData !== null) {
      const summaryObj = zData?.summary || zData;
      for (const val of Object.values(summaryObj)) {
        const parsed = parseNumeric(val);
        if (parsed !== null) {
          zVal = parsed;
          break;
        }
      }
    }

    if (zVal !== null) {
      widgets.push({
        id: zScoreKey,
        type: 'z_score',
        title: 'Altman Z-Score',
        value: zVal.toFixed(2),
        badge: getZScoreBadge(zVal)
      });
    }
  }

  // 2. Ekstraksi Spesifik: DuPont Analysis
  const dupontKey = Object.keys(data).find(k => k.toLowerCase().includes('du_pont') || k.toLowerCase().includes('dupont'));
  if (dupontKey) {
    processedKeys.add(dupontKey);
    const dData = data[dupontKey];
    const summary = dData?.summary || dData || {};

    const extractM = (keysToFind: string[]) => {
      for (const k of keysToFind) {
        let parsed = parseNumeric(summary[k]);
        if (parsed !== null) return parsed.toFixed(4);
        
        if (summary[k] && typeof summary[k] === 'object') {
          for (const val of Object.values(summary[k])) {
            parsed = parseNumeric(val);
            if (parsed !== null) return parsed.toFixed(4);
          }
        }
      }
      return 'N/A';
    };

    widgets.push({
      id: dupontKey,
      type: 'dupont',
      title: 'DuPont ROE Drivers',
      subMetrics: [
        { label: 'NPM', value: extractM(['NPM', 'Net Profit Margin', 'net_profit_margin']) },
        { label: 'AT', value: extractM(['AT', 'Asset Turnover', 'asset_turnover']) },
        { label: 'EM', value: extractM(['EM', 'Equity Multiplier', 'equity_multiplier']) },
        { label: 'ROE', value: extractM(['ROE', 'Return on Equity', 'roe']) },
      ]
    });
  }

  // 3. Ekstraksi Dinamis Sisa Metrik Numerik
  for (const [key, val] of Object.entries(data)) {
    if (BLACKLIST_KEYS.includes(key) || processedKeys.has(key)) continue;

    let numVal: number | null = parseNumeric(val);
    
    if (numVal === null && typeof val === 'object' && val !== null) {
      numVal = parseNumeric((val as any).summary);
      if (numVal === null) {
        for (const innerVal of Object.values(val)) {
          const parsed = parseNumeric(innerVal);
          if (parsed !== null) {
            numVal = parsed;
            break;
          }
        }
      }
    }

    if (numVal !== null) {
      widgets.push({
        id: key,
        type: 'generic',
        title: formatKey(key),
        value: numVal % 1 === 0 ? numVal.toString() : numVal.toFixed(4).replace(/\.0000$/, ''),
        badge: evaluateGenericBadge(key, numVal)
      });
    }
  }

  return widgets.slice(0, 6); // Maksimum 6 widget
};

export function AnalyticsDashboard({ sessionId, executionLog }: AnalyticsDashboardProps) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetchWithAuth(`/api/v1/workspace/results/${sessionId}`)
        if (!res.ok) throw new Error('Failed to load analytical payload.')
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
      <div className="rounded-md border border-red-500/50 bg-red-500/10 p-6 flex items-center space-x-4">
        <AlertTriangle className="h-6 w-6 text-red-500" />
        <span className="text-red-400 font-medium">System Error: {error}</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12 border border-slate-800 rounded-lg bg-slate-900/50 backdrop-blur-md">
         <span className="text-slate-400 animate-pulse font-mono text-sm tracking-widest uppercase">Initializing comprehensive analytics architecture...</span>
      </div>
    )
  }

  const analyticalData = data.analytical_data || {}
  const narrative = data.narrative || 'No structural narrative was generated by the CFO Synthesizer.'
  const chainOfThought = data.chain_of_thought_code || 'No execution trace available.'
  const charts = analyticalData._charts || []

  const systemExecutionLog = executionLog && executionLog.length > 0 
    ? executionLog.map((item) => item.content).join('') 
    : '[SYSTEM]: Log execution trace unavailable. Memory context dropped during handover.';

  const widgets = extractWidgets(analyticalData);
  const tableData = Object.entries(analyticalData).filter(([key]) => !BLACKLIST_KEYS.includes(key) && key !== '_charts');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* TARGETED DYNAMIC WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.length === 0 ? (
          <div className="col-span-full flex items-center justify-center p-12 border border-dashed border-slate-700 rounded-lg bg-slate-900/30">
            <span className="text-slate-500 font-mono text-sm tracking-widest uppercase">
              Awaiting structured KPIs from Agent-F...
            </span>
          </div>
        ) : (
          widgets.map((widget, idx) => {
            
            if (widget.type === 'dupont' && widget.subMetrics) {
              return (
                <Card key={idx} className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate pr-4">
                      {widget.title}
                    </CardTitle>
                    <Layers className="h-4 w-4 text-indigo-400 shrink-0" />
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col justify-center h-24">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 divide-x divide-slate-800/80">
                      {widget.subMetrics.map(sub => (
                        <div key={sub.label} className="flex flex-col pl-2 first:pl-0 sm:first:pl-0 sm:pl-2">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{sub.label}</span>
                          <span className="text-sm font-mono text-slate-200 truncate">{sub.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            }

            const IconComponent = widget.type === 'z_score' ? ShieldAlert : Activity;
            return (
              <Card key={idx} className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate pr-4">
                    {widget.title}
                  </CardTitle>
                  <IconComponent className="h-4 w-4 text-indigo-400 shrink-0" />
                </CardHeader>
                <CardContent className="pt-4 flex flex-col justify-between h-24">
                  <div className="text-3xl font-bold text-slate-100 truncate" title={String(widget.value)}>
                    {widget.value}
                  </div>
                  {widget.badge && (
                    <div className="mt-2 flex items-center h-[24px]">
                      <span className={`text-[10px] uppercase font-mono inline-block px-2 py-1 rounded border opacity-90 tracking-wider ${widget.badge.colorClass}`}>
                        {widget.badge.text}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* TABBED SECTIONS */}
      <Tabs defaultValue="narrative" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 flex flex-wrap">
          <TabsTrigger value="narrative" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 font-mono text-xs uppercase">CFO Executive Brief</TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 font-mono text-xs uppercase">Aggregated Matrices</TabsTrigger>
          <TabsTrigger value="trace" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 font-mono text-xs uppercase">Sandbox Trace</TabsTrigger>
          <TabsTrigger value="log" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 font-mono text-xs uppercase">Log Eksekusi / Audit Trail</TabsTrigger>
        </TabsList>
        
        <TabsContent value="narrative" className="mt-4">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
            <CardContent className="p-10">
              <div className="mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-semibold text-slate-100">Strategic Synthesis</h2>
              </div>
              
              <div className="prose prose-invert prose-indigo max-w-none font-serif text-lg text-slate-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {narrative}
                </ReactMarkdown>
              </div>
              
              {charts && charts.length > 0 && (
                <div className="mt-12 space-y-8 border-t border-slate-800 pt-8">
                  <h3 className="text-xl font-semibold text-slate-100">Visual Architectures</h3>
                  <div className="grid grid-cols-1 gap-8">
                    {charts.map((chartBase64: string, idx: number) => (
                      <div key={idx} className="rounded-lg overflow-hidden border border-slate-700 bg-[#0A0A0A] p-4 flex justify-center">
                        <img 
                          src={`data:image/png;base64,${chartBase64}`} 
                          alt={`Execution Context Visualization ${idx + 1}`} 
                          className="w-full h-auto object-contain max-h-[600px] rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-900/80">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider py-4 pl-6">Metric Identifier</TableHead>
                      <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider py-4 text-right pr-6">Computed Extracted Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map(([key, value]) => (
                      <TableRow key={key} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                        <TableCell className="font-mono text-sm text-indigo-300 py-4 align-top pl-6">{formatKey(key)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-slate-200 align-top max-w-2xl overflow-x-auto pr-6">
                          <pre className="whitespace-pre-wrap text-left inline-block bg-slate-950 p-4 rounded border border-slate-800/80 shadow-inner">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tableData.length === 0 && (
                      <TableRow className="border-slate-800">
                        <TableCell colSpan={2} className="text-center text-slate-500 py-12 font-mono text-sm">
                          No structural data parameters returned by the Sandbox Execution Engine.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trace" className="mt-4">
          <Card className="border-slate-800 bg-[#050505]">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-sm font-mono text-emerald-400 flex items-center uppercase tracking-wider">
                <Terminal className="mr-2 h-4 w-4" />
                Auditable Chain of Thought Trace
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 overflow-x-auto max-h-[600px] overflow-y-auto">
                <pre className="font-mono text-xs text-emerald-300/80 leading-relaxed whitespace-pre-wrap">
                  {chainOfThought}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <Card className="border-slate-800 bg-[#050505]">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-sm font-mono text-green-400 flex items-center uppercase tracking-wider">
                <Terminal className="mr-2 h-4 w-4" />
                System Execution Log / Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 overflow-x-auto max-h-[600px] overflow-y-auto">
                <pre className="font-mono text-xs text-green-400 leading-relaxed whitespace-pre-wrap">
                  {systemExecutionLog}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}