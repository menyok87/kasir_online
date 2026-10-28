import { PackageOpen } from 'lucide-react'

export default function EmptyState({ title = 'Tidak ada data', description = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <PackageOpen size={48} className="text-gray-300 mb-4" />
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
