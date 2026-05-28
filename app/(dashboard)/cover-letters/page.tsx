import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import CoverLettersList from '@/components/CoverLettersList'

async function CoverLettersData() {
  const jobs = await fetchJobs()
  const withLetters = jobs.filter(j => j.cover_letter_url)
  return (
    <>
      {withLetters.length > 0 && (
        <div className="flex items-center gap-6 mb-6 p-4 bg-[#0d0d14] border border-[#1a1a26] rounded-xl">
          <div className="text-center">
            <p className="text-xl font-bold text-white tabular-nums">{withLetters.length}</p>
            <p className="text-[11px] text-zinc-600 mt-0.5 uppercase tracking-wider">Generated</p>
          </div>
          <div className="w-px h-8 bg-[#1a1a26]" />
          <div className="text-center">
            <p className="text-xl font-bold text-white tabular-nums">{jobs.length}</p>
            <p className="text-[11px] text-zinc-600 mt-0.5 uppercase tracking-wider">Total Jobs</p>
          </div>
          <div className="w-px h-8 bg-[#1a1a26]" />
          <div className="text-center">
            <p className="text-xl font-bold text-indigo-400 tabular-nums">
              {Math.round((withLetters.length / jobs.length) * 100)}%
            </p>
            <p className="text-[11px] text-zinc-600 mt-0.5 uppercase tracking-wider">Coverage</p>
          </div>
        </div>
      )}
      <CoverLettersList jobs={withLetters} />
    </>
  )
}

function CoverLettersSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-[60px] bg-[#111118] border border-[#1f1f2e] rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

export default function CoverLettersPage() {
  return (
    <div className="px-6 py-8 max-w-4xl animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">AI-Generated · Google Drive</span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Cover Letters</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Claude-written letters for high-scoring jobs · View, copy, or open in Drive
        </p>
      </div>

      <Suspense fallback={<CoverLettersSkeleton />}>
        <CoverLettersData />
      </Suspense>
    </div>
  )
}
