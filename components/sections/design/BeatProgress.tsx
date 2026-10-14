import s from './BeatProgress.module.css';

/**
 * Five stadium ticks, one per placard. Decorative (the placards carry their
 * own index numbers), so hidden from assistive tech. The scroll-linked fill
 * and the active tick's growth are driven from the design story's timeline.
 */
export default function BeatProgress({ count }: { count: number }) {
  return (
    <div className={s.rail} data-design-rail aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={s.tick} data-tick>
          <span className={s.fill} data-tick-fill />
        </span>
      ))}
    </div>
  );
}
