import { NAV, SITE } from '@/content/copy';
import LoopMark from './editorial/LoopMark';
import styles from './Footer.module.css';

/** Footer: wordmark, the links again, the required disclaimer (verbatim) and copyright. On charcoal. */
export default function Footer() {
  return (
    <footer className={styles.footer} data-tone="dark">
      <div className={`grid ${styles.inner}`}>
        <div className={styles.top}>
          <p className={styles.wordmark}>
            <LoopMark />
            {SITE.name}
          </p>
          <nav aria-label="Footer">
            <ul className={styles.links}>
              {NAV.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className={styles.disclaimer}>{SITE.disclaimer}</p>
        <p className={styles.copyright}>{SITE.copyright}</p>
      </div>
    </footer>
  );
}
