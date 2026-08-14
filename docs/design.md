# EcoMark — design specification

Pair C (frontend + glue). Written before the re-skin, per Step 5 of the build
spec. Every colour and type value in the codebase derives from this file.

**Tagline:** Proof, not promises.

---

## 1. Direction — atmospheric instrumentation

The product is a measuring instrument, not a consumer eco app. It reads the
atmosphere and issues marks of proof. Credits are *readings*, not rewards.

The reference points are monitoring-station readouts, spectrometers and
calibration seals: precise, dark, data-forward, quiet around a single luminous
signal. Nothing about it should suggest a leaf, a globe icon, or a rewards
programme.

**Why the previous pass was wrong.** It used a blue-cyan accent on near-black
with a soft blue-grey type family. That reads as generic dark-mode SaaS — the
exact "near-black background with a single accent used as the only idea"
failure in §8.1. Two things change it: the ground gains a green cast rather
than a blue one, and the accent is used *only* for verified state and live
signal, never as decoration.

## 2. Palette

Tokens exactly as specified in §8.3. Every value is bound to meaning.

| Token | Hex | Meaning |
|---|---|---|
| `--bg-void` | `#070B0A` | Deep base. Green-blue cast, never pure black — an unlit sensor field. |
| `--bg-surface` | `#0F1614` | Lifted panels. |
| `--bg-elevated` | `#16201D` | Modals, popovers, hovered rows. |
| `--line` | `#22302C` | Hairline dividers — instrument rules, not card borders. |
| `--signal` | `#6EE7A8` | Primary. Verified, active, luminous. The one bright thing. |
| `--signal-dim` | `#2F6B50` | The same hue, inactive. |
| `--ember` | `#F0A868` | Emissions, pending, warnings. |
| `--alert` | `#E8705C` | Errors, rejections. |
| `--text-primary` | `#E8F0ED` | |
| `--text-secondary` | `#8FA39C` | |
| `--text-muted` | `#536761` | |

### Category colours — consistent everywhere

`land #6EE7A8` · `energy #F0A868` · `water #5EC8E8` · `transport #A98BF0`

A category's colour is identical in its badge, its balance segment, its swap
row and its particles in the 3D field. Colour never carries meaning alone —
every status also carries text (§12.3).

### Contrast

`--text-secondary #8FA39C` on `--bg-void` measures ≈ 7.2:1, and on
`--bg-elevated` ≈ 6.1:1 — both clear 4.5:1. `--text-muted` is reserved for
large text and non-essential glyphs only, never body copy.

## 3. Typography

| Role | Face | Use |
|---|---|---|
| Display | **Bricolage Grotesque** | Headings only, tight tracking, used sparingly. |
| Body | **Inter Tight** | All UI text, labels, paragraphs. |
| Data | **JetBrains Mono** | Every number, hash, coordinate, timestamp. |

**The rule that carries the whole feel:** every numeric value is set in
JetBrains Mono with `font-variant-numeric: tabular-nums`. Figures align in
columns and stop jittering while counting up. A human wrote the sans; the
instrument wrote the mono.

Type scale, fixed — no intermediate sizes: **12 / 14 / 16 / 20 / 28 / 40 / 64**.

## 4. Layout

Not a sidebar-plus-stat-card grid (§8.1). The frame is a **readout header**: a
thin instrument bar carrying the wordmark, the live total, and navigation as
calibrated tabs, sitting over the atmospheric field. Content below runs in a
single measured column with asymmetric splits — never two equal-weight
siblings.

Balance is one instrument, not four cards: a single horizontal calibrated bar
divided into four category segments, with a tick scale beneath it and the total
in 40px mono. It reads as one gauge showing composition.

```
┌──────────────────────────────────────────────────────────────┐
│ ◈ ECOMARK      Log action  Claims  Balance  Trades    24.3 ▾ │  ← readout bar
│ ·  ·   ·  ·  ·    ·   ·  ·   ·   ·  ·  ·   ·  ·   ·  ·  ·    │  ← particle field
├──────────────────────────────────────────────────────────────┤
│  TOTAL HOLDINGS                                              │
│  24.3                                                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │████████████████████│███████│███│██████                 │  │  ← one gauge
│  └────────────────────────────────────────────────────────┘  │
│  ╵    ╵    ╵    ╵    ╵    ╵    ╵    ╵    ╵    ╵    ╵    ╵    │  ← tick scale
│  land 12.5   energy 4.5   water 1.2   transport 6.1          │
├──────────────────────────────────────────────────────────────┤
│  RECENT ACTIVITY                          ⋯ filter   ↕ sort  │
│  ────────────────────────────────────────────────────────────│
│  tree_planting   satellite   14 Aug 09:12   ● minted    +4.5 │
│  energy_reduction ocr        14 Aug 08:40   ◐ verifying    — │
└──────────────────────────────────────────────────────────────┘
```

Depth comes from surface steps plus a 1px inset top highlight, never from a
drop shadow alone. Radii track object scale: 2px instruments, 6px rows, 14px
panels.

## 5. Signature element — the atmospheric field

One particle system, used twice, telling one story.

**On the landing page** it is the logo. Particles drift as a diffuse cloud —
unmeasured atmospheric carbon — then coalesce into the EcoMark emblem: a
calibration seal built from a ring, radial tick marks and a central hexagon.
It holds, rotating slowly. Pressing **Enter** disperses the seal; the particles
fly forward and settle into the app.

**In the app** the same field sits behind the readout header, diffuse and calm.
Its lattice density reflects the user's total balance and its colour mix
reflects category composition — a user holding mostly land credits sees a
green-dominant field. When a claim reaches `verified`, particles pull from the
diffuse cloud into the ordered lattice.

So the mark *is* the mechanism: carbon measured and captured. The 3D shows
real state, never decoration.

After the entrance, the interface goes quiet. This is a serious subject and the
spectacle earns its place once, at the door.

### Constraints
2000 / 1000 / 400 particles by breakpoint · one `InstancedMesh`, one draw call ·
`dpr={[1,2]}` · paused on hidden tab and off-screen · lazy-loaded, never
delaying first paint · never intercepting pointer events.

### Fallback — a designed state, not a failure
Under `prefers-reduced-motion`, WebGL failure, ≤4 cores, or viewport < 640px:
a static radial gradient in signal-dim over the void, with a sparse grid of
positioned dots at low opacity. It reads as a calm sensor field at rest.

## 6. Motion

Tokens: 80 / 160 / 280 / 520ms, `ease-out cubic-bezier(0.16,1,0.3,1)`.

Three moments earn real budget: the entrance (seal → dispersal), the
verification sequence (staged progress, then particles into the lattice with
the credit figure counting up in tabular mono), and the swap confirm (two
columns merging as credits cross). Everything else gets ≤160ms micro-feedback.

Nothing triggered by polling animates — re-animating every 2 seconds is the
clearest tell that software was generated.

## 7. Copy

Instrument voice: precise, active, never apologetic. Buttons state what
happens and keep their name through the flow ("Submit claim" → "Claim
submitted"). Errors say what happened and what to do next. Empty states invite
the first action rather than reporting absence.

## 8. Critique against §8.1

| Failure pattern | Status |
|---|---|
| Sidebar + top bar + stat card grid | Avoided — readout bar, single gauge, no card grid |
| Bootstrap / default Tailwind | Avoided — every value tokenised here |
| Cream + serif + terracotta | Not present, no serif in the system |
| Near-black + single acid accent as the only idea | **Was the previous pass.** Fixed: green-cast ground, signal reserved to verified state, four bound category hues, texture from the field |
| Blue-and-white corporate | Avoided — no blue in chrome; `water` is a bound data hue only |
| Leaves, trees, globes as iconography | Avoided — the globe is a coordinate *input*, never an icon; the mark is a calibration seal |
| White rounded cards on light grey | Avoided — dark strata |
| Default framework fonts | Avoided — three deliberate faces |
