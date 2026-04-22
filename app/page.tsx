"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

const screen = (n: string) => `/screens/IMG_${n}.PNG`;

function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src="/harmoniq-logo.png" alt="Harmoniq" className="w-9 h-9 rounded-[10px] shadow-sm" />
      <span className="font-display text-[26px] leading-none text-[color:var(--navy)]">Harmoniq</span>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[color:var(--bg)]/75 border-b border-[color:var(--border)]/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[color:var(--navy)]/80">
          <a href="#features" className="hover:text-[color:var(--navy)]">Features</a>
          <a href="#compare" className="hover:text-[color:var(--navy)]">Why Harmoniq</a>
          <a href="#pricing" className="hover:text-[color:var(--navy)]">Pricing</a>
        </nav>
        <a href="#cta" className="btn-primary text-sm !py-2.5 !px-5">Get early access</a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero-gradient relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
        <div className="fade-up">
          <span className="chip mb-6">
            <span className="w-2 h-2 rounded-full bg-[color:var(--sage-deep)]" />
            Tuning in to care
          </span>
          <h1 className="font-display text-[clamp(48px,7vw,88px)] leading-[0.95] text-[color:var(--navy-deep)] tracking-tight">
            The music<br />
            <span className="italic text-[color:var(--sage-deep)]">remembers.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[color:var(--navy)]/75 max-w-xl leading-relaxed">
            Personalized AI music therapy and cognitive games for people living with dementia and Alzheimer&rsquo;s — built around the songs that shaped a lifetime.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#cta" className="btn-primary">
              Join the pilot
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10h12m0 0l-5-5m5 5l-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            <a href="#features" className="btn-ghost">See how it works</a>
          </div>
          <div className="mt-10 flex items-center gap-8 text-sm text-[color:var(--muted)]">
            <div>
              <div className="text-2xl font-display text-[color:var(--navy-deep)]">57M</div>
              <div>living with dementia</div>
            </div>
            <div className="w-px h-10 bg-[color:var(--border)]" />
            <div>
              <div className="text-2xl font-display text-[color:var(--navy-deep)]">75%</div>
              <div>caregivers use music daily</div>
            </div>
            <div className="w-px h-10 bg-[color:var(--border)] hidden sm:block" />
            <div className="hidden sm:block">
              <div className="text-2xl font-display text-[color:var(--navy-deep)]">23%</div>
              <div>more affordable</div>
            </div>
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(168,197,181,0.35),transparent_60%)] blur-2xl" aria-hidden />
          <div className="relative flex gap-6 items-end">
            <div className="phone-frame w-[220px] float-slower hidden sm:block">
              <img src={screen("4849")} alt="Harmoniq music therapy screen" />
            </div>
            <div className="phone-frame w-[260px] float-slow">
              <img src={screen("4850")} alt="Harmoniq memory games screen" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="py-24 md:py-32 bg-[color:var(--navy-deep)] text-white relative overflow-hidden">
      <div className="absolute inset-0 dark-gradient opacity-80" aria-hidden />
      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <span className="section-label !text-[color:var(--sage)]">The problem</span>
        <h2 className="mt-4 font-display text-[clamp(40px,6vw,72px)] leading-[1.02] tracking-tight">
          <span className="text-[color:var(--sage)]">57 million</span> people are losing their memories.
        </h2>
        <p className="mt-8 text-lg md:text-xl text-white/75 max-w-3xl mx-auto leading-relaxed">
          Traditional music therapy costs <b className="text-white">$300+ per session</b>, and reaches fewer than 2% of dementia patients. Families turn to generic playlists that don&rsquo;t adapt, don&rsquo;t track progress, and don&rsquo;t understand the person behind the diagnosis.
        </p>
        <p className="mt-6 text-lg md:text-xl text-white/90 italic font-display">
          &ldquo;I saw my daughter&rsquo;s face, felt warmth in my heart, but could not remember her name.&rdquo;
        </p>
      </div>
    </section>
  );
}

function FeatureRow({
  tag,
  title,
  body,
  bullets,
  img,
  imgClass = "",
  reverse = false,
  wide = false,
}: {
  tag: string;
  title: string;
  body: string;
  bullets: string[];
  img: string;
  imgClass?: string;
  reverse?: boolean;
  wide?: boolean;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
      <div className={reverse ? "lg:order-2" : ""}>
        <span className="section-label">{tag}</span>
        <h3 className="mt-3 font-display text-[clamp(32px,4.5vw,56px)] leading-[1.02] text-[color:var(--navy-deep)] tracking-tight">
          {title}
        </h3>
        <p className="mt-5 text-lg text-[color:var(--navy)]/75 leading-relaxed">{body}</p>
        <ul className="mt-7 space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-[color:var(--navy)]">
              <span className="mt-1.5 w-4 h-4 rounded-full bg-[color:var(--sage)] grid place-items-center shrink-0">
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-[color:var(--navy-deep)]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-6"/></svg>
              </span>
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={`flex justify-center ${reverse ? "lg:order-1" : ""}`}>
        {wide ? (
          <div className="w-full max-w-[640px] rounded-2xl overflow-hidden border border-[color:var(--border)] shadow-[0_30px_60px_-20px_rgba(11,30,74,0.25)] bg-white">
            <img src={img} alt="" className={`w-full h-auto block ${imgClass}`} />
          </div>
        ) : (
          <div className="phone-frame w-[280px]">
            <img src={img} alt="" />
          </div>
        )}
      </div>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="py-28 md:py-36 bg-[color:var(--bg)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl">
          <span className="section-label">The product</span>
          <h2 className="mt-3 font-display text-[clamp(40px,5.5vw,72px)] leading-[1.02] text-[color:var(--navy-deep)] tracking-tight">
            Every song is a <span className="italic text-[color:var(--sage-deep)]">memory</span>. Every pattern, a lifeline.
          </h2>
        </div>

        <div className="mt-24 space-y-32">
          <FeatureRow
            tag="01 · Onboarding"
            title="A profile built around who they are."
            body="A caregiver-led setup with on-device voice guidance captures neurological condition, musical era, and genre — the foundation for truly personalized therapy."
            bullets={[
              "Conditions: Alzheimer's and Dementia",
              "Musical preferences by decade and genre",
              "Hands-free voice guidance designed for seniors",
              "One setup, a lifetime of personalization",
            ]}
            img={screen("4849")}
          />

          <FeatureRow
            tag="02 · AI Music Therapy"
            title="Playlists that adapt to mood in real time."
            body="Harmoniq&rsquo;s recommendation engine matches therapeutic benefits to each user&rsquo;s emotional state — reconnecting patients with their most meaningful moments through music they already love."
            bullets={[
              "Adapts to mood and memory",
              "Triggers memory recall and stabilizes mood",
              "&ldquo;Why this song?&rdquo; explains every pick",
              "Streams directly through Spotify",
            ]}
            img={screen("4840")}
            reverse
          />

          <FeatureRow
            tag="03 · Cognitive Games"
            title="Brain workouts, woven into the music."
            body="Memory Match, Lyric Recall Karaoke, Pattern Recognition, and Number Sequence — games designed with accessibility-first UI and difficulty that scales with the user, not against them."
            bullets={[
              "Memory Match — musical icon pairs",
              "Lyric Recall — fill-in-the-blank karaoke",
              "Pattern Recognition — visual sequences",
              "Every session logged for progression tracking",
            ]}
            img={screen("4846")}
          />

          <FeatureRow
            tag="04 · Caregiver Dashboard"
            title="Peace of mind for families and caregivers."
            body="Real-time insights into cognitive health, mood patterns, and daily engagement. Catch early signs of decline. Celebrate progress. Stay connected even when you can&rsquo;t be there."
            bullets={[
              "Cognitive score, engagement, and mood stability",
              "Emotional state trends over time",
              "Per-game performance breakdown",
              "Remote monitoring for family and clinicians",
            ]}
            img="/dashboard.png"
            reverse
            wide
          />
        </div>
      </div>
    </section>
  );
}

function Screens() {
  const list = ["4844", "4842", "4847", "4848", "4841", "4839"];
  return (
    <section className="py-24 md:py-28 bg-[color:var(--bg-alt)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl">
          <span className="section-label">A closer look</span>
          <h2 className="mt-3 font-display text-[clamp(32px,4.5vw,52px)] leading-[1.02] text-[color:var(--navy-deep)] tracking-tight">Every screen, designed for calm focus.</h2>
        </div>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {list.map((n) => (
            <div key={n} className="phone-frame !p-[6px] !rounded-[28px]">
              <img src={screen(n)} alt="" className="!rounded-[22px]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Compare() {
  const rows = [
    { f: "Adaptive Music Therapy", t: true, s: false, m: false, h: true },
    { f: "Caregiver / Admin Dashboard", t: false, s: true, m: false, h: true },
    { f: "Accessible to families", t: false, s: false, m: true, h: true },
    { f: "Older-adult friendly UI", t: true, s: true, m: true, h: true },
  ];
  const cell = (v: boolean, accent = false) =>
    v ? (
      <div className={`w-7 h-7 rounded-full grid place-items-center mx-auto ${accent ? "bg-[color:var(--sage)]" : "bg-[color:var(--sage-soft)]"}`}>
        <svg viewBox="0 0 14 14" className="w-4 h-4 text-[color:var(--navy-deep)]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5L6 10.5 11 4.5"/></svg>
      </div>
    ) : (
      <div className="w-7 h-7 rounded-full bg-[color:var(--bg-alt)] grid place-items-center mx-auto">
        <svg viewBox="0 0 14 14" className="w-3 h-3 text-[color:var(--coral)]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg>
      </div>
    );
  return (
    <section id="compare" className="py-28 md:py-36 bg-[color:var(--bg-alt)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="section-label">Competitive edge</span>
          <h2 className="mt-3 font-display text-[clamp(36px,5vw,60px)] leading-[1.02] text-[color:var(--navy-deep)] tracking-tight">The only one built end-to-end.</h2>
        </div>
        <div className="mt-14 card-soft p-6 md:p-10 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th className="text-left pb-5 w-[36%]" />
                <th className="pb-5 text-center font-semibold text-[color:var(--navy)] text-[15px]">Music Therapist</th>
                <th className="pb-5 text-center font-semibold text-[color:var(--navy)] text-[15px]">SingFit</th>
                <th className="pb-5 text-center font-semibold text-[color:var(--navy)] text-[15px]">Music &amp; Memory</th>
                <th className="pb-5 text-center font-display text-xl text-[color:var(--navy-deep)]">Harmoniq</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.f} className="border-t border-[color:var(--border)]">
                  <td className="py-5 text-[color:var(--navy)] font-medium">{r.f}</td>
                  <td className="py-5 align-middle">{cell(r.t)}</td>
                  <td className="py-5 align-middle">{cell(r.s)}</td>
                  <td className="py-5 align-middle">{cell(r.m)}</td>
                  <td className="py-5 align-middle bg-[color:var(--cream-soft)]">{cell(r.h, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-28 md:py-36">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl">
          <span className="section-label">In their words</span>
          <h2 className="mt-3 font-display text-[clamp(36px,5vw,60px)] leading-[1.02] text-[color:var(--navy-deep)] tracking-tight">Reconnection, in real time.</h2>
        </div>
        <div className="mt-14 grid md:grid-cols-2 gap-6 items-stretch">
          <Quote
            body="My mom lives at Sunrise Senior Living, and over the past year her dementia has made it harder for her to stay engaged during visits. When we started using this music app together, something shifted. The personalized songs immediately caught her attention, she started smiling, tapping her hand, and even sang parts of a song she used to play in the car when I was a kid. For those few minutes, it felt like I had my mom back. It&rsquo;s become a meaningful part of our visits and helps us connect without frustration or confusion."
            name="Daughter of Patient (Aged 77)"
            role="Memory Care Resident"
          />
          <Quote
            body="I live at Brookdale now, and sometimes it&rsquo;s hard for me to focus during activities. When they put on the playlist this app made for me, I recognize a lot of the songs. It helps me sit still and listen, and I feel less confused. I don&rsquo;t always remember everything, but I remember the music, and that makes me feel more comfortable."
            name="Patient (Aged 84)"
            role="Resident at Brookdale Senior Living"
          />
        </div>
      </div>
    </section>
  );
}

function Quote({ body, name, role }: { body: string; name: string; role: string }) {
  return (
    <figure className="card-soft p-8 md:p-10 pt-12 md:pt-14 relative h-full flex flex-col">
      <div className="absolute top-6 left-8 md:top-7 md:left-10 text-7xl font-display text-[color:var(--sage)] leading-none select-none pointer-events-none">&ldquo;</div>
      <blockquote className="text-[color:var(--navy)]/85 leading-relaxed text-[17px] flex-1">{body}</blockquote>
      <figcaption className="mt-8 pt-6 border-t border-[color:var(--border)]">
        <div className="font-semibold text-[color:var(--navy-deep)]">{name}</div>
        <div className="text-sm text-[color:var(--muted)]">{role}</div>
      </figcaption>
    </figure>
  );
}

function Pricing() {
  const plus = [
    "Personalized AI music therapy",
    "On-device voice guidance",
    "1-month free trial of Plus",
    "Cognitive games — Full Access",
    "Admin dashboard — Advanced Insights",
    "AI therapist chatbot — Full Access",
  ];
  const free = [
    "Personalized AI music therapy",
    "On-device voice guidance",
    "1-month free trial of Plus",
  ];
  return (
    <section id="pricing" className="py-28 md:py-36 bg-[color:var(--bg-alt)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="section-label">Pricing</span>
          <h2 className="mt-3 font-display text-[clamp(36px,5vw,60px)] leading-[1.02] text-[color:var(--navy-deep)] tracking-tight">23% more affordable than the alternative.</h2>
          <p className="mt-5 text-[color:var(--navy)]/70 text-lg">$120/yr vs. the competitor average of $156/yr. Or get started free.</p>
        </div>
        <div className="mt-14 grid md:grid-cols-2 gap-6 items-stretch">
          <div className="card-soft p-8 md:p-10 flex flex-col">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-3xl text-[color:var(--navy-deep)]">Harmoniq Free</h3>
              <div className="text-[color:var(--muted)] font-semibold">Free</div>
            </div>
            <p className="mt-2 text-[color:var(--muted)]">The essentials — forever.</p>
            <ul className="mt-8 space-y-3 flex-1">
              {free.map((f) => (
                <li key={f} className="flex items-start gap-3"><Check /> <span>{f}</span></li>
              ))}
            </ul>
            <a href="#cta" className="btn-ghost mt-10 w-full justify-center flex">Start free</a>
          </div>

          <div className="relative rounded-[24px] p-8 md:p-10 bg-gradient-to-br from-[color:var(--navy-deep)] to-[color:var(--navy)] text-white overflow-hidden flex flex-col">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[color:var(--sage)]/20 blur-3xl" aria-hidden />
            <div className="absolute top-6 right-6 chip !bg-[color:var(--sage)]/25 !border-[color:var(--sage)]/40 !text-white">Most popular</div>
            <h3 className="font-display text-3xl">Harmoniq Plus</h3>
            <p className="mt-2 text-white/70">Full therapy, for patient and caregiver.</p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-6xl">$9.99</span>
              <span className="text-white/70">/ month / user</span>
            </div>
            <ul className="mt-8 space-y-3 flex-1">
              {plus.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-1.5 w-4 h-4 rounded-full bg-[color:var(--sage)] grid place-items-center shrink-0">
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-[color:var(--navy-deep)]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-6"/></svg>
                  </span>
                  <span className="text-white/90">{f}</span>
                </li>
              ))}
            </ul>
            <a href="#cta" className="mt-10 w-full justify-center flex items-center gap-2 bg-[color:var(--sage)] text-[color:var(--navy-deep)] font-semibold rounded-full py-3.5 hover:bg-[color:var(--cream)] transition-colors">
              Start 30-day trial
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Check() {
  return (
    <span className="mt-1.5 w-4 h-4 rounded-full bg-[color:var(--sage-soft)] grid place-items-center shrink-0">
      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-[color:var(--navy-deep)]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-6"/></svg>
    </span>
  );
}

function Market() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-[clamp(36px,5vw,60px)] leading-[1.02] text-[color:var(--navy-deep)] tracking-tight">A $57B problem. A launch plan that scales.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <MarketCard badge="TAM" value="$57.8B" sub="57M dementia and neurodegenerative patients globally" tone="sky" />
          <MarketCard badge="SAM" value="$19.1B" sub="1 in 3 dementia families in developed markets seeking digital health tools" tone="sage" />
          <MarketCard badge="SOM" value="$8.6M" sub="720K dementia patients in California — our launch state" tone="cream" />
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <InfoCard k="22.2%" v="California digital health sector CAGR" />
          <InfoCard k="Year 3" v="Break-even projection · $3.6M ARR by Year 5" />
        </div>
      </div>
    </section>
  );
}

function MarketCard({ badge, value, sub, tone }: { badge: string; value: string; sub: string; tone: "sky" | "sage" | "cream" }) {
  const bg = { sky: "var(--sky)", sage: "var(--sage)", cream: "var(--cream)" }[tone];
  return (
    <div className="card-soft p-8 relative overflow-hidden">
      <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full" style={{ background: bg, opacity: 0.3 }} aria-hidden />
      <div className="relative">
        <span className="section-label">{badge}</span>
        <div className="mt-2 font-display text-5xl text-[color:var(--navy-deep)]">{value}</div>
        <p className="mt-3 text-[color:var(--navy)]/70 leading-snug">{sub}</p>
      </div>
    </div>
  );
}
function InfoCard({ k, v }: { k: string; v: string }) {
  return (
    <div className="card-soft p-6 flex items-center gap-5">
      <div className="font-display text-3xl text-[color:var(--sage-deep)] shrink-0">{k}</div>
      <div className="text-[color:var(--navy)]/75">{v}</div>
    </div>
  );
}

function CTA() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setState("loading");
    setTimeout(() => setState("done"), 900);
  };
  return (
    <section id="cta" className="py-28 md:py-36 relative overflow-hidden">
      <div className="absolute inset-0 hero-gradient" aria-hidden />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-[1.0] text-[color:var(--navy-deep)] tracking-tight">
          Tune in to the <span className="italic text-[color:var(--sage-deep)]">people</span> behind the patients.
        </h2>
        <p className="mt-6 text-lg md:text-xl text-[color:var(--navy)]/75 max-w-2xl mx-auto">
          Pilot begins 2026 in California. Senior-living facilities, caregivers, and families — we&rsquo;d love to hear from you.
        </p>

        <div className="mt-10 max-w-lg mx-auto relative min-h-[64px]">
          {state !== "done" ? (
            <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 fade-up">
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@family.com"
                disabled={state === "loading"}
                className="flex-1 px-5 py-4 rounded-full bg-white border border-[color:var(--border)] focus:outline-none focus:border-[color:var(--navy)] transition-colors disabled:opacity-60"
              />
              <button type="submit" className="btn-primary justify-center min-w-[170px]" disabled={state === "loading"}>
                {state === "loading" ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                    Adding you…
                  </span>
                ) : (
                  "Request access"
                )}
              </button>
            </form>
          ) : (
            <div className="fade-up inline-flex items-center gap-3 px-6 py-4 rounded-full bg-[color:var(--sage)]/25 border border-[color:var(--sage)] text-[color:var(--navy-deep)] font-semibold">
              <span className="w-7 h-7 rounded-full bg-[color:var(--sage)] grid place-items-center">
                <svg viewBox="0 0 14 14" className="w-4 h-4 text-[color:var(--navy-deep)]" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5L6 10.5 11 4.5"/></svg>
              </span>
              You&rsquo;re on the list. We&rsquo;ll be in touch.
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-[color:var(--muted)]">No spam. Pilot updates only.</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[color:var(--bg-alt)] border-t border-[color:var(--border)]">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-wrap gap-6 items-center justify-between">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-[color:var(--muted)] max-w-md">Personalized AI music therapy and cognitive games for people living with dementia and Alzheimer&rsquo;s.</p>
        </div>
        <div className="text-sm text-[color:var(--muted)] flex flex-wrap gap-6">
          <a href="mailto:amaar2cool@gmail.com" className="hover:text-[color:var(--navy)]">Contact</a>
          <a href="#features" className="hover:text-[color:var(--navy)]">Features</a>
          <a href="#pricing" className="hover:text-[color:var(--navy)]">Pricing</a>
          <span>© 2026 Harmoniq</span>
        </div>
      </div>
    </footer>
  );
}

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Features />
        <Screens />
        <Compare />
        <Testimonials />
        <Market />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
