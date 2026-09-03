import { redirect } from 'next/navigation'

/** The audit log has a full page of its own under Management. */
export default function SettingsAuditLogsPage() {
  redirect('/audit-logs')
}
