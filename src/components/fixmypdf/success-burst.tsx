"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const COLORS = ["#ea580c", "#059669", "#f43f5e", "#0b1329", "#f59e0b"];

interface Particle {
  id: number;
  x: number;
  delay: number;
  color: string;
  size: number;
  rotation: number;
}

/**
 * One-shot confetti burst for successful fixes.
 * Respects prefers-reduced-motion (renders nothing) and auto-unmounts.
 */
export function SuccessBurst({ burstKey }: { burstKey: number }) {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [shownKey, setShownKey] = useState(0);

  // React on a new successful result during render (derived-state pattern).
  if (!reducedMotion && burstKey > 0 && burstKey !== shownKey) {
    setShownKey(burstKey);
    setVisible(true);
  }

  // Auto-hide via a timer callback (external system) once visible.
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 1700);
    return () => window.clearTimeout(timer);
  }, [visible]);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 26 }, (_, i) => ({
      id: i,
      // Spread across the top arc of the panel
      x: -45 + (i / 25) * 90 + (i % 3) * 2,
      delay: (i % 7) * 0.03,
      color: COLORS[i % COLORS.length],
      size: 5 + (i % 4) * 2,
      rotation: (i * 137) % 360,
    }));
  }, []);

  if (reducedMotion) return null;

  return (
    <AnimatePresence>
      {visible && (
        <div
          key={burstKey}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden z-10"
        >
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className={cn("absolute left-1/2 top-3 rounded-[2px]")}
              style={{ backgroundColor: p.color, width: p.size, height: p.size * 0.6 }}
              initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
              animate={{
                x: `${p.x}vw`,
                y: [0, 90 + (p.id % 5) * 18],
                opacity: [0, 1, 1, 0],
                rotate: p.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1 + p.delay * 2, delay: p.delay, ease: "easeOut" }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
