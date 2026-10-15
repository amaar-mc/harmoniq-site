import s from './PartsList.module.css';

export interface Part {
  readonly anchor: string;
  readonly label: string;
}

/**
 * The exploded view's parts as an ordered list. Visible on mobile (where it
 * replaces the projected labels); on desktop it stays in the accessibility
 * tree only, since the projected labels are decorative.
 */
export default function PartsList({ parts, labelledBy }: { parts: readonly Part[]; labelledBy: string }) {
  return (
    <div className={s.wrap} data-parts-list>
      <ol className={s.list} aria-labelledby={labelledBy}>
        {parts.map((p, i) => (
          <li key={p.anchor} className={s.row} data-part-row>
            <span className={s.rule} data-part-rule aria-hidden="true" />
            <span className={s.inner} data-part-inner>
              <span className={`t-index ${s.index}`} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={s.name}>{p.label}</span>
            </span>
          </li>
        ))}
      </ol>
      <span className={s.endRule} data-part-rule aria-hidden="true" />
    </div>
  );
}
