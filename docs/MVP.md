# Jam Session Orchestrator - MVP Specification

## Overview

A web app that orchestrates jam sessions by coordinating when musicians should play, start, or solo. Uses visual cues via a circular sector display and an audible metronome to keep everyone in sync.

## User Flow

### 1. Setup Phase
- User enters number of musicians (2-8)
- User optionally names each musician (defaults: "Player 1", "Player 2", etc.)
- User sets tempo (BPM: 60-200, default: 120)
- User sets bars per phase (how many bars before next musician joins or solo rotates)

### 2. Play Phase
- User presses Play
- Metronome starts
- **Staggered Entry**: Musicians join one by one, each after N bars
- **Solo Rotation**: Once all musicians are playing, solos rotate every N bars
- User can Pause/Resume or Stop at any time

### 3. End
- User presses Stop to end session
- Returns to setup phase

---

## Core Mechanics

### Timing
- **Beat**: Single metronome tick
- **Bar**: 4 beats (4/4 time signature for MVP)
- **Phase**: Configurable number of bars (default: 4 bars = 16 beats)

### Session Phases

```
Phase 1: Musician 1 starts (solo)
Phase 2: Musician 2 joins, Musician 1 maintains
Phase 3: Musician 3 joins, others maintain
...
Phase N: All playing, Musician 1 solos
Phase N+1: All playing, Musician 2 solos
... (solo rotation continues until stopped)
```

### Musician States
| State | Meaning | Visual |
|-------|---------|--------|
| **Inactive** | Not yet in the jam | Dimmed/grayed sector |
| **Starting** | About to join (1 bar warning) | Pulsing/flashing sector |
| **Playing** | Actively playing, maintaining rhythm | Normal brightness |
| **Soloing** | Featured player, can improvise freely | Highlighted/glowing, enlarged |

---

## Interface Design

### Main View: The Circle

```
        ┌─────────────┐
       ╱   Player 1    ╲
      ╱    (orange)     ╲
     ╱                   ╲
    │ Player 4  ●  Player 2│
    │  (purple)    (blue)  │
     ╲                   ╱
      ╲    Player 3    ╱
       ╲    (green)   ╱
        └─────────────┘
```

- Circle divided into equal sectors (one per musician)
- Center shows: current bar count, BPM, play/pause button
- Each sector displays:
  - Musician name
  - Current state (via color intensity/animation)
  - "SOLO" badge when soloing

### Color Palette (for up to 8 musicians)
1. Orange (#F97316)
2. Blue (#3B82F6)
3. Green (#22C55E)
4. Purple (#A855F7)
5. Pink (#EC4899)
6. Cyan (#06B6D4)
7. Yellow (#EAB308)
8. Red (#EF4444)

### State Visualizations
- **Inactive**: 30% opacity, grayscale
- **Starting**: Pulsing animation (opacity 50%-100%), sector border glows
- **Playing**: 100% opacity, normal color
- **Soloing**: 100% opacity, glowing border, subtle scale up (1.05x), "SOLO" badge

### Controls
- **Play/Pause**: Center of circle (large button)
- **Stop**: Below circle (resets session)
- **Settings**: Accessible before Play (BPM, bars per phase)

---

## Audio

### Metronome
- Tick sound on every beat
- Accent (different sound) on beat 1 of each bar
- Visual beat indicator synced with audio

### Future (post-MVP)
- Countdown sounds before state changes
- Voice announcements ("Player 2, get ready!")

---

## Setup Screen

```
┌────────────────────────────────────────┐
│         JAM SESSION SETUP              │
├────────────────────────────────────────┤
│                                        │
│  Musicians: [  4  ] [-] [+]            │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 🟠 Player 1: [______________]    │  │
│  │ 🔵 Player 2: [______________]    │  │
│  │ 🟢 Player 3: [______________]    │  │
│  │ 🟣 Player 4: [______________]    │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Tempo: [120] BPM                      │
│  Bars per phase: [4]                   │
│                                        │
│         [ ▶ START JAM ]                │
│                                        │
└────────────────────────────────────────┘
```

---

## Technical Requirements

### Audio
- Web Audio API for precise metronome timing
- Pre-schedule beats to avoid JavaScript timing jitter
- Two audio samples: normal tick, accented tick

### State Management
- Current phase (entry phase or solo rotation)
- Current beat within bar
- Current bar within phase
- Each musician's state
- Playing/paused status

### Animations
- CSS transitions for state changes
- RequestAnimationFrame for smooth pulsing
- Sync visual beat indicator with audio

---

## MVP Scope

### In Scope
- [x] Setup screen with musician count and names
- [x] BPM and bars-per-phase configuration
- [x] Circular sector visualization
- [x] Metronome with accented downbeats
- [x] Staggered musician entry
- [x] Solo rotation after all joined
- [x] Play/Pause/Stop controls
- [x] Visual state indicators (inactive, starting, playing, soloing)
- [x] Beat/bar counter display

### Out of Scope (Future)
- [ ] Custom time signatures (5/4, 7/8, etc.)
- [ ] Save/load session presets
- [ ] Multiple solo musicians simultaneously
- [ ] Audio recording
- [ ] Remote sync (multiple devices)
- [ ] Custom color themes
- [ ] Voice announcements
- [ ] Tap tempo

---

## Example Session (4 musicians, 4 bars/phase, 120 BPM)

| Time | Bar | Phase | Event |
|------|-----|-------|-------|
| 0:00 | 1 | 1 | Player 1 starts (soloing alone) |
| 0:08 | 5 | 2 | Player 2 joins, Player 1 maintains |
| 0:16 | 9 | 3 | Player 3 joins |
| 0:24 | 13 | 4 | Player 4 joins, all now playing |
| 0:32 | 17 | 5 | Player 1 solos, others maintain |
| 0:40 | 21 | 6 | Player 2 solos |
| 0:48 | 25 | 7 | Player 3 solos |
| 0:56 | 29 | 8 | Player 4 solos |
| 1:04 | 33 | 9 | Player 1 solos again (rotation continues) |
| ... | ... | ... | Until user presses Stop |
