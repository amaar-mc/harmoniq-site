import styles from './LoopMark.module.css';

/**
 * The loop: a small stadium with the champagne contact inside (as the favicon).
 * Decorative; sits beside the "Harmoniq" wordmark in the nav and footer.
 */
export default function LoopMark({ className = '' }: { className?: string }) {
  return (
    <span className={`${styles.mark} ${className}`} aria-hidden="true">
      <span className={styles.contact} />
    </span>
  );
}
