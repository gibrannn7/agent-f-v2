'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Terminal, LogOut, ChevronUp, Edit3, Settings2, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/client'

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [userData, setUserData] = useState<{ name: string; email: string; initials: string; role: string; goal: string } | null>(null)
  const [isSessionChecked, setIsSessionChecked] = useState(false)
  
  // Persona Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editRole, setEditRole] = useState('')
  const [editGoal, setEditGoal] = useState('')
  const [isSavingPersona, setIsSavingPersona] = useState(false)
  
  // Persona Toggle State
  const [usePersona, setUsePersona] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const metadata = session.user.user_metadata
        const email = session.user.email || ''
        const name = metadata?.full_name || email.split('@')[0] || 'User'
        const initials = name.substring(0, 2).toUpperCase()
        setUserData({ name, email, initials, role: metadata?.role || '', goal: metadata?.goal || '' })
      }
      setIsSessionChecked(true)
    }
    fetchUser()
    
    // Load toggle state from local storage
    const stored = localStorage.getItem('agentf_usePersona');
    if (stored !== null) {
      setUsePersona(stored === 'true');
    }
  }, [supabase])

  const handleTogglePersona = () => {
    const newVal = !usePersona;
    setUsePersona(newVal);
    localStorage.setItem('agentf_usePersona', String(newVal));
    window.dispatchEvent(new CustomEvent('personaToggle', { detail: newVal }));
  }

  const openEditModal = () => {
    if (userData) {
      setEditRole(userData.role);
      setEditGoal(userData.goal);
    }
    setIsEditModalOpen(true);
    setIsProfileMenuOpen(false);
  }

  const savePersona = async () => {
    try {
      setIsSavingPersona(true);
      const { error } = await supabase.auth.updateUser({
        data: { role: editRole, goal: editGoal }
      });
      if (error) throw error;
      if (userData) {
        setUserData({ ...userData, role: editRole, goal: editGoal });
      }
      setIsEditModalOpen(false);
    } catch (err) {
      alert("Failed to update persona.");
    } finally {
      setIsSavingPersona(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
      </nav>

      {/* PROFILE SECTON */}
      <div className={`border-t border-slate-800/50 py-3 shrink-0 flex flex-col relative ${isExpanded ? 'px-3' : 'items-center'}`}>
        {!isSessionChecked ? (
          <div className={`flex items-center p-2 opacity-50`}>
             <div className="w-8 h-8 rounded bg-slate-800 animate-pulse"></div>
             {isExpanded && <div className="ml-3 h-4 w-20 bg-slate-800 animate-pulse rounded"></div>}
          </div>
        ) : userData ? (
          <>
            {/* Logout Menu Popup */}
            {isProfileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                <div className={`absolute bottom-full mb-2 bg-[#0A0A0A] border border-slate-800 rounded-lg shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-bottom-2 ${isExpanded ? 'left-3 right-3' : 'left-full ml-2 w-56'}`}>
                  
                  {/* Edit Persona */}
                  <button
                    onClick={openEditModal}
                    className="w-full text-left px-4 py-2.5 text-xs font-mono text-slate-300 hover:bg-slate-800/50 transition-colors flex items-center space-x-3"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Personalize Prompt</span>
                  </button>

                  {/* Toggle Persona */}
                  <div className="w-full px-4 py-2.5 flex items-center justify-between border-b border-slate-800/50">
                    <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
                      <Settings2 className="w-4 h-4" />
                      <span>Use Persona</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleTogglePersona}
                      className={`w-8 h-4 rounded-full transition-colors relative focus:outline-none ${usePersona ? 'bg-emerald-600' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${usePersona ? 'translate-x-4' : 'translate-x-0'}`}></span>
                    </button>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-xs font-mono text-red-400 hover:bg-red-500/10 transition-colors flex items-center space-x-3 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            )}

            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`flex items-center rounded-md hover:bg-slate-900/80 cursor-pointer transition-colors overflow-hidden border border-transparent hover:border-slate-800 focus:outline-none ${isExpanded ? 'px-2 py-2 w-full justify-between' : 'p-1'}`}
            >
              <div className="flex items-center min-w-0">
                <div className="w-8 h-8 rounded bg-indigo-950 border border-indigo-900/50 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-indigo-400 font-mono tracking-tighter">
                    {userData.initials}
                  </span>
                </div>
                <div className={`flex flex-col ml-3 min-w-0 transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                  <span className="text-xs font-medium text-slate-300 whitespace-nowrap truncate">{userData.name}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest whitespace-nowrap truncate">{userData.email}</span>
                </div>
              </div>
              {isExpanded && <ChevronUp className="w-4 h-4 text-slate-600 shrink-0" />}
            </button>
          </>
        ) : (
          <button 
            onClick={() => router.push('/login')}
            className={`flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors overflow-hidden border border-transparent focus:outline-none shadow-[0_0_15px_rgba(79,70,229,0.3)] ${isExpanded ? 'px-4 py-2.5 w-full space-x-2' : 'w-8 h-8 p-0'}`}
            title="Log In"
          >
            {isExpanded ? (
               <span className="text-xs font-semibold uppercase tracking-wider">Sign In</span>
            ) : (
               <LogOut className="w-4 h-4 rotate-180" />
            )}
          </button>
        )}
      </div>

      {/* Edit Persona Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-slate-800 rounded-xl shadow-2xl p-6 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-100 font-mono">Personalize Prompt Engine</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Your Operational Role</label>
                <input 
                  type="text" 
                  value={editRole} 
                  onChange={e => setEditRole(e.target.value)}
                  placeholder="e.g. Risk Manager, M&A Analyst"
                  className="w-full bg-[#050505] border border-slate-700 rounded p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Analysis Directive / Goal</label>
                <textarea 
                  value={editGoal} 
                  onChange={e => setEditGoal(e.target.value)}
                  rows={3}
                  placeholder="e.g. Audit for structural liabilities and predict downside risks."
                  className="w-full bg-[#050505] border border-slate-700 rounded p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={savePersona}
                disabled={isSavingPersona || !editRole.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded text-xs font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {isSavingPersona && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}