# PHASE 2: Terminal Components & Visual Effects
## Claude Community Kenya — Next.js Website Build

**Role:** Effects & Components Engineer
**Estimated Scope:** Custom terminal components, animations, interactive elements
**Dependency:** Phase 1 (Foundation) must be complete

---

## Objective

Build all specialized terminal-themed components and visual effects that define the "Terminal Noir" aesthetic. These components will be reused across all pages to create a cohesive hacker/developer experience.

---

## Deliverables

### 1. Terminal Window Component

#### `/components/terminal/TerminalWindow.tsx`
A reusable card component styled as a terminal window.

**Features:**
- Macintosh-style window controls at top (● ● ● in customizable colors)
- Window title bar with custom title (e.g., "claude-community-kenya@nairobi:~$")
- Content area with optional monospace font
- Box-drawing characters for borders (╔═╗║╚╝)
- Configurable padding and content type
- Hover state: lifts with subtle shadow and green glow
- Dark background matching terminal aesthetic

**Props:**
```typescript
interface TerminalWindowProps {
  title?: string
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'command' | 'code'
  showDots?: boolean
  glowing?: boolean
}
```

**Example Usage:**
```jsx
<TerminalWindow title="claude-community-kenya@nairobi:~$" glowing>
  <p>$ whoami</p>
  <p>> Claude Community Kenya 🇰🇪</p>
</TerminalWindow>
```

---

### 2. Typing Animation Component

#### `/components/terminal/TypingAnimation.tsx`
Simulates a terminal typing effect where text appears character-by-character.

**Features:**
- Configurable typing speed (milliseconds per character)
- Optional cursor (blinking `▊`)
- Loop option (repeats after completion)
- Plays/pauses based on visibility (Intersection Observer)
- Respects `prefers-reduced-motion` (shows all text instantly)
- Can show/hide cursor independently

**Props:**
```typescript
interface TypingAnimationProps {
  text: string | string[]
  speed?: number // ms per character
  showCursor?: boolean
  loop?: boolean
  delay?: number // before animation starts
  onComplete?: () => void
}
```

**Example Usage:**
```jsx
<TypingAnimation
  text={[
    "$ whoami",
    "> Claude Community Kenya 🇰🇪",
    "$ status --check",
    "> 🟢 ACTIVE"
  ]}
  speed={50}
  showCursor
/>
```

---

### 3. Matrix Rain Background Effect

#### `/components/terminal/MatrixRain.tsx`
Subtle falling character animation in background (like The Matrix rain effect).

**Features:**
- Canvas-based for performance
- Subtle green characters falling down
- Very low opacity to not interfere with content
- Used on hero sections only
- Fully respects `prefers-reduced-motion`
- Configurable speed, density, character set
- Auto-cleanup on unmount (memory efficient)

**Props:**
```typescript
interface MatrixRainProps {
  speed?: number // ms per frame
  density?: number // 0-1 scale
  opacity?: number // 0-1 scale
  className?: string
}
```

**Example Usage:**
```jsx
<div className="relative h-screen">
  <MatrixRain opacity={0.05} speed={50} density={0.3} />
  {/* Hero content on top */}
</div>
```

---

### 4. Command Palette Component

#### `/components/terminal/CommandPalette.tsx`
Global spotlight-search accessible via `Ctrl+K` or `/` (anywhere on site).

**Features:**
- Modal overlay with terminal styling
- Input field prefixed with `$` symbol
- Fuzzy search across all pages and sections
- Shows recent navigation history
- Keyboard shortcuts displayed in results
- Escape key to close
- Arrow keys to navigate results
- Enter to select

**Search Categories:**
- Pages (Home, Events, Resources, etc.)
- Events (searchable by name, date, city)
- Blog posts (searchable by title, tag)
- FAQ items
- Resources

**Keyboard Shortcuts:**
- `Ctrl+K` / `Cmd+K` — Open palette
- `Escape` — Close palette
- Arrow keys — Navigate results
- `Enter` — Select result
- `/` — Open palette (alternative)

**Props:**
```typescript
interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (path: string) => void
}
```

---

### 5. Glitch Text Effect Component

#### `/components/terminal/GlitchText.tsx`
CSS-based glitch effect on hover for headings and prominent text.

**Features:**
- Uses `clip-path` CSS animation
- Triggers on hover (and optionally on mount)
- Respects `prefers-reduced-motion`
- Layered color shift (slight offset red/cyan glitch)
- Configurable intensity and duration
- Works on any text element

**Props:**
```typescript
interface GlitchTextProps {
  children: React.ReactNode
  intensity?: 'subtle' | 'medium' | 'intense'
  trigger?: 'hover' | 'always' | 'once'
  className?: string
}
```

**Example Usage:**
```jsx
<GlitchText intensity="subtle">
  <h1>Claude Community Kenya</h1>
</GlitchText>
```

---

### 6. CRT Glow Effect Component

#### `/components/terminal/CRTGlow.tsx`
Applies a subtle green phosphor CRT monitor glow effect via CSS box-shadow.

**Features:**
- Nested box-shadows creating glow layer effect
- Green-primary color with variable opacity
- Transitions smoothly on hover
- Configurable intensity
- Respects motion preferences

**Props:**
```typescript
interface CRTGlowProps {
  children: React.ReactNode
  intensity?: 'subtle' | 'medium' | 'intense'
  color?: 'green' | 'amber' | 'red' | 'cyan'
}
```

---

### 7. Loading Bar Component

#### `/components/terminal/LoadingBar.tsx`
Full-viewport-width progress indicator styled as a terminal loading bar.

**Features:**
- Appears at top of page during navigation
- Animated bar that progresses smoothly
- Terminal-styled text overlay: "Loading /page-name... [████████░░░░░] 60%"
- Auto-hides after route change completes
- Green color matching theme
- Very performant (CSS animations)

**Props:**
```typescript
interface LoadingBarProps {
  isLoading: boolean
  currentPath: string
  progress?: number // 0-100
}
```

---

### 8. Typing Cursor Component

#### `/components/terminal/TypingCursor.tsx`
Standalone blinking block cursor animation (`▊`).

**Features:**
- Pure CSS animation for performance
- Respects `prefers-reduced-motion`
- Configurable blink speed
- Green color
- Can be inline or block display

**Props:**
```typescript
interface TypingCursorProps {
  blinkSpeed?: number // ms
  className?: string
}
```

---

### 9. Scanline Overlay

#### `/components/terminal/Scanlines.tsx`
Very subtle horizontal scan lines across page (TV/monitor effect).

**Features:**
- Applied to page background
- 0.03-0.05 opacity (barely visible)
- CSS-based pattern
- Uses single-pixel SVG or CSS pattern-image
- Global effect (applied in layout)

---

### 10. Section Reveal Animation

#### `/components/terminal/ScrollReveal.tsx`
Fade-in and slide animations triggered on scroll.

**Features:**
- Uses Intersection Observer API
- Configurable stagger delay (for multiple elements)
- Direction: up, down, left, right
- Smooth easing
- Respects `prefers-reduced-motion`
- Framer Motion-based for smooth performance

**Props:**
```typescript
interface ScrollRevealProps {
  children: React.ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number // ms
  stagger?: number // ms between children
}
```

---

### 11. Command Prefix Component

#### `/components/terminal/CommandPrefix.tsx`
Reusable `$` or `>` prefix for interactive elements.

**Features:**
- Styled with terminal font and green color
- Used on buttons, links, and command prompts
- Configurable symbol (`$`, `>`, `#`)

**Props:**
```typescript
interface CommandPrefixProps {
  symbol?: '$' | '>' | '#'
  className?: string
}
```

---

## Integration into Layout

### Update `/components/layout/Navbar.tsx`
- Integrate CommandPalette component
- Add keyboard shortcut listener
- Make command palette globally accessible

### Update `/app/layout.tsx`
- Add LoadingBar component
- Add Scanlines overlay to body
- Add global keyboard listener for Ctrl+K
- Wrap content in PageTransition

---

## CSS Enhancements

### Update `/styles/globals.css`
Add keyframe animations for:
- Blinking cursor (`▊`)
- Glitch effect (clip-path animation)
- Loading bar progress
- Scanline flicker (optional, subtle)
- CRT glow pulse (optional)

### Create `/styles/terminal-effects.css`
- Matrix rain canvas styling
- Terminal window styling
- Text animation keyframes
- Responsive adjustments for mobile

---

## Accessibility Requirements

- [ ] All animations respect `prefers-reduced-motion`
- [ ] Text remains readable with glitch effects
- [ ] Command palette keyboard accessible
- [ ] Loading bar doesn't interfere with page interactions
- [ ] Color contrast meets WCAG AA
- [ ] No seizure-inducing effects (safe blink speeds)

---

## Performance Optimization

- [ ] Canvas-based effects (MatrixRain) use `requestAnimationFrame`
- [ ] CSS animations used over JavaScript where possible
- [ ] Intersection Observer for scroll-triggered animations
- [ ] Lazy-load heavy effects (MatrixRain only loads on hero sections)
- [ ] Memory cleanup on component unmount
- [ ] Test Lighthouse scores with effects enabled

---

## Testing Checklist

- [ ] All components render without errors
- [ ] Typing animation works and respects motion preferences
- [ ] Matrix rain is performant (no jank on 60fps target)
- [ ] Command palette opens/closes smoothly
- [ ] Glitch effect is smooth on hover
- [ ] Loading bar appears during navigation
- [ ] Mobile: all effects work smoothly on smaller screens
- [ ] Keyboard navigation works throughout
- [ ] Effects disable properly with `prefers-reduced-motion`

---

## File Structure Created

```
components/terminal/
├── TerminalWindow.tsx
├── TypingAnimation.tsx
├── MatrixRain.tsx
├── CommandPalette.tsx
├── GlitchText.tsx
├── CRTGlow.tsx
├── LoadingBar.tsx
├── TypingCursor.tsx
├── Scanlines.tsx
├── ScrollReveal.tsx
└── CommandPrefix.tsx

styles/
├── terminal-effects.css (new)
└── globals.css (updated)
```

---

## Success Criteria

- All terminal components render correctly
- Animations are smooth (60 FPS on modern devices)
- Effects respect accessibility preferences
- Command palette functional globally
- No performance degradation
- Components integrate seamlessly into Phase 3 pages
- Lighthouse performance score remains 90+
