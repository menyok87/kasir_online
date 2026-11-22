import { NavLink } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { allMenus } from './menus'

// Material 3 Navigation Bar — tampil hanya di layar kecil (Android / mobile).
// Menampilkan maksimal 5 destinasi; bila menu yang diizinkan lebih dari 5,
// 4 teratas ditampilkan + tombol "Lainnya" yang membuka drawer (sidebar).
export default function BottomNav({ onMore }) {
  const { can } = useAuth()
  const permitted = allMenus.filter(m => can?.[m.feature])
  const overflow = permitted.length > 5
  const items = overflow ? permitted.slice(0, 4) : permitted

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around px-1 pt-1.5 pb-1">
        {items.map(({ to, icon: Icon, short }) => (
          <NavLink
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center gap-1 min-w-0 group"
          >
            {({ isActive }) => (
              <>
                {/* Active indicator (pil M3) */}
                <span
                  className={`flex items-center justify-center h-8 w-14 rounded-full transition-colors ${
                    isActive
                      ? 'bg-blue-600/15 dark:bg-blue-500/25'
                      : 'group-active:bg-gray-100 dark:group-active:bg-gray-800'
                  }`}
                >
                  <Icon
                    size={21}
                    className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
                  />
                </span>
                <span
                  className={`text-[10px] leading-none truncate max-w-full ${
                    isActive
                      ? 'font-semibold text-blue-600 dark:text-blue-400'
                      : 'font-medium text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {short}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {overflow && (
          <button
            type="button"
            onClick={onMore}
            className="flex-1 flex flex-col items-center gap-1 min-w-0 group"
          >
            <span className="flex items-center justify-center h-8 w-14 rounded-full transition-colors group-active:bg-gray-100 dark:group-active:bg-gray-800">
              <MoreHorizontal size={21} className="text-gray-500 dark:text-gray-400" />
            </span>
            <span className="text-[10px] leading-none font-medium text-gray-500 dark:text-gray-400">
              Lainnya
            </span>
          </button>
        )}
      </div>
    </nav>
  )
}
