import { motion } from "motion/react"
import type { ElementType, ReactNode } from "react"
import { useInView } from "../hooks/useInView"
import { useReducedMotion } from "../hooks/useReducedMotion"

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
  as?: ElementType
  /** Distance in pixels the element travels while fading in. */
  distance?: number
}

/**
 * Scroll-triggered reveal with a blur-to-sharp transition — the content
 * appears to come into focus rather than simply fade.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
  distance = 22,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const reduced = useReducedMotion()
  const Component = motion[as as keyof typeof motion] as typeof motion.div

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <Component
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: distance, filter: "blur(6px)" },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] },
        },
      }}
    >
      {children}
    </Component>
  )
}
