# Harmoniq — design notes

Working notes for the device model, the visual system and the site. The concept board
(`reference/harmoniq-concept.png`) is the reference for the hardware. Everything factual on
the site comes from the brief's §1; nothing here is a product specification.

---

## 1. Reading the board

The board is an AI render, so its four views disagree in places. These are the readings used
and how each conflict was resolved (conservative reading wins).

| Element | What the board shows | Built as |
|---|---|---|
| Halo | One continuous band across the forehead, temple to temple. Brushed, satin titanium outer face with a crisp top edge. | An elliptical plan curve (superellipse n = 2.0, which gives even forehead contact on the construction head) swept with a titanium profile: barrel-bowed outer face, crisp 0.55 mm top edge, soft 3.2 mm bottom-outer radius, and a lip that wraps under the band to hold the liner. |
| Crown | A heathered grey textile cushion on top. It rolls inward over the top of the inner face; in the hero and front views it covers roughly the upper half of the inside. | A rolled cushion profile (closed centripetal spline) that sits on a 1.1 mm titanium ledge, bulges slightly outward, and rolls 2.6 mm past the liner toward the forehead, tucking into a crevice above the contacts. |
| Liner + contacts | Graphite channel low on the inner face; champagne pads in dark foam gaskets; centre pad largest. Five read clearly in the front view. | Graphite liner between the titanium lip and the cushion roll. Five stadium pads (23×11, 19×10, 15×8.5 mm), nearly flat satin tops, 1.3 mm edge radius, standing 3 mm proud, each in a 1.6 mm velvety foam rim with a 0.3 mm shadow gap; the liner shows around every gasket, as on the board. |
| Light line | Hero and side: one slit near the front, just off-centre. Front view: a mirrored pair. | **One** light line, on the wearer's left, everywhere. The mirrored pair in the front view is the inconsistency. |
| Wordmark | "Harmoniq", etched on the same side as the light line, toward the temple. | Canvas-rendered Inter wordmark on a conformal decal, darker and rougher than the brushed titanium so it reads as a laser etch. |
| Temple modules | Smoked translucent glass where the halo meets the arm; in the side profile it sits on the top line, continuing the crown. | Smoked-glass block (30 × 12.5 mm in elevation, 14 mm deep, 3.6 mm corner radius) seated on the titanium with one parting gap, its top flush with the crown so textile flows into glass. A dim internal spine gives the smoke depth. |
| Arms | Titanium blades running back and down, each with a long slot. In the side profile the titanium face flows straight into the arm. | The titanium's top edge sweeps down under the glass and the face continues as the arm with a 0.02 mm step and continuous brushing, so it reads as one part. Arm 62 mm long, 22 mm drop, tapering to 10 mm, with a 30 × 4 mm stadium slot. |
| Ear rests | Soft graphite tips curving down behind the ear, rounded end. | A variable-section sweep: a slim sleeve that tapers onto the arm's tail, morphing from a stadium to a 7.5 mm round section, turning down 38 mm in one long bend and tucking toward the skull to a 5.8 mm hemispherical tip that sits behind the auricle. |
| Board's "front view" | It actually looks at the **inner** face from behind the wearer (contacts visible, arms toward the camera). | The lab's "Front (board)" preset matches that framing; a separate "True front" preset looks at the outer face. |

Hidden geometry (undersides, inner faces of modules, backs of arms) is inferred with ordinary
industrial-design logic: one material per mesh, a parting gap wherever two materials meet,
consistent radii by material (crisp on titanium edges, soft on graphite and textile).

## 2. Proportions

Modelled in millimetres for a typical adult head. These numbers never appear in copy.

| Part | Brief guide | Built | Why it differs |
|---|---|---|---|
| Halo inner span | ~140 | 140 | — |
| Halo depth (front → temple) | ~65 | 62 inner / 75 outer | The guide reads as inner-to-outer; this keeps the forehead fit right on the construction head. |
| Plan curve | — | ellipse (n = 2.0) | Contacts sit 2–3 mm off the construction-head forehead evenly; n = 2.45 left the outer pads ~5 mm off. |
| Height centre → temple | ~34 → ~28 | 34 → 28 | — |
| Thickness | ~13 | 13 | — |
| Crown | 16 × 6, 2 mm overhang | ~14 wide, 7.5–9.5 rise, 2.6 overhang, rolls down the inner face | The board's cushion is clearly fuller than 6 mm and covers the upper inner face; this splits the difference. |
| Contacts | 23×11 / 19×10 / 15×8.5, 3 proud, 2 rim | same sizes, 3 proud, 1.6 rim | A slimmer foam rim keeps graphite visible around each gasket, as on the board. |
| Temple module | ~36 × 24 × 15 | 30 × 12.5 × 14 | Sits on the top line (as in the side view) instead of covering the whole band end; the titanium passes beneath it. |
| Arm | 60–65 long, 25–30 drop, 24 → 12 tall, 3.5 thick, 40 × 4 slot | 62 long, 22 drop, ~15 → 10, 3.5 thick, 30 × 4 slot | Starts under the glass at the titanium's dipped height, so the visible blade is slimmer, as in the board's side view; the drop puts the ear rest behind the ear on the construction head. |
| Ear rest | 35 drop, Ø 9 → 7 | 38 drop, Ø 7.5 → 5.8 | Slimmer, so it continues the blade instead of reading as a slip-on boot. |

## 3. Material map

| Part | Material (MeshPhysicalMaterial) |
|---|---|
| Shell, arms | Titanium: neutral silver (#B6B4B0), metal 1, roughness 0.27 × hairline roughness map, anisotropy 0.55 along the band (explicit tangents), faint hairline normal map |
| Wordmark | Laser-etch oxide: #55524E, metal 0.4, roughness 0.65, Inter 400 with open tracking |
| Crown | Heathered knit: #8A8987 × melange map, roughness 0.95, sheen 1 (#D9D5CF), procedural knit normal map |
| Liner | Soft-touch graphite: #403F3D, roughness 0.62, soft sheen, fine grain normal map |
| Gaskets | Open-cell foam: #2E2C2A, roughness 1, velvety sheen, cellular normal map |
| Contacts | Satin champagne: #DCCBB4, metal 1, roughness 0.33. "Warm-up" = a capped emissive plus an additive halo that spills onto the liner (all five in one draw call) |
| Modules | Smoked glass: transmission 0.95, IOR 1.5, clearcoat 0.8, smoke attenuation ≈ 10 mm; dim internal spine. Mobile: glossy opaque fallback |
| Light line | Emissive slit (cool white, not tone-mapped) in a dark bezel, plus an analytic stadium-falloff glow that fades with view angle: restrained bloom on the light line only, with no post-processing pass |
| Ear rests | Graphite soft-touch: #3B3A3A, roughness 0.72, sheen |

Colours are a little lighter than the brief's starting values where the real-time lighting
needed it (graphite albedo below ~#40 collapses to black under IBL).

## 4. Making it ours (and not a Muse)

- **The loop.** The stadium is the brand shape and appears on the hardware five times: the
  contacts, their gaskets, the arm slots, the light line and the glass modules. It carries
  into the interface: buttons, chips, progress, the closed-loop diagram, transitions and the favicon.
- **One sweep of titanium.** The titanium face runs from brow to ear without a visible joint;
  the glass module sits on top of it. Rigid metal, not a flexible plastic strip.
- **Textile meets glass.** The crown flows into the smoked glass along the top line, so the
  softest and the most technical materials share one silhouette.
- **A single light line** on the wearer's left. One signal, used consistently from the
  hardware through the closed-loop diagram to the app waveform.
- **Champagne as the only accent**, on the contacts and nowhere else on the device.
- Deliberately absent: thin flexible bands, soft sensor pods behind the ears, visible
  buttons, ports or extra LEDs, and the board's marketing lines.

## 5. 3D approach and trade-offs

**Procedural generator, no AI image-to-3D.** `createHarmoniqModel(config)` returns a
`THREE.Group` with the named parts `shell`, `liner`, `crown`, `contact_0…4`, `gasket_0…4`,
`lightLine`, `wordmark`, `module_L/R`, `arm_L/R`, `earRest_L/R`. Every dimension lives in
`lib/harmoniq/config.ts`.

- **Band coordinates.** Halo parts are defined in (s, p, q): arc length along the plan curve,
  outward offset, height. Frames come from world-up (no Frenet twist), and the profile rakes
  back toward the forehead.
- **Sweeps.** Shell, liner and crown are swept cross-sections with fixed point counts (fillets
  animate their radius instead of their vertex count), so profiles can taper and morph along
  the band. UVs run u along the band and v around the profile.
- **Stadium lathes.** Pads, gaskets, the light line and the glass modules are solids of
  revolution around a stadium (offset rings collapse cleanly onto the centre segment), then
  wrapped onto the band surface with true surface arc length.
- **Arms.** `ExtrudeGeometry` with soft bevels, with normals computed per group (flat faces
  exactly flat, bevels welded and smoothed), then bent along a spine with analytic normals
  and tangents.
- **Ear rests.** A variable-section sweep along a centripetal Catmull-Rom with rotation-minimising
  frames, and angular sampling at the tip for a smooth hemisphere.
- **Baked ambient occlusion.** Per-vertex AO is ray-cast once with three-mesh-bvh and stored in
  vertex colours. It's free per frame, and a uniform fades it out during the exploded view.
- **Tangents.** Brushed anisotropic metal needs smooth tangents; without them three.js falls
  back to per-triangle screen-space derivatives, which facet badly on long or bent triangles.
- **Textures.** All procedural and deterministic (brushed streaks, jersey knit with heather,
  foam, grain, the wordmark). About 2.7 MB of GPU memory with mipmaps, under the 6 MB budget.
- **Lighting.** The environment map is built from a gradient studio dome and rectangular
  light panels: long strips for the band highlight, a back softbox for the inner face, and
  black flags for edge definition. It uses Khronos PBR Neutral tone mapping, a transparent
  canvas over the CSS backgrounds, and soft contact shadows.

**Budget (current):** 59.4k triangles, 26 meshes (24 draw calls with the shadow planes on
mobile). Desktop transmission adds a pre-pass that re-draws the opaque meshes for the glass
(~49 calls in total); `PerformanceMonitor` will drop to the opaque glass when frame time
suffers, and mobile uses that fallback from the start.

**Trade-offs.**
- *Procedural vs Blender.* Code keeps every dimension editable and every part addressable for
  the choreography, with no binary pipeline. The cost is that very fine detail (micro
  chamfers, sculpted transitions) takes more effort than in a DCC tool.
- *Runtime vs GLB.* The generator stays the source of truth. A GLB export (GLTFExporter →
  gltf-transform with meshopt) with AO baked offline is the planned production path; it removes
  the ~1 s client-side build and AO bake.
- *Glow without bloom.* An analytic glow on the light line gives restrained "bloom" on exactly
  one element, works over a transparent canvas, and costs one draw call.

## 6. Lab

`/lab` has an orbit viewer, part toggles, an explode slider, contact-glow and light-line
controls, paper/graphite/charcoal backdrops, a construction-line head underlay and the
"mobile materials" fallback. Its camera presets match the board's views (hero ¾, front (board),
side profile, contacts close-up), with extra presets for true front, top, module, arm and
underside. `scripts/shoot-lab.mjs` screenshots any set of presets and states with headless
Chromium.

## 7. Review process

The model went through a five-lens critique (silhouette, materials and lighting, industrial-design
realism, rendering artifacts, brand and framing). Each critic compared renders against the board
crops and the generator code. The fixes it drove: the plan curve, gasket proportions, the crown
roll self-intersection, the glass units bug, back-face-culled contact glow, contact-shadow plane
edges, tangent-less anisotropy faceting, the halo-to-arm seam, and the preset framings.

## 8. Checkpoint questions (decided)

- **Forked temple: no.** The board's side profile can also be read as two branches per side.
  The brief describes one slotted titanium arm with a graphite ear rest, which is what's built.
- **Module height: slim.** The board's module looks taller than the crown at the temple. The
  glass stays at 12.5 mm so the titanium sweep remains the hero line.
- **Crown volume: 9.5 mm.** Between the brief's ~6 mm guide and the board's ~12 mm.

---

## 9. The site

### Story and structure

One idea per screen, carried by one object. The device never leaves the page until the app
section, and comes back for the close. Eight scenes, in scroll order:

| # | Scene | What the device does | Ground |
|---|---|---|---|
| 01 | Hero: "Memory keeps time." | A breathing hairline gathers into the light line; the device appears on a warm floor at three-quarters. | paper |
| 02 | Reveal: "A quiet instrument for the mind." | Lifts off the floor, turns to face us, the camera pushes in; a giant faint "Harmoniq" sits behind it. | paper |
| 03 | Design story (5 beats) | Halo (low three-quarter, a highlight sweeps the titanium), crown (from above), contacts (inside the band, warming one by one), fit (side profile, a construction-line head draws itself), layers (exploded along clean axes with projected labels, then reassembled). | paper → graphite |
| 04 | Closed loop | Small, inside a stadium loop, orbiting once while a traveling light runs the five steps: Sense (contacts warm), Interpret (a highlight runs the titanium), Personalize, Deliver (the light line turns into view and breathes), Adapt (home). The light finally leaves the loop as a line. | graphite |
| 05 | Interface concept | The line lands in the in-session phone's waveform; three HTML phones; the room turns to paper. | graphite → paper |
| 06 | Research | Four chapters, recognition as a quiet text list. | paper |
| 07 | Founder | One quote. | paper |
| 08 | Close: "For every name worth remembering." | Turns its light line toward us on charcoal, then dissolves while the line stretches into a full-width hairline, the hairline the page began with. | charcoal |

### Choreography

- **Pure function of scroll.** Camera and device are keyframes anchored to scene progress
  (`components/experience/poses.ts`), eased per segment and sampled by `poseAt(scrollY)`. The
  stage only damps toward the sampled pose (Lenis already smooths the scroll), so a jump, a
  fast fling or scrolling back always lands on the same frame. Text reveals are scrubbed GSAP
  timelines over the same progress values (`components/experience/timeline.ts` is the shared
  map).
- **Spherical camera.** Moves are orbits (azimuth, elevation, distance around a target) plus a
  screen-space shift, so the device can sit beside a copy column without changing perspective.
- **Moods.** Two studio environments (light and dark) are rendered once; the switch happens at
  the bottom of an intensity dip timed with the background crossfade, so it is never seen.
- **The giant word** is HTML above the canvas with `mix-blend-mode: darken`: the device is always
  darker than the word, so the word reads as if it were behind the device.
- **One signal.** The light line on the hardware becomes the traveling light in the loop diagram,
  the hand-off line, the session waveform in the app (synced to the same breathing), and the
  closing hairline.

### Craft rules kept

- Inter only, display weights 200–300 with optical size; eyebrows 11.5px / 0.32em; tabular index
  numbers 01–05; 1px hairlines; stadium buttons and chips; champagne only as a small accent.
- Nothing flashes: the 40 Hz is only ever heard (an optional, tap-only five-second
  demonstration at capped volume) or drawn as a calm line. Breathing runs at 5.2 s, ripples
  at 7.2 s.
- All copy in `content/copy.ts`, each factual line annotated with its source fact; the required
  disclaimer is in the footer verbatim.

### Performance

- **Baked model.** The generator runs offline (`scripts/bake-model.mjs`); the site parses a
  1.5 MB bake (≈0.8 MB gzipped) in about 0.4 s instead of generating geometry and ray-casting AO
  for 8–15 s.
- **Render on demand** (`frameloop="never"`), paused while the stage is off screen; shaders
  compiled with `compileAsync` before the first visible frame.
- **Adaptive quality:** pixel ratio 2 → 1.5 → 1, then opaque glass, if frames stay slow.
- **Lazy timelines:** each section's scroll timeline builds in its own task as it nears the
  viewport.
- **Software WebGL gets stills.** Without a GPU this scene renders at a few frames per second
  and blocks the main thread on shader compiles, so those visitors (and headless audits) get
  pre-rendered stills of each station instead.

### Judgement calls

- **Single slotted arm** (no forked temple), **slim glass module**, **crown rise 9.5 mm** (see §8).
- **Crown on mobile** keeps its own placard inside the halo camera beat rather than being merged
  into one block, so every line of copy survives at 390 px.
- **Contacts beat** looks into the band from behind and above, with the whole band to the right
  of the copy column; the room darkens during the turn in, and the copy waits until the camera
  has arrived.
- **Reveal** faces the device from slightly above, so it reads as a headband (crown, modules,
  light line) rather than a flat bar, and the turn starts as the hero un-pins.
- **Exploded labels** sit in two columns outside the projected device bounds, so only 1 px
  leaders cross the metal; parts are numbered in the order they read on screen.
- **Ending:** the device dissolves while its light line becomes the closing hairline, which then
  leaves with the page as the footer arrives.

### Review and verification

- **Jury round.** Six independent critics (desktop composition, mobile composition, typography,
  choreography, story and brand, claims and accessibility) reviewed every beat's screenshots
  and the code; a chair verified, deduplicated and ranked their findings. The ten kept fixes
  (contacts and fit framing, exploded-label placement, keyboard access to the demo, reduced
  motion, the ending, the reveal turn, type hygiene, loop label contrast, the loop orbit, and
  copy that drifted from its sources) were implemented and re-shot.
- **Verification.** Fast-scroll stability (fresh jump vs. after rapid wheel passes, scroll back
  up), reduced motion, no-WebGL stills, no-JavaScript layout, keyboard and axe checks, the
  audio demo, flashing, console, and the mandatory word and claims audit.
