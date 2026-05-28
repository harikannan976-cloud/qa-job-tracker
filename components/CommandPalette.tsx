'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  LayoutDashboard, GitBranch, Briefcase, Sparkles,
  FileText, BarChart2, Zap, LogOut, Search,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard',     href: '/',              icon: LayoutDashboard, hint: 'G D' },
  { label: 'Pipeline',      href: '/pipeline',      icon: GitBranch,       hint: 'G P' },
  { label: 'Jobs',          href: '/jobs',          icon: Briefcase,       hint: null  },
  { label: 'AI Insights',   href: '/insights',      icon: Sparkles,        hint: null  },
  { label: 'Cover Letters', href: '/cover-letters', icon: FileText,        hint: null  },
  { label: 'Analytics',     href: '/analytics',     icon: BarChart2,       hint: 'G A' },
  { label: 'Automation',    href: '/automation',    icon: Zap,             hint: null  },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = useCallback((href: string) => {
    router.push(href)
    setOpen(false)
  }, [router])

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/landing')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[18vh] px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div className="relative w-full max-w-[560px] animate-palette-in">
        <Command
          className="bg-[#111118] border border-[#252535] rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
          loop
        >
          {/* Search row */}
          <div className="flex items-center gap-3 px-4 border-b border-[#1e1e2e]">
            <Search className="w-4 h-4 text-zinc-600 flex-shrink-0" />
            <Command.Input
              placeholder="Search pages, actions…"
              className="flex-1 bg-transparent py-4 text-[14px] text-zinc-200 placeholder-zinc-600 outline-none"
            />
            <kbd className="text-[10px] bg-[#1a1a26] border border-[#252535] text-zinc-600 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-[13px] text-zinc-600">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:text-zinc-600 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium"
            >
              {NAV_ITEMS.map(item => (
                <Command.Item
                  key={item.href}
                  value={`navigate ${item.label} ${item.href}`}
                  onSelect={() => go(item.href)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-zinc-300 cursor-pointer
                    data-[selected=true]:bg-indigo-500/10 data-[selected=true]:text-indigo-300
                    transition-colors duration-100 group"
                >
                  <item.icon className="w-4 h-4 text-zinc-600 group-data-[selected=true]:text-indigo-400 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.hint && (
                    <span className="flex gap-1">
                      {item.hint.split(' ').map(k => (
                        <kbd key={k} className="text-[10px] bg-[#1a1a26] border border-[#252535] text-zinc-600 px-1.5 py-0.5 rounded font-mono">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="my-1.5 border-t border-[#1e1e2e]" />

            <Command.Group
              heading="Account"
              className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:text-zinc-600 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium"
            >
              <Command.Item
                value="sign out logout"
                onSelect={signOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-zinc-300 cursor-pointer
                  data-[selected=true]:bg-red-500/10 data-[selected=true]:text-red-300
                  transition-colors duration-100 group"
              >
                <LogOut className="w-4 h-4 text-zinc-600 group-data-[selected=true]:text-red-400 flex-shrink-0" />
                Sign Out
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="border-t border-[#1e1e2e] px-4 py-2.5 flex items-center gap-4 text-[11px] text-zinc-700">
            <span className="flex items-center gap-1">
              <kbd className="bg-[#1a1a26] border border-[#252535] px-1 rounded font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#1a1a26] border border-[#252535] px-1 rounded font-mono">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#1a1a26] border border-[#252535] px-1 rounded font-mono">⌘K</kbd> toggle
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}
