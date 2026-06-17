interface SortIconProps {
  column: string
  activeKey: string
  order: 'asc' | 'desc'
}

export default function SortIcon({ column, activeKey, order }: SortIconProps) {
  if (activeKey !== column) return <span className="text-subtle ml-1">⇅</span>
  return <span className="text-accent ml-1">{order === 'asc' ? '↑' : '↓'}</span>
}
