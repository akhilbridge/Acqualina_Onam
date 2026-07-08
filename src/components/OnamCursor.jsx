import { useEffect, useRef, useState } from "react";

const BURST_DURATION_MS = 900;
const TRAIL_DURATION_MS = 720;
const TRAIL_MIN_DISTANCE = 18;
const TRAIL_MIN_INTERVAL_MS = 36;
const BURST_TARGET_SELECTOR = [
  "button",
  "a.primary-button",
  "a.ghost-button",
  "a.danger-button",
  "[data-onam-burst='true']",
].join(", ");
const PETAL_CLASS_NAMES = [
  "petal-top",
  "petal-top-right",
  "petal-right",
  "petal-bottom-right",
  "petal-bottom",
  "petal-bottom-left",
  "petal-left",
  "petal-top-left",
];
const PETAL_TONE_CLASS_NAMES = [
  "tone-gold",
  "tone-amber",
  "tone-cream",
  "tone-orange",
  "tone-gold",
  "tone-amber",
  "tone-cream",
  "tone-orange",
];
const SPARKLE_CLASS_NAMES = [
  "sparkle-top",
  "sparkle-right",
  "sparkle-bottom",
  "sparkle-left",
  "sparkle-top-right",
  "sparkle-bottom-left",
];

export default function OnamCursor() {
  const [cursorEnabled, setCursorEnabled] = useState(false);
  const [bursts, setBursts] = useState([]);
  const [trails, setTrails] = useState([]);
  const timeoutIdsRef = useRef([]);
  const lastTrailRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(pointer: fine)");
    const syncEnabled = () => {
      setCursorEnabled(mediaQuery.matches);
    };

    syncEnabled();
    mediaQuery.addEventListener("change", syncEnabled);

    return () => {
      mediaQuery.removeEventListener("change", syncEnabled);
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
      lastTrailRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!cursorEnabled || typeof window === "undefined") {
      return undefined;
    }

    const handlePointerMove = (event) => {
      const now = performance.now();
      const previousPoint = lastTrailRef.current;

      if (!previousPoint) {
        lastTrailRef.current = {
          x: event.clientX,
          y: event.clientY,
          at: now,
        };
        return;
      }

      const deltaX = event.clientX - previousPoint.x;
      const deltaY = event.clientY - previousPoint.y;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance < TRAIL_MIN_DISTANCE || now - previousPoint.at < TRAIL_MIN_INTERVAL_MS) {
        return;
      }

      const trailId = `${Date.now()}-${Math.random()}`;
      const trail = {
        id: trailId,
        x: event.clientX,
        y: event.clientY,
        driftX: Math.max(-36, Math.min(36, deltaX * -1.1)),
        driftY: Math.max(-24, Math.min(24, deltaY * -1.1)),
        angle: `${Math.atan2(deltaY, deltaX)}rad`,
        scale: Math.max(0.82, Math.min(1.34, distance / 24)),
      };

      setTrails((current) => [...current.slice(-15), trail]);

      const timeoutId = window.setTimeout(() => {
        setTrails((current) => current.filter((item) => item.id !== trailId));
      }, TRAIL_DURATION_MS);

      timeoutIdsRef.current.push(timeoutId);
      lastTrailRef.current = {
        x: event.clientX,
        y: event.clientY,
        at: now,
      };
    };

    const resetPointerTrail = () => {
      lastTrailRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", resetPointerTrail);
    window.addEventListener("blur", resetPointerTrail);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", resetPointerTrail);
      window.removeEventListener("blur", resetPointerTrail);
      lastTrailRef.current = null;
    };
  }, [cursorEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleButtonClick = (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest(BURST_TARGET_SELECTOR)
          : null;

      if (!target) {
        return;
      }

      if (
        target.matches(":disabled") ||
        target.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const burstId = `${Date.now()}-${Math.random()}`;
      const burst = {
        id: burstId,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        scale: Math.max(1, Math.min(1.5, Math.max(rect.width, rect.height) / 96)),
      };

      setBursts((current) => [...current.slice(-5), burst]);

      const timeoutId = window.setTimeout(() => {
        setBursts((current) => current.filter((item) => item.id !== burstId));
      }, BURST_DURATION_MS);

      timeoutIdsRef.current.push(timeoutId);
    };

    window.addEventListener("click", handleButtonClick, { passive: true, capture: true });

    return () => {
      window.removeEventListener("click", handleButtonClick, true);
    };
  }, []);

  if (!cursorEnabled && bursts.length === 0 && trails.length === 0) {
    return null;
  }

  return (
    <div className="onam-cursor-layer" aria-hidden="true">
      {trails.map((trail) => (
        <div
          key={trail.id}
          className="onam-trail"
          style={{
            left: `${trail.x}px`,
            top: `${trail.y}px`,
            "--trail-drift-x": `${trail.driftX}px`,
            "--trail-drift-y": `${trail.driftY}px`,
            "--trail-angle": trail.angle,
            "--trail-scale": trail.scale,
          }}
        >
          <span className="onam-trail-streak" />
          <span className="onam-trail-petal trail-petal-top" />
          <span className="onam-trail-petal trail-petal-right" />
          <span className="onam-trail-petal trail-petal-bottom" />
          <span className="onam-trail-petal trail-petal-left" />
          <span className="onam-trail-core" />
        </div>
      ))}
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="onam-burst"
          style={{
            left: `${burst.x}px`,
            top: `${burst.y}px`,
            "--burst-scale": burst.scale,
          }}
        >
          {PETAL_CLASS_NAMES.map((petalClassName, index) => (
            <span
              key={`${burst.id}-${petalClassName}`}
              className={`onam-petal ${petalClassName} ${PETAL_TONE_CLASS_NAMES[index]}`}
            />
          ))}
          {SPARKLE_CLASS_NAMES.map((sparkleClassName) => (
            <span
              key={`${burst.id}-${sparkleClassName}`}
              className={`onam-sparkle ${sparkleClassName}`}
            />
          ))}
          <span className="onam-burst-ring" />
          <span className="onam-burst-core" />
        </div>
      ))}
    </div>
  );
}
