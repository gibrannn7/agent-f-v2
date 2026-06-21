'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'
import { Check, LogIn, Loader2, ArrowRight } from 'lucide-react'

export default function PricingPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState<number | null>(null)
  const [currentTier, setCurrentTier] = useState<number>(0)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsAuthenticated(true)
        setCurrentTier(session.user.user_metadata?.tier || 0)
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [supabase.auth])

  const handleSelectTier = async (tierLevel: number) => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (tierLevel === currentTier) {
      router.push('/workspace')
      return
    }

    try {
      setIsProcessing(tierLevel)
      // Simulate Payment/Upgrade Process
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const { error } = await supabase.auth.updateUser({
        data: { tier: tierLevel }
      })

      if (error) throw error

      setCurrentTier(tierLevel)
      router.push('/workspace')
    } catch (err: any) {
      alert("Failed to update tier: " + err.message)
    } finally {
      setIsProcessing(null)
    }
  }

  const plans = [
    {
      level: 0,
      name: "Free Tier",
      price: "$0",
      period: "forever",
      description: "Basic access to deterministic financial pipelines.",
      features: [
        "Base LLM Engines (Llama, Standard Groq)",
        "Standard Pandas Shielding",
        "Community Support",
        "Limited Execution Memory"
      ],
      buttonText: "Current Plan",
      highlight: false
    },
    {
      level: 1,
      name: "STANDARD",
      price: "$49",
      period: "per month",
      description: "Advanced analytics and multi-model routing.",
      features: [
        "Qwen 3 Access",
        "Extended Time-To-Live Memory",
        "Macro-News Event Ingestion",
        "Priority Support"
      ],
      buttonText: "Upgrade to Pro",
      highlight: true
    },
    {
      level: 2,
      name: "PRO",
      price: "$99,9",
      period: "per month",
      description: "Dedicated isolated sandbox and custom endpoints.",
      features: [
        "Qwen 3.7 Plus & Deepseek v4 PRO",
        "Custom Sandbox Architecture",
        "Unlimited Session Memory",
        "On-Premises Deployment Options",
        "Dedicated Success Manager"
      ],
      buttonText: "Contact Sales",
      highlight: false
    }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-emerald-500 font-mono text-sm tracking-[0.2em] uppercase mb-4">Pricing & Tiers</h2>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
            Scale your financial operations.
          </h1>
          <p className="text-lg text-slate-400">
            Choose the right tier to unlock advanced models, extended Sandbox memory, and real-time macroeconomic injections.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
          {plans.map((plan, idx) => (
            <div 
              key={idx} 
              className={`relative bg-[#0A0A0A] border rounded-2xl p-8 flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-[${idx * 150}ms] transition-transform hover:-translate-y-2 ${
                plan.highlight 
                  ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] z-10' 
                  : 'border-slate-800/50'
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-[#050505] px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                  Most Popular
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-100 mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-400 mb-6 min-h-[40px]">{plan.description}</p>
                <div className="flex items-baseline text-white">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  {plan.period !== 'forever' && (
                    <span className="ml-1 text-sm font-medium text-slate-500">/{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start">
                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mr-3" />
                    <span className="text-sm text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectTier(plan.level)}
                disabled={isProcessing === plan.level}
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center space-x-2 ${
                  !isAuthenticated 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
                    : plan.level === currentTier
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      : plan.highlight
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isProcessing === plan.level ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : !isAuthenticated ? (
                  <>
                    <span>Log In to Select</span>
                    <LogIn className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>{plan.level === currentTier ? 'Current Tier' : plan.buttonText}</span>
                    {plan.level !== currentTier && <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
