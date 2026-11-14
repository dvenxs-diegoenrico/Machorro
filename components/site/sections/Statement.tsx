import { Words } from "@/components/motion/Words";
import { Liquid } from "@/components/motion/graphics/Liquid";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Statement.module.css";

/** The olive band. One sentence, word by word. */
export function Statement({ t }: { t: Dictionary }) {
  return (
    <section className={styles.band} data-theme="night">
      <Liquid tone="night" layout="a" />
      <div className="wrap">
        <p className={styles.words} data-reveal="mask">
          <Words text={t.statement.words} />
        </p>
      </div>
    </section>
  );
}
