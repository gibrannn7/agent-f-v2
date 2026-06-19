'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchWithAuth } from '@/lib/api-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, Terminal, Activity, Layers, ShieldAlert, Maximize2, Minimize2, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'

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

const formatKey = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const parseNumeric = (val: any): number | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) return Number(val);
  return null;
};

const getZScoreBadge = (val: number) => {
  if (val > 2.99) return { text: "SAFE ZONE", colorClass: "text-emerald-400 bg-emerald-950/30 border-emerald-900/50" };
  if (val >= 1.81) return { text: "GREY ZONE", colorClass: "text-yellow-400 bg-yellow-950/30 border-yellow-900/50" };
  return { text: "DISTRESS ZONE", colorClass: "text-rose-400 bg-rose-950/30 border-rose-900/50" };
};

const evaluateGenericBadge = (key: string, value: number) => {
  const keyLower = key.toLowerCase();
  if (keyLower.includes('volatility') || keyLower.includes('risk') || keyLower.includes('std')) {
    if (value > 0.05) return { text: "HIGH RISK", colorClass: "text-rose-400 bg-rose-950/30 border-rose-900/50" };
    return { text: "STD VARIANCE", colorClass: "text-emerald-400 bg-emerald-950/30 border-emerald-900/50" };
  }
  if (keyLower.includes('profit') || keyLower.includes('margin') || keyLower.includes('cagr') || keyLower.includes('revenue') || keyLower.includes('growth')) {
    if (value > 0) return { text: "POSITIVE", colorClass: "text-emerald-400 bg-emerald-950/30 border-emerald-900/50" };
    if (value < 0) return { text: "NEGATIVE", colorClass: "text-rose-400 bg-rose-950/30 border-rose-900/50" };
    return { text: "NEUTRAL", colorClass: "text-slate-400 bg-slate-800/50 border-slate-700" };
  }
  return { text: "TRACKED KPI", colorClass: "text-indigo-400 bg-indigo-950/30 border-indigo-900/50" };
};

const extractWidgets = (data: any): WidgetData[] => {
  const widgets: WidgetData[] = [];
  if (!data || typeof data !== 'object') return widgets;

  const processedKeys = new Set<string>();

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

  return widgets.slice(0, 6);
};

export function AnalyticsDashboard({ sessionId, executionLog }: AnalyticsDashboardProps) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  // UI States
  const [isFullscreenLog, setIsFullscreenLog] = useState(false)
  const [modalPayload, setModalPayload] = useState<{title: string, data: any} | null>(null)

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
      <div className="rounded border border-red-900/50 bg-red-950/20 p-6 flex items-center space-x-4">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <span className="text-red-400 text-sm font-mono uppercase tracking-wider">System Error: {error}</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12 border border-slate-800/50 rounded bg-[#0A0A0A]">
         <span className="text-slate-500 animate-pulse font-mono text-xs tracking-widest uppercase">Initializing comprehensive architectures...</span>
      </div>
    )
  }

  const analyticalData = data.analytical_data || {}
  const narrative = data.narrative || 'No structural narrative was generated.'
  const chainOfThought = data.chain_of_thought_code || 'No execution trace available.'
  const charts = analyticalData._charts || []

  const systemExecutionLog = executionLog && executionLog.length > 0 
    ? executionLog.map((item) => item.content).join('') 
    : '[SYSTEM]: Log execution trace unavailable. Memory context dropped.';

  const widgets = extractWidgets(analyticalData);
  const tableData = Object.entries(analyticalData).filter(([key]) => !BLACKLIST_KEYS.includes(key) && key !== '_charts');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* MODAL OVERLAY FOR HUGE JSON PAYLOADS */}
      {modalPayload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/90 backdrop-blur-sm p-6">
          <div className="bg-[#0A0A0A] border border-slate-800 rounded shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800/80 flex justify-between items-center bg-[#050505]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 font-mono">
                Payload Inspector: {modalPayload.title}
              </h3>
              <button onClick={() => setModalPayload(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
               <pre className="text-emerald-400 text-xs whitespace-pre-wrap font-mono leading-relaxed">
                 {typeof modalPayload.data === 'object' ? JSON.stringify(modalPayload.data, null, 2) : String(modalPayload.data)}
               </pre>
            </div>
          </div>
        </div>
      )}

      {/* TARGETED DYNAMIC WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.length === 0 ? (
          <div className="col-span-full flex items-center justify-center p-10 border border-dashed border-slate-800 rounded bg-[#0A0A0A]">
            <span className="text-slate-600 font-mono text-xs tracking-widest uppercase">
              Awaiting structured KPIs...
            </span>
          </div>
        ) : (
          widgets.map((widget, idx) => {
            if (widget.type === 'dupont' && widget.subMetrics) {
              return (
                <Card key={idx} className="border-slate-800/80 bg-[#0A0A0A] shadow-none rounded">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate pr-4">
                      {widget.title}
                    </CardTitle>
                    <Layers className="h-4 w-4 text-slate-600 shrink-0" />
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col justify-center h-24">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 divide-x divide-slate-800/80">
                      {widget.subMetrics.map(sub => (
                        <div key={sub.label} className="flex flex-col pl-2 first:pl-0 sm:first:pl-0 sm:pl-2">
                          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">{sub.label}</span>
                          <span className="text-xs font-mono text-slate-200 truncate">{sub.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            }

            const IconComponent = widget.type === 'z_score' ? ShieldAlert : Activity;
            return (
              <Card key={idx} className="border-slate-800/80 bg-[#0A0A0A] shadow-none rounded">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate pr-4">
                    {widget.title}
                  </CardTitle>
                  <IconComponent className="h-4 w-4 text-slate-600 shrink-0" />
                </CardHeader>
                <CardContent className="pt-4 flex flex-col justify-between h-24">
                  <div className="text-2xl font-light text-slate-100 truncate" title={String(widget.value)}>
                    {widget.value}
                  </div>
                  {widget.badge && (
                    <div className="mt-2 flex items-center h-[24px]">
                      <span className={`text-[9px] uppercase font-bold font-mono inline-block px-2 py-1 rounded border tracking-widest ${widget.badge.colorClass}`}>
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
        <TabsList className="bg-[#0A0A0A] border border-slate-800/80 flex flex-wrap rounded-none">
          <TabsTrigger value="narrative" className="data-[state=active]:bg-indigo-600/10 data-[state=active]:text-indigo-400 rounded-none text-slate-500 font-mono text-[10px] tracking-widest uppercase border-r border-slate-800/50">CFO Executive Brief</TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-indigo-600/10 data-[state=active]:text-indigo-400 rounded-none text-slate-500 font-mono text-[10px] tracking-widest uppercase border-r border-slate-800/50">Aggregated Matrices</TabsTrigger>
          <TabsTrigger value="trace" className="data-[state=active]:bg-indigo-600/10 data-[state=active]:text-indigo-400 rounded-none text-slate-500 font-mono text-[10px] tracking-widest uppercase border-r border-slate-800/50">Sandbox Trace</TabsTrigger>
          <TabsTrigger value="log" className="data-[state=active]:bg-indigo-600/10 data-[state=active]:text-indigo-400 rounded-none text-slate-500 font-mono text-[10px] tracking-widest uppercase">Audit Trail</TabsTrigger>
        </TabsList>
        
        <TabsContent value="narrative" className="mt-0 pt-4">
          <Card className="border-slate-800/80 bg-[#0A0A0A] rounded shadow-none">
            <CardContent className="p-8 md:p-12">
              <div className="mb-8 border-b border-slate-800/50 pb-4">
                <h2 className="text-xl font-medium tracking-tight text-slate-200">Strategic Synthesis</h2>
              </div>
              
              <div className="prose prose-invert max-w-none font-sans text-sm text-slate-300 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {narrative}
                </ReactMarkdown>
              </div>
              
              {charts && charts.length > 0 && (
                <div className="mt-12 space-y-6 border-t border-slate-800/50 pt-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 font-mono">Visual Architectures</h3>
                  <div className="grid grid-cols-1 gap-6">
                    {charts.map((chartBase64: string, idx: number) => (
                      <div key={idx} className="rounded border border-slate-800 bg-[#050505] p-6 flex justify-center">
                        <img 
                          src={`data:image/png;base64,${chartBase64}`} 
                          alt={`Execution Context Visualization ${idx + 1}`} 
                          className="w-full h-auto object-contain max-h-[500px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-0 pt-4">
          <Card className="border-slate-800/80 bg-[#0A0A0A] rounded shadow-none">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#050505]">
                    <TableRow className="border-slate-800/80 hover:bg-transparent">
                      <TableHead className="text-slate-500 text-[10px] font-bold uppercase tracking-widest py-4 pl-6 w-1/3">Metric Identifier</TableHead>
                      <TableHead className="text-slate-500 text-[10px] font-bold uppercase tracking-widest py-4 text-right pr-6">Computed Extracted Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map(([key, value]) => {
                      const isComplex = typeof value === 'object' && value !== null;
                      const strValue = String(value);
                      const isLongString = !isComplex && strValue.length > 80;

                      return (
                        <TableRow key={key} className="border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                          <TableCell className="font-mono text-xs text-indigo-300/80 py-4 align-middle pl-6">
                            {formatKey(key)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-slate-300 align-middle pr-6">
                            {(isComplex || isLongString) ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-[#050505] border-slate-700 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                                onClick={() => setModalPayload({ title: formatKey(key), data: value })}
                              >
                                View Payload
                              </Button>
                            ) : (
                              strValue
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {tableData.length === 0 && (
                      <TableRow className="border-slate-800/50">
                        <TableCell colSpan={2} className="text-center text-slate-600 py-12 font-mono text-xs uppercase tracking-widest">
                          No structural data parameters returned.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trace" className="mt-0 pt-4">
          <Card className="border-slate-800/80 bg-[#050505] rounded shadow-none">
            <CardContent className="p-0">
              <div className="p-6 overflow-x-auto h-[600px] overflow-y-auto">
                <pre className="font-mono text-[11px] text-emerald-400/80 leading-relaxed whitespace-pre-wrap">
                  {chainOfThought}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FULLSCREEN CAPABLE LOG TAB */}
        <TabsContent value="log" className="mt-0 pt-4">
          <div className={isFullscreenLog ? "fixed inset-0 z-50 bg-[#050505] flex flex-col p-6 animate-in fade-in duration-200" : ""}>
            <Card className={`border-slate-800/80 bg-[#050505] rounded shadow-none flex-1 flex flex-col ${isFullscreenLog ? 'h-full border-0' : ''}`}>
              <CardHeader className="border-b border-slate-800/50 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest flex items-center">
                  <Terminal className="mr-2 h-4 w-4 text-slate-600" />
                  System Execution Log
                </CardTitle>
                <button 
                  onClick={() => setIsFullscreenLog(!isFullscreenLog)}
                  className="text-slate-500 hover:text-slate-300 transition-colors flex items-center space-x-2"
                >
                  <span className="text-[10px] uppercase tracking-widest font-mono font-bold">
                    {isFullscreenLog ? 'Exit Fullscreen' : 'Fullscreen'}
                  </span>
                  {isFullscreenLog ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </CardHeader>
              <CardContent className="p-0 flex-1 relative min-h-[400px]">
                <div className={`p-6 overflow-x-auto overflow-y-auto absolute inset-0`}>
                  <pre className="font-mono text-[11px] text-emerald-500 leading-relaxed whitespace-pre-wrap">
                    {systemExecutionLog}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}