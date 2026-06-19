'use client'

import React, { useState } from 'react'
import { Menu, Terminal, Database, Settings } from 'lucide-react'

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <aside 
      className={`border-r border-slate-800/80 bg-[#0A0A0A] flex flex-col transition-all duration-300 relative z-20 ${
        isExpanded ? 'w-64' : 'w-[72px]'
      }`}
    >
      {/* HEADER: Toggle & Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-800/50 shrink-0 overflow-hidden">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 -ml-2 mr-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded transition-colors shrink-0 outline-none"
          title={isExpanded ? "Collapse Menu" : "Expand Menu"}
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className={`flex items-center transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>
          <img 
            src="/images/logo.webp" 
            alt="AGENT-F" 
            className="w-6 h-6 object-contain mr-3"
          />
          <span className="text-xs font-bold tracking-[0.2em] text-slate-300 uppercase whitespace-nowrap">
            Agent-F
          </span>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 w-full flex flex-col gap-2 p-3 overflow-y-auto overflow-x-hidden">
        <div className="flex items-center w-full px-3 py-3 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20 cursor-pointer transition-colors group">
          <Terminal className="h-4 w-4 shrink-0" />
          <span className={`ml-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
            Orchestrator
          </span>
        </div>
        
        <div className="flex items-center w-full px-3 py-3 text-slate-500 rounded-md cursor-not-allowed transition-colors hover:bg-slate-900/50">
          <Database className="h-4 w-4 shrink-0" />
          <span className={`ml-4 text-xs uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
            Knowledge Base
          </span>
        </div>

        <div className="flex items-center w-full px-3 py-3 text-slate-500 rounded-md cursor-not-allowed transition-colors hover:bg-slate-900/50">
          <Settings className="h-4 w-4 shrink-0" />
          <span className={`ml-4 text-xs uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
            Settings
          </span>
        </div>
      </nav>

      {/* PROFILE MOCKUP */}
      <div className="border-t border-slate-800/50 p-3 shrink-0">
        <div className="flex items-center px-2 py-2 rounded-md hover:bg-slate-900/50 cursor-pointer transition-colors overflow-hidden">
          <div className="w-8 h-8 rounded bg-indigo-950 border border-indigo-900/50 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-indigo-400 font-mono tracking-tighter">FG</span>
          </div>
          <div className={`flex flex-col ml-3 transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
            <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Users</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest whitespace-nowrap">User Test Development</span>
          </div>
        </div>
      </div>
    </aside>
  )
}