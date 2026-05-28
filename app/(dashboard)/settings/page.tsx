import { ComingSoon } from '@/components/ui/ComingSoon'

export default function SettingsPage() {
  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
        <p className="text-[13px] text-zinc-500 mt-1">Profile, AI preferences, and notification config</p>
      </div>
      <ComingSoon feature="Settings" description="Resume management, score thresholds, Slack webhook, and role targets" />
    </div>
  )
}
