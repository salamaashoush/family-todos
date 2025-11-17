# Feature Implementation Plan

## Overview
This document outlines the implementation plan for three major features:
1. Realtime Support
2. Theme System
3. Layout Options

---

## 1. Realtime Support

### Goal
Enable real-time synchronization of task completions and updates across all connected clients so family members can see changes instantly.

### Technical Approach: Server-Sent Events (SSE)

**Why SSE?**
- Native browser support
- One-way server→client is sufficient for our use case
- Simple to implement with Bun/Node.js
- No additional dependencies needed
- Automatic reconnection handling

### Implementation Plan

#### Phase 1: SSE Server Setup
**File**: `src/server/realtime.ts`

```typescript
// Event stream endpoint
export const eventStream = createServerFn({ method: "GET" })
  .handler(async ({ request }) => {
    // Create SSE response with proper headers
    // Keep connection alive
    // Send heartbeat every 30s
  });

// Event broadcaster
export const broadcast = (event: {
  type: 'task_completed' | 'task_uncompleted' | 'timeslot_completed' | 'achievement_unlocked'
  memberId: number
  data: any
}) => {
  // Send to all connected clients
};
```

**Features**:
- Heartbeat to keep connection alive
- Automatic client reconnection
- Event types: task updates, achievements, stats changes

#### Phase 2: Client Integration
**File**: `src/hooks/useRealtime.ts`

```typescript
export function useRealtime() {
  useEffect(() => {
    const eventSource = new EventSource('/api/events')

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch(data.type) {
        case 'task_completed':
          queryClient.invalidateQueries(['completions'])
          // Show toast notification
          break
        case 'achievement_unlocked':
          queryClient.invalidateQueries(['memberAchievements'])
          // Trigger celebration
          break
      }
    }

    return () => eventSource.close()
  }, [])
}
```

#### Phase 3: Integration Points

**Update these functions** to broadcast events:
- `completeTodo` → broadcast 'task_completed'
- `uncompleteTodo` → broadcast 'task_uncompleted'
- `updateStats` → check for achievements → broadcast 'achievement_unlocked'

#### Phase 4: UI Enhancements

**Real-time Indicators**:
- Toast notifications for family member actions
  - "Dad completed Morning Routine! 🎉"
  - "Mom earned 'Week Warrior' achievement! 🏆"
- Optional: Active user indicators
- Optional: Live progress bars

### Files to Create/Modify
- `src/server/realtime.ts` (new)
- `src/hooks/useRealtime.ts` (new)
- `src/server/completions.ts` (modify - add broadcasts)
- `src/server/statistics.ts` (modify - add broadcasts)
- `src/routes/index.tsx` (modify - use hook)
- `src/components/RealtimeToast.tsx` (new)

### Estimated Time: 1.5-2 hours

---

## 2. Theme System

### Goal
Allow users to customize the app's appearance with multiple color themes and dark mode support.

### Technical Approach: Tailwind + CSS Variables + Context

**Themes to Implement**:
1. **Light** (default) - Current purple/pink gradient
2. **Dark** - Dark backgrounds, muted colors
3. **Ocean** - Blue/teal color scheme
4. **Sunset** - Orange/red warm colors
5. **Forest** - Green/brown natural colors
6. **Candy** - Pink/purple vibrant (current but more intense)

### Implementation Plan

#### Phase 1: Theme Configuration
**File**: `src/config/themes.ts`

```typescript
export const themes = {
  light: {
    name: 'Light',
    colors: {
      primary: '#9333ea',      // purple-600
      secondary: '#ec4899',    // pink-600
      accent: '#f59e0b',       // amber-500
      background: 'from-blue-100 via-purple-100 to-pink-100',
      card: '#ffffff',
      text: '#1f2937',
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#a78bfa',      // purple-400
      secondary: '#f472b6',    // pink-400
      accent: '#fbbf24',       // amber-400
      background: 'from-gray-900 via-purple-950 to-gray-900',
      card: '#1f2937',
      text: '#f9fafb',
    }
  },
  ocean: {
    name: 'Ocean',
    colors: {
      primary: '#0891b2',      // cyan-600
      secondary: '#06b6d4',    // cyan-500
      accent: '#0ea5e9',       // sky-500
      background: 'from-cyan-100 via-blue-100 to-teal-100',
      card: '#ffffff',
      text: '#1f2937',
    }
  },
  // ... more themes
}
```

#### Phase 2: Theme Context
**File**: `src/contexts/ThemeContext.tsx`

```typescript
const ThemeContext = createContext<{
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}>()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<ThemeId>(() => {
    // Load from localStorage
    return localStorage.getItem('theme') || 'light'
  })

  useEffect(() => {
    // Apply theme class to document
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

#### Phase 3: Tailwind Configuration
**File**: `tailwind.config.js`

```javascript
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'theme-primary': 'var(--color-primary)',
        'theme-secondary': 'var(--color-secondary)',
        'theme-accent': 'var(--color-accent)',
      }
    }
  }
}
```

**File**: `src/styles.css`

```css
:root[data-theme="light"] {
  --color-primary: 147 51 234;     /* purple-600 */
  --color-secondary: 236 72 153;   /* pink-600 */
  --color-accent: 245 158 11;      /* amber-500 */
}

:root[data-theme="dark"] {
  --color-primary: 167 139 250;    /* purple-400 */
  --color-secondary: 244 114 182;  /* pink-400 */
  --color-accent: 251 191 36;      /* amber-400 */
}

/* ... more themes */
```

#### Phase 4: Theme Switcher UI
**File**: `src/components/ThemeSwitcher.tsx`

```typescript
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-2">
      {Object.entries(themes).map(([id, config]) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          className={`theme-option ${theme === id ? 'active' : ''}`}
        >
          <div className="theme-preview" style={{
            background: `linear-gradient(${config.colors.background})`
          }} />
          <span>{config.name}</span>
        </button>
      ))}
    </div>
  )
}
```

**Add to header** in `src/routes/index.tsx`

#### Phase 5: Component Updates

**Update color classes throughout**:
- Replace hardcoded `purple-600` with `theme-primary`
- Replace `pink-600` with `theme-secondary`
- Replace `amber-500` with `theme-accent`
- Update gradients to use theme variables

**Files to update**:
- `src/routes/index.tsx`
- `src/routes/admin.tsx`
- All component styles

### Files to Create/Modify
- `src/config/themes.ts` (new)
- `src/contexts/ThemeContext.tsx` (new)
- `src/components/ThemeSwitcher.tsx` (new)
- `src/styles.css` (modify)
- `tailwind.config.js` (modify)
- `src/routes/__root.tsx` (modify - wrap with ThemeProvider)
- `src/routes/index.tsx` (modify - add switcher)
- `src/routes/admin.tsx` (modify - update colors)

### Estimated Time: 45-60 minutes

---

## 3. Layout Options

### Goal
Provide different layout views to accommodate different screen sizes, preferences, and use cases.

### Layout Options

#### 1. Grid Layout (Current - Default)
**Description**: Card-based grid with one column per family member
**Best for**: Desktop, tablets, 2-4 family members
**Current implementation**: Already exists

#### 2. List Layout
**Description**: Single column vertical list showing all timeslots sequentially
**Best for**: Mobile phones, quick overview, many family members
**Features**:
- One timeslot at a time (expandable)
- Member selector at top
- Compact view
- Swipe between members

#### 3. Kanban Layout
**Description**: Horizontal columns for timeslots, cards for members
**Best for**: Desktop, focusing on one timeslot at a time
**Features**:
- Columns = timeslots (Morning, Homework, Bedtime)
- Rows = family members
- Drag-and-drop to reorder (future)

#### 4. Calendar Layout
**Description**: Week view with completion status
**Best for**: Planning ahead, viewing patterns
**Features**:
- 7-day grid
- Cell = day + member
- Color coding by completion percentage
- Click to see details

#### 5. Compact Layout
**Description**: Ultra-compressed view for small screens
**Best for**: Smartwatches, small phones, quick glance
**Features**:
- Minimal text
- Icon-only tasks
- Swipe gestures
- Focus on one member at a time

### Implementation Plan

#### Phase 1: Layout Configuration
**File**: `src/config/layouts.ts`

```typescript
export type LayoutId = 'grid' | 'list' | 'kanban' | 'calendar' | 'compact'

export const layouts = {
  grid: {
    name: 'Grid',
    icon: '⊞',
    description: 'Card view with columns per member',
    responsive: true,
  },
  list: {
    name: 'List',
    icon: '☰',
    description: 'Single column vertical list',
    responsive: true,
  },
  kanban: {
    name: 'Kanban',
    icon: '▦',
    description: 'Columns for timeslots',
    responsive: false, // Desktop only
  },
  calendar: {
    name: 'Calendar',
    icon: '📅',
    description: 'Week view grid',
    responsive: true,
  },
  compact: {
    name: 'Compact',
    icon: '◫',
    description: 'Minimal view for small screens',
    responsive: true,
  }
}
```

#### Phase 2: Layout Context
**File**: `src/contexts/LayoutContext.tsx`

```typescript
const LayoutContext = createContext<{
  layout: LayoutId
  setLayout: (layout: LayoutId) => void
}>()

export function LayoutProvider({ children }) {
  const [layout, setLayout] = useState<LayoutId>(() => {
    // Auto-detect based on screen size
    if (window.innerWidth < 640) return 'list'
    if (window.innerWidth < 1024) return 'grid'
    return 'grid'
  })

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('layout', layout)
  }, [layout])

  return (
    <LayoutContext.Provider value={{ layout, setLayout }}>
      {children}
    </LayoutContext.Provider>
  )
}
```

#### Phase 3: Layout Components

**File**: `src/components/layouts/GridLayout.tsx`
```typescript
// Current implementation - extract to component
```

**File**: `src/components/layouts/ListLayout.tsx`
```typescript
export function ListLayout({ members, timeslots, todos, ... }) {
  const [selectedMember, setSelectedMember] = useState(members[0].id)
  const [expandedTimeslot, setExpandedTimeslot] = useState<number | null>(null)

  return (
    <div className="list-layout">
      {/* Member selector */}
      <div className="member-tabs">
        {members.map(m => (
          <button onClick={() => setSelectedMember(m.id)}>
            {m.avatar && <img src={m.avatar} />}
            {m.name}
          </button>
        ))}
      </div>

      {/* Timeslot list */}
      <div className="timeslot-list">
        {timeslots.map(ts => (
          <TimeslotAccordion
            timeslot={ts}
            expanded={expandedTimeslot === ts.id}
            onToggle={() => setExpandedTimeslot(
              expandedTimeslot === ts.id ? null : ts.id
            )}
          />
        ))}
      </div>
    </div>
  )
}
```

**File**: `src/components/layouts/KanbanLayout.tsx`
```typescript
export function KanbanLayout({ members, timeslots, todos, ... }) {
  return (
    <div className="kanban-layout flex gap-4 overflow-x-auto">
      {timeslots.map(timeslot => (
        <div key={timeslot.id} className="kanban-column min-w-[300px]">
          <h3>{timeslot.name}</h3>
          {members.map(member => (
            <MemberTimeslotCard
              member={member}
              timeslot={timeslot}
              todos={todos.filter(t => t.timeslot_ids.includes(timeslot.id))}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
```

**File**: `src/components/layouts/CalendarLayout.tsx`
```typescript
export function CalendarLayout({ members, weeklyProgress }) {
  return (
    <div className="calendar-layout">
      <table className="w-full">
        <thead>
          <tr>
            <th>Member</th>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <th key={day}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.id}>
              <td>{member.name}</td>
              {weeklyProgress[member.id]?.map(day => (
                <td className={getCompletionColor(day.percentage)}>
                  {day.task_count}/{day.total_tasks}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**File**: `src/components/layouts/CompactLayout.tsx`
```typescript
export function CompactLayout({ members, timeslots, todos, ... }) {
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0)

  // Swipe handlers
  const handlers = useSwipeable({
    onSwipedLeft: () => setCurrentMemberIndex(i => Math.min(i + 1, members.length - 1)),
    onSwipedRight: () => setCurrentMemberIndex(i => Math.max(i - 1, 0)),
  })

  const currentMember = members[currentMemberIndex]

  return (
    <div {...handlers} className="compact-layout p-2">
      {/* Dots indicator */}
      <div className="dots">
        {members.map((_, i) => (
          <span className={i === currentMemberIndex ? 'active' : ''} />
        ))}
      </div>

      {/* Current member tasks - icon only */}
      <div className="member-avatar">
        <img src={currentMember.avatar} />
      </div>

      {timeslots.map(ts => (
        <div key={ts.id} className="timeslot-compact">
          <h4>{ts.name}</h4>
          <div className="task-icons">
            {todos.map(t => (
              <button
                key={t.id}
                onClick={() => handleToggle(t.id, ts.id, currentMember.id)}
                className={isCompleted ? 'completed' : ''}
              >
                {t.symbol}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### Phase 4: Layout Switcher UI
**File**: `src/components/LayoutSwitcher.tsx`

```typescript
export function LayoutSwitcher() {
  const { layout, setLayout } = useLayout()
  const [open, setOpen] = useState(false)

  return (
    <div className="layout-switcher">
      <button onClick={() => setOpen(!open)}>
        {layouts[layout].icon} {layouts[layout].name}
      </button>

      {open && (
        <div className="layout-menu">
          {Object.entries(layouts).map(([id, config]) => (
            <button
              key={id}
              onClick={() => {
                setLayout(id)
                setOpen(false)
              }}
              className={layout === id ? 'active' : ''}
            >
              <span className="icon">{config.icon}</span>
              <div>
                <div className="name">{config.name}</div>
                <div className="description">{config.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### Phase 5: Router Integration
**File**: `src/routes/index.tsx`

```typescript
function Home() {
  const { layout } = useLayout()
  // ... existing code ...

  const renderLayout = () => {
    switch (layout) {
      case 'grid':
        return <GridLayout {...props} />
      case 'list':
        return <ListLayout {...props} />
      case 'kanban':
        return <KanbanLayout {...props} />
      case 'calendar':
        return <CalendarLayout {...props} />
      case 'compact':
        return <CompactLayout {...props} />
      default:
        return <GridLayout {...props} />
    }
  }

  return (
    <div>
      <Header>
        <LayoutSwitcher />
      </Header>
      {renderLayout()}
    </div>
  )
}
```

#### Phase 6: Responsive Auto-Switching

```typescript
// Auto-switch layout based on screen size
useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth < 640 && layout === 'kanban') {
      setLayout('list')
    }
  }

  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [layout])
```

### Files to Create/Modify
- `src/config/layouts.ts` (new)
- `src/contexts/LayoutContext.tsx` (new)
- `src/components/LayoutSwitcher.tsx` (new)
- `src/components/layouts/GridLayout.tsx` (new - extract current)
- `src/components/layouts/ListLayout.tsx` (new)
- `src/components/layouts/KanbanLayout.tsx` (new)
- `src/components/layouts/CalendarLayout.tsx` (new)
- `src/components/layouts/CompactLayout.tsx` (new)
- `src/routes/index.tsx` (modify - use layouts)
- `src/routes/__root.tsx` (modify - wrap with LayoutProvider)

### Dependencies
- `react-swipeable` - For swipe gestures in compact/list layouts

```bash
bun add react-swipeable
```

### Estimated Time: 2-3 hours

---

## Implementation Order (Recommended)

### Sprint 1: Quick Wins (1-1.5 hours)
1. **Theme System** - Most visual impact, easiest to implement
   - Basic light/dark mode first
   - Add 2-3 additional themes
   - Theme switcher in header

### Sprint 2: Enhanced UX (2-3 hours)
2. **Layout Options** - Better mobile experience
   - Extract current to GridLayout
   - Implement ListLayout (most useful)
   - Add layout switcher
   - Optional: Add one more layout (Kanban or Calendar)

### Sprint 3: Collaboration (1.5-2 hours)
3. **Realtime Support** - Family sync
   - SSE server setup
   - Client integration
   - Toast notifications
   - Achievement celebrations

### Total Time: 4.5-6.5 hours

---

## Testing Checklist

### Theme System
- [ ] Theme persists after page reload
- [ ] All components render correctly in each theme
- [ ] Dark mode is readable
- [ ] Celebrations work in all themes
- [ ] Admin panel styled correctly

### Layout Options
- [ ] Each layout displays all data correctly
- [ ] Switching layouts preserves state
- [ ] Responsive breakpoints work
- [ ] Swipe gestures work (compact/list)
- [ ] Layout preference persists

### Realtime Support
- [ ] Events broadcast correctly
- [ ] Clients receive events
- [ ] No memory leaks from SSE connections
- [ ] Reconnection works after disconnect
- [ ] Multiple clients stay in sync
- [ ] Toasts don't spam

---

## Future Enhancements

### Themes
- Per-member theme preferences
- Custom theme builder
- Seasonal themes (Halloween, Christmas)
- Accessibility themes (high contrast, large text)

### Layouts
- Drag-and-drop in Kanban
- Save custom layout configurations
- Split-screen multi-member view
- Full-screen focus mode

### Realtime
- Typing indicators
- Online/offline status
- Collaborative task assignment
- Live progress racing (gamification)

---

## Notes

- All features should be **optional** and have sensible defaults
- **Performance**: Test with 4+ family members and 10+ timeslots
- **Accessibility**: Ensure all themes meet WCAG AA standards
- **Mobile-first**: Test layouts on actual devices
- **Progressive enhancement**: Features degrade gracefully

---

## Questions to Answer Before Implementation

1. Should themes be **global** (app-wide) or **per-member**?
2. Should layout preference be **device-specific** or **account-specific**?
3. Do we need **realtime** for stats/achievements or just task completions?
4. Should we show **who completed** a task in realtime notifications?
5. Should layouts be **automatically suggested** based on screen size?
