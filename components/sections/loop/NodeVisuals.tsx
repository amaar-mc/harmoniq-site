'use client';

import { useId, type CSSProperties } from 'react';
import { LOOP } from '@/content/copy';
import s from '../Loop.module.css';
import {
  CONTACTS,
  CONTACT_ARC_D,
  EEG,
  EEG_FORECAST_D,
  EEG_HISTORY_D,
  EEG_NOW_Y,
  SLIDERS,
  WAVE,
  WAVE_D,
} from './geometry';

/**
 * One small instrument readout per station. All decorative (`aria-hidden`):
 * the panel's title and body say what each one shows. Default (CSS) state is
 * the finished readout, which is what reduced motion shows; the scroll
 * timeline starts each one from empty.
 */

const V = LOOP.visuals;

/** useId() output is not a valid bare fragment id in every renderer. */
function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/** 01 Sense: five contacts warm one after another. */
export function SenseVisual() {
  return (
    <div className={`${s.figure} ${s.sense}`} aria-hidden="true">
      <svg className={s.senseArc} viewBox="0 0 400 100" preserveAspectRatio="none" focusable="false">
        <path d={CONTACT_ARC_D} vectorEffect="non-scaling-stroke" />
      </svg>
      {CONTACTS.map((c, i) => (
        <span
          key={i}
          className={s.contact}
          style={{ left: `${c.left}%`, top: `${c.top}px`, width: c.w, height: c.h, rotate: `${c.rotate}deg` }}
        >
          <span className={s.contactWarm} data-l="warm" />
        </span>
      ))}
    </div>
  );
}

/** 02 Interpret: EEG history up to "now", a dashed forecast beyond it. */
export function InterpretVisual() {
  const clip = useSvgId('eeg-clip');
  const nowPct = (EEG.now / EEG.w) * 100;
  return (
    <div className={`${s.figure} ${s.eeg}`} aria-hidden="true">
      <div className={s.eegTags}>
        <span className={s.tag} data-l="eegTag">
          {V.eeg}
        </span>
        <span className={`${s.tag} ${s.tagNow}`} style={{ left: `${nowPct}%` }} data-l="eegTagNow">
          {V.now}
        </span>
        <span className={`${s.tag} ${s.tagForecast}`} data-l="eegTagForecast">
          {V.forecast}
        </span>
      </div>
      <svg className={s.eegSvg} viewBox={`0 0 ${EEG.w} ${EEG.h}`} focusable="false">
        <defs>
          <clipPath id={clip}>
            <rect x={EEG.now} y="-10" width={EEG.w - EEG.now + 4} height={EEG.h + 20} data-l="eegClip" />
          </clipPath>
        </defs>
        <line className={s.eegBase} x1="0" x2={EEG.w} y1={EEG.mid} y2={EEG.mid} />
        <path className={s.eegHist} d={EEG_HISTORY_D} data-l="eegHist" />
        <g clipPath={`url(#${clip})`}>
          <path className={s.eegFore} d={EEG_FORECAST_D} />
        </g>
        <g data-l="eegNow">
          <line className={s.eegNowLine} x1={EEG.now} x2={EEG.now} y1="16" y2={EEG.h - 8} />
          <circle className={s.eegNowDot} cx={EEG.now} cy={EEG_NOW_Y} r="2.6" />
        </g>
      </svg>
    </div>
  );
}

/** 03 Personalize: three settings glide to new values. */
export function PersonalizeVisual() {
  return (
    <div className={`${s.figure} ${s.sliders}`} aria-hidden="true">
      {V.settings.map((label, k) => (
        <div key={label} className={s.slider} style={{ '--v': SLIDERS[k].to } as CSSProperties} data-l="slider">
          <span className={s.sliderLabel}>{label}</span>
          <span className={s.track}>
            <span className={s.ticks} />
            <span className={s.trackFill} />
            <span className={s.knob} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** 04 Deliver: a steady 40 Hz waveform, drawn as a line, with slow stadium ripples. Never a flashing light. */
export function DeliverVisual() {
  const mask = useSvgId('wave-mask');
  const fade = useSvgId('wave-fade');
  return (
    <div className={`${s.figure} ${s.deliver}`} aria-hidden="true" data-l="deliverFig">
      <span className={s.tag}>{V.tone}</span>
      <div className={s.capsule}>
        <span className={s.ripple} />
        <span className={s.ripple} />
        <span className={s.ripple} />
        <svg className={s.waveSvg} viewBox={`0 0 ${WAVE.w} ${WAVE.h}`} preserveAspectRatio="none" focusable="false">
          <defs>
            <linearGradient id={fade} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.16" stopColor="#fff" stopOpacity="1" />
              <stop offset="0.84" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width={WAVE.w} height={WAVE.h}>
              <rect width={WAVE.w} height={WAVE.h} fill={`url(#${fade})`} />
            </mask>
          </defs>
          <g mask={`url(#${mask})`}>
            <path className={s.wave} d={WAVE_D} vectorEffect="non-scaling-stroke" data-l="wave" />
          </g>
        </svg>
      </div>
    </div>
  );
}

/** 05 Adapt: the five stations in a row; the return path closes the loop. */
export function AdaptVisual() {
  const xs = [5, 27.5, 50, 72.5, 95];
  return (
    <div className={`${s.figure} ${s.adapt}`} aria-hidden="true">
      <svg className={s.adaptSvg} viewBox="0 0 400 92" focusable="false">
        <line className={s.adaptRow} x1="20" x2="380" y1="22" y2="22" />
        <path className={s.adaptRet} d="M380 22 V52 A24 24 0 0 1 356 76 H44 A24 24 0 0 1 20 52 V22" data-l="ret" />
      </svg>
      {LOOP.nodes.map((n, i) => (
        <span key={n.id} className={s.chip} style={{ left: `${xs[i]}%` }}>
          <span className={s.chipText}>{n.index}</span>
          {i === 0 && (
            <span className={s.chipHome} data-l="chipHome">
              <span className={s.chipText}>{n.index}</span>
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

export const VISUALS = [SenseVisual, InterpretVisual, PersonalizeVisual, DeliverVisual, AdaptVisual] as const;
