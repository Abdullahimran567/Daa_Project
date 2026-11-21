import { motion } from "motion/react"

/**
 * The AlgoLab mark: a square that splits into two — the shape of every
 * divide-and-conquer recursion in the app.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <defs>
          <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8fb6ff" />
            <stop offset="55%" stopColor="#5ff0d8" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        <motion.rect
          x="12.5"
          y="3.5"
          width="7"
          height="7"
          rx="1.6"
          stroke="url(#brand-grad)"
          strokeWidth="1.4"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.path
          d="M16 11.5 L16 14.5 M16 14.5 L9.5 17.5 M16 14.5 L22.5 17.5"
          stroke="url(#brand-grad)"
          strokeWidth="1.2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.85 }}
          transition={{ duration: 1.1, delay: 0.15, ease: "easeOut" }}
        />

        <motion.rect
          x="4.5"
          y="21.5"
          width="8"
          height="8"
          rx="1.6"
          stroke="url(#brand-grad)"
          strokeWidth="1.4"
          initial={{ opacity: 0.25 }}
          animate={{ opacity: [0.25, 0.9, 0.25] }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.35,
          }}
        />
        <motion.rect
          x="19.5"
          y="21.5"
          width="8"
          height="8"
          rx="1.6"
          stroke="url(#brand-grad)"
          strokeWidth="1.4"
          initial={{ opacity: 0.25 }}
          animate={{ opacity: [0.25, 0.9, 0.25] }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.65,
          }}
        />
      </svg>
    </span>
  )
}
