import { Construction } from 'lucide-react'

export default function AdminPlaceholder({ titre, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-20 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 mb-4">
        <Construction className="size-6" />
      </span>
      <h3 className="text-lg font-semibold text-slate-900">{titre}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      <p className="mt-4 text-xs text-slate-400">Cette section sera bientôt disponible.</p>
    </div>
  )
}
