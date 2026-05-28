import Sidebar from '@/components/Sidebar'
import CommandPalette from '@/components/CommandPalette'
import GlobalShortcuts from '@/components/GlobalShortcuts'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <main className="lg:ml-[220px] min-h-screen">
        <div className="h-14 lg:hidden" />
        {children}
      </main>
      <CommandPalette />
      <GlobalShortcuts />
    </div>
  )
}
