"use client";

import { signIn, signOut, useSession } from "next-auth/react";
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

  if (!session?.user) return <LoginButton />;

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end hidden md:flex">
        <span className="text-xs font-semibold tracking-tight leading-none">{session.user.name}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">{session.user.email}</span>
      </div>
      <div className="relative group">
        <button 
          onClick={() => signOut()}
          className="relative block"
        >
          {session.user.image ? (
            <img 
              src={session.user.image} 
              alt={session.user.name || "User"} 
              className="w-8 h-8 rounded-full border border-border bg-foreground/5 shadow-sm"
            />
          ) : (
            <div className="w-8 h-8 rounded-full border border-border bg-foreground/[0.02] flex items-center justify-center text-[10px] font-bold">
              {session.user.name?.[0] || 'U'}
            </div>
          )}
          <div className="absolute inset-0 bg-red-500 rounded-full opacity-0 group-hover:opacity-10 transition-opacity flex items-center justify-center">
            <LogOut className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      </div>
    </div>
  );
}
