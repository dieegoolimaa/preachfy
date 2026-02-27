"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, LogIn } from "lucide-react";

export function LoginButton() {
  return (
    <Button 
      onClick={() => signIn("google")}
      className="rounded-full gap-2 px-6"
    >
      <LogIn className="w-4 h-4" /> Entrar com Google
    </Button>
  );
}

export function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (!session?.user) return <LoginButton />;

  return (
    <div className="relative flex items-center gap-3">
      <div className="flex flex-col items-end hidden md:flex">
        <span className="text-xs font-semibold tracking-tight leading-none text-foreground">{session.user.name}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">{session.user.email}</span>
      </div>
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative block rounded-full focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 focus:ring-offset-background transition-all"
      >
        {session.user.image ? (
          <img 
            src={session.user.image} 
            alt={session.user.name || "User"} 
            className="w-8 h-8 rounded-full border border-border shadow-sm object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full border border-border bg-foreground/[0.02] flex items-center justify-center text-[10px] font-bold text-foreground">
            {session.user.name?.[0] || 'U'}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-12 right-0 w-48 bg-surface/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 border-b border-border/40 md:hidden">
              <p className="text-sm font-semibold truncate text-foreground">{session.user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{session.user.email}</p>
            </div>
            
            <button 
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors mt-1"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
          </div>
        </>
      )}
    </div>
  );
}
