"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="secondary" size="icon" className="rounded-full animate-pulse bg-surface border-border">
        <span className="sr-only">Carregando tema</span>
      </Button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="secondary"
      size="icon"
      className="rounded-full shadow-sm hover:shadow-md transition-all relative overflow-hidden"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Alternar tema"
    >
      <Sun 
        className={`h-5 w-5 absolute transition-all duration-500 ease-in-out ${isDark ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100 text-foreground'}`} 
      />
      <Moon 
        className={`h-5 w-5 absolute transition-all duration-500 ease-in-out ${isDark ? 'rotate-0 scale-100 opacity-100 text-foreground' : 'rotate-90 scale-0 opacity-0'}`} 
      />
    </Button>
  )
}
