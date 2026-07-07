import { useEffect, useRef, useState } from "react";

const BURST_DURATION_MS = 900;

export default function OnamCursor() {
  const [enabled, setEnabled] = useState(false);
  const [bursts, setBursts] = useState([]);
  const timeoutIdsRef = useRef([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(pointer: fine)");
    const syncEnabled = () => {
      const nextEnabled = mediaQuery.matches;
      setEnabled(nextEnabled);
      document.body.classList.toggle("onam-cursor-enabled", nextEnabled);
    };

    syncEnabled();
    mediaQuery.addEventListener("change", syncEnabled);

    return () => {
      document.body.classList.remove("onam-cursor-enabled");
      mediaQuery.removeEventListener("change", syncEnabled);
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const burstId = `${Date.now()}-${Math.random()}`;
      const burst = {
        id: burstId,
        x: event.clientX,
        y: event.clientY,
      };

      setBursts((current) => [...current.slice(-4), burst]);

      const timeoutId = window.setTimeout(() => {
        setBursts((current) => current.filter((item) => item.id !== burstId));
      }, BURST_DURATION_MS);

      timeoutIdsRef.current.push(timeoutId);
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [enabled]);

  if (!enabled || bursts.length === 0) {
    return null;
  }

  return (
    <div className="onam-cursor-layer" aria-hidden="true">
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="onam-burst"
          style={{
            left: `${burst.x}px`,
            top: `${burst.y}px`,
          }}
        >
          <span className="onam-petal petal-top" />
          <span className="onam-petal petal-right" />
          <span className="onam-petal petal-bottom" />
          <span className="onam-petal petal-left" />
          <span className="onam-burst-core" />
        </div>
      ))}
    </div>
  );
}
