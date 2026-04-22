# Deploy Harmoniq → harmoniq.site

## Recommended: Vercel + Cloudflare DNS (5 min)

Vercel auto-builds Next.js, gives free SSL, global CDN. Cloudflare keeps domain registrar + DNS.

### 1 — Push repo to GitHub

```bash
cd /Users/amaarchughtai/Developer/projects/websites/harmoniq.site
git add -A
git commit -m "feat: marketing site v1"
gh repo create harmoniq-site --public --source=. --push
```

### 2 — Deploy on Vercel

1. Go to https://vercel.com/new
2. Import `harmoniq-site` repo. Framework auto-detected (Next.js). Hit **Deploy**.
3. Wait ~60s → get `harmoniq-site-xxx.vercel.app` URL. Verify live.

### 3 — Add custom domain in Vercel

1. Project → **Settings → Domains**
2. Add `harmoniq.site` AND `www.harmoniq.site`
3. Vercel shows required DNS records. Two setups to pick from:

**Option A — Point apex at Vercel (recommended)**
- `A` record, name `@`, value `76.76.21.21`
- `CNAME` record, name `www`, value `cname.vercel-dns.com`

**Option B — Proxy through Cloudflare (keep CF features like analytics)**
- Same records, but set **Proxy status: DNS only** (gray cloud) for Vercel SSL to work. Turning on orange-cloud proxy breaks Vercel's cert issuance unless you configure Full (strict) SSL in Cloudflare.

### 4 — Add records in Cloudflare

1. Cloudflare dashboard → `harmoniq.site` → **DNS → Records**
2. Delete any existing `A @` / `CNAME www` pointing elsewhere
3. Add records from step 3. **Proxy status: DNS only** (gray cloud) for both.
4. Wait 1–5 min. Vercel will auto-issue Let's Encrypt cert.
5. Back in Vercel → domain shows ✓. Visit `https://harmoniq.site`.

### 5 — Verify

```bash
dig harmoniq.site +short      # → 76.76.21.21
dig www.harmoniq.site +short  # → cname.vercel-dns.com...
curl -I https://harmoniq.site # → HTTP/2 200
```

## Alternative: Cloudflare Pages (no third party)

If you want everything in Cloudflare:

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. Pick the repo. Framework preset: **Next.js**. Build command `npx next build`. Output dir `.next`.
3. Pages auto-connects to `harmoniq.site` zone — add custom domain from Pages project settings. No manual DNS needed.

Vercel is faster for Next.js (native support, zero config). Pages works but Next 16 on Pages occasionally lags in support.

## What to do next

**Before Diamond Challenge finals (Apr 22):**
- [ ] Hook up real email capture on the `#cta` form (currently `mailto:`). Options: Formspree, Resend + a tiny API route, or Google Form embed.
- [ ] Add Plausible or Cloudflare Web Analytics to track pitch-week traffic.
- [ ] Replace team-card initials with real headshots in `public/team/` (the ones from the deck).
- [ ] Swap science stats (32% / 21% / 4.2×) for real numbers from the sources cited.
- [ ] Add a short demo video / GIF in the hero or a dedicated section.
- [ ] Proof-read every number against the pitch deck (unit cost, ARR, CAC/LTV).

**Post-finals:**
- [ ] `/privacy` + `/terms` pages (HIPAA mention — judges flagged this).
- [ ] Caregiver/facility waitlist page with Calendly booking.
- [ ] Blog or press section for pilot updates.
- [ ] OG image at `/public/og.png` (1200×630) — currently falls back to auto.
