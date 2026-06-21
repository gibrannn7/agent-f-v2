'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/client'
import { Shield, ArrowRight, Loader2, BarChart2 } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      })
      
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020202] text-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0A0A0A] border border-slate-800 shadow-2xl mb-6">
            <BarChart2 className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">
            Enter <span className="font-semibold">AGENT-F</span>
          </h1>
          <p className="text-slate-500 text-sm font-mono tracking-wide">
            Enterprise Financial Orchestration Pipeline
          </p>
        </div>

        <div className="bg-[#050505] border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-start space-x-3">
              <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">Zero Data Retention</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Authentication is strictly utilized for billing and persona assignment. Your mathematical payloads and sandbox executions are purged every 2 hours.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full relative group bg-white text-black hover:bg-slate-100 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all absolute right-4" />
                </>
              )}
            </button>
            
            <p className="text-center text-[10px] text-slate-600 mt-4">
              By authenticating, you agree to our Enterprise Terms of Service and Privacy Directive.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
