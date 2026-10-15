import type { ReactNode } from 'react';
import { APP } from '@/content/copy';
import SessionWave from './SessionWave';
import styles from './Phone.module.css';

/**
 * Three interface-concept screens on a generic device: a thin titanium band,
 * deep black glass, generous radius. No platform chrome (no status bar, no
 * camera cut-out, no system glyphs): every mark on screen is Harmoniq's own.
 * The data shown is illustrative UI, never statistics.
 */

/** Captions under each device (UI labels, no claims). */
const CAPTIONS = APP.captions;

/** Session on that day (1) or not (0): consistency only, no magnitudes. */
const WEEK_FILLS = [1, 1, 1, 0, 1, 1, 1];
/** The five contact pills echo the hardware's five contacts (centre largest). */
const CONTACT_WIDTHS = [0.7, 0.85, 1, 0.85, 0.7];

const t = APP.today;
const s = APP.session;
const w = APP.week;

const LABELS = {
  today: `Interface concept, ${CAPTIONS.today} screen: “${t.greeting}”, ${t.title.toLowerCase()}’s session card, ${t.session}, ${t.detail.toLowerCase()}, tagged ${t.tags.join(' and ')}, with a ${t.begin} button. ${t.upNext}: ${t.playlist.join(', ')}.`,
  session: `Interface concept, ${CAPTIONS.session} screen: ${s.state}. Five ${s.contacts.toLowerCase()} indicators and a calm, breathing waveform. Now playing ${s.nowPlaying}, ${s.artist.replace(' · ', ', ')}. ${s.tone}. An ${s.end} button.`,
  week: `Interface concept, ${CAPTIONS.week} screen: ${w.consistency.toLowerCase()} shown as seven day bars, ${w.moodTitle.toLowerCase()} in words: ${w.moods.join(', ')}. A card reads ${w.family}: ${w.familyDetail.toLowerCase()}.`,
};

function Device({ label, children, dim }: { label: string; children: ReactNode; dim?: boolean }) {
  return (
    <div className={styles.device} role="img" aria-label={label}>
      <span className={styles.shadowDark} aria-hidden="true" />
      <span className={styles.shadowLight} aria-hidden="true" />
      <span className={styles.key} aria-hidden="true" />
      <div className={styles.glass} aria-hidden="true">
        <div className={styles.screen}>
          {children}
          {dim ? <span className={styles.dim} /> : null}
        </div>
        <span className={styles.glare} />
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className={styles.bar}>
      <span className={styles.brandMark} />
      <span className={styles.brand}>Harmoniq</span>
    </div>
  );
}

function TodayScreen() {
  return (
    <div className={`${styles.ui} ${styles.light}`}>
      <Brand />
      <div className={styles.flow}>
        <div>
          <p className={styles.greet}>{t.greeting}</p>
          <p className={styles.h}>{t.title}</p>
        </div>
        <div className={styles.card}>
          <div className={styles.art}>
            <span className={styles.artRing} />
            <span className={styles.artLine} />
          </div>
          <p className={styles.cardTitle}>{t.session}</p>
          <p className={styles.cardDetail}>{t.detail}</p>
          <div className={styles.chips}>
            {t.tags.map((tag, i) => (
              <span key={tag} className={styles.chip}>
                {i === 0 ? <span className={styles.chipDot} /> : null}
                {tag}
              </span>
            ))}
          </div>
          <span className={styles.begin}>
            {t.begin}
            <span className={styles.beginDot} />
          </span>
        </div>
        <div>
          <p className={styles.label}>{t.upNext}</p>
          <ul className={styles.list}>
            {t.playlist.map((item, i) => (
              <li key={item} className={styles.row}>
                <span className={styles.thumb} data-i={i} />
                <span className={styles.rowTitle}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SessionScreen() {
  return (
    <div className={`${styles.ui} ${styles.dark}`} data-session="">
      <div className={styles.live}>
        <span className={styles.liveDot} data-breath="" />
        <span className={styles.liveText}>{s.state}</span>
      </div>
      <div className={styles.contacts}>
        <div className={styles.dots}>
          {CONTACT_WIDTHS.map((cw, i) => (
            <span key={i} className={styles.dot} style={{ ['--cw' as string]: cw }} data-app="contact" />
          ))}
        </div>
        <p className={styles.subLabel}>{s.contacts}</p>
      </div>
      <div className={styles.waveStage}>
        <span className={styles.halo} />
        <span className={`${styles.halo} ${styles.haloInner}`} />
        <SessionWave />
      </div>
      <div className={styles.now}>
        <p className={styles.track}>{s.nowPlaying}</p>
        <p className={styles.artist}>{s.artist}</p>
        <span className={styles.progress}>
          <span className={styles.progressFill} />
        </span>
      </div>
      <div className={styles.sessionFoot}>
        <span className={styles.tone}>
          <span className={styles.toneDot} />
          {s.tone}
        </span>
        <span className={styles.end}>{s.end}</span>
      </div>
    </div>
  );
}

function WeekScreen() {
  return (
    <div className={`${styles.ui} ${styles.light}`}>
      <Brand />
      <div className={styles.flow}>
        <p className={styles.h}>{w.title}</p>
        <div>
          <p className={styles.label}>{w.consistency}</p>
          <div className={styles.bars}>
            {w.days.map((day, i) => (
              <div key={i} className={styles.day}>
                <span className={styles.barTrack}>
                  {WEEK_FILLS[i] > 0 ? (
                    <span
                      className={`${styles.barFill} ${i === w.days.length - 1 ? styles.barFillNow : ''}`}
                      style={{ ['--h' as string]: WEEK_FILLS[i] }}
                    />
                  ) : null}
                </span>
                <span className={styles.dayLabel}>{day}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className={styles.label}>{w.moodTitle}</p>
          <div className={styles.moods}>
            {w.moods.map((mood, i) => (
              <span key={i} className={styles.mood}>
                {mood}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.family}>
          <span className={styles.familyTop}>
            <span className={styles.avatars}>
              <span />
              <span />
            </span>
            <span className={styles.toggle} />
          </span>
          <span className={styles.familyTitle}>{w.family}</span>
          <span className={styles.familyDetail}>{w.familyDetail}</span>
        </div>
      </div>
    </div>
  );
}

/** The trio. Parallax and arrival are driven by AppSection's scene timeline (data-app hooks). */
export default function Phones() {
  return (
    <div className={styles.stage} data-app="stage">
      <figure className={`${styles.figure} ${styles.left}`} data-app="phone-left">
        <Device label={LABELS.today} dim>
          <TodayScreen />
        </Device>
        <figcaption className={styles.caption}>
          <span className={styles.captionIndex}>01</span>
          {CAPTIONS.today}
        </figcaption>
      </figure>
      <figure className={`${styles.figure} ${styles.mid}`} data-app="phone-mid">
        <Device label={LABELS.session}>
          <SessionScreen />
        </Device>
        <figcaption className={styles.caption}>
          <span className={styles.captionIndex}>02</span>
          {CAPTIONS.session}
        </figcaption>
      </figure>
      <figure className={`${styles.figure} ${styles.right}`} data-app="phone-right">
        <Device label={LABELS.week} dim>
          <WeekScreen />
        </Device>
        <figcaption className={styles.caption}>
          <span className={styles.captionIndex}>03</span>
          {CAPTIONS.week}
        </figcaption>
      </figure>
    </div>
  );
}
