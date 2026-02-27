"use client";

import React from 'react';
import { Zap, Users, BookOpen, ArrowLeft, Layout, Bell } from 'lucide-react';
import { UserMenu } from "@/components/auth-components";
import { RiceBeansLogo } from "@/components/ui/RiceBeansLogo";
import { clsx, type ClassValue } from 'clsx';

import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavbarProps {
  currentView: 'dashboard' | 'community' | 'bible' | 'study' | 'pulpit';
  onViewChange: (view: any) => void;
  userName?: string;
  onBack?: () => void;
  extraActions?: React.ReactNode;
}

export function Navbar({ 
  currentView, 
  onViewChange, 
  onBack,
  extraActions 
}: NavbarProps) {
  
  const isImmersive = currentView === 'pulpit';

  if (isImmersive) return null;

  return (
    <header className="h-20 sticky top-0 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-8 z-50 transition-all duration-300">
      <div className="flex items-center gap-6">
        {onBack && currentView !== 'dashboard' && (
          <button 
            onClick={onBack}
            className="group flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-border hover:bg-foreground hover:text-background transition-all active:scale-90"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </button>
        )}
        
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onViewChange('dashboard')}
        >
          <div className="w-12 h-12 bg-transparent flex items-center justify-center shrink-0">
             <RiceBeansLogo className="w-full h-full drop-shadow-sm" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">
              Rice & Beans
            </h1>
            <span className="text-[10px] font-black opacity-50 uppercase tracking-[0.4em] mt-1.5 ml-0.5">Preaching</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {extraActions}
        
        <div className="flex items-center gap-3">
           <button className="w-10 h-10 rounded-full hover:bg-foreground/5 flex items-center justify-center relative transition-all text-muted-foreground hover:text-foreground">
             <Bell className="w-5 h-5" />
             <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-red rounded-full border-2 border-background" />
           </button>
           
           <div className="h-6 w-px bg-border mx-1" />

           <nav className="flex items-center gap-2">
             <button 
               onClick={() => onViewChange('dashboard')}
               className={cn(
                 "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-bold tracking-tight",
                 currentView === 'dashboard' 
                   ? "bg-brand-red text-white shadow-lg shadow-brand-red/20" 
                   : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
               )}
             >
               <Layout className="w-4 h-4" />
               Studio
             </button>

             <button 
               onClick={() => onViewChange('community')}
               className={cn(
                 "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-bold tracking-tight",
                 currentView === 'community' 
                   ? "bg-brand-red text-white shadow-lg shadow-brand-red/20" 
                   : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
               )}
             >
               <Users className="w-4 h-4" />
               Comunidade
             </button>

             <button 
               onClick={() => onViewChange('bible')}
               className={cn(
                 "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-bold tracking-tight",
                 currentView === 'bible' 
                   ? "bg-brand-red text-white shadow-lg shadow-brand-red/20" 
                   : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
               )}
             >
               <BookOpen className="w-4 h-4" />
               Bíblia
             </button>
           </nav>
        </div>

        <div className="w-px h-6 bg-border" />
        <UserMenu />
      </div>
    </header>
  );
}
