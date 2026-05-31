import { notFound } from 'next/navigation'
import { fetchJobById } from '@/lib/airtable'
import JobDetailPage from '@/components/JobDetailPage'

interface Props {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

export default async function JobDetailRoute({ params, searchParams }: Props) {
  const { id }   = await params
  const { from } = await searchParams
  const job = await fetchJobById(id)
  if (!job) notFound()
  return <JobDetailPage job={job} from={from} />
}
