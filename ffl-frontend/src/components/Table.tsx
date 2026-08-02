import { forwardRef } from 'react'
import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from 'react'

interface TableContentProps {
  children: ReactNode
  count?: number
  total?: number
  countLabel?: string
}

export function TableContent({ children, count, total, countLabel }: TableContentProps) {
  return (
    <div className="flex-1 px-6 pt-6 pb-6 overflow-x-auto">
      <div className="rounded-card border border-border">
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

const headBase = 'px-3 py-2 h-[40px] text-[12px] font-semibold uppercase tracking-wide text-muted border-b border-border select-none'

interface ThSortableProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'className'> {
  children: ReactNode
  align?: Align
  numeric?: boolean
  className?: string
}

export function ThSortable({ children, align, numeric = false, className = '', ...rest }: ThSortableProps) {
  const effectiveAlign: Align = align ?? (numeric ? 'right' : 'left')
  return (
    <th
      className={`${headBase} group text-${effectiveAlign} cursor-pointer hover:text-accent ${numeric ? 'tabular-nums' : ''} ${className}`}
      {...rest}
    >
      {children}
    </th>
  )
}

interface ThProps {
  children?: ReactNode
  align?: Align
  numeric?: boolean
  className?: string
}

export function Th({ children, align, numeric = false, className = '' }: ThProps) {
  const effectiveAlign: Align = align ?? (numeric ? 'right' : 'left')
  return (
    <th className={`${headBase} text-${effectiveAlign} ${numeric ? 'tabular-nums' : ''} ${className}`}>
      {children}
    </th>
  )
}

interface TableBodyProps {
  children: ReactNode
}

export function TableBody({ children }: TableBodyProps) {
  return (
    <tbody className="bg-surface text-[13px]">
      {children}
    </tbody>
  )
}

interface TableRowProps extends Omit<HTMLAttributes<HTMLTableRowElement>, 'className'> {
  children: ReactNode
  active?: boolean
  className?: string
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ children, active = false, className = '', ...rest }, ref) => {
    return (
      <tr
        ref={ref}
        className={`border-b border-border hover:bg-card-hover ${active ? 'border-l-2 border-l-accent bg-accent-muted font-semibold' : ''} ${className}`}
        {...rest}
      >
        {children}
      </tr>
    )
  }
)

interface TdProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'className'> {
  children?: ReactNode
  align?: Align
  numeric?: boolean
  className?: string
}

export function Td({ children, align, numeric = false, className = '', ...rest }: TdProps) {
  const effectiveAlign: Align = align ?? (numeric ? 'right' : 'left')
  return (
    <td className={`px-3 py-2 h-[40px] text-${effectiveAlign} ${numeric ? 'tabular-nums' : ''} ${className}`} {...rest}>
      {children}
    </td>
  )
}
