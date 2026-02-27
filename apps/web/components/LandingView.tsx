"use client";

import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { BookOpen, Layout, Zap, Users, Shield, ArrowRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiceBeansLogo } from "@/components/ui/RiceBeansLogo";

export default function LandingView() {
  const staggerContainer: any = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const fadeUp: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
  };

  return (
    <div className="h-screen w-full bg-[#0a0a0a] text-foreground flex overflow-hidden selection:bg-brand-red/20 selection:text-brand-red font-sans">
      
      {/* Background Noise & Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] pointer-events-none"></div>

      {/* Left Panel: App Entrance & Auth */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full lg:w-[45%] h-full flex flex-col justify-between p-8 md:p-16 lg:p-24 border-r border-white/5 bg-background/50 backdrop-blur-2xl shadow-2xl"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-4">
          <RiceBeansLogo className="w-12 h-12 drop-shadow-xl" />
          <div className="flex flex-col">
            <span className="font-serif italic font-black text-xl tracking-tight leading-none text-foreground">Rice & Beans</span>
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-red mt-1">Preaching Platform</span>
          </div>
        </motion.div>

        <div className="flex flex-col gap-10 mt-12 mb-auto">
          <motion.div variants={fadeUp} className="flex flex-col gap-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-bold leading-[1.1] tracking-tighter">
              Performance <br/> de Púlpito <span className="text-brand-red italic font-serif">Redefinida.</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-md font-medium">
              Conceituada na filosofia do <span className="text-foreground italic font-black">"Arroz com Feijão"</span>: A ideia de construirmos algo estupidamente simples de usar, mas que carrega o peso de uma verdadeira sustância funcional para te alimentar e edificar na hora da pregação.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col gap-5 w-full max-w-sm">
            <Button 
              onClick={() => signIn("google")}
              size="lg"
              className="relative h-16 w-full rounded-2xl bg-white text-black hover:bg-neutral-200 active:scale-[0.98] transition-all text-sm font-black uppercase tracking-widest gap-4 border border-transparent hover:border-white/20 shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)] group overflow-hidden"
            >
              <img src="/google-icon.svg" className="w-5 h-5 z-10 relative" alt="Google" 
                onError={(e) => { e.currentTarget.src = "https://www.google.com/favicon.ico"; }}
              />
              <span className="z-10 relative">Autenticar Sistema</span>
              <ArrowRight className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all z-10 relative" />
            </Button>
            
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-2">
              <Shield className="w-3.5 h-3.5 text-green-500/70" />
              <span>Acesso Seguro Exclusivo via Google</span>
            </div>
          </motion.div>
        </div>

        <motion.div variants={fadeUp} className="flex items-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
             <span className="text-[9px] font-black uppercase tracking-widest">Sistemas Operacionais</span>
           </div>
           <span className="text-[10px] font-serif italic text-muted-foreground">© 2026 Engine</span>
        </motion.div>
      </motion.div>

      {/* Right Panel: Abstract Floating Application Visualization */}
      <div className="hidden lg:flex relative z-0 w-[55%] h-full items-center justify-center p-20 perspective-1000 overflow-hidden">
        
        {/* Ambient Glows */}
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] right-[20%] w-[500px] h-[500px] bg-brand-red/10 blur-[120px] rounded-full mix-blend-screen" 
        />
        <motion.div 
          animate={{ rotate: -360, scale: [1, 1.3, 1] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] left-[10%] w-[600px] h-[600px] bg-brand-gold/10 blur-[140px] rounded-full mix-blend-screen" 
        />

        {/* Pulpit Live Render Visualization */}
        <div className="relative w-full max-w-3xl aspect-[16/10] flex items-center justify-center transform-style-3d">
          
          <motion.div 
            initial={{ y: 50, opacity: 0, rotateX: 6, rotateY: -12 }}
            animate={{ y: 0, opacity: 1, rotateX: 10, rotateY: -15 }}
            transition={{ type: "spring", stiffness: 60, delay: 0.2 }}
            className="absolute z-20 w-full h-full bg-surface/90 backdrop-blur-3xl border border-white/5 rounded-3xl shadow-[-20px_40px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-left"
          >
            {/* Header Fake */}
            <div className="h-16 border-b border-border/20 flex items-center justify-between px-8 bg-black/40">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-brand-red/10 animate-pulse border-2 border-brand-red/30 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-brand-red animate-ping" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-xs font-black uppercase text-brand-red tracking-widest">Tempo Decorrido</span>
                   <span className="text-2xl font-black font-serif italic text-white leading-none">42:15</span>
                 </div>
              </div>
              <div className="flex gap-2">
                 <div className="w-12 h-10 rounded-xl bg-white/5 border border-white/10" />
                 <div className="w-12 h-10 rounded-xl bg-white/5 border border-white/10" />
                 <div className="w-32 h-10 rounded-full bg-brand-red text-white flex items-center justify-center text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-red/20">Finalizar Sermão</div>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-8 py-12 flex gap-12 overflow-hidden relative">
              <div className="absolute left-[380px] top-0 bottom-0 w-1 bg-gradient-to-b from-brand-gold/60 to-transparent hidden lg:block" />

              {/* Base Text Card */}
              <motion.div 
                animate={{ scale: [1, 1.01, 1], y: [0, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-[350px] shrink-0 bg-surface border border-white/10 rounded-3xl p-8 flex flex-col gap-4 shadow-xl z-20 relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-red" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-red/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-brand-red" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Texto Base</span>
                </div>
                <p className="text-xl font-sans font-medium text-white leading-relaxed mt-2 line-clamp-4">
                  "No princípio Deus criou os céus e a terra. Era a terra sem forma e vazia..."
                </p>
              </motion.div>

              {/* Insights List */}
              <div className="flex-1 flex flex-col gap-6 pt-4">
                 
                 <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="w-full bg-surface border border-white/5 rounded-2xl p-6 relative group"
                 >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-gold rounded-l-2xl" />
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-3.5 h-3.5 text-brand-gold" />
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-gold">Exegese</span>
                    </div>
                    <div className="w-full h-3 bg-white/10 rounded-full mb-2" />
                    <div className="w-3/4 h-3 bg-white/10 rounded-full" />
                 </motion.div>

                 <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="w-[90%] bg-surface border border-white/5 rounded-2xl p-6 relative group opacity-50"
                 >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl" />
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-500">Contexto Histórico</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full mb-2" />
                    <div className="w-2/3 h-3 bg-white/5 rounded-full" />
                 </motion.div>

              </div>
            </div>
            
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-30" />
          </motion.div>
        </div>

      </div>
    </div>
  );
}
