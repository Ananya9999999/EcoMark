# Design specification — Digital Carbon Credit Verification

Written before any CSS, per Part 7.9. Every colour and type value in the codebase is
derived from this file. If a value appears in `globals.css` or the Tailwind theme and
is not justified here, it is a mistake.

---

## 1. Palette

The subject is Earth observation: orbital composites, vegetation-index rasters,
coordinate graticules, bathymetry, night-side city lights. The palette is sampled from
that world rather than from a general idea of "sustainability". The interface is dark
because every serious remote-sensing tool is dark — imagery and index ramps only read
correctly against a low-luminance ground, and this product's content *is* imagery and
indices.

### Core — six values

| Name | Hex | Justification |
|---|---|---|
| `night-ocean` | `#0E141A` | Deep ocean in a Sentinel-2 true-colour composite is never black — it is a cold near-neutral carrying a blue cast from Rayleigh scattering. This is the page ground. |
| `shelf` | `#161F27` | The continental shelf reads one step brighter than open ocean in the same composite. First raised surface. |
| `terrace` | `#1F2C36` | Terraced agricultural land catches more light again. Top surface: hovered rows, popovers, the elevated panel. |
| `airglow` | `#DCE6EC` | The faint blue-white emission layer visible above the night limb from orbit. Primary ink — bright but never pure white, so it sits *in* the scene rather than on top of it. |
| `graticule` | `#7E909C` | The colour a coordinate grid is drawn in when overlaid on imagery: legible, deliberately subordinate to the data underneath. Secondary ink, rules, axis labels. |
| `limb` | `#5CC8DB` | The thin cyan band of atmospheric scattering on Earth's limb, the brightest thing in a night-side orbital photograph. The single primary accent: focus rings, active nav, the pin, the atmosphere shader. |

### Data ramp — derived, not decorative

These five are reserved **exclusively** for encoding measured values. They never appear
as chrome, backgrounds or decoration. This is the rule that stops the interface becoming
a green eco app: green here means *a vegetation index came back high*, and nothing else.

| Name | Hex | Source |
|---|---|---|
| `chlorophyll` | `#93C356` | Top of the standard NDVI ramp (~0.6–0.8), dense healthy canopy. Encodes the `land` category. |
| `sodium` | `#E4A34A` | Sodium-vapour street lighting on the VIIRS day/night band — the visual signature of energy consumption seen from orbit. Encodes `energy`. |
| `bathymetry` | `#4C9FD0` | Mid-depth blue from a standard bathymetric ramp. Encodes `water`. |
| `nir-magenta` | `#C77DBE` | In a Landsat 4-3-2 false-colour composite, near-infrared is rendered to the red channel and built surfaces separate out as magenta. Encodes `transport`. |
| `oxide` | `#C4573F` | Exposed iron-oxide soil — what bare, unvegetated ground actually looks like in a composite. Encodes failure: `rejected`, and error states. |

### Why not the obvious alternative

The stock move is a warm off-white page with a leaf green. That palette says "eco brand".
This one says "instrument". The product's credibility rests on looking like something
that *measures*, because the entire proposition is that a claim was independently
verified.

---

## 2. Type

Three faces, three jobs.

| Role | Face | Why |
|---|---|---|
| Display | **Bricolage Grotesque** | A variable grotesque with genuine irregularity — asymmetric terminals, an optical-size axis, slightly restless proportions. It supplies the personality that the rest of the system deliberately withholds. Used for page titles and the one or two large statements only, never below 24px. |
| Body | **IBM Plex Sans** | Drawn for engineering and data contexts. It is quiet, has a large x-height at small sizes, and complements Bricolage by contrast rather than by matching it — Bricolage has opinions, Plex Sans has none, which is correct for a label. |
| Mono | **IBM Plex Mono** | The reason the pairing works. This product is full of measured values — latitudes, NDVI deltas, kWh readings, transaction hashes, credit amounts. Plex Mono has a slashed zero and unambiguous `1`/`l`/`I`, which matters when the content *is* the digits. Sharing a skeleton with Plex Sans means a coordinate set in mono next to a label set in sans reads as the same voice speaking in two registers: prose and instrument. |

**The rule:** any value that was measured, computed or hashed is set in mono. Anything a
human wrote is set in sans. A user never has to ask which is which.

### Scale

Sizes in rem, tracking in em. Deliberate, not linear.

| Token | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `display-xl` | 3.25 | 600 | −0.03 | Dashboard total, the one big number |
| `display-l` | 2.25 | 600 | −0.025 | Page titles |
| `display-m` | 1.5 | 600 | −0.02 | Section headings |
| `body-l` | 1.0625 | 400 | −0.005 | Paragraphs |
| `body-m` | 0.9375 | 400 | 0 | Default interface text |
| `body-s` | 0.8125 | 500 | 0.01 | Labels |
| `label-xs` | 0.6875 | 600 | 0.09 | Uppercase eyebrows, badge text, table headers |
| `mono-l` | 1.75 | 500 | −0.02 | Credit figures, the coordinate readout |
| `mono-m` | 0.9375 | 450 | 0 | Inline measured values |
| `mono-s` | 0.75 | 450 | 0.02 | Hashes, timestamps, evidence values |

Uppercase is used at exactly one size (`label-xs`) with wide tracking, as a
cartographic map-legend label would be. Nowhere else.

---

## 3. Layout

The page is built from three elevation strata rather than a grid of equal cards. A
narrow fixed left rail carries navigation, the demo user switcher and the persistent
balance — it stays at ground level (`night-ocean`) so it reads as the frame the content
sits inside. Content occupies an asymmetric two-column field: the primary column is
roughly 1.6× the secondary, so the eye is never offered two things of equal weight and
made to choose. On the dashboard the balance band spans the full content width as a
single continuous ledger strip — four category readouts whose bar lengths are
proportional to their amounts, so the strip is itself the chart and not four identical
tiles standing next to a chart. Below it, recent claims run down the wide column as
rows, not cards, because a claim history is a ledger; the action panel and the orbital
detail sit in the narrow column. Below 900px the rail collapses to a top bar and the
columns stack, primary first. Everything holds at 375px.

```
┌────────────┬──────────────────────────────────────────────────────────────┐
│            │  BALANCE                                     16.7 total      │
│  ◉ ORBIT   │  ┌────────────────────────────────────────────────────────┐  │
│            │  │ land       ████████████████████████████████    12.5    │  │
│  Dashboard │  │ energy     ███████                              3.0    │  │
│  New claim │  │ water                                           0.0    │  │
│  My claims │  │ transport  ███                                  1.2    │  │
│  Swaps     │  └────────────────────────────────────────────────────────┘  │
│            │                                                              │
│  ────────  │  ┌─────────────────────────────────┐  ┌───────────────────┐  │
│            │  │ RECENT CLAIMS                   │  │                   │  │
│  balance   │  │                                 │  │   Make a claim    │  │
│  land 12.5 │  │ Planted trees      ● minted     │  │                   │  │
│  enrg  3.0 │  │ 14 Aug · 12.97N 77.59E    4.5   │  │   Log an action   │  │
│  watr  0.0 │  │ ─────────────────────────────── │  │   you have taken  │  │
│  tran  1.2 │  │ Reduced electricity ◐ verifying │  │   and have it     │  │
│            │  │ 14 Aug · TNEB bill         —    │  │   verified.       │  │
│  ────────  │  │ ─────────────────────────────── │  │                   │  │
│            │  │ Bought an EV       ○ rejected   │  │   [ Make a claim ]│  │
│  viewing   │  │ 13 Aug · invoice.pdf       —    │  │                   │  │
│  [Priya ▾] │  │ ─────────────────────────────── │  └───────────────────┘  │
│            │  │ ...                             │  ┌───────────────────┐  │
│            │  │                                 │  │  ·  ⌒⌒⌒  ·        │  │
│            │  │            [ All claims → ]     │  │ ( globe detail )  │  │
│            │  └─────────────────────────────────┘  └───────────────────┘  │
└────────────┴──────────────────────────────────────────────────────────────┘
```

### Depth

Elevation is never signalled by a drop shadow alone. Each stratum carries three
simultaneous cues:

1. **Surface** — a step up the `night-ocean` → `shelf` → `terrace` ladder.
2. **Top highlight** — a 1px inset light line along the upper edge, as though lit from
   above by the same source lighting the globe. This is what actually sells the
   elevation.
3. **Ambient occlusion** — a wide, very soft, very dark shadow (not a tight dark one),
   plus a tighter contact shadow on interactive elements only.

Radii are not uniform: 2px on inputs and badges (instrument chrome), 6px on rows and
list items, 14px on panels, and fully round only on the pin and the globe controls.
Scale of radius tracks scale of object.

---

## 4. 3D and motion

### Where 3D appears — and only here

| Place | Job |
|---|---|
| `/claims/new`, satellite actions | **Coordinate input.** The user rotates Earth and drops a pin instead of typing two numbers they would have to look up. The 3D *is* the form control. |
| `/claims/[id]`, satellite claims | **Location readout.** Same component, non-interactive props: pin already placed, radius drawn, camera parked. Shows *where the claim was*, which a lat/lng pair does not. |

Nowhere else. No 3D on the dashboard, the history table, or the swaps page — there are
no coordinates on those screens, so there is no job for it.

### The three motion moments

1. **The verification wait.** The largest share of the budget. The user has asserted
   something about the world and is waiting to be believed; that is the emotional centre
   of the product and it does not get a spinner. A staged sequence names the real step in
   progress, driven by elapsed time, with the stage list chosen by verification method
   (satellite: locating parcel → retrieving imagery → comparing before and after →
   calculating). Stages cross-fade and the completed ones stay visible as a ledger of
   what has happened. The globe, where present, responds to the stage.
2. **The credit award.** The awarded figure counts up from zero; the balance in the rail
   counts to its new value at the same time so the causal link is visible. Once, briefly,
   then still.
3. **The globe.** Slow ambient rotation at rest, damped inertial drag so it feels
   weighted rather than slippery, and an eased camera arc to a dropped pin rather than a
   cut.

Everything else gets micro-interactions only: 120ms hover lifts, list entrances
staggered ~35ms, page transitions under 200ms.

Under `prefers-reduced-motion`: ambient rotation stops, the count-up resolves instantly
to its final value, stage transitions become instant swaps, and the globe is replaced by
the numeric fallback entirely.

---

## 5. Signature

**The globe is the signature.** It does three jobs simultaneously, which is what
separates functional 3D from a spinning ornament:

- It is the **input control** — the only way coordinates are entered, other than the
  accessible numeric fallback.
- It is the **memorable moment** — the thing someone describes afterwards.
- It is an **honest statement of the product** — this app claims to verify land use from
  orbit, and the first thing it shows you is the view from orbit.

What makes it specific to *this* product rather than a generic globe: the radius control
draws the actual claim area as a circle projected onto the sphere surface, so the user
sees the parcel that will be analysed, at its true relative size. The coordinate readout
beside it is live and set in mono, updating as the pin moves — the instrument reading,
not a label. And the atmospheric rim is a real fresnel shader on the limb, which is the
one visual detail that makes a rendered sphere read as *Earth photographed* rather than
*a ball with a texture*.

The boldness is spent here and nowhere else.

---

## 6. Critique against 7.4, and what changed

Checked the plan above against every item on the forbidden list.

| Item | Verdict |
|---|---|
| Warm cream, high-contrast serif, terracotta | Not present. No serif in the system at all. |
| **Near-black background with one bright accent** | **Matched. Revised — see below.** |
| Broadsheet: hairline rules, zero radius, dense columns | Not present. Four distinct radii, two columns, generous measure. |
| Default geometric sans as the whole system | Not present. Three faces, none geometric; Bricolage is a grotesque with irregularity. |
| Purple-to-blue gradients | Not present. `nir-magenta` is a single flat data hue on a badge, never a gradient, never chrome. |
| Emoji as icons | Not present. Status markers are drawn glyphs (`●` filled, `◐` half, `○` open) plus colour plus fill state. |
| **Centred hero + three equal feature cards** | **Matched in the first sketch. Revised — see below.** |
| One uniform border-radius | Not present, by explicit rule (2 / 6 / 14 / round). |
| **Drop shadows as the only depth cue** | **Risked. Revised — see below.** |

### Three revisions

**1. The ground was too dark and carried a single accent.** The first pass had a
`#080A0C` ground with `limb` cyan as the only non-neutral — which is exactly the
"near-black plus one bright accent" tell, and cyan-on-near-black in particular reads as
generic sci-fi dashboard.

*Changed:* the ground moved up to `#0E141A`, which is measurably lighter and carries a
real blue cast rather than being a neutral dark, and two further surface levels were
added above it so the interface is built from **strata** rather than from one flat void
with things floating on it. The accent count went from one to two families: `limb` for
interaction, and the five-value data ramp for encoded values. Because the ramp is bound
to meaning — green *only* means a high vegetation index, amber *only* means energy — the
extra colour reads as information rather than decoration, which is the distinction the
single-accent look is trying to avoid in the first place.

**2. The dashboard was a hero over three equal cards.** The first sketch had the total
centred at the top with land / energy / water / transport as four identical tiles
beneath. That is the forbidden pattern with an extra tile.

*Changed:* the four categories became a single continuous **ledger strip** with bar
lengths proportional to their amounts. It occupies one band instead of four boxes, it is
left-aligned rather than centred, and it encodes the data in its own geometry — a
category with 12.5 credits is now visibly twelve times a category with 1.0, which the
equal-tile version actively concealed. The content below it is a deliberately asymmetric
1.6 : 1 split, so no row of the page ever presents equal-weight siblings.

**3. Depth was going to be shadows.** "Layered surfaces with distinct elevation" would
have collapsed into `box-shadow` on cards, which is the tell.

*Changed:* elevation is now specified as three simultaneous cues — surface step, 1px
inset top highlight, and a wide soft ambient occlusion — with the top highlight doing
most of the work. A panel is legible as raised in a screenshot with all shadows
disabled, which is the test.

---

## 7. Implementation contract

- Every value above becomes a CSS custom property on `:root` in `src/styles/globals.css`.
- Tailwind reads those properties through `@theme` — no hex literal appears in a
  component, ever.
- The three faces load through `next/font/google` and expose
  `--font-display`, `--font-body`, `--font-mono`.
- The data ramp is available only through category- and status-named tokens, never as
  raw colours, so it cannot drift into decoration.
