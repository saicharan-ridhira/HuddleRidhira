'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, BookmarkPlus, Check, MoreHorizontal, Rows2, Rows3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DynamicIcon } from '@/components/primitives'
import { useCustomFields, useSavedViews } from '@/lib/store/selectors'
import { viewService } from '@/lib/services'
import { DISPLAYABLE_FIELDS, type DisplayableField, type Id, type SavedView, type ViewConfig } from '@/lib/types'
import { toast } from 'sonner'

const FIELD_LABEL: Record<DisplayableField, string> = {
  key: 'ID',
  type: 'Type',
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  labels: 'Labels',
  dueDate: 'Due date',
  checklist: 'Checklist',
  blocked: 'Blocked',
  dependencies: 'Dependencies',
  updatedAt: 'Updated',
}

/**
 * PRD §44's overflow. Saved views, field visibility and density all live
 * here rather than on the toolbar — they are set occasionally and read
 * constantly, which is exactly the profile for a menu.
 */
export function ViewMenu({
  departmentId,
  departmentSlug,
  config,
  onChange,
}: {
  departmentId: Id
  departmentSlug: string
  config: ViewConfig
  onChange: (patch: Partial<ViewConfig>) => void
}) {
  const router = useRouter()
  const savedViews = useSavedViews(departmentId)
  const customFields = useCustomFields(departmentId)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')

  const toggleField = (field: DisplayableField) =>
    onChange({
      visibleFields: config.visibleFields.includes(field)
        ? config.visibleFields.filter((entry) => entry !== field)
        : [...config.visibleFields, field],
    })

  const toggleCustomField = (fieldId: Id) =>
    onChange({
      visibleCustomFieldIds: config.visibleCustomFieldIds.includes(fieldId)
        ? config.visibleCustomFieldIds.filter((entry) => entry !== fieldId)
        : [...config.visibleCustomFieldIds, fieldId],
    })

  const applyView = (view: SavedView) => {
    viewService.applySavedView(departmentId, view)
    router.push(`/departments/${departmentSlug}/${view.config.layout}`)
    toast.success(`Applied “${view.name}”`)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Bookmark />
            View
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Saved views</DropdownMenuLabel>
          {savedViews.length === 0 && (
            <div className="px-2 py-1.5 text-[12px] text-muted-foreground">Nothing saved yet.</div>
          )}
          {savedViews.map((view) => (
            <DropdownMenuItem key={view.id} onSelect={() => applyView(view)}>
              <DynamicIcon name={view.icon} />
              <span className="flex-1 truncate">{view.name}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{view.config.layout}</span>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSaving(true)}>
            <BookmarkPlus />
            Save current view…
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Rows3 />
              Visible fields
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              {DISPLAYABLE_FIELDS.map((field) => (
                <DropdownMenuCheckboxItem
                  key={field}
                  checked={config.visibleFields.includes(field)}
                  onCheckedChange={() => toggleField(field)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {FIELD_LABEL[field]}
                </DropdownMenuCheckboxItem>
              ))}

              {customFields.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Custom fields</DropdownMenuLabel>
                  {customFields.map((field) => (
                    <DropdownMenuCheckboxItem
                      key={field.id}
                      checked={config.visibleCustomFieldIds.includes(field.id)}
                      onCheckedChange={() => toggleCustomField(field.id)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {field.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Rows2 />
              Density
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-40">
              <DropdownMenuItem onSelect={() => onChange({ density: 'compact' })}>
                <span className="flex-1">Compact</span>
                {config.density === 'compact' && <Check className="size-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onChange({ density: 'comfortable' })}>
                <span className="flex-1">Comfortable</span>
                {config.density === 'comfortable' && <Check className="size-3.5" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {config.layout === 'board' && (
            <DropdownMenuCheckboxItem
              checked={config.hideEmptyGroups}
              onCheckedChange={(checked) => onChange({ hideEmptyGroups: checked === true })}
              onSelect={(event) => event.preventDefault()}
            >
              Hide empty columns
            </DropdownMenuCheckboxItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saving} onOpenChange={setSaving}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
            <DialogDescription>
              Layout, grouping, sorting, filters and visible fields are saved. The underlying work is untouched.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="view-name">Name</Label>
            <Input
              id="view-name"
              autoFocus
              value={name}
              placeholder="Blocked engineering work"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaving(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim()}
              onClick={() => {
                viewService.saveView({ name, departmentId, scope: 'department', config })
                setName('')
                setSaving(false)
                toast.success('View saved')
              }}
            >
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** The `⋯` overflow: rarely used, never competing for attention. */
export function WorkspaceOverflow({ departmentId, departmentSlug }: { departmentId: Id; departmentSlug: string }) {
  const router = useRouter()
  const savedViews = useSavedViews(departmentId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="More options">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => router.push(`/departments/${departmentSlug}/members`)}>
          Members
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/settings/departments')}>Department settings</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/settings/workflows')}>Workflow</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/settings/custom-fields')}>Custom fields</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Manage saved views</DropdownMenuLabel>
        {savedViews
          .filter((view) => view.departmentId === departmentId)
          .map((view) => (
            <DropdownMenuItem
              key={view.id}
              variant="destructive"
              onSelect={() => {
                viewService.deleteSavedView(view.id)
                toast.success(`Deleted “${view.name}”`)
              }}
            >
              <Trash2 />
              <span className="flex-1 truncate">{view.name}</span>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
