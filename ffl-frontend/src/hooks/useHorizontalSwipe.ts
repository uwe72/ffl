import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react'

const SWIPE_THRESHOLD = 50

export default function useHorizontalSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void
) {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)

  const onPointerDown = (e: ReactPointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const start = startRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault()
    }
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = startRef.current
    startRef.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      suppressClick.current = true
      if (dx < 0) onSwipeLeft()
      else onSwipeRight()
    }
  }

  const onClickCapture = (e: ReactMouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp, onClickCapture }
}
