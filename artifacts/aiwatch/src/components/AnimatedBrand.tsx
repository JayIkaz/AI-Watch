import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const NAME = "Aukizan";
const TAGLINE = "AI signal, ranked by credibility";
const FLAG = "aukizan:brand-intro";

// The intro plays once per browser tab. Every page mounts its own Layout, so
// without this the logo would replay on every navigation.
let introDone = false;
try {
  introDone = sessionStorage.getItem(FLAG) === "1";
} catch {
  /* storage unavailable: play the intro once per page load instead */
}

function markIntroDone() {
  introDone = true;
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function AnimatedBrand() {
  const reduce = useReducedMotion();
  const [intro] = useState(() => !reduce && !introDone);

  useEffect(() => {
    markIntroDone();
  }, []);

  return (
    <div className="p-6 flex items-center gap-3 shrink-0">
      {/* Tile: pops in with a small spring */}
      <motion.div
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20"
        initial={intro ? { scale: 0.5, opacity: 0, rotate: -14 } : false}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
      >
        {/* Owl: drops in, then tilts its head every few seconds and on hover */}
        <motion.div
          initial={intro ? { y: 6, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: intro ? 0.2 : 0, duration: 0.4, ease: "easeOut" }}
        >
          <motion.img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="Aukizan"
            className="w-6 h-6 object-contain"
            style={{ transformOrigin: "50% 90%" }}
            animate={reduce ? undefined : { rotate: [0, -10, 8, -4, 0] }}
            transition={{
              duration: 1.3,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 8,
              delay: intro ? 1.6 : 3,
            }}
            whileHover={
              reduce
                ? undefined
                : { rotate: -12, scale: 1.08, transition: { duration: 0.25, repeat: 0, delay: 0 } }
            }
          />
        </motion.div>
      </motion.div>

      <div className="flex flex-col min-w-0">
        {/* Wordmark: letters rise one after another */}
        <span
          aria-label={NAME}
          className="inline-flex overflow-hidden py-0.5 -my-0.5 font-display font-bold text-xl tracking-tight text-foreground leading-tight"
        >
          {NAME.split("").map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="inline-block"
              initial={intro ? { y: "0.9em", opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: intro ? 0.3 + i * 0.05 : 0, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {ch}
            </motion.span>
          ))}
        </span>

        {/* Tagline: fades in last */}
        <motion.span
          className="text-[10px] text-muted-foreground/70 leading-tight truncate"
          initial={intro ? { opacity: 0, x: -6 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: intro ? 0.8 : 0, duration: 0.5, ease: "easeOut" }}
        >
          {TAGLINE}
        </motion.span>
      </div>
    </div>
  );
}
