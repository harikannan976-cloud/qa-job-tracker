import { fetchJobs } from '@/lib/airtable'
import KanbanBoard from '@/components/KanbanBoard'

export default async function PipelinePage() {
  const jobs = await fetchJobs()

  return (
    <div className="px-6 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Pipeline</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Drag jobs between stages · changes sync to Airtable · live data
        </p>
      </div>
      <KanbanBoard jobs={jobs} />
    </div>
  )
}
