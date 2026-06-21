'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'
import { Loader2, Briefcase, Target, ArrowRight, CheckCircle2 } from 'lucide-react'

const ROLES = [
  "Risk Manager",
  "M&A Analyst",
  "Financial Auditor",
  "Chief Financial Officer",
  "Quantitative Researcher",
  "Data Scientist"
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [goal, setGoal] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      
      // If user already has metadata, redirect to workspace directly
      const metadata = session.user.user_metadata
      if (metadata?.role && metadata?.goal) {
        router.push('/workspace')
        return
      }
      
      setIsLoadingSession(false)
    }
    
    checkSession()
  }, [router, supabase.auth])

  const handleSavePersona = async () => {
    if (!role) {
      setError("Please select a role.")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Store persona in user_metadata, and default to FREE tier if missing
      // If goal is empty, save it as an empty string (or a default neutral directive)
      const finalGoal = goal.trim() ? goal.trim() : "Standard operational performance metrics"

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          role: role,
          goal: finalGoal,
          tier: 0 // TIERS.FREE
        }
      })

      if (updateError) throw updateError

      // Redirect to main workspace
      router.push('/workspace')
    } catch (err: any) {
      setError(err.message || 'Failed to update persona context')
      setIsSubmitting(false)
    }
  }

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020202] text-slate-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Progress Bar */}
        <div className="flex items-center mb-12">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-800 text-slate-500'}`}>
              1
            </div>
            <span className={`ml-3 text-sm font-semibold tracking-wide ${step >= 1 ? 'text-indigo-400' : 'text-slate-600'}`}>Persona Profile</span>
          </div>
          <div className={`flex-1 h-px mx-4 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-800'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-800 text-slate-500'}`}>
              2
            </div>
            <span className={`ml-3 text-sm font-semibold tracking-wide ${step >= 2 ? 'text-indigo-400' : 'text-slate-600'}`}>Analysis Directive</span>
          </div>
        </div>

        <div className="bg-[#050505] border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center space-x-3 mb-8">
                <Briefcase className="w-6 h-6 text-indigo-400" />
                <h2 className="text-2xl font-light text-white tracking-tight">Select your operational <span className="font-medium">Role</span></h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`p-4 rounded-xl border text-left transition-all duration-300 ${
                      role === r 
                        ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.15)]' 
                        : 'bg-[#0A0A0A] border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{r}</span>
                      {role === r && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800/50 flex justify-end">
                <button
                  onClick={() => {
                    if (role) setStep(2)
                    else setError("Please select a role to continue.")
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50"
                  disabled={!role}
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center space-x-3 mb-8">
                <Target className="w-6 h-6 text-emerald-400" />
                <h2 className="text-2xl font-light text-white tracking-tight">Define your Analysis <span className="font-medium">Directive</span></h2>
              </div>
              
              <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-5">
                <p className="text-slate-500 text-xs mb-3 font-mono">
                  As a <span className="text-indigo-400">{role}</span>, what is your primary objective in AGENT-F?
                </p>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., Identify liquidity bottlenecks, uncover M&A valuation discrepancies, flag anomalies in OPEX..."
                  className="w-full bg-transparent border-none text-slate-200 text-sm focus:outline-none focus:ring-0 placeholder:text-slate-700 resize-none min-h-[120px]"
                />
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800/50 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-300 px-4 py-2 text-sm font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSavePersona}
                  disabled={isSubmitting}
                  className={`${goal.trim() ? 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-800 hover:bg-slate-700 shadow-none'} text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{goal.trim() ? 'Initialize Agent' : 'Skip & Initialize'}</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
