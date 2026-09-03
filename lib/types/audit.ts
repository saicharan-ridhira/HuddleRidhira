import type { Id, ISODate } from './primitives'

/**
 * PRD §41. Written by the service layer's `withAudit` wrapper rather
 * than by call sites, so coverage is complete by construction.
 */
export type AuditEntityKind =
  | 'work-item'
  | 'dependency'
  | 'blocker'
  | 'checklist'
  | 'comment'
  | 'huddle'
  | 'huddle-action'
  | 'department'
  | 'member'
  | 'role'
  | 'workflow'
  | 'status'
  | 'label'
  | 'work-item-type'
  | 'custom-field'
  | 'view'
  | 'organization'

export interface AuditEvent {
  id: Id
  at: ISODate
  actorId: Id
  kind: AuditEntityKind
  entityId: Id
  /** Past-tense sentence fragment, e.g. "moved ENG-120 to Doing". */
  summary: string
  /** Optional before/after for field-level changes. */
  detail?: { field: string; from: string | null; to: string | null }
  departmentId: Id | null
}
