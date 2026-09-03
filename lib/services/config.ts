'use client'

import type {
  CustomField,
  CustomFieldKind,
  Department,
  Hue,
  Id,
  Label,
  Permission,
  StatusCategory,
  ViewLayout,
} from '@/lib/types'
import { useStore, type AuditDraft, type StoreState } from '@/lib/store/store'
import { newId } from '@/lib/utils/id'

const apply = (recipe: (state: StoreState) => AuditDraft | AuditDraft[] | void | null) => useStore.getState().apply(recipe)

/* ------------------------------------------------------------------ *
 * Departments — PRD §38
 * ------------------------------------------------------------------ */

export interface DepartmentInput {
  name: string
  description: string
  icon: string
  hue: Hue
  workflowId: Id
  defaultView: ViewLayout
  memberIds: Id[]
  leadId: Id
  huddle: Department['huddle']
}

export function createDepartment(input: DepartmentInput): Id | null {
  let createdId: Id | null = null

  apply((state) => {
    const id = newId('dept')
    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    state.entities.departments[id] = { id, slug, ...input }
    state.order.departmentIds.push(id)

    for (const userId of input.memberIds) {
      const user = state.entities.users[userId]
      if (user && !user.departmentIds.includes(id)) user.departmentIds.push(id)
    }

    createdId = id
    return { kind: 'department', entityId: id, summary: `created the ${input.name} department`, departmentId: id }
  })

  return createdId
}

export function updateDepartment(departmentId: Id, patch: Partial<Department>) {
  apply((state) => {
    const department = state.entities.departments[departmentId]
    if (!department) return
    Object.assign(department, patch)
    return { kind: 'department', entityId: departmentId, summary: `updated the ${department.name} department`, departmentId }
  })
}

export function deleteDepartment(departmentId: Id) {
  apply((state) => {
    const department = state.entities.departments[departmentId]
    if (!department) return
    const { name } = department

    // Work items belonging to the department go with it — leaving
    // orphans would show them on "all work" views with no home.
    for (const item of Object.values(state.entities.workItems)) {
      if (item.departmentId === departmentId) {
        delete state.entities.workItems[item.id]
      }
    }
    state.order.workItemIds = state.order.workItemIds.filter((id) => Boolean(state.entities.workItems[id]))

    for (const user of Object.values(state.entities.users)) {
      user.departmentIds = user.departmentIds.filter((id) => id !== departmentId)
    }

    delete state.entities.departments[departmentId]
    state.order.departmentIds = state.order.departmentIds.filter((id) => id !== departmentId)

    return { kind: 'department', entityId: departmentId, summary: `deleted the ${name} department`, departmentId: null }
  })
}

export function setDepartmentMembers(departmentId: Id, memberIds: Id[]) {
  apply((state) => {
    const department = state.entities.departments[departmentId]
    if (!department) return
    department.memberIds = memberIds

    for (const user of Object.values(state.entities.users)) {
      const shouldBelong = memberIds.includes(user.id)
      const belongs = user.departmentIds.includes(departmentId)
      if (shouldBelong && !belongs) user.departmentIds.push(departmentId)
      if (!shouldBelong && belongs) user.departmentIds = user.departmentIds.filter((id) => id !== departmentId)
    }

    return { kind: 'department', entityId: departmentId, summary: `updated ${department.name} membership`, departmentId }
  })
}

/* ------------------------------------------------------------------ *
 * Members and roles — PRD §40
 * ------------------------------------------------------------------ */

export function setUserRole(userId: Id, roleId: Id) {
  apply((state) => {
    const user = state.entities.users[userId]
    const role = state.entities.roles[roleId]
    if (!user || !role) return
    const from = state.entities.roles[user.roleId]?.name ?? null
    user.roleId = roleId
    return {
      kind: 'member',
      entityId: userId,
      summary: `changed ${user.name}’s role to ${role.name}`,
      detail: { field: 'role', from, to: role.name },
      departmentId: null,
    }
  })
}

export function toggleRolePermission(roleId: Id, permission: Permission) {
  apply((state) => {
    const role = state.entities.roles[roleId]
    if (!role) return
    const index = role.permissions.indexOf(permission)
    const granted = index === -1
    if (granted) role.permissions.push(permission)
    else role.permissions.splice(index, 1)

    return {
      kind: 'role',
      entityId: roleId,
      summary: `${granted ? 'granted' : 'revoked'} ${permission} ${granted ? 'to' : 'from'} ${role.name}`,
      departmentId: null,
    }
  })
}

export function createRole(name: string, description: string) {
  apply((state) => {
    const id = newId('role')
    state.entities.roles[id] = {
      id,
      name,
      description,
      permissions: ['work.view'],
      system: false,
      rank: state.order.roleIds.length,
    }
    state.order.roleIds.push(id)
    return { kind: 'role', entityId: id, summary: `created the ${name} role`, departmentId: null }
  })
}

export function deleteRole(roleId: Id) {
  apply((state) => {
    const role = state.entities.roles[roleId]
    if (!role || role.system) return
    // Anyone holding the deleted role falls back to the lowest-privilege one.
    const fallback = [...state.order.roleIds]
      .map((id) => state.entities.roles[id]!)
      .filter(Boolean)
      .sort((a, b) => b.rank - a.rank)
      .find((candidate) => candidate.id !== roleId)

    for (const user of Object.values(state.entities.users)) {
      if (user.roleId === roleId && fallback) user.roleId = fallback.id
    }

    delete state.entities.roles[roleId]
    state.order.roleIds = state.order.roleIds.filter((id) => id !== roleId)

    return { kind: 'role', entityId: roleId, summary: `deleted the ${role.name} role`, departmentId: null }
  })
}

/* ------------------------------------------------------------------ *
 * Workflows and statuses — PRD §39
 * ------------------------------------------------------------------ */

export function createStatus(workflowId: Id, name: string, category: StatusCategory) {
  apply((state) => {
    const workflow = state.entities.workflows[workflowId]
    if (!workflow) return
    const id = newId('st')
    state.entities.statuses[id] = { id, name, category, order: workflow.statusIds.length }
    workflow.statusIds.push(id)
    return { kind: 'status', entityId: id, summary: `added the ${name} status to ${workflow.name}`, departmentId: null }
  })
}

export function updateStatusConfig(statusId: Id, patch: { name?: string; category?: StatusCategory }) {
  apply((state) => {
    const status = state.entities.statuses[statusId]
    if (!status) return
    Object.assign(status, patch)
    return { kind: 'status', entityId: statusId, summary: `updated the ${status.name} status`, departmentId: null }
  })
}

export function deleteStatus(workflowId: Id, statusId: Id) {
  apply((state) => {
    const workflow = state.entities.workflows[workflowId]
    const status = state.entities.statuses[statusId]
    if (!workflow || !status) return
    if (workflow.statusIds.length <= 2) return

    // Work sitting in the removed status moves to the first remaining
    // one rather than vanishing from the board.
    const fallbackId = workflow.statusIds.find((id) => id !== statusId)
    if (!fallbackId) return

    for (const item of Object.values(state.entities.workItems)) {
      if (item.statusId === statusId) item.statusId = fallbackId
    }

    workflow.statusIds = workflow.statusIds.filter((id) => id !== statusId)
    workflow.statusIds.forEach((id, index) => {
      const entry = state.entities.statuses[id]
      if (entry) entry.order = index
    })
    delete state.entities.statuses[statusId]

    return { kind: 'status', entityId: statusId, summary: `removed the ${status.name} status from ${workflow.name}`, departmentId: null }
  })
}

export function reorderStatuses(workflowId: Id, statusIds: Id[]) {
  apply((state) => {
    const workflow = state.entities.workflows[workflowId]
    if (!workflow) return
    workflow.statusIds = statusIds
    statusIds.forEach((id, index) => {
      const status = state.entities.statuses[id]
      if (status) status.order = index
    })
    return { kind: 'workflow', entityId: workflowId, summary: `reordered ${workflow.name}`, departmentId: null }
  })
}

export function createWorkflow(name: string, description: string) {
  apply((state) => {
    const id = newId('wf')
    const todoId = newId('st')
    const doingId = newId('st')
    const doneId = newId('st')

    state.entities.statuses[todoId] = { id: todoId, name: 'To do', category: 'unstarted', order: 0 }
    state.entities.statuses[doingId] = { id: doingId, name: 'Doing', category: 'started', order: 1 }
    state.entities.statuses[doneId] = { id: doneId, name: 'Done', category: 'completed', order: 2 }

    state.entities.workflows[id] = { id, name, description, statusIds: [todoId, doingId, doneId] }
    state.order.workflowIds.push(id)

    return { kind: 'workflow', entityId: id, summary: `created the ${name} workflow`, departmentId: null }
  })
}

/* ------------------------------------------------------------------ *
 * Labels, types and custom fields — PRD §21, §22
 * ------------------------------------------------------------------ */

export function createLabel(name: string, hue: Hue) {
  apply((state) => {
    const id = newId('lbl')
    state.entities.labels[id] = { id, name, hue }
    state.order.labelIds.push(id)
    return { kind: 'label', entityId: id, summary: `created the ${name} label`, departmentId: null }
  })
}

export function updateLabel(labelId: Id, patch: Partial<Label>) {
  apply((state) => {
    const label = state.entities.labels[labelId]
    if (!label) return
    Object.assign(label, patch)
    return { kind: 'label', entityId: labelId, summary: `updated the ${label.name} label`, departmentId: null }
  })
}

export function deleteLabel(labelId: Id) {
  apply((state) => {
    const label = state.entities.labels[labelId]
    if (!label) return
    for (const item of Object.values(state.entities.workItems)) {
      item.labelIds = item.labelIds.filter((id) => id !== labelId)
    }
    delete state.entities.labels[labelId]
    state.order.labelIds = state.order.labelIds.filter((id) => id !== labelId)
    return { kind: 'label', entityId: labelId, summary: `deleted the ${label.name} label`, departmentId: null }
  })
}

export function createWorkItemType(name: string, icon: string, hue: Hue) {
  apply((state) => {
    const id = newId('wt')
    state.entities.workItemTypes[id] = { id, name, icon, hue, keyPrefix: name.slice(0, 1).toUpperCase() }
    state.order.workItemTypeIds.push(id)
    return { kind: 'work-item-type', entityId: id, summary: `created the ${name} work item type`, departmentId: null }
  })
}

export function deleteWorkItemType(typeId: Id) {
  apply((state) => {
    const type = state.entities.workItemTypes[typeId]
    if (!type || state.order.workItemTypeIds.length <= 1) return
    const fallbackId = state.order.workItemTypeIds.find((id) => id !== typeId)
    if (!fallbackId) return

    for (const item of Object.values(state.entities.workItems)) {
      if (item.typeId === typeId) item.typeId = fallbackId
    }

    delete state.entities.workItemTypes[typeId]
    state.order.workItemTypeIds = state.order.workItemTypeIds.filter((id) => id !== typeId)
    return { kind: 'work-item-type', entityId: typeId, summary: `deleted the ${type.name} work item type`, departmentId: null }
  })
}

export interface CustomFieldInput {
  name: string
  kind: CustomFieldKind
  departmentIds: Id[]
  options: string[]
  description?: string
}

export function createCustomField(input: CustomFieldInput) {
  apply((state) => {
    const id = newId('cf')
    state.entities.customFields[id] = { id, ...input }
    state.order.customFieldIds.push(id)
    return { kind: 'custom-field', entityId: id, summary: `created the ${input.name} custom field`, departmentId: null }
  })
}

export function updateCustomField(fieldId: Id, patch: Partial<CustomField>) {
  apply((state) => {
    const field = state.entities.customFields[fieldId]
    if (!field) return
    Object.assign(field, patch)
    return { kind: 'custom-field', entityId: fieldId, summary: `updated the ${field.name} custom field`, departmentId: null }
  })
}

export function deleteCustomField(fieldId: Id) {
  apply((state) => {
    const field = state.entities.customFields[fieldId]
    if (!field) return
    for (const item of Object.values(state.entities.workItems)) {
      delete item.customFields[fieldId]
    }
    delete state.entities.customFields[fieldId]
    state.order.customFieldIds = state.order.customFieldIds.filter((id) => id !== fieldId)
    return { kind: 'custom-field', entityId: fieldId, summary: `deleted the ${field.name} custom field`, departmentId: null }
  })
}

/* ------------------------------------------------------------------ *
 * Organization
 * ------------------------------------------------------------------ */

export function updateOrganization(orgId: Id, patch: { name?: string; initials?: string; hue?: Hue }) {
  apply((state) => {
    const org = state.entities.organizations[orgId]
    if (!org) return
    Object.assign(org, patch)
    return { kind: 'organization', entityId: orgId, summary: `updated organization settings`, departmentId: null }
  })
}
