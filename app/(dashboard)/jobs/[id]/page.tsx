import { notFound } from 'next/navigation'
import { fetchJobById } from '@/lib/airtable'
import JobDetailPage from '@/components/JobDetailPage'

interface Props {
  params: Promise<{ id: string }>
}

export default async function JobDetailRoute({ params }: Props) {
  const { id } = await params
  const job = await fetchJobById(id)
  if (!job) notFound()
  return <JobDetailPage job={job} />
}
