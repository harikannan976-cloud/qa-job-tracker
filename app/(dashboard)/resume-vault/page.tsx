import ResumeVault from '@/components/ResumeVault'
import { FileText } from 'lucide-react'

export default function ResumeVaultPage() {
  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Resume Vault</h1>
        </div>
        <p className="text-[13px] text-zinc-500 mt-1 ml-11">
          Store your resume links and set a default for Apply Assistant autofill
        </p>
      </div>
      <ResumeVault />
    </div>
  )
}
