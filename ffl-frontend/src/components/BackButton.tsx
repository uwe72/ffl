import { useNavigate } from 'react-router-dom'

interface BackButtonProps {
  to: string
  className?: string
}

export default function BackButton({ to, className = '' }: BackButtonProps) {
  const navigate = useNavigate()
  const handleClick = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(to)
    }
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline font-semibold px-4 md:px-0 pt-4 md:pt-0 ${className}`}
    >
      <i className="sap-icon sap-icon-nav-back text-base" />
      Zurück
    </button>
  )
}
