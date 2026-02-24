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
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-end max-sm:hidden">
        <span className="text-[11px] font-black uppercase tracking-widest">{session.user.name}</span>
        <span className="text-[9px] opacity-40 font-mono italic">{session.user.email}</span>
      </div>
      {session.user.image && (
        <img 
          src={session.user.image} 
          alt={session.user.name || "User"} 
          className="w-10 h-10 rounded-full border border-border shadow-sm"
        />
      )}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => signOut()}
        className="rounded-full hover:bg-red-500/10 hover:text-red-500"
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );
}
