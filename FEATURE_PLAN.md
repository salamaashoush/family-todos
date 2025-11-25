# Feature Implementation Plan

## Overview
Family-friendly layout options optimized for iPad (kids) and iPhone Pro Max (parents).

**Target Devices:**
- iPad (kids) - Kitchen/living room use
- iPhone 16 Pro Max (parents) - Quick checks on the go

---

## Layout Options

### 1. Member Focus (Current Default)
**Description**: One column per family member showing their timeslots and todos.

**Best for**: iPad landscape, seeing all family members at once

**Current behavior**:
- 1 col (phone) -> 2 col (sm) -> 3 col (lg) -> 4 col (xl)
- Each column shows member's timeslots vertically

---

### 2. Timeslot Focus (Parent's favorite)
**Description**: Organized by timeslot, showing all family members horizontally within each timeslot.

**Best for**:
- Parents checking "Who still needs to do Morning Routine?"
- Kitchen iPad as family status board
- Quick morning/bedtime checks

**Layout Structure**:
```
+--------------------------------------------------+
| Morning Routine (7:00 - 8:30)                    |
| +----------+ +----------+ +----------+ +-------+ |
| | Salama   | | Farida   | | Omar     | | Ali   | |
| | [x] Brush| | [x] Brush| | [ ] Brush| | [x]   | |
| | [x] Dress| | [ ] Dress| | [ ] Dress| | [x]   | |
| | 2/3 done | | 1/3 done | | 0/3 done | | 3/3   | |
| +----------+ +----------+ +----------+ +-------+ |
+--------------------------------------------------+
| Homework Time (16:00 - 17:00)                    |
| ...                                              |
+--------------------------------------------------+
```

**Features**:
- Rows = Timeslots (Morning, Homework, Bedtime)
- Cards = Family members side-by-side within each timeslot
- Progress indicator per member per timeslot
- Highlight current timeslot based on time of day
- Collapsed/expanded timeslots (current one auto-expanded)

**Responsive**:
- iPad: 4 members side by side
- iPhone Pro Max: 2 members side by side, scroll horizontally or stack

---

### 3. Quick Check (Phone optimized)
**Description**: Single-member view with swipeable member tabs and time-aware auto-expansion.

**Best for**:
- iPhone quick checks
- Individual kid checking their own tasks
- Bedtime routine on phone

**Layout Structure**:
```
+---------------------------+
| [Salama] [Farida] [Omar]  |  <- Swipeable tabs
+---------------------------+
| Salama                    |
| +-----------------------+ |
| | Morning Routine  [v]  | |  <- Auto-expanded if current time
| | [x] Brush Teeth       | |
| | [x] Get Dressed       | |
| | [ ] Eat Breakfast     | |
| | 2/3 complete          | |
| +-----------------------+ |
| | Homework Time    [>]  | |  <- Collapsed
| +-----------------------+ |
| | Bedtime          [>]  | |
| +-----------------------+ |
+---------------------------+
```

**Features**:
- Horizontal swipeable member selector at top (avatars)
- Accordion timeslots - one expanded at a time
- Auto-expand current timeslot based on time
- Swipe left/right to switch members
- Large touch targets for kid-friendly use

---

### 4. Family Dashboard (iPad command center)
**Description**: Split view showing current timeslot prominently with day summary below.

**Best for**:
- Kitchen iPad as family hub
- Parents monitoring all kids at once
- "What's happening right now" view

**Layout Structure**:
```
+--------------------------------------------------+
| NOW: Morning Routine (7:00 - 8:30)               |
+--------------------------------------------------+
| Salama        | Farida        | Omar    | Ali    |
| [x] Brush     | [x] Brush     | [ ]     | [x]    |
| [x] Dress     | [ ] Dress     | [ ]     | [x]    |
| [ ] Breakfast | [ ] Breakfast | [ ]     | [x]    |
| ============  | ======        |         | ====== |
| 66%           | 33%           | 0%      | 100%   |
+--------------------------------------------------+
| Today's Progress                                 |
| +----------+ +----------+ +----------+ +-------+ |
| | Salama   | | Farida   | | Omar     | | Ali   | |
| | 8/12     | | 5/12     | | 2/12     | | 12/12 | |
| | [======] | | [====  ] | | [=     ] | | [====]| |
| +----------+ +----------+ +----------+ +-------+ |
+--------------------------------------------------+
```

**Features**:
- Top section: Current/next timeslot with all members
- Bottom section: Day summary cards per member
- Auto-advances to next timeslot as time passes
- Visual progress bars
- Celebration animations when someone hits 100%

---

## Auto-Switch Feature (Admin Toggle)

### Settings (stored in DB)
- autoSwitchEnabled: boolean
- defaultLayout: LayoutId
- timeslotAutoExpand: boolean (expand current timeslot automatically)
- deviceLayouts: phone/tablet/desktop default layouts

### Admin Panel Addition
- Toggle: "Auto-switch layout based on device"
- Toggle: "Auto-expand current timeslot"
- Default layout selector per device type (phone < 640px, tablet 640-1024px, desktop > 1024px)

### Time-Based Logic
- Detect current timeslot by comparing current time against timeslot start/end times
- Auto-expand or highlight the active timeslot
- Show "next up" when between timeslots

---

## Implementation Plan

### Phase 1: Layout Infrastructure
- Layout definitions and types
- Layout context for state management
- Add layout_settings table to DB schema
- Server functions for layout settings CRUD

### Phase 2: Extract Current Layout
- Extract current grid to MemberFocusLayout component
- Create shared types for layout props
- Add layout switcher component to header

### Phase 3: Timeslot Focus Layout
- Implement timeslot-grouped view
- Add current timeslot highlighting
- Test on iPad

### Phase 4: Quick Check Layout
- Implement swipeable member tabs
- Add accordion timeslots with auto-expand
- Test on iPhone Pro Max

### Phase 5: Family Dashboard Layout
- Implement split view (current + summary)
- Add progress bars and animations
- Test on iPad landscape

### Phase 6: Auto-Switch & Admin
- Add layout settings to admin panel
- Implement device detection
- Implement time-based timeslot detection
- Add admin toggles for auto-switch features

---

## Dependencies
- react-swipeable (for swipe gestures in Quick Check layout)

---

## Testing Checklist

### Layout Rendering
- [ ] MemberFocus displays correctly on all devices
- [ ] TimeslotFocus shows members grouped by timeslot
- [ ] QuickCheck swipe gestures work smoothly
- [ ] FamilyDashboard shows current timeslot prominently

### Device Testing
- [ ] iPad portrait and landscape
- [ ] iPhone Pro Max portrait
- [ ] Layout switching persists after refresh

### Auto-Switch
- [ ] Device-based switching works
- [ ] Time-based timeslot expansion works
- [ ] Admin toggles enable/disable features correctly

### Touch & Gestures
- [ ] Swipe between members (QuickCheck)
- [ ] Tap to expand/collapse timeslots
- [ ] Large touch targets (48px+) for kids

---

## Notes

- Layout preference stored per-device (localStorage) not per-account
- Auto-switch can be disabled by user manually selecting a layout
- Current timeslot detection uses device local time
- All layouts must support the existing completion toggle functionality
