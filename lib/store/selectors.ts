'use client'

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { Department, Id, SavedView, User, ViewConfig, WorkItem } from '@/lib/types'
import { createEngineContext, type EngineContext } from '@/lib/engine/context'
import { defaultViewConfig } from '@/lib/data/seed'
import { useStore } from './store'

/**
 * The engine context is rebuilt whenever entities change. Building the
 * dependency and blocker indexes is O(n) over a few hundred records —
 * cheap enough to do per change, and far simpler than maintaining
 * incremental indexes that could fall out of step with the data.
 *
 * `now` is pinned per context so every derived value in one render pass
 * agrees about what "today" means.
 */
export function useEngineContext(): EngineContext {
  const entities = useStore((state) => state.entities)
  return useMemo(() => createEngineContext(entities, new Date()), [entities])
}

export function useHydrated(): boolean {
  return useStore((state) => state.hydrated)
}

export function useSession() {
  return useStore(useShallow((state) => state.session))
}

export function useCurrentUser(): User | undefined {
  return useStore((state) => state.entities.users[state.session.currentUserId])
}

export function useCurrentOrg() {
  return useStore((state) => state.entities.organizations[state.session.currentOrgId])
}

export function useOrganizations() {
  return useStore(useShallow((state) => state.order.organizationIds.map((id) => state.entities.organizations[id]!).filter(Boolean)))
}

export function useDepartments(): Department[] {
  return useStore(useShallow((state) => state.order.departmentIds.map((id) => state.entities.departments[id]!).filter(Boolean)))
}

export function useDepartment(departmentId: Id | undefined): Department | undefined {
  return useStore((state) => (departmentId ? state.entities.departments[departmentId] : undefined))
}

export function useDepartmentBySlug(slug: string | undefined): Department | undefined {
  return useStore((state) =>
    slug ? state.order.departmentIds.map((id) => state.entities.departments[id]).find((d) => d?.slug === slug) : undefined,
  )
}

export function useUsers(): User[] {
  return useStore(useShallow((state) => state.order.userIds.map((id) => state.entities.users[id]!).filter(Boolean)))
}

export function useUser(userId: Id | null | undefined): User | undefined {
  return useStore((state) => (userId ? state.entities.users[userId] : undefined))
}

export function useWorkItem(id: Id | null | undefined): WorkItem | undefined {
  return useStore((state) => (id ? state.entities.workItems[id] : undefined))
}

/** Every work item in a department, in stable declaration order. */
export function useDepartmentWorkItems(departmentId: Id | undefined): WorkItem[] {
  return useStore(
    useShallow((state) =>
      departmentId
        ? state.order.workItemIds
            .map((id) => state.entities.workItems[id]!)
            .filter((item) => item && item.departmentId === departmentId)
        : [],
    ),
  )
}

export function useAllWorkItems(): WorkItem[] {
  return useStore(useShallow((state) => state.order.workItemIds.map((id) => state.entities.workItems[id]!).filter(Boolean)))
}

export function useWorkItemsAssignedTo(userId: Id | null | undefined): WorkItem[] {
  return useStore(
    useShallow((state) =>
      userId
        ? state.order.workItemIds.map((id) => state.entities.workItems[id]!).filter((item) => item && item.assigneeId === userId)
        : [],
    ),
  )
}

/** Statuses of a department's workflow, in workflow order. */
export function useDepartmentStatuses(departmentId: Id | undefined) {
  return useStore(
    useShallow((state) => {
      const department = departmentId ? state.entities.departments[departmentId] : undefined
      const workflow = department ? state.entities.workflows[department.workflowId] : undefined
      return (workflow?.statusIds ?? []).map((id) => state.entities.statuses[id]!).filter(Boolean)
    }),
  )
}

export function useLabels() {
  return useStore(useShallow((state) => state.order.labelIds.map((id) => state.entities.labels[id]!).filter(Boolean)))
}

export function useWorkItemTypes() {
  return useStore(useShallow((state) => state.order.workItemTypeIds.map((id) => state.entities.workItemTypes[id]!).filter(Boolean)))
}

export function useRoles() {
  return useStore(useShallow((state) => state.order.roleIds.map((id) => state.entities.roles[id]!).filter(Boolean)))
}

export function useWorkflows() {
  return useStore(useShallow((state) => state.order.workflowIds.map((id) => state.entities.workflows[id]!).filter(Boolean)))
}

/** Custom fields applicable to a department (empty `departmentIds` = org-wide). */
export function useCustomFields(departmentId?: Id) {
  return useStore(
    useShallow((state) =>
      state.order.customFieldIds
        .map((id) => state.entities.customFields[id]!)
        .filter(
          (field) =>
            field && (!departmentId || field.departmentIds.length === 0 || field.departmentIds.includes(departmentId)),
        ),
    ),
  )
}

export function useSavedViews(departmentId?: Id): SavedView[] {
  return useStore(
    useShallow((state) =>
      state.order.savedViewIds
        .map((id) => state.entities.savedViews[id]!)
        .filter((view) => view && (!departmentId || view.departmentId === departmentId || view.departmentId === null)),
    ),
  )
}

/**
 * The live view configuration for a department. `layout` is supplied by
 * the route rather than stored, so navigating Board → Table keeps the
 * filters, grouping and sort the user set up.
 */
export function useWorkingView(departmentId: Id | undefined, layout: ViewConfig['layout']): ViewConfig {
  const stored = useStore((state) => (departmentId ? state.workingViews[departmentId] : undefined))

  return useMemo(() => ({ ...(stored ?? defaultViewConfig()), layout }), [stored, layout])
}

export function useActiveHuddle() {
  return useStore((state) => (state.activeHuddleId ? state.entities.huddles[state.activeHuddleId] : undefined))
}

export function useHuddle(huddleId: Id | null | undefined) {
  return useStore((state) => (huddleId ? state.entities.huddles[huddleId] : undefined))
}

/** Every huddle across the organization, newest first. */
export function useStoreHuddles() {
  return useStore(useShallow((state) => state.order.huddleIds.map((id) => state.entities.huddles[id]!).filter(Boolean)))
}

/** The live huddle for an organization, if one is open. */
export function useLiveHuddle(organizationId: Id | undefined) {
  return useStore((state) =>
    organizationId
      ? state.order.huddleIds
          .map((id) => state.entities.huddles[id])
          .find((huddle) => huddle && huddle.organizationId === organizationId && huddle.stage !== 'complete')
      : undefined,
  )
}

export function useAuditEvents(limit = 100, departmentId?: Id) {
  return useStore(
    useShallow((state) =>
      state.order.auditEventIds
        .map((id) => state.entities.auditEvents[id]!)
        .filter((event) => event && (!departmentId || event.departmentId === departmentId))
        .slice(0, limit),
    ),
  )
}

export function useOpenWorkItemId() {
  return useStore((state) => state.openWorkItemId)
}
