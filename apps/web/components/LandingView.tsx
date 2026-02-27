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
    <div className="h-screen w-full bg-background text-foreground flex overflow-hidden selection:bg-brand-red/20 selection:text-brand-red font-sans">
      
      {/* Background Noise & Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.4] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] pointer-events-none"></div>

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
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-bold leading-[1.1] tracking-tighter text-foreground">
              Performance <br/> de Púlpito <span className="text-brand-red italic font-serif">Redefinida.</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-md font-medium">
              <span className="text-foreground italic font-black">"Arroz com Feijão"</span>: A ideia de construirmos algo simples de usar, mas que carrega o peso de uma verdadeira sustância para te alimentar e edificar na hora da pregação e alimentar com o básico que é rico em edificação: a palavra de Deus!
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col gap-5 w-full max-w-sm">
            <Button 
              onClick={() => signIn("google")}
              size="lg"
              className="relative h-16 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] transition-all text-sm font-black uppercase tracking-widest gap-4 border border-transparent shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] group overflow-hidden"
            >
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center relative z-10">
                <img src="/google-icon.svg" className="w-4 h-4" alt="Google" 
                  onError={(e) => { e.currentTarget.src = "https://www.google.com/favicon.ico"; }}
                />
              </div>
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
          animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] right-[10%] w-[600px] h-[600px] bg-brand-red/10 blur-[120px] rounded-full mix-blend-multiply pointer-events-none" 
        />
        <motion.div 
          animate={{ rotate: -360, scale: [1, 1.1, 1] }} 
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[0%] left-[10%] w-[800px] h-[800px] bg-brand-gold/10 blur-[150px] rounded-full mix-blend-multiply pointer-events-none" 
        />

        {/* Pulpit Live Render Visualization - Ultra Realistic Replica */}
        <div className="relative w-full max-w-[900px] aspect-[16/10] flex flex-col justify-end transform-style-3d perspective-1000">
          
          <motion.div 
            initial={{ y: 50, opacity: 0, rotateX: 15, rotateY: -20, rotateZ: 5 }}
            animate={{ y: 0, opacity: 1, rotateX: 10, rotateY: -15, rotateZ: 0 }}
            transition={{ type: "spring", stiffness: 60, damping: 20, delay: 0.2 }}
            className="w-full h-[90%] bg-surface border border-border/40 rounded-t-[2.5rem] rounded-b-xl shadow-[-30px_50px_100px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden text-left relative z-20"
          >
            {/* Real Header Replica */}
            <div className="h-[72px] shrink-0 border-b border-border/40 flex items-center justify-between px-10 bg-background/80 backdrop-blur-xl relative z-30">
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-red/10 animate-pulse border-2 border-brand-red/20 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-red shadow-[0_0_10px_rgba(114,47,39,0.8)]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase text-brand-red tracking-[0.3em]">Tempo Decorrido</span>
                      <span className="text-2xl font-black font-serif italic text-foreground leading-[1.1]">42:15</span>
                    </div>
                 </div>
              </div>
              <div className="flex gap-3">
                 <div className="w-12 h-12 rounded-2xl bg-surface border border-border/60 flex items-center justify-center text-foreground/40 shadow-sm"><Layers className="w-5 h-5"/></div>
                 <div className="w-12 h-12 rounded-2xl bg-surface border border-border/60 flex items-center justify-center text-foreground/40 shadow-sm"><BookOpen className="w-5 h-5"/></div>
                 <div className="px-6 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-black uppercase tracking-widest shadow-xl">Menu de Controle</div>
              </div>
            </div>

            {/* Content Body Replica */}
            <div className="flex-1 px-10 py-12 flex gap-12 overflow-hidden relative bg-background/30">
              
              {/* Neural Bridge Glow Line */}
              <div className="absolute left-[445px] top-0 bottom-0 w-1 bg-gradient-to-b from-brand-gold/40 via-brand-gold/10 to-transparent hidden lg:block" />

              {/* Anchor Card (Texto Base) */}
              <motion.div 
                animate={{ scale: [1, 1.005, 1], y: [0, -4, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="w-[400px] shrink-0 bg-surface border border-border/30 rounded-[2rem] p-10 flex flex-col shadow-2xl z-20 relative overflow-hidden h-fit"
              >
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-brand-red rounded-l-[2rem]" />
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground/40">Texto Base</span>
                  </div>
                  <div className="px-4 py-1.5 rounded-full border border-border/60 bg-foreground/5 text-foreground/60 text-[11px] font-black font-mono">Gênesis 1:1</div>
                </div>
                <p className="text-[28px] font-sans font-medium text-foreground leading-[1.3] tracking-tight">
                  No princípio Deus criou os céus e a terra. Era a terra sem forma e vazia...
                </p>
              </motion.div>

              {/* Derivatives Column (Insights) */}
              <div className="flex-1 flex flex-col gap-8 pt-6 relative">
                 
                 {/* Connection stem dot */}
                 <div className="absolute -left-12 top-14 w-8 h-1 bg-brand-gold/20 rounded-full hidden lg:flex items-center">
                    <div className="w-2 h-2 rounded-full bg-brand-gold ml-0" />
                 </div>
                 
                 {/* Insight Card 1 */}
                 <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="w-full bg-surface border border-border/30 rounded-[1.5rem] p-8 relative shadow-xl hover:-translate-y-1 transition-transform"
                 >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-gold rounded-l-[1.5rem]" />
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                          <Zap className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Exegese</span>
                      </div>
                    </div>
                    <p className="text-foreground/80 font-medium text-lg leading-relaxed mix-blend-multiply">
                      A palavra hebraica "Bara" (criou) é usada exclusivamente para a ação divina de criar do nada absoluto.
                    </p>
                 </motion.div>

                 {/* Connection stem dot 2 */}
                 <div className="absolute -left-12 top-[16.5rem] w-8 h-1 bg-blue-500/20 rounded-full hidden lg:flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 ml-0" />
                 </div>

                 {/* Insight Card 2 */}
                 <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7, type: 'spring' }}
                    className="w-[90%] bg-surface border border-border/30 rounded-[1.5rem] p-8 relative shadow-lg opacity-80"
                 >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 rounded-l-[1.5rem]" />
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                          <Layers className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Contexto Histórico</span>
                      </div>
                    </div>
                    <div className="w-full h-4 bg-border/40 rounded-full mb-3" />
                    <div className="w-2/3 h-4 bg-border/40 rounded-full" />
                 </motion.div>

              </div>
            </div>
            
            <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-30" />
          </motion.div>
        </div>

      </div>
    </div>
  );
}
