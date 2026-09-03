'use client'

import type { Id, SavedView, ViewConfig } from '@/lib/types'
import { useStore, type AuditDraft, type StoreState } from '@/lib/store/store'
import { newId } from '@/lib/utils/id'

const apply = (recipe: (state: StoreState) => AuditDraft | AuditDraft[] | void | null) => useStore.getState().apply(recipe)

/** PRD §17 — saving the current presentation, never the data. */
export function saveView(input: {
  name: string
  description?: string
  departmentId: Id | null
  scope: SavedView['scope']
  config: ViewConfig
}): Id | null {
  let createdId: Id | null = null

  apply((state) => {
    const id = newId('view')
    state.entities.savedViews[id] = {
      id,
      name: input.name.trim(),
      description: input.description,
      departmentId: input.departmentId,
      scope: input.scope,
      createdBy: state.session.currentUserId,
      // Structured clone so later toolbar edits don't mutate the saved copy.
      config: JSON.parse(JSON.stringify(input.config)) as ViewConfig,
    }
    state.order.savedViewIds.push(id)
    createdId = id

    return { kind: 'view', entityId: id, summary: `created the saved view “${input.name.trim()}”`, departmentId: input.departmentId }
  })

  return createdId
}

export function updateSavedView(viewId: Id, patch: Partial<Omit<SavedView, 'id'>>) {
  apply((state) => {
    const view = state.entities.savedViews[viewId]
    if (!view) return
    Object.assign(view, patch)
    return { kind: 'view', entityId: viewId, summary: `updated the saved view “${view.name}”`, departmentId: view.departmentId }
  })
}

export function deleteSavedView(viewId: Id) {
  apply((state) => {
    const view = state.entities.savedViews[viewId]
    if (!view) return
    const { name, departmentId } = view
    delete state.entities.savedViews[viewId]
    state.order.savedViewIds = state.order.savedViewIds.filter((id) => id !== viewId)
    return { kind: 'view', entityId: viewId, summary: `deleted the saved view “${name}”`, departmentId }
  })
}

/** Loads a saved view into the department's working configuration. */
export function applySavedView(departmentId: Id, view: SavedView) {
  useStore.getState().replaceWorkingView(departmentId, JSON.parse(JSON.stringify(view.config)) as ViewConfig)
}
