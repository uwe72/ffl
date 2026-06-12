import { type LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface SidebarItemProps {
  to: string
  label: string
  icon: LucideIcon
  collapsed: boolean
  subItems?: { to: string; label: string; external?: boolean }[]
  expanded?: boolean
  onToggle?: () => void
}

export default function SidebarItem({ to, label, icon: Icon, collapsed, subItems, expanded, onToggle }: SidebarItemProps) {
  const location = useLocation()
  const isActive = location.pathname === to || (subItems && location.pathname.startsWith(to))
  const hasSubItems = subItems && subItems.length > 0

  if (hasSubItems) {
    return (
      <div>
        <button
          onClick={onToggle}
          title={collapsed ? label : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
            ${isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-elevated hover:text-accent'}
            ${collapsed ? 'justify-center' : ''}`}
        >
          <Icon size={20} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="text-sm font-medium">{label}</span>
              <svg
                className={`ml-auto w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
        {!collapsed && expanded && (
          <div className="ml-6 mt-1 flex flex-col gap-1">
            {subItems.map((sub) => {
              const subActive = !sub.external && location.pathname === sub.to
              if (sub.external) {
                return (
                  <a
                    key={sub.to}
                    href={sub.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2 rounded-lg text-sm transition-colors text-subtle hover:text-accent hover:bg-elevated"
                  >
                    {sub.label}
                  </a>
                )
              }
              return (
                <Link
                  key={sub.to}
                  to={sub.to}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors
                    ${subActive ? 'text-accent bg-accent/10' : 'text-subtle hover:text-accent hover:bg-elevated'}`}
                >
                  {sub.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
        ${isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-elevated hover:text-accent'}
        ${collapsed ? 'justify-center' : ''}`}
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </Link>
  )
}
