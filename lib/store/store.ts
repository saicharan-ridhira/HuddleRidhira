'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AuditEntityKind, Id, ViewConfig } from '@/lib/types'
import type { Entities, EntityOrder } from '@/lib/engine/context'
import { createSeed, CURRENT_ORG_ID, CURRENT_USER_ID, defaultViewConfig } from '@/lib/data/seed'
import { newId } from '@/lib/utils/id'

/**
 * What a mutation reports about itself so the audit trail can be written
 * without every call site remembering to log (PRD §41).
 */
export interface AuditDraft {
  kind: AuditEntityKind
  entityId: Id
  /** Past-tense fragment; the actor is prepended when rendered. */
  summary: string
  detail?: { field: string; from: string | null; to: string | null }
  departmentId?: Id | null
}

export interface Session {
  currentUserId: Id
  currentOrgId: Id
  /** The prototype's stand-in for auth. */
  signedIn: boolean
}

export interface StoreState {
  entities: Entities
  order: EntityOrder
  session: Session
  /**
   * The live, unsaved view configuration per department (PRD §49's
   * "view configuration" tier). Layout comes from the route; everything
   * else lives here so switching Board → Table keeps your filters.
   */
  workingViews: Record<Id, ViewConfig>
  /** The huddle currently in progress, if any. */
  activeHuddleId: Id | null
  /** Which work item the detail drawer is showing. */
  openWorkItemId: Id | null
  hydrated: boolean
}

export type MutationRecipe = (state: StoreState) => AuditDraft | AuditDraft[] | void | null

export interface StoreActions {
  /**
   * The single write path. A recipe mutates the draft and returns what
   * it did; `apply` turns that into audit events. Nothing in the UI
   * calls `set` directly, which is what makes audit coverage complete
   * by construction rather than by discipline.
   */
  apply: (recipe: MutationRecipe) => void
  setSession: (patch: Partial<Session>) => void
  setWorkingView: (departmentId: Id, patch: Partial<ViewConfig>) => void
  replaceWorkingView: (departmentId: Id, config: ViewConfig) => void
  openWorkItem: (id: Id | null) => void
  resetDemoData: () => void
  markHydrated: () => void
}

export type Store = StoreState & StoreActions

const emptyEntities = (): Entities => ({
  organizations: {}, users: {}, roles: {}, departments: {}, workflows: {}, statuses: {},
  labels: {}, workItemTypes: {}, customFields: {}, metrics: {}, metricEntries: {},
  workItems: {}, checklists: {},
  checklistItems: {}, dependencies: {}, blockers: {}, comments: {}, savedViews: {},
  huddles: {}, huddleDiscussions: {}, huddleActions: {}, auditEvents: {},
})

const emptyOrder = (): EntityOrder => ({
  organizationIds: [], userIds: [], roleIds: [], departmentIds: [], workflowIds: [],
  labelIds: [], workItemTypeIds: [], customFieldIds: [], metricIds: [], metricEntryIds: [],
  workItemIds: [],
  savedViewIds: [], auditEventIds: [], huddleIds: [],
})

/**
 * Brings a browser holding an older persisted blob up to the current
 * shape.
 *
 * Without this, anyone who has already used the app rehydrates with
 * `entities.metrics` undefined and crashes on the first selector that
 * maps over it — a failure that would hit every existing user at once,
 * on load, with their data still in localStorage and no way back.
 *
 * Metric *definitions* and their seeded history are installed wholesale,
 * because there is nothing in an older blob to preserve; work items and
 * huddles are left exactly as they are and only gain their new fields.
 */
function migratePersisted(persisted: unknown, version: number): unknown {
  if (version >= 2 || !persisted || typeof persisted !== 'object') return persisted

  const state = persisted as { entities?: Partial<Entities>; order?: Partial<EntityOrder> }
  const entities = state.entities
  const order = state.order
  if (!entities || !order) return persisted

  if (!entities.metrics) {
    const seed = createSeed(new Date())
    entities.metrics = seed.entities.metrics
    entities.metricEntries = seed.entities.metricEntries
    order.metricIds = seed.order.metricIds
    order.metricEntryIds = seed.order.metricEntryIds

    for (const [id, department] of Object.entries(entities.departments ?? {})) {
      department.criticalNumber ??= seed.entities.departments[id]?.criticalNumber ?? null
    }
  }

  for (const item of Object.values(entities.workItems ?? {})) {
    item.rockQuarter ??= null
  }

  return persisted
}

/**
 * Deliberately empty at module scope. Seeding uses `new Date()`, which
 * would differ between the server render and the client — so the seed is
 * installed after hydration instead, and the app renders a skeleton
 * until then. This is the one real hydration trap in the design.
 */
const initialState = (): StoreState => ({
  entities: emptyEntities(),
  order: emptyOrder(),
  session: { currentUserId: CURRENT_USER_ID, currentOrgId: CURRENT_ORG_ID, signedIn: false },
  workingViews: {},
  activeHuddleId: null,
  openWorkItemId: null,
  hydrated: false,
})

export const useStore = create<Store>()(
  persist(
    immer((set) => ({
      ...initialState(),

      apply: (recipe) =>
        set((state) => {
          const result = recipe(state)
          if (!result) return

          const drafts = Array.isArray(result) ? result : [result]
          const at = new Date().toISOString()

          for (const draft of drafts) {
            const id = newId('aud')
            state.entities.auditEvents[id] = {
              id,
              at,
              actorId: state.session.currentUserId,
              kind: draft.kind,
              entityId: draft.entityId,
              summary: draft.summary,
              detail: draft.detail,
              departmentId: draft.departmentId ?? null,
            }
            state.order.auditEventIds.unshift(id)
          }
        }),

      setSession: (patch) =>
        set((state) => {
          Object.assign(state.session, patch)
        }),

      setWorkingView: (departmentId, patch) =>
        set((state) => {
          const current = state.workingViews[departmentId] ?? defaultViewConfig()
          state.workingViews[departmentId] = { ...current, ...patch }
        }),

      replaceWorkingView: (departmentId, config) =>
        set((state) => {
          state.workingViews[departmentId] = config
        }),

      openWorkItem: (id) =>
        set((state) => {
          state.openWorkItemId = id
        }),

      resetDemoData: () =>
        set((state) => {
          const seed = createSeed(new Date())
          state.entities = seed.entities
          state.order = seed.order
          state.workingViews = {}
          state.activeHuddleId = null
          state.openWorkItemId = null
          state.session.currentUserId = CURRENT_USER_ID
          state.session.currentOrgId = CURRENT_ORG_ID
        }),

      markHydrated: () =>
        set((state) => {
          state.hydrated = true
        }),
    })),
    {
      name: 'huddle-prototype',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: migratePersisted,
      skipHydration: true,
      partialize: ({ entities, order, session, workingViews, activeHuddleId }) => ({
        entities,
        order,
        session,
        workingViews,
        activeHuddleId,
      }),
    },
  ),
)

/** Read the current state outside React — used by the service layer. */
export const getStore = () => useStore.getState()
