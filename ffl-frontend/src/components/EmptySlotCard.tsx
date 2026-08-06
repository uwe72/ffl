interface EmptySlotCardProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
}

export default function EmptySlotCard({
  label,
  onClick,
  disabled,
  ariaLabel,
}: EmptySlotCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? `${label} wählen`}
      className="w-full min-h-[56px] px-3 py-2 rounded-card border border-dashed border-border-strong bg-transparent flex items-center gap-2 text-subtle transition-colors hover:border-control hover:bg-elevated cursor-pointer disabled:cursor-not-allowed"
    >
      <i className="sap-icon sap-icon-add text-xl text-subtle" />
      <span className="text-sm">{label} wählen</span>
    </button>
  )
}
