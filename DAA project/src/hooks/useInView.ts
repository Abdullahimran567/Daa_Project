import { useEffect, useRef, useState } from "react"

/**
 * Reveals its children once they scroll into view. The observer disconnects
 * after the first intersection so the reveal only ever plays once.
 */
export function useInView<T extends HTMLElement>(
  options: IntersectionObserverInit = { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined",
  )

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      }
    }, options)

    observer.observe(element)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ref, inView }
}
