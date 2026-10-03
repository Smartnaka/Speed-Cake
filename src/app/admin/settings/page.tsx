'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Save, Settings } from 'lucide-react'
import { getAdminAuthHeader } from '@/lib/admin-client-auth'

type SettingsForm = {
  store_name: string; store_email: string; store_phone: string; store_address: string
  city: string; state: string; country: string; support_email: string; support_phone: string
}

const emptySettings: SettingsForm = {
  store_name: '', store_email: '', store_phone: '', store_address: '', city: '', state: '', country: '', support_email: '', support_phone: '',
}

const fields: Array<{ name: keyof SettingsForm; label: string; type?: string }> = [
  { name: 'store_name', label: 'Store name' }, { name: 'store_email', label: 'Store email', type: 'email' },
  { name: 'store_phone', label: 'Store phone', type: 'tel' }, { name: 'store_address', label: 'Store address' },
  { name: 'city', label: 'City' }, { name: 'state', label: 'State' }, { name: 'country', label: 'Country' },
]

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const response = await fetch('/api/admin/settings', { headers: await getAdminAuthHeader() })
      const data = await response.json()
      if (response.status === 404) return
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to load settings.')
      setForm(data.settings)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load settings.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null); setSuccess(null)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await getAdminAuthHeader()) }, body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        const detail = data.issues?.formErrors?.[0] || data.error || 'Unable to save settings.'
        throw new Error(detail)
      }
      setForm(data.settings)
      setSuccess('Store settings saved.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save settings.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="py-24 text-center"><Loader2 size={32} className="animate-spin mx-auto text-[#6f3d36] mb-3" /><p className="text-sm text-[#756862]">Loading store settings…</p></div>

  return <div className="max-w-3xl space-y-7 pb-12">
    <div className="pb-5 border-b border-[#ded0c8]"><div className="eyebrow text-[#8a5b51]">Operations</div><h1 className="serif text-4xl text-[#352c28] mt-1">Store Settings</h1><p className="text-sm text-[#756862] mt-2">Manage the contact information used to operate Speed Cake.</p></div>
    {error && <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-sm flex gap-2"><AlertCircle size={16} className="shrink-0" />{error}</div>}
    {success && <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-sm flex gap-2"><CheckCircle2 size={16} className="shrink-0" />{success}</div>}
    <form onSubmit={save} className="space-y-6">
      <section className="bg-white border border-[#e5d9d1] rounded p-6 shadow-sm"><h2 className="font-serif text-xl text-[#352c28] flex gap-2 items-center mb-5"><Settings size={19} className="text-[#6f3d36]" />Store Information</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{fields.map(field => <label key={field.name} className={field.name === 'store_address' ? 'sm:col-span-2' : ''}><span className="block text-xs font-semibold text-[#756862] mb-1">{field.label}</span><input required type={field.type || 'text'} value={form[field.name]} onChange={event => setForm(current => ({ ...current, [field.name]: event.target.value }))} className="w-full rounded border border-[#ded0c8] p-2.5 text-sm text-[#352c28] focus:outline-none focus:border-[#6f3d36]" /></label>)}</div></section>
      <section className="bg-white border border-[#e5d9d1] rounded p-6 shadow-sm"><h2 className="font-serif text-xl text-[#352c28] mb-2">Customer Support</h2><p className="text-xs text-[#756862] mb-5">Contact details for customers who need help with an order.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{(['support_email', 'support_phone'] as const).map(name => <label key={name}><span className="block text-xs font-semibold text-[#756862] mb-1">{name === 'support_email' ? 'Support email' : 'Support phone'}</span><input required type={name === 'support_email' ? 'email' : 'tel'} value={form[name]} onChange={event => setForm(current => ({ ...current, [name]: event.target.value }))} className="w-full rounded border border-[#ded0c8] p-2.5 text-sm text-[#352c28] focus:outline-none focus:border-[#6f3d36]" /></label>)}</div></section>
      <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6f3d36] text-white rounded text-sm font-semibold hover:bg-[#5b322c] disabled:opacity-50"><Save size={16} />{saving ? 'Saving…' : 'Save settings'}</button>
    </form>
  </div>
}
