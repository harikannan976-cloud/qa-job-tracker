'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, GitBranch, Briefcase, Sparkles,
  FileText, BarChart2, Zap, Settings, HelpCircle, Menu, X, Bot, LogOut,
  Target, CalendarClock, ClipboardList,
} from 'lucide-react'

const NAV_MAIN = [
  { href: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/plan',          label: 'Daily Plan',    icon: ClipboardList   },
  { href: '/queue',         label: 'App Queue',     icon: Target          },
  { href: '/follow-up',     label: 'Follow-Up',     icon: CalendarClock   },
  { href: '/pipeline',      label: 'Pipeline',      icon: GitBranch       },
  { href: '/jobs',          label: 'Jobs',          icon: Briefcase       },
  { href: '/insights',      label: 'AI Insights',   icon: Sparkles        },
  { href: '/cover-letters', label: 'Cover Letters', icon: FileText        },
  { href: '/analytics',     label: 'Analytics',     icon: BarChart2       },
  { href: '/automation',    label: 'Automation',    icon: Zap             },
]

const NAV_BOTTOM = [
  { href: '/settings',      label: 'Settings',      icon: Settings },
  { href: '/how-it-works',  label: 'How It Works',  icon: HelpCircle },
]

function NavItem({ href, label, icon: Icon, active, onClick }: {
  href: string; label: string; icon: React.ComponentType<{ className?: string }>;
  active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group border ${
        active
          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15'
          : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-[#16161e] hover:border-[#252535]'
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
        active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'
      }`} />
      {label}
    </Link>
  )
}

function SidebarInner({ onLinkClick }: { onLinkClick?: () => void }) {
  const path = usePathname()
  const router = useRouter()

  function isActive(href: string) {
    return href === '/' ? path === '/' : path.startsWith(href)
  }

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/landing')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[#1a1a26] flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white truncate leading-none">QA Tracker</p>
          <p className="text-[10px] text-zinc-600 mt-0.5 truncate">AI-Powered</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {NAV_MAIN.map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onLinkClick} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="p-2.5 space-y-0.5 border-t border-[#1a1a26] flex-shrink-0">
        {NAV_BOTTOM.map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onLinkClick} />
        ))}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-zinc-400 border border-transparent hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/15 group"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 text-zinc-500 group-hover:text-red-400 transition-colors" />
          Sign Out
        </button>

        {/* ⌘K hint */}
        <div className="mt-2 px-3 py-2 rounded-lg bg-[#0d0d14] border border-[#1a1a26] flex items-center justify-between">
          <span className="text-[10px] text-zinc-700">Command palette</span>
          <div className="flex gap-1">
            <kbd className="text-[9px] bg-[#1a1a26] border border-[#252535] text-zinc-700 px-1 py-0.5 rounded font-mono">⌘</kbd>
            <kbd className="text-[9px] bg-[#1a1a26] border border-[#252535] text-zinc-700 px-1 py-0.5 rounded font-mono">K</kbd>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[220px] fixed left-0 top-0 h-full bg-[#0d0d15] border-r border-[#1a1a26] z-30">
        <SidebarInner />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#0d0d15] border-b border-[#1a1a26] flex items-center px-4 z-30 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-zinc-500 hover:text-zinc-200 p-1 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-white">QA Tracker</span>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-[220px] bg-[#0d0d15] border-r border-[#1a1a26] z-50 lg:hidden flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-[#1a1a26] flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[13px] font-semibold text-white">QA Tracker</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarInner onLinkClick={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  )
}
