# Feature: Terminal-Style Interactive Application Form

## Context
**Project:** Claude Community Kenya — Next.js website with "Terminal Noir" design system
**Page:** `/join` (replace current static join page at `src/app/join/page.tsx`)
**Design Reference:** The official Claude Community application at https://claude.community uses a fully interactive terminal where users type responses to prompts, step-by-step, like a real command-line application. We want to recreate and improve upon this experience for Claude Community Kenya.

## What We're Building

A **fully interactive terminal application form** that replaces the current static join page. Users interact with it like a real terminal — reading prompts, typing responses, seeing feedback — all within a TerminalWindow component. The experience should feel like running `./apply.sh` in a terminal.

---

## Existing Components to Leverage

These components already exist and MUST be reused (do NOT recreate them):

| Component | Path | Purpose |
|-----------|------|---------|
| `TerminalWindow` | `src/components/terminal/TerminalWindow.tsx` | Container with title bar, window dots, border |
| `TypingAnimation` | `src/components/terminal/TypingAnimation.tsx` | Types text character-by-character |
| `TypingCursor` | `src/components/terminal/TypingCursor.tsx` | Blinking cursor |
| `CommandPrefix` | `src/components/terminal/CommandPrefix.tsx` | Shell `$` prefix |
| `GlitchText` | `src/components/terminal/GlitchText.tsx` | Glitch effect for headers |
| `CRTGlow` | `src/components/terminal/CRTGlow.tsx` | Glow effects |
| `ScrollReveal` | `src/components/terminal/ScrollReveal.tsx` | Scroll animations |
| `Card` | `src/components/ui/Card.tsx` | Card with terminal title bar |
| `CountUp` | `src/components/ui/CountUp.tsx` | Animated number counter |

**Design tokens** are in `src/app/globals.css` — use CSS variables (`--green-primary`, `--bg-primary`, `--amber`, `--cyan`, etc.) via Tailwind classes (`text-green-primary`, `bg-bg-card`, etc.).

**Fonts:** JetBrains Mono for all terminal text (`font-mono`), IBM Plex Sans for body text (`font-sans`).

---

## Page Structure & Flow

### Section 1: Community Pulse Header (Static, Above Terminal)

Before the terminal, show a brief community stats bar:

```
╔══════════════════════════════════════════════════╗
║  COMMUNITY PULSE                                 ║
╚══════════════════════════════════════════════════╝

  30+ members  •  3 events  •  2 cities  •  1 mission

  🇰🇪 EAST AFRICA'S FIRST CLAUDE DEVELOPER COMMUNITY
```

Use `CountUp` component for the numbers. Wrap in `TerminalWindow` with title `community-pulse`.

### Section 2: The Interactive Terminal Application

This is the main feature — a large `TerminalWindow` component (title: `apply.sh — bash`) that contains the entire interactive form flow.

#### Boot Sequence (Auto-plays on page load)

```
$ ./apply.sh
Initializing Claude Community Kenya application...

╔══════════════════════════════════════════════════╗
║        CLAUDE COMMUNITY KENYA APPLICATION        ║
╚══════════════════════════════════════════════════╝

We're building East Africa's first Claude developer
community. Want in? Let's go.
```

Use `TypingAnimation` for the boot text. After boot completes, start the interactive form.

#### Interactive Form Steps

Each step follows this pattern:
1. A **prompt question** appears (typed out via TypingAnimation in green/amber)
2. A `~/claude-community-kenya $` prompt appears with blinking cursor
3. User types their response in an **actual input field styled as terminal text**
4. User presses Enter to submit
5. **Feedback line** appears (acknowledging input, in cyan or green)
6. Next question types out

**Step 1: Full Name**
```
What is your full name?

  ~/claude-community-kenya $  [user types here]

[After input] Welcome, {name}! 🤝
```

**Step 2: Email Address**
```
What's your email address?
(We'll send you community updates and event invites)

  ~/claude-community-kenya $  [user types here]

[After input] Email captured! 📧
```

**Step 3: City**
```
Which city are you based in?
Options:
  1. Nairobi
  2. Mombasa
  3. Other (type your city)

  ~/claude-community-kenya $  [user types here]

[After input] {city} — great! We're growing there. 🏙️
```

**Step 4: Role / Occupation**
```
What's your role?
(e.g., Student, Software Engineer, Data Scientist, Designer, Curious Human)

  ~/claude-community-kenya $  [user types here]

[After input] {role} — nice!
```

**Step 5: Experience with Claude**
```
How familiar are you with Claude / Claude Code?
  1. Never used it
  2. Tried it a few times
  3. Use it regularly
  4. Can't code without it 😤

  ~/claude-community-kenya $  [user types here]

[After input, if 4] One of us! 🔥
[After input, if 1-2] Perfect — we'll get you up to speed.
[After input, if 3] Solid. You'll fit right in.
```

**Step 6: Why Join? (Optional)**
```
Why do you want to join Claude Community Kenya?
(A brief answer is fine — or press Enter to skip)

  ~/claude-community-kenya $  [user types here]

[After input] Thanks for sharing!
[If skipped] No worries — actions speak louder. 💪
```

**Step 7: How Did You Hear About Us?**
```
How did you hear about us?
  1. Twitter/X
  2. LinkedIn
  3. Discord
  4. Friend/colleague
  5. Meetup event
  6. Other

  ~/claude-community-kenya $  [user types here]

[After input] Got it!
```

#### Processing Animation

After all steps complete:

```
Processing your application...
[████████████████████░░░░] 80%
[████████████████████████] 100%

  ╔══════════════════════════════════════════════════╗
  ║          🎉 APPLICATION SUBMITTED!               ║
  ╚══════════════════════════════════════════════════╝

  Welcome to Claude Community Kenya, {name}!

  ✅ APPLICATION RECEIVED

  Here's what happens next:

  1. Join our Discord → [link]
  2. Follow us on Twitter → [link]
  3. Check upcoming events → /events

  📧 Check your email — we just sent you a confirmation.

  Easter Eggs Found: 0/5
  HINT: Explore the terminal like a developer would...
```

The progress bar should animate smoothly. Use green for the filled portion.

---

## Technical Implementation Details

### Component Architecture

Create these new files:

```
src/
├── app/join/
│   └── page.tsx                    # Updated — wraps TerminalApplication
├── components/terminal/
│   └── TerminalApplication.tsx     # Main interactive terminal form (client component)
```

The `TerminalApplication.tsx` is a `"use client"` component. The page.tsx can remain a server component that wraps it with metadata.

### State Management

Use `useReducer` for form state:

```typescript
type FormStep =
  | 'boot'
  | 'name'
  | 'email'
  | 'city'
  | 'role'
  | 'experience'
  | 'why'
  | 'referral'
  | 'processing'
  | 'complete';

interface FormState {
  currentStep: FormStep;
  responses: {
    name: string;
    email: string;
    city: string;
    role: string;
    experience: string;
    why: string;
    referral: string;
  };
  history: TerminalLine[];  // All rendered lines (prompts + responses + feedback)
  isTyping: boolean;        // Whether TypingAnimation is active
  easterEggsFound: number;
}
```

### Terminal Line Rendering

The terminal content is a scrollable list of "lines" that builds up as the user progresses:

```typescript
interface TerminalLine {
  id: string;
  type: 'system' | 'prompt' | 'input' | 'response' | 'feedback' | 'ascii-art' | 'progress';
  content: string;
  color?: 'green' | 'amber' | 'cyan' | 'red' | 'dim' | 'primary';
  animate?: boolean;  // Whether to use TypingAnimation
}
```

Each line renders differently based on type:
- `system`: dim text, monospace
- `prompt`: green text with question
- `input`: shows `~/claude-community-kenya $` prefix + user's typed text
- `response`: the user's actual input (after pressing Enter)
- `feedback`: cyan/green acknowledgment text
- `ascii-art`: pre-formatted box-drawing art
- `progress`: animated progress bar

### Input Handling

- The input field is positioned at the bottom of the terminal (sticky within the terminal window)
- Styled to look like a terminal prompt: `~/claude-community-kenya $ ` prefix, green caret, monospace font, no visible border
- Pressing Enter submits the current step
- Input field auto-focuses after each TypingAnimation completes
- For numbered options (city, experience, referral), accept both the number AND the text
- Basic validation: name required, email format check, show error inline like `bash: invalid email format`

### Auto-Scroll

The terminal content area should auto-scroll to bottom as new lines appear, mimicking a real terminal. Use `scrollIntoView({ behavior: 'smooth' })` on a ref at the bottom.

### Progress Bar Component

For the processing animation, create an inline progress bar:

```
[████████████░░░░░░░░] 60%
```

Animate from 0% to 100% over ~2.5 seconds. Use green (`text-green-primary`) for filled blocks `█` and dim (`text-text-dim`) for empty blocks `░`.

### Form Submission

For v1, form data is **NOT sent to a backend**. Instead:
1. Store responses in state
2. Show the success screen
3. Construct a `mailto:` link or Discord invite as the CTA
4. Optionally store in `localStorage` so returning users see "Welcome back, {name}!"

In a future phase, this can connect to an API (Supabase, Google Forms, etc.).

### Easter Egg Hooks

- If user types `help` at any prompt → Show available commands hint
- If user types `sudo` anything → "Nice try. No root access here. 😏"
- If user types `ls` → List the form steps
- If user types `clear` → Joke: "You can't clear your destiny. Keep going."
- If user types `exit` → "No escape. You're one of us now. 🇰🇪"
- Track easter eggs found in state, display count at the end

### Accessibility

- The terminal must be keyboard-navigable (it's fundamentally keyboard-driven anyway)
- Screen readers should be able to read the prompts and feedback
- Use `aria-live="polite"` on the terminal output area so new lines are announced
- Respect `prefers-reduced-motion`: skip TypingAnimation, show text instantly
- Input field must have proper `aria-label` for each step
- The numbered options should also be clickable/tappable for mobile users

### Mobile Considerations

- On mobile, the terminal should be full-width
- The input field should not be hidden behind the mobile keyboard — ensure it's always visible
- Numbered options should be large enough to tap (or render as buttons below the terminal)
- Consider showing option buttons alongside typed input for mobile UX

### Returning Users

Check `localStorage` for previous application:
```typescript
const saved = localStorage.getItem('cck-application');
if (saved) {
  // Show: "Welcome back, {name}! Your application is on file."
  // Still show the full terminal but with a "re-apply" option
}
```

---

## Section 3: Below the Terminal (Keep from Current Page)

After the terminal application, keep the existing content from the current join page but condensed:

- **Quick Links Row**: Discord | LinkedIn | Twitter/X | Events — horizontal, compact
- **Contribute Section**: Speak, Organize, Submit, Partner cards (keep existing)
- **Contact Info**: Email + Discord link

---

## Styling Requirements

- All text inside terminal: `font-mono` (JetBrains Mono)
- Terminal background: `bg-bg-primary` or `bg-bg-card`
- Green glow on the terminal window: use `CRTGlow` component with `color="green"` `intensity="subtle"`
- Input caret color: green (`caret-green-primary` or CSS `caret-color: var(--green-primary)`)
- ASCII box art borders: use Unicode box-drawing characters (═, ║, ╔, ╗, ╚, ╝)
- Smooth scroll behavior within terminal
- Terminal min-height: `60vh` on desktop, `70vh` on mobile
- Max-width: `4xl` (896px) — terminal shouldn't stretch too wide

---

## Verification Checklist

After implementation:
- [ ] `npm run build` passes with zero errors
- [ ] Page loads and boot sequence auto-plays
- [ ] All 7 form steps work sequentially
- [ ] Input validation works (empty name shows error, bad email shows error)
- [ ] Numbered options accept number or text
- [ ] Processing animation plays after last step
- [ ] Success screen shows with correct name
- [ ] Easter egg commands work (help, sudo, ls, clear, exit)
- [ ] Auto-scroll follows new terminal output
- [ ] Mobile: input stays visible when keyboard opens
- [ ] Mobile: numbered options are tappable
- [ ] Accessibility: screen reader can follow the flow
- [ ] `prefers-reduced-motion` disables typing animations
- [ ] `localStorage` saves completed application
- [ ] Returning users see welcome-back message
- [ ] All existing terminal components reused (not recreated)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Design matches Terminal Noir aesthetic
- [ ] No inline styles — all Tailwind + CSS variables

---

## Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| **CREATE** | `src/components/terminal/TerminalApplication.tsx` | Main interactive terminal form component |
| **MODIFY** | `src/app/join/page.tsx` | Replace current static content with TerminalApplication + condensed links below |

Do NOT create additional files unless absolutely necessary. Keep it to these two files.

---

## What NOT to Do

- Do NOT install any new packages (no react-hook-form, no zod — this is a simple sequential form)
- Do NOT create a separate backend or API route
- Do NOT use `<form>` HTML element — this is a terminal simulation, not a traditional form
- Do NOT break the existing terminal components — import and use them as-is
- Do NOT add loading spinners from UI libraries — use the terminal progress bar aesthetic
- Do NOT over-engineer with complex state machines — useReducer is sufficient
- Do NOT add analytics or tracking in this phase
