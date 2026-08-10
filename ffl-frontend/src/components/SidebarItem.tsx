import { Link, useLocation } from 'react-router-dom'

interface SidebarItemProps {
  to: string
  label: string
  icon: string
  collapsed: boolean
  subItems?: { to: string; label: string; external?: boolean }[]
  expanded?: boolean
  onToggle?: () => void
}

export default function SidebarItem({ to, label, icon, collapsed, subItems, expanded, onToggle }: SidebarItemProps) {
  const location = useLocation()
  const isActive =
    location.pathname === to ||
    (subItems
      ? subItems.some((sub) => !sub.external && (location.pathname === sub.to || location.pathname.startsWith(sub.to + '/')))
      : to !== '/' && location.pathname.startsWith(to + '/'))
  const hasSubItems = subItems && subItems.length > 0

  if (hasSubItems) {
    return (
      <div>
        <button
          onClick={onToggle}
          title={collapsed ? label : undefined}
          className={`relative w-full flex items-center gap-3 px-3 h-[38px] rounded-control transition-colors
            text-sidebar-muted font-medium hover:bg-sidebar-hover hover:text-sidebar-foreground
            ${collapsed ? 'justify-center' : ''}`}
        >
          <i className={`sap-icon ${icon} text-[18px] shrink-0`} />
          {!collapsed && (
            <>
              <span className="text-sm">{label}</span>
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
                    className="block px-3 py-2 rounded-control text-sm transition-colors text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover"
                  >
                    {sub.label}
                  </a>
                )
              }
              return (
                <Link
                  key={sub.to}
                  to={sub.to}
                  aria-current={subActive ? 'page' : undefined}
                  className={`block px-3 py-2 rounded-control text-sm transition-colors
                    ${subActive
                      ? 'bg-sidebar-active-bg text-sidebar-active-text font-semibold'
                      : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover'}`}
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
      aria-current={isActive ? 'page' : undefined}
      className={`relative flex items-center gap-3 px-3 h-[38px] rounded-control transition-colors
        ${isActive
          ? 'bg-sidebar-active-bg text-sidebar-active-text font-semibold'
          : 'text-sidebar-muted font-medium hover:bg-sidebar-hover hover:text-sidebar-foreground'}
        ${collapsed ? 'justify-center' : ''}`}
    >
      <i className={`sap-icon ${icon} text-[18px] shrink-0 ${isActive ? 'text-accent' : ''}`} />
      {!collapsed && <span className="text-sm">{label}</span>}
    </Link>
  )
}
