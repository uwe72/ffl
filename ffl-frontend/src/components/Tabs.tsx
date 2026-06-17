interface TabItem {
  key: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
}

export default function Tabs({ items, active, onChange }: TabsProps) {
  return (
    <div className="border-b border-border mb-6">
      <div className="flex gap-6">
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`pb-3 px-1 text-lg font-medium transition-colors ${
              active === item.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
