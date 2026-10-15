/**
 * Harmoniq — site copy.
 *
 * Every factual line carries a comment naming the brief §1 fact it relies on
 * (ORIGIN / RESEARCH / PRODUCT / MISSION). Lines without a source comment are
 * design description, interface labels or calls to action, and make no claim.
 *
 * Rules applied (brief §2): no outcomes, no clinical or regulatory status, no
 * unstated specs, no named delivery hardware, no light stimulation, no logos,
 * no statistics; "music-based sessions", "support", "explore".
 */

/** Placeholder until the real link is provided (brief §11). */
export const CONTACT_URL = '#follow';

export const SITE = {
  name: 'Harmoniq',
  title: 'Harmoniq: memory keeps time',
  // PRODUCT: EEG headband + companion app, music with personalized 40 Hz auditory stimulation, closed loop.
  description:
    'A research-stage concept: an EEG-guided headband and companion app that blend music with personalized 40 Hz sound in a closed loop.',
  // §2 REQUIRED FOOTER DISCLAIMER (verbatim).
  disclaimer:
    'Harmoniq is a research-stage concept. It is not a medical device, has not been evaluated by the FDA, and is not intended to diagnose, treat, cure, or prevent any disease. Product imagery shows a design render.',
  copyright: '© 2026 Harmoniq',
} as const;

export const NAV = [
  { href: '#design', label: 'Design' },
  { href: '#loop', label: 'How it works' },
  { href: '#app', label: 'App' },
  { href: '#research', label: 'Research' },
] as const;

/** Interface labels for the navigation (no claims). */
export const NAV_UI = {
  follow: 'Follow',
  menu: 'Menu',
} as const;

export const HERO = {
  eyebrow: 'Harmoniq',
  headline: 'Memory keeps time.',
  // PRODUCT: noninvasive EEG headband; personalized 40 Hz auditory stimulation. ("listens" = reads EEG, RESEARCH.)
  subline: 'An EEG-guided headband that listens to the brain, and answers with personalized 40 Hz sound.',
  status: 'Research-stage concept',
  scroll: 'Scroll',
} as const;

export const REVEAL = {
  // Design statement; "instrument" in both senses (music: ORIGIN piano; sensing: PRODUCT EEG).
  headline: 'A quiet instrument for the mind.',
  // PRODUCT: headband + companion app blend music with personalized 40 Hz auditory stimulation in a closed loop.
  body: 'A noninvasive headband and a companion app that blend music with personalized 40 Hz sound, in a closed loop.',
} as const;

export const DESIGN = {
  eyebrow: 'Design',
  beats: [
    {
      id: 'halo',
      index: '01',
      label: 'Halo',
      headline: 'One continuous sweep of satin titanium, shaped to the brow.',
      body: 'From brow to ear the titanium never breaks. A single light line marks the band.',
    },
    {
      id: 'crown',
      index: '02',
      label: 'Crown',
      headline: 'Soft where it rests.',
      body: 'A knit cushion rolls over the top edge and meets the forehead first.',
    },
    {
      id: 'contacts',
      index: '03',
      label: 'Contacts',
      // PRODUCT: noninvasive EEG headband (dry contacts per the design brief).
      headline: 'Dry contacts listen across the forehead. No gel.',
      body: 'Champagne contacts sit in soft foam, low on the inner band, where the halo meets the skin.',
    },
    {
      id: 'fit',
      index: '04',
      label: 'Fit',
      headline: 'Rests at the temples. Settles behind the ear.',
      body: 'Drawn around a head first, then shaped to it: a halo across the brow and slim arms that tuck behind the ear.',
    },
    {
      id: 'layers',
      index: '05',
      label: 'Layers',
      headline: 'Every layer, considered.',
      body: 'Textile, titanium, foam and glass, each meeting the next on a clean line.',
    },
  ],
  /** Exploded-view part labels (design description only). */
  parts: [
    { anchor: 'crownTop', label: 'Knit crown' },
    { anchor: 'titaniumSide', label: 'Titanium halo' },
    { anchor: 'lightLine', label: 'Light line' },
    { anchor: 'contactCentre', label: 'Dry contacts' },
    { anchor: 'moduleL', label: 'Smoked-glass module' },
    { anchor: 'armL', label: 'Titanium arm' },
    { anchor: 'earRestL', label: 'Graphite ear rest' },
  ],
} as const;

export const LOOP = {
  eyebrow: 'How it works',
  headline: 'One closed loop.',
  // RESEARCH: stimulus adapts instead of fixed audio on a fixed schedule. Framed as research-stage design.
  intro: 'A research-stage design that listens, forecasts and adapts, so the sound follows the person.',
  nodes: [
    {
      id: 'sense',
      index: '01',
      title: 'Sense',
      // PRODUCT: EEG headband; RESEARCH: continuous EEG history.
      body: "Dry contacts read the brain's electrical rhythm, continuously.",
    },
    {
      id: 'interpret',
      index: '02',
      title: 'Interpret',
      // RESEARCH: causal TCN reads continuous EEG history, forecasts PAC, predicts when the brain may stop responding.
      body: 'A causal model reads what has already happened to forecast what comes next, including when the brain may stop responding.',
    },
    {
      id: 'personalize',
      index: '03',
      title: 'Personalize',
      // RESEARCH: the stimulus adapts instead of playing fixed audio on a fixed schedule.
      body: 'The stimulus adapts to the person, not to a fixed schedule.',
    },
    {
      id: 'deliver',
      index: '04',
      title: 'Deliver',
      // PRODUCT: blends music with personalized 40 Hz auditory stimulation.
      body: '40 Hz sound, woven into music.',
    },
    {
      id: 'adapt',
      index: '05',
      title: 'Adapt',
      // RESEARCH: 40 Hz audio adapts in real time to sustain entrainment; PRODUCT: closed loop.
      body: 'Every response informs the next. The loop closes.',
    },
  ],
  visuals: {
    eeg: 'EEG',
    now: 'now',
    forecast: 'forecast',
    settings: ['Timing', 'Depth', 'Blend'],
    tone: '40 Hz',
  },
  demo: {
    button: 'Hear 40 Hz',
    playing: 'Playing',
    stopped: 'Stopped',
    label: 'Demonstration',
    note: 'Five seconds of a soft chord with a 40 Hz pulse, at low volume.',
  },
} as const;

export const APP = {
  eyebrow: 'Interface concept',
  captions: { today: 'Today', session: 'In session', week: 'This week' },
  headline: 'Calm on the surface. Personal underneath.',
  // PRODUCT: app concept — playlists shaped by mood and cognitive load, session tracking, caregiver dashboard.
  subline: 'Sessions shaped by mood and cognitive load, and a caregiver view that keeps family close.',
  today: {
    greeting: 'Good evening',
    title: 'Tonight',
    // PRODUCT: music-based sessions with 40 Hz.
    session: 'Music + 40 Hz',
    detail: 'Shaped by how today felt',
    tags: ['Calm', 'Familiar'],
    begin: 'Begin',
    upNext: 'Up next',
    playlist: ['Embraceable You', 'Evening piano', 'Familiar standards'],
  },
  session: {
    state: 'Listening',
    contacts: 'Contact quality',
    // ORIGIN-adjacent: the piece the founder imagines playing (brief §5, optional).
    nowPlaying: 'Embraceable You',
    artist: 'George Gershwin · solo piano',
    tone: '40 Hz woven in',
    end: 'End session',
  },
  week: {
    title: 'This week',
    consistency: 'Sessions',
    days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    moodTitle: 'How it felt',
    moods: ['Settled', 'Bright', 'Tired', 'Settled'],
    // PRODUCT: caregiver dashboard.
    family: 'Shared with family',
    familyDetail: 'Two people can see this week',
  },
} as const;

export const RESEARCH = {
  eyebrow: 'From research to product',
  recognitionLabel: 'Recognition',
  headline: 'It started with one person.',
  chapters: [
    {
      index: '01',
      title: 'The question',
      // ORIGIN: age nine, grandfather's memory faded, forgot my name, looked at me like a stranger.
      body: 'I was nine when my grandfather’s memory began to fade. He forgot my name and looked at me like a stranger.',
      // ORIGIN: 8+ years of classical and jazz piano.
      aside: 'Eight years of classical and jazz piano run through everything that followed.',
    },
    {
      index: '02',
      title: 'The research',
      // RESEARCH: extended MIT's 2016 40 Hz gamma (GENUS) work; personalized 40 Hz auditory stimulation; causal TCN forecasting PAC.
      body: 'Closed-loop EEG with personalized 40 Hz auditory stimulation, building on MIT’s 2016 gamma-stimulation research. A causal temporal-convolutional network reads continuous EEG and forecasts phase–amplitude coupling, so the sound can adapt in real time.',
      recognition: [
        // RESEARCH: recognition.
        '1st Place, Computational Biology & Bioinformatics, Synopsys Championship',
        'Advanced to the California Science & Engineering Fair 2026',
        'Lightning talk, IEEE MIT URTC 2026',
      ],
    },
    {
      index: '03',
      title: 'The prototype',
      // PRODUCT: weeks optimizing real-time latency; piloted with 18 seniors in assisted-living facilities.
      body: 'Weeks spent optimizing real-time latency. Then a pilot with 18 seniors in assisted-living facilities.',
    },
    {
      index: '04',
      title: 'The company',
      // PRODUCT: Harmoniq turns the research into a product.
      body: 'Harmoniq turns that research into a product: a headband and an app, designed together.',
      recognition: [
        // PRODUCT: company recognition.
        'Diamond Challenge Finalist, Business Innovation (top 35 globally)',
        'Blue Ocean Entrepreneurship Competition, top 2%',
      ],
    },
  ],
} as const;

export const FOUNDER = {
  heading: 'From the founder',
  // ORIGIN: founder's words (verbatim).
  quote: 'When my grandfather’s memory began to fade, he lost his words, but he could still feel music.',
  // ORIGIN: founder's words (verbatim).
  second: 'Watching my grandfather’s memory fade was my first encounter with losing a mind before losing a person.',
  name: 'Amaar',
  role: 'Founder',
} as const;

export const CLOSE = {
  headline: 'For every name worth remembering.',
  // MISSION (worded as "care", per brief): proactive care as routine as a blood-pressure check — an aspiration.
  subline: 'Harmoniq is building toward proactive cognitive care that’s as routine as a blood-pressure check.',
  // MISSION (thesis), framed as an aim rather than a current capability.
  mission: 'The aim: use AI, sound and personalization to support and study the mind.',
  cta: 'Follow the research',
} as const;
