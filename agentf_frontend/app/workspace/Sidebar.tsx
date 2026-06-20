'use client'

import React, { useState } from 'react'
import { Menu, Terminal, Database, Settings } from 'lucide-react'

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <aside 
      className={`border-r border-slate-800/80 bg-[#0A0A0A] flex flex-col transition-all duration-300 relative z-20 ${
        isExpanded ? 'w-64' : 'w-[72px]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* HEADER: Toggle & Logo */}
      <div className={`flex items-center h-16 border-b border-slate-800/50 shrink-0 overflow-hidden ${isExpanded ? 'px-4' : 'justify-center'}`}>
        {!isExpanded && !isHovered ? (
          <div className="flex items-center justify-center w-10 h-10">
            <img 
              src="/images/logo.png" 
              alt="AF" 
              className="w-6 h-6 object-contain"
            />
          </div>
        ) : (
          <>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-10 h-10 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded transition-colors shrink-0 outline-none flex items-center justify-center group/btn relative"
              title={!isExpanded ? "buka sidebar" : "Collapse Menu"}
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className={`flex items-center transition-opacity duration-300 ${isExpanded ? 'opacity-100 ml-3' : 'opacity-0 w-0 hidden'}`}>
              <img 
                src="/images/logo.png" 
                alt="AGENT-F" 
                className="w-6 h-6 object-contain mr-3"
              />
              <span className="text-xs font-bold tracking-[0.2em] text-slate-300 uppercase whitespace-nowrap">
                Agent-F
              </span>
            </div>
          </>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className={`flex-1 w-full flex flex-col gap-2 py-3 overflow-y-auto overflow-x-hidden ${isExpanded ? 'px-3' : 'px-0 items-center'}`}>
        <div className={`flex items-center bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20 cursor-pointer transition-colors group ${isExpanded ? 'w-full px-3 py-3' : 'w-10 h-10 justify-center'}`} title={!isExpanded ? 'Orchestrator' : ''}>
          <Terminal className="h-5 w-5 shrink-0" />
          <span className={`ml-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
            Orchestrator
          </span>
        </div>
        
        <div className={`flex items-center text-slate-500 rounded-md cursor-not-allowed transition-colors hover:bg-slate-900/50 ${isExpanded ? 'w-full px-3 py-3' : 'w-10 h-10 justify-center'}`} title={!isExpanded ? 'Knowledge Base' : ''}>
          <Database className="h-5 w-5 shrink-0" />
          <span className={`ml-4 text-xs uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
            Knowledge Base
          </span>
        </div>

        <div className={`flex items-center text-slate-500 rounded-md cursor-not-allowed transition-colors hover:bg-slate-900/50 ${isExpanded ? 'w-full px-3 py-3' : 'w-10 h-10 justify-center'}`} title={!isExpanded ? 'Settings' : ''}>
          <Settings className="h-5 w-5 shrink-0" />
          <span className={`ml-4 text-xs uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
            Settings
          </span>
        </div>
      </nav>

      {/* PROFILE MOCKUP */}
      <div className={`border-t border-slate-800/50 py-3 shrink-0 flex ${isExpanded ? 'px-3' : 'justify-center'}`}>
        <div className={`flex items-center rounded-md hover:bg-slate-900/50 cursor-pointer transition-colors overflow-hidden ${isExpanded ? 'px-2 py-2 w-full' : 'p-1'}`}>
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