"use client";

import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, Layout, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingView() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden p-6">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-red/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-gold/5 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 flex flex-col items-center text-center max-w-3xl gap-10"
      >
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 rounded-3xl bg-foreground flex items-center justify-center shadow-2xl"
          >
            <Zap className="w-10 h-10 text-background fill-current" />
          </motion.div>
          <h1 className="text-5xl font-sans font-black tracking-tight">Rice & Beans Preaching</h1>
          <p className="text-[11px] font-sans font-black tracking-[0.4em] uppercase opacity-30 mt-1">Pulpit Performance Engine</p>
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-4xl md:text-5xl font-sans font-bold leading-[1.15] tracking-tight">
            A arte da pregação elevada por um <span className="text-brand-red italic">design focado</span>.
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Organize seu fluxo teológico, gerencie referências bíblicas e entregue sua mensagem com clareza absoluta no Púlpito.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 w-full">
          <Button 
            onClick={() => signIn("google")}
            size="lg"
            className="h-20 px-12 rounded-full bg-foreground text-background hover:scale-[1.02] active:scale-[0.98] transition-all text-lg font-black uppercase tracking-widest gap-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] group"
          >
            <img src="/google-icon.svg" className="w-6 h-6 group-hover:scale-110 transition-transform" alt="Google" 
              onError={(e) => {
                e.currentTarget.src = "https://www.google.com/favicon.ico";
              }}
            />
            Entrar com Google
          </Button>
          
          <div className="flex items-center gap-8 opacity-20">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Estudo Imersivo</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-foreground" />
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">HUD de Púlpito</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-foreground" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronia Real</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <footer className="absolute bottom-12 left-0 right-0 flex justify-center opacity-10">
        <p className="text-[10px] font-black uppercase tracking-[0.5em]">Deus é Brasileiro & O Design é Focado</p>
      </footer>
    </div>
  );
}
