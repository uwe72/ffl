import type { ReactNode } from 'react'

interface PageHeaderProps {
  icon: string
  title: string
  children?: ReactNode
}

export default function PageHeader({ icon, title, children }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <i className={`sap-icon ${icon} text-xl text-primary`} />
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      {children}
    </div>
  )
}
