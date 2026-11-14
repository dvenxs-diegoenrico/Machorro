import styles from "./graphics.module.css";

/** A record on the platter: spins slowly, label carries the catalogue number. Decorative. */
export function Vinyl({ label, className = "" }: { label: string; className?: string }) {
  const ring = `${label} · ${label} · `;
  return (
    <svg className={`${styles.vinyl} ${className}`} viewBox="0 0 200 200" aria-hidden="true">
      <g>
        <circle cx="100" cy="100" r="99" className={styles.vinylDisc} />
        {[90, 82, 74, 66, 58, 50].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} className={styles.vinylGroove} />
        ))}
        {/* the sheen: two short arcs, so you can see it turn */}
        <path d="M100 32 A68 68 0 0 1 151 55" className={styles.vinylSheen} />
        <path d="M100 168 A68 68 0 0 1 49 145" className={styles.vinylSheen} />
        <circle cx="100" cy="100" r="36" className={styles.vinylLabel} />
        <defs>
          <path id="vinyl-ring" d="M100,100 m-26,0 a26,26 0 1,1 52,0 a26,26 0 1,1 -52,0" />
        </defs>
        <text className={styles.vinylText}>
          <textPath href="#vinyl-ring" textLength="160" lengthAdjust="spacing">
            {ring}
          </textPath>
        </text>
        <circle cx="100" cy="100" r="4" className={styles.vinylHole} />
      </g>
    </svg>
  );
}
