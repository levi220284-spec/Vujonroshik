import { Download, Plus, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button, Card, CardHeader, ConfirmButton, Input, PageHeader } from '../components/ui'
import { downloadFile } from '../lib/csv'
import { todayString } from '../lib/dates'
import { parseBackup } from '../lib/storage'
import { useStore } from '../lib/store'
import type { AppData } from '../lib/types'

function MemberRow({ id, index }: { id: string; index: number }) {
  const { data, renameMember, memberHasData, removeMember, notify } = useStore()
  const member = data.members.find((m) => m.id === id)!
  const [text, setText] = useState(member.name)
  const hasData = memberHasData(id)
  const onlyOne = data.members.length <= 1

  const commit = () => {
    const name = text.trim()
    if (!name) return setText(member.name) // empty names are not allowed; put the old one back
    if (name !== member.name) {
      renameMember(id, name)
      if (data.members.some((m) => m.id !== id && m.name.toLowerCase() === name.toLowerCase())) notify('Another member already has this name', 'error')
    }
    setText(name)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-6 text-right text-sm tabular-nums text-slate-400">{index + 1}</span>
      <Input
        aria-label={`Name of member ${index + 1}`}
        value={text}
        maxLength={40}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <ConfirmButton
        confirmLabel="Remove?"
        disabled={hasData || onlyOne}
        title={hasData ? 'This member has meals or deposits recorded, so they cannot be removed' : onlyOne ? 'At least one member is required' : 'Remove member'}
        onConfirm={() => removeMember(id)}
      >
        Remove
      </ConfirmButton>
    </div>
  )
}

export default function Settings() {
  const { data, addMember, replaceAll, resetAll, notify, canEdit, shared } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<AppData | null>(null)

  const exportJson = () => {
    downloadFile(`flat-meal-backup-${todayString()}.json`, JSON.stringify(data, null, 2), 'application/json')
    notify('Backup downloaded')
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setPending(parseBackup(await file.text()))
    } catch (err) {
      setPending(null)
      notify(err instanceof Error ? err.message : 'Could not read that file', 'error')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <PageHeader title="Members / Settings" subtitle="Names you set here appear in every table and report." />

      <Card>
        <CardHeader title="Flat members" subtitle={`${data.members.length} members. Names save when you leave the field.`} />
        <fieldset disabled={!canEdit} className="flex flex-col gap-3 p-5 disabled:opacity-60">
          {data.members.map((m, i) => <MemberRow key={m.id} id={m.id} index={i} />)}
          <div>
            <Button variant="secondary" onClick={addMember}><Plus size={16} />Add member</Button>
          </div>
          <p className="text-xs text-slate-400">A member can only be removed while they have no meals or deposits, so past months never change by accident.</p>
        </fieldset>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Backup and restore" subtitle={shared ? 'Data is stored in the shared database. A downloaded backup is still a good safety copy.' : 'Your data lives in this browser only. Download a backup now and then.'} />
        <div className="flex flex-wrap gap-2 p-5">
          <Button onClick={exportJson}><Download size={16} />Export backup (JSON)</Button>
          <Button variant="secondary" disabled={!canEdit} onClick={() => fileRef.current?.click()}><Upload size={16} />Import backup</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {pending && (
          <div className="mx-5 mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Replace everything with this backup?</p>
            <p className="mt-1 text-amber-800">
              It has {pending.members.length} members, {Object.keys(pending.meals).length} days of meals, {pending.expenses.length} expenses and {pending.deposits.length} deposits.
              Your current data will be overwritten.
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => { replaceAll(pending); setPending(null); notify('Backup restored') }}>Replace my data</Button>
              <Button variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="mt-5">
        <CardHeader title="Start over" subtitle="Deletes all meals, expenses and deposits and resets the 7 member names." />
        <div className="p-5">
          <ConfirmButton disabled={!canEdit} confirmLabel="Click again to erase everything" className="!h-10 !px-4 !text-sm border border-rose-200 !text-rose-600" onConfirm={() => { resetAll(); notify('All data cleared') }}>
            <RotateCcw size={15} className="mr-2" />Erase all data
          </ConfirmButton>
        </div>
      </Card>
    </>
  )
}
