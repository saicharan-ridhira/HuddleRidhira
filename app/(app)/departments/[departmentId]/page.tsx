import { redirect } from 'next/navigation'

/** A department opens on its board; the default view is per-department config. */
export default async function DepartmentPage({ params }: { params: Promise<{ departmentId: string }> }) {
  const { departmentId } = await params
  redirect(`/departments/${departmentId}/board`)
}
