'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CONTACT_URL, NAV, NAV_UI, SITE } from '@/content/copy';
import LoopMark from './editorial/LoopMark';
import styles from './Nav.module.css';

/** Interface labels (make no claim). The pill's accessible name reads "Follow the research". */
const FOLLOW = NAV_UI.follow;
const FOLLOW_SR = ' the research';
const MENU = NAV_UI.menu;

const MOBILE_QUERY = '(max-width: 767px)';

/**
 * Fixed, transparent top bar. Its colour follows the page background
 * (`html[data-bg-tone]`, set by the director). Hides while scrolling down,
 * returns on scroll up or when anything inside it takes focus.
 * Mobile: wordmark, the Follow pill and a small menu button that opens the
 * links as a full-screen sheet.
 */
export default function Nav() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Scroll: hide on the way down, show on the way up; mark the section in view.
  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - lastY;
      setScrolled(y > 24);
      if (y < 80) setHidden(false);
      else if (Math.abs(dy) > 6) setHidden(dy > 0);
      if (Math.abs(dy) > 6 || y < 80) lastY = y;

      const mid = window.innerHeight * 0.5;
      let current: string | null = null;
      for (const item of NAV) {
        const el = document.getElementById(item.href.slice(1));
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) current = item.href;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const close = useCallback((restoreFocus: boolean) => {
    document.documentElement.style.removeProperty('overflow');
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Menu sheet: lock page scroll, focus the first link, close on Escape or on resize to desktop.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    html.style.overflow = 'hidden';
    listRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      if (!mq.matches) close(false);
    };
    mq.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
      html.style.removeProperty('overflow');
    };
  }, [open, close]);

  // While the full-screen sheet is open, the page behind it is out of reach for
  // assistive tech and pointer alike (matching what is on screen).
  useEffect(() => {
    if (!open) return;
    const behind = [document.getElementById('main'), document.querySelector('body > footer')].filter(
      (el): el is HTMLElement => !!el,
    );
    behind.forEach((el) => el.setAttribute('inert', ''));
    return () => behind.forEach((el) => el.removeAttribute('inert'));
  }, [open]);

  // Keep keyboard focus inside the bar + sheet while the sheet is open.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key !== 'Tab' || !navRef.current) return;
    const focusables = Array.from(navRef.current.querySelectorAll<HTMLElement>('a[href], button')).filter(
      (el) => el.offsetParent !== null,
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <header
      className={styles.header}
      data-hidden={hidden && !open ? '' : undefined}
      data-scrolled={scrolled ? '' : undefined}
      data-open={open ? '' : undefined}
    >
      <nav ref={navRef} className={styles.bar} aria-label="Primary" onKeyDown={onKeyDown}>
        <a className={styles.wordmark} href="#top" onClick={() => open && close(false)}>
          <LoopMark />
          {SITE.name}
        </a>

        <ul ref={listRef} id="primary-menu" className={styles.links} data-lenis-prevent={open ? '' : undefined}>
          {NAV.map((item, i) => (
            <li key={item.href} className={styles.item}>
              <a
                className={styles.link}
                href={item.href}
                aria-current={active === item.href ? 'location' : undefined}
                onClick={() => open && close(false)}
              >
                <span className={styles.linkIndex} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={styles.linkLabel}>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <a className={styles.follow} href={CONTACT_URL} onClick={() => open && close(false)}>
            {FOLLOW}
            <span className="sr-only">{FOLLOW_SR}</span>
            <span className={styles.followDot} aria-hidden="true" />
          </a>
          <button
            ref={buttonRef}
            type="button"
            className={styles.menuButton}
            aria-label={MENU}
            aria-expanded={open}
            aria-controls="primary-menu"
            onClick={() => (open ? close(false) : setOpen(true))}
          >
            <span className={styles.menuIcon} aria-hidden="true" />
          </button>
        </div>
      </nav>
    </header>
  );
}
