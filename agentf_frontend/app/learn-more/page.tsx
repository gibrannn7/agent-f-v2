"use client";

import React from 'react';
import Link from 'next/link';

export default function LearnMorePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center font-sans">
      <div className="w-12 h-12 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
        <span className="font-mono font-bold text-emerald-400 text-xl">F</span>
      </div>
      
      <h1 className="font-mono text-2xl md:text-3xl text-slate-400 tracking-widest uppercase text-center px-4 mb-8">
        masih development bro...
      </h1>

      <Link 
        href="/"
        className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:border-slate-600 rounded font-mono font-bold tracking-[0.1em] transition-all duration-300 uppercase text-sm"
      >
        Go Back
      </Link>
    </div>
  );
}
