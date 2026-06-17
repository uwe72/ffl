import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'

interface TableContentProps {
  children: ReactNode
  count?: number
  total?: number
  countLabel?: string
}

export function TableContent({ children, count, total, countLabel }: TableContentProps) {
  return (
    <div className="flex-1 px-6 pb-6 overflow-x-auto">
      <div className="rounded-lg border border-border">
        {children}
      </div>
      {count != null && total != null && countLabel && (
        <div className="mt-4 text-sm text-subtle">
          {count} von {total} {countLabel}
        </div>
      )}
    </div>
  )
}

interface TableHeadProps {
  children: ReactNode
}

export function TableHead({ children }: TableHeadProps) {
  return (
    <thead className="bg-elevated sticky top-0">
      {children}
    </thead>
  )
}

type Align = 'left' | 'center' | 'right'

interface ThSortableProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'className'> {
  children: ReactNode
  align?: Align
  className?: string
}

export function ThSortable({ children, align = 'left', className = '', ...rest }: ThSortableProps) {
  return (
    <th
      className={`px-3 py-2 text-${align} text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border ${className}`}
      {...rest}
    >
      {children}
    </th>
  )
}

interface ThProps {
  children?: ReactNode
  align?: Align
  className?: string
}

export function Th({ children, align = 'left', className = '' }: ThProps) {
  return (
    <th className={`px-3 py-2 text-${align} text-xs text-muted font-bold border-b border-border ${className}`}>
      {children}
    </th>
  )
}

interface TableBodyProps {
  children: ReactNode
}

export function TableBody({ children }: TableBodyProps) {
  return (
    <tbody className="bg-surface text-sm">
      {children}
    </tbody>
  )
}

interface TdProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'className'> {
  children?: ReactNode
  align?: Align
  className?: string
}

export function Td({ children, align = 'left', className = '', ...rest }: TdProps) {
  return (
    <td className={`px-3 py-2 text-${align} ${className}`} {...rest}>
      {children}
    </td>
  )
}
