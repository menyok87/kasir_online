export default function Spinner({ size = 'md' }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size]
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-blue-500 ${s}`} />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-gray-400 dark:text-gray-500">Memuat...</p>
    </div>
  )
}
