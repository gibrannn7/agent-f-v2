"use client";

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const GooeyNav = dynamic(() => import('@/components/GooeyNav'), { ssr: false });
const LineWaves = dynamic(() => import('@/components/LineWaves'), { ssr: false });
const GhostCursor = dynamic(() => import('@/components/GhostCursor'), { ssr: false });
const LogoLoop = dynamic(() => import('@/components/LogoLoop'), { ssr: false });
const Masonry = dynamic(() => import('@/components/Masonry'), { ssr: false });

// Tech stack for LogoLoop
const techStack = [
  { node: <span className="font-mono text-xl font-bold tracking-wider text-slate-300">PYTHON</span> },
  { node: <span className="font-mono text-xl font-bold tracking-wider text-emerald-400">FASTAPI</span> },
  { node: <span className="font-mono text-xl font-bold tracking-wider text-slate-300">NEXT.JS</span> },
  { node: <span className="font-mono text-xl font-bold tracking-wider text-blue-400">REACT 19</span> },
  { node: <span className="font-mono text-xl font-bold tracking-wider text-purple-400">DEEPSEEK</span> },
  { node: <span className="font-mono text-xl font-bold tracking-wider text-yellow-400">PANDAS</span> },
  { node: <span className="font-mono text-xl font-bold tracking-wider text-slate-300">PYDANTIC</span> },
  { node: <span className="font-mono text-xl font-bold tracking-wider text-emerald-500">SSE STREAMING</span> },
];

const masonryItems = [
  {
    id: '1',
    img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1000&auto=format&fit=crop',
    url: '#',
    height: 400,
  },
  {
    id: '2',
    img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop',
    url: '#',
    height: 300,
  },
  {
    id: '3',
    img: 'https://images.unsplash.com/photo-1620825937374-87fc7d628302?q=80&w=1000&auto=format&fit=crop',
    url: '#',
    height: 500,
  },
  {
    id: '4',
    img: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1000&auto=format&fit=crop',
    url: '#',
    height: 350,
  },
  {
    id: '5',
    img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop',
    url: '#',
    height: 450,
  },
  {
    id: '6',
    img: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=1000&auto=format&fit=crop',
    url: '#',
    height: 300,
  },
];

const navItems = [
  { label: 'HOME', href: '/' },
  { label: 'WORKSPACE', href: '/workspace' },
  { label: 'PRICING', href: '/pricing' },
  { label: 'LEARN MORE', href: '/learn-more' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans flex flex-col relative overflow-x-hidden selection:bg-emerald-500/30">
      
      {/* Navigation Layer */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-[#050505]/60 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <span className="font-mono font-bold text-emerald-400">F</span>
          </div>
          <span className="font-mono font-bold tracking-[0.2em] text-lg text-slate-100">AGENT-F</span>
        </div>
        <div className="hidden md:block">
          <GooeyNav items={navItems} />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full h-screen flex flex-col items-center justify-center pt-20">
        {/* LineWaves Background */}
        <div className="absolute inset-0 z-0 opacity-50">
          <LineWaves
            speed={0.15}
            warpIntensity={2.0}
            color1="#10b981" 
            color2="#0f172a" 
            color3="#050505" 
            brightness={1.0}
            enableMouseInteraction={true}
          />
        </div>

        {/* Ghost Cursor Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-auto">
          <GhostCursor
            color="#10b981"
            bloomStrength={0.3}
            brightness={1.5}
            trailLength={80}
          />
        </div>

        {/* Foreground Content */}
        <div className="relative z-20 flex flex-col items-center text-center px-4 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-8 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            V2.0 ENTERPRISE PIPELINE ACTIVE
          </div>

          <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-slate-100 via-slate-400 to-slate-800 drop-shadow-2xl">
            AGENT-F
          </h1>
          
          <p className="text-xl md:text-3xl text-slate-300 max-w-3xl font-light mb-6 tracking-wide drop-shadow-lg">
            High-Performance Financial AI Orchestration.
          </p>
          <p className="text-sm md:text-base text-emerald-500/80 max-w-xl font-mono mb-12 tracking-[0.1em] drop-shadow-md">
            ENTERPRISE &bull; DETERMINISTIC &bull; REAL-TIME
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 pointer-events-auto mt-4">
            <Link 
              href="/workspace"
              className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono font-bold tracking-[0.15em] transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] uppercase"
            >
              Get Started
            </Link>
            <Link 
              href="/learn-more"
              className="px-10 py-4 bg-[#0A0A0A] hover:bg-slate-900 text-slate-300 border border-slate-700/50 hover:border-slate-600 rounded font-mono font-bold tracking-[0.15em] transition-all duration-300 uppercase shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Tech Stack Banner */}
      <section className="relative z-20 w-full py-16 bg-[#030303] border-y border-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
          <h2 className="font-mono text-xs tracking-[0.3em] text-slate-500 mb-10 uppercase">
            Industrial-Grade Stack
          </h2>
          <div className="w-full overflow-hidden">
            <LogoLoop logos={techStack} speed={35} direction="left" gap={80} scaleOnHover={true} />
          </div>
        </div>
      </section>

      {/* AI Finance / Enterprise Masonry Gallery */}
      <section className="relative z-20 w-full py-32 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-24 flex flex-col items-center text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-slate-100 mb-8 tracking-tight drop-shadow-xl">
              Uncompromising Precision.
            </h2>
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl font-light leading-relaxed drop-shadow-lg">
              Engineered for the rigorous demands of institutional finance. 
              Our architecture guarantees sub-millisecond state management, isolated sandboxing, and hallucinatory-free data processing.
            </p>
          </div>
          
          <div className="w-full min-h-[800px] relative">
             <Masonry 
               items={masonryItems} 
               scaleOnHover={true} 
               colorShiftOnHover={true}
               blurToFocus={true}
               stagger={0.1}
             />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 w-full py-12 bg-[#020202] border-t border-slate-900 text-center flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 grayscale opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
          <span className="font-mono font-bold text-emerald-400 text-xs">F</span>
        </div>
        <p className="font-mono text-slate-600 text-xs tracking-[0.2em] uppercase">
          &copy; {new Date().getFullYear()} AGENT-F Enterprise. All systems deterministic.
        </p>
      </footer>
    </div>
  );
}
