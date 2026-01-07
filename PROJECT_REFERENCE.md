# RPG Life Tracker - Project Reference

> **Master instruction file for AI assistants (Claude Code, GitHub Copilot)**
> Last Updated: January 2026

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Core Game Mechanics](#core-game-mechanics)
4. [Features & Functionality](#features--functionality)
5. [Data Models](#data-models)
6. [State Management](#state-management)
7. [UI/UX Design System](#uiux-design-system)
8. [Pages & Routes](#pages--routes)
9. [Recent Changes & Current State](#recent-changes--current-state)
10. [Development Commands](#development-commands)
11. [Key Implementation Patterns](#key-implementation-patterns)
12. [Database Schema](#database-schema)

---

## Project Overview

### Purpose
RPG Life Tracker is a personal life gamification application that transforms daily habits, goals, and activities into a tabletop RPG-style character progression system using D&D 5e mechanics.

### Target User
Single user, self-hosted application (currently configured for Zachary Anderson). Not designed for multi-user environments.

### Core Concept
Your real life is treated as an RPG character with:
- **Stats & Abilities**: D&D-style core stats (Body, Mind, Heart, Soul) and 16 custom abilities
- **Character Progression**: Earn XP from completing quests and activities, level up to increase abilities
- **Traits & Inventory**: Features, flaws, and items that provide mechanical bonuses/penalties
- **Quest System**: Track recurring goals (weekly/monthly) and one-time tasks with progression milestones
- **Daily Mechanics**: Daily d20 roll affects your stats and XP multipliers
- **Resource Management**: Hit dice system for tracking energy/exhaustion

---

## Technical Architecture

### Tech Stack

#### Frontend
- **React** 19.2.0 with **TypeScript** 5.9.3
- **Vite** 7.2.4 (build tool with HMR)
- **React Router DOM** 7.9.6 (routing)

#### UI & Styling
- **Tailwind CSS** 4.1.17 (custom `@theme` syntax - recently migrated from v3)
- **shadcn/ui** components (built on Radix UI primitives)
- **Lucide React** 0.555.0 (icons)
- **class-variance-authority** + **clsx** + **tailwind-merge** (component styling)

#### State Management
- **Zustand** 5.0.9 (global state with slices)
- **React Hook Form** 7.67.0 (form handling)
- **Zod** 4.1.13 (validation schemas)
- **@hookform/resolvers** 5.2.2 (form validation integration)

#### Backend & Database
- **Supabase** 2.86.0 (PostgreSQL database + authentication)
- 11 database migrations tracking schema evolution

#### Data Visualization
- **Recharts** 3.5.1 (charts/graphs)
- **date-fns** 4.1.0 (date utilities)

#### Development Tools
- **ESLint** 9.39.1
- **PostCSS** 8.5.6
- **Autoprefixer** 10.4.22

### Project Structure

```
/Users/zanderson/Documents/rpg-life-tracker/
├── src/
│   ├── components/
│   │   ├── character/       # Trait/inventory management
│   │   ├── quests/          # Quest creation/display components
│   │   ├── journal/         # Journal entry components
│   │   ├── layout/          # App layout (Header, BottomNav)
│   │   └── ui/              # shadcn/ui primitives (10 components)
│   ├── pages/               # Main route pages
│   │   ├── Dashboard.tsx    # Character overview (42KB - largest file)
│   │   ├── Quests.tsx       # Quest management
│   │   ├── Journal.tsx      # Daily journaling
│   │   ├── Stats.tsx        # Analytics (placeholder)
│   │   └── Auth.tsx         # Authentication
│   ├── lib/                 # Business logic & services
│   │   ├── calculations.ts      # XP/stat/modifier formulas
│   │   ├── supabaseService.ts   # Database operations
│   │   ├── actionLogService.ts  # Action logging
│   │   ├── seedData.ts          # Initial character data
│   │   ├── validations.ts       # Form validation schemas
│   │   ├── utils.ts             # cn() utility function
│   │   └── migrations/          # Data migrations
│   ├── store/               # Zustand state management
│   │   ├── characterSlice.ts    # Character, stats, abilities, traits, inventory
│   │   ├── gameStateSlice.ts    # Daily rolls, hit dice, custom effects
│   │   └── questSlice.ts        # Quest data and operations
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts             # All types (338 lines)
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx      # Authentication context
│   └── index.css            # Tailwind + custom utilities
├── supabase/
│   └── migrations/          # 11 SQL migration files
├── public/                  # Static assets
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

**Total Codebase**: ~10,697 lines of TypeScript/TSX

---

## Core Game Mechanics

### Character System

#### 4 Core Stats
The character has 4 core stats based on D&D ability scores:
- **Body**: Physical health and capabilities
- **Mind**: Mental acuity and knowledge
- **Heart**: Social and emotional intelligence
- **Soul**: Willpower and spiritual endurance

**Calculation**:
```typescript
coreStatValue = base_value + Σ(ability.current - ability.initial)
modifier = floor((coreStatValue - 10) / 2)  // D&D 5e formula
```

#### 16 Abilities
Abilities are grouped by their core stat:

**Body**:
- nutrition
- strength
- agility
- sex

**Mind**:
- language
- literature
- logic
- creation

**Heart**:
- persuasion
- performance
- empathy
- deception

**Soul**:
- endurance
- drive
- discipline
- perception

**Ability Tracking**:
Each ability has three values:
- `initial_value`: Starting value from character creation (never changes)
- `base_value`: Current permanent value (increased on level-up)
- `current_value`: Fully modified value including all traits/items/effects

**Usage Tracking**:
- `times_used_this_level`: Reset to 0 on level-up
- `total_times_used`: Cumulative lifetime usage

### XP & Leveling System

#### XP Formula
```
Level 1 → 2: 10 XP
Level 2 → 3: 20 XP (10 + 5×2)
Level 3 → 4: 35 XP (20 + 5×3)
Level 4 → 5: 55 XP (35 + 5×4)
...
Level N → N+1: Previous threshold + (5 × N)
```

**Implementation**: `calculateXPToNextLevel()` in [src/lib/calculations.ts](src/lib/calculations.ts)

#### Level-Up Process
1. User reaches XP threshold
2. System presents abilities with `times_used_this_level >= 5` as choices
3. User selects one ability to increase
4. Selected ability's `base_value` increases by +1
5. All abilities' `times_used_this_level` reset to 0
6. Core stats automatically recalculate based on new ability values

### Hit Dice System

**Purpose**: Resource management system tracking energy/rest needs

**Max Hit Dice Calculation**:
```typescript
maxHitDice = ceil(bodyStatValue / 2.5)
```

**Exhaustion Levels**:
- 0 days at zero hit dice: Exhaustion Level 0
- 1-2 days at zero: Exhaustion Level 1
- 3-4 days at zero: Exhaustion Level 2
- 5+ days at zero: Exhaustion Level 3

**Long Rest**:
- Restores all hit dice to maximum
- Resets exhaustion level to 0
- Resets `days_at_zero` counter

### Daily Roll System

Every day, roll a d20 to determine the day's state:

| Roll | State | Effect |
|------|-------|--------|
| 1-5 | Difficult Terrain | Disadvantage on selected core stat's abilities |
| 6-15 | Normal Day | No special effects |
| 16-19 | Inspiration Day | Advantage on one selected core stat |
| 20 | Critical Day | 2× XP multiplier for all actions |

**Implementation**: `determineDayState()` and `getXPMultiplier()` in [src/lib/calculations.ts](src/lib/calculations.ts)

---

## Features & Functionality

### Quest System

Three quest types with different mechanics:

#### 1. Side Quests
- **One-time completable tasks**
- Simple checkbox to mark complete
- Awards XP on completion
- Examples: "Learn a new recipe", "Finish reading book X"

#### 2. Recurring Quests
- **Repeatable tasks with progression milestones**
- Completion counter (not just checkbox)
- Optional `progression_milestone` array:
  ```typescript
  {
    ability: "discipline",
    every: 10,      // Every 10 completions
    gain: 1         // Gain +1 to discipline
  }
  ```
- Awards XP each completion
- Examples: "Weekly meal prep", "Daily meditation"

#### 3. Main Quests
- **Hierarchical quest trees for complex goals**
- Uses `quest_tree` structure with nested nodes
- Node types:
  - `quest`: Reference to another quest
  - `text`: Simple text checklist item
- Supports complex multi-step goals
- Examples: "Complete master's degree" with sub-quests for each course

**Quest Data Model**:
```typescript
Quest {
  quest_name: string
  quest_type: 'main' | 'side' | 'recurring'
  core_stat: CoreStatName[]        // Can affect multiple stats
  abilities_used: string[]
  xp_reward: number
  progression_milestone?: { ability, every, gain }[]
  quest_tree?: QuestTreeNode[]     // For main quests only
  times_completed: number
  is_completed: boolean
}
```

### Trait System

**3 Trait Types**:
- **Feature**: Positive traits
- **Flaw**: Negative traits
- **Passive**: Neutral traits

**Mechanical Effects**:
Traits have a `mechanical_effect` array (recently migrated from single object to array):

```typescript
MechanicalEffect {
  type?: 'stat_modifier' | 'advantage' | 'disadvantage' | 'custom'
  applies_to?: ('ability_checks' | 'saving_throws' | 'passive_modifier')[]
  affected_stats?: string[]        // For advantage/disadvantage
  stat_modifiers?: StatModifier[]  // For stat_modifier type
  modifier?: number                // Flat modifier with advantage/disadvantage
  condition?: string               // e.g., "drive > 0", "nutrition >= 5"
  description?: string
}
```

**Conditional Effects**:
- Traits can have conditions that must be met for effects to apply
- Examples: "ARTIST: +2 creation if drive > 0"
- Condition evaluation: `evaluateCondition()` in [src/lib/calculations.ts](src/lib/calculations.ts)
- Trait is marked `is_active` only when at least one effect's condition is met

**Context-Aware Application**:
Effects can specify when they apply via `applies_to`:
- `ability_checks`: Only during ability checks
- `saving_throws`: Only during saving throws
- `passive_modifier`: Always applied to displayed ability values

### Inventory System

**4 Item Types**:
- **tool**: Work/productivity items
- **comfort**: Comfort/lifestyle items
- **consumable**: One-time use items
- **debuff**: Negative items

**Passive Effects**:
Items have `passive_effect` array (same structure as trait mechanical effects):
- Only apply when `is_equipped: true`
- Same conditional logic as traits
- Example: "MacBook Pro" (tool) gives advantage on creation ability checks

### Temporary Effects

**Custom Daily Buffs/Debuffs**:
- User-created effects from Dashboard
- Automatically expire at midnight (`expires_at` timestamp)
- Support all effect types (stat_modifier, advantage, disadvantage)
- No conditions (always active until expiration)
- Applied in modifier calculations alongside traits/items

### Modifier Calculation Engine

**Core Function**: `calculateTotalModifier()` in [src/lib/calculations.ts](src/lib/calculations.ts:214)

**Order of Application**:
1. **Base ability modifier** (from core stat)
2. **Active trait effects** (if conditions met)
3. **Equipped inventory passive effects** (if conditions met)
4. **Custom temporary effects**
5. **Day state effects** (difficult terrain / inspiration)

**Context Filtering**:
The modifier calculation can filter by context:
- `context: 'passive_modifier'`: Used for displayed ability values
- `context: 'ability_checks'`: Used when rolling ability checks
- `context: 'saving_throws'`: Used when rolling saving throws

Effects only apply if their `applies_to` array includes the current context (or if `applies_to` is empty/undefined for backward compatibility).

**Advantage/Disadvantage**:
- Can come from traits, items, custom effects, or day state
- Multiple sources can grant advantage/disadvantage
- Can include flat modifiers alongside advantage/disadvantage
- Example: "CAFFEINATED: Advantage on logic with +1 modifier"

**Modifier Breakdown**:
Returns detailed breakdown showing contribution from each source:
```typescript
{
  total: number
  breakdown: Array<{ source: string, value: number }>
  hasAdvantage: boolean
  hasDisadvantage: boolean
}
```

### Action Logging

**Comprehensive Logging System**: `actionLogService.ts` tracks all user actions

**Logged Actions**:
- Quest completions (with XP awarded)
- Ability checks (d20 + modifiers vs DC)
- Saving throws
- Item usage
- Level-ups (with ability increased)
- Attacks and damage (future feature)

**Log Data Includes**:
- Timestamp (date + time)
- Action type and related IDs
- Roll details (d20 value, modifier breakdown, total)
- Advantage/disadvantage flags
- Success/failure outcome
- XP awarded
- Notes

### Journal System

**Daily Journal Entries**:
- One entry per date
- Free-form text editor
- Date navigation (previous/next/today)
- Displays daily roll and action log for selected date

---

## Data Models

All TypeScript types are defined in [src/types/index.ts](src/types/index.ts)

### Core Types

#### Character
```typescript
Character {
  id: string
  user_id: string
  name: string
  class: string
  level: number
  current_xp: number
  xp_to_next_level: number
  created_at: string
  updated_at: string
}
```

#### CoreStat
```typescript
CoreStat {
  id: string
  character_id: string
  stat_name: 'body' | 'mind' | 'heart' | 'soul'
  base_value: number
  current_value: number
  modifier: number
}
```

#### Ability
```typescript
Ability {
  id: string
  character_id: string
  core_stat: CoreStatName
  ability_name: string
  initial_value: number        // Never changes
  base_value: number           // Increased on level-up
  current_value: number        // base_value + all modifiers
  times_used_this_level: number
  total_times_used: number
}
```

#### Trait
```typescript
Trait {
  id: string
  character_id: string
  trait_name: string
  trait_type: 'feature' | 'flaw' | 'passive' | null
  description: string | null
  mechanical_effect: MechanicalEffect[] | null
  is_active: boolean           // Auto-calculated from conditions
  created_at: string
}
```

#### InventoryItem
```typescript
InventoryItem {
  id: string
  character_id: string
  item_name: string
  description: string | null
  item_type: 'tool' | 'comfort' | 'consumable' | 'debuff' | null
  passive_effect: PassiveEffect[] | null
  condition: string | null
  is_equipped: boolean
  created_at: string
}
```

#### Quest
```typescript
Quest {
  id: string
  character_id: string
  quest_name: string
  quest_type: 'main' | 'side' | 'recurring'
  core_stat: CoreStatName[]
  abilities_used: string[] | null
  xp_reward: number
  difficulty_class: number | null
  progression_milestone: ProgressionMilestone[] | null
  times_completed: number
  description: string | null
  deadline: string | null
  is_active: boolean
  is_completed: boolean
  completed_at: string | null
  parent_quest_id: string | null
  quest_tree: QuestTreeNode[] | null
  created_at: string
}
```

### Effect Structures

#### MechanicalEffect / PassiveEffect
```typescript
MechanicalEffect {
  type?: 'stat_modifier' | 'advantage' | 'disadvantage' | 'custom'
  applies_to?: ('ability_checks' | 'saving_throws' | 'passive_modifier')[]
  affected_stats?: string[]        // For advantage/disadvantage
  stat_modifiers?: StatModifier[]  // For stat_modifier type
  modifier?: number                // Flat modifier for advantage/disadvantage
  condition?: string               // e.g., "drive > 0"
  description?: string
}
```

#### StatModifier
```typescript
StatModifier {
  stat: string      // Ability name
  modifier: number  // Positive or negative value
}
```

#### ProgressionMilestone
```typescript
ProgressionMilestone {
  ability: string   // Ability to increase
  every: number     // Completions required
  gain: number      // Amount to increase (usually 1)
}
```

### Daily State Types

#### DailyRoll
```typescript
DailyRoll {
  id: string
  character_id: string
  roll_date: string
  roll_value: number
  day_state: 'difficult' | 'normal' | 'inspiration' | 'critical'
  affected_stats: CoreStatName[] | null
}
```

#### HitDice
```typescript
HitDice {
  id: string
  character_id: string
  max_hit_dice: number
  current_hit_dice: number
  exhaustion_level: number
  days_at_zero: number
  last_long_rest: string | null
  updated_at: string
}
```

#### CustomEffect
```typescript
CustomEffect {
  id: string
  character_id: string
  effect_name: string
  effect_type: 'stat_modifier' | 'advantage' | 'disadvantage' | 'custom'
  applies_to?: ('ability_checks' | 'saving_throws' | 'passive_modifier')[] | null
  affected_stats?: string[] | null
  stat_modifiers?: StatModifier[] | null
  modifier?: number | null
  description?: string | null
  created_at: string
  expires_at: string         // Auto-expires at midnight
  effects?: {                // For custom type with multiple sub-effects
    type: 'stat_modifier' | 'advantage' | 'disadvantage'
    applies_to?: (...)[] | null
    affected_stats?: string[] | null
    stat_modifiers?: StatModifier[] | null
    modifier?: number | null
  }[] | null
}
```

### Logging Types

#### ActionLog
```typescript
ActionLog {
  id: string
  character_id: string
  action_date: string
  action_time: string
  action_type: 'quest_completion' | 'skill_check' | 'saving_throw' | 'item_use' | 'level_up' | 'attack' | 'damage' | 'other'

  // Quest-related
  quest_id: string | null
  quest_name: string | null
  completion_status: 'full' | 'partial' | 'failed' | null
  xp_awarded: number | null

  // Roll-related
  roll_type: 'skill_check' | 'saving_throw' | 'attack' | 'damage' | null
  ability_used: string | null
  roll_value: number | null
  modifier_value: number | null
  modifier_breakdown: Array<{ label: string; value: number }> | null
  total_value: number | null
  difficulty_class: number | null
  had_advantage: boolean | null
  had_disadvantage: boolean | null
  success: boolean | null

  // Item-related
  item_id: string | null
  item_name: string | null

  // Level-up
  ability_increased: string | null
  new_level: number | null

  notes: string | null
  created_at: string
}
```

#### JournalEntry
```typescript
JournalEntry {
  id: string
  character_id: string
  entry_date: string
  journal_text: string | null
  created_at: string
}
```

---

## State Management

### Zustand Store Architecture

The application uses Zustand with a sliced store pattern. Three main slices:

#### 1. Character Slice ([src/store/characterSlice.ts](src/store/characterSlice.ts))
Manages:
- Character data (name, class, level, XP)
- Core stats (body, mind, heart, soul)
- Abilities (16 abilities with usage tracking)
- Traits (features, flaws, passives)
- Inventory items

#### 2. Game State Slice ([src/store/gameStateSlice.ts](src/store/gameStateSlice.ts))
Manages:
- Daily rolls and day state
- Hit dice and exhaustion
- Inspiration tokens
- Custom temporary effects
- Long rest functionality

#### 3. Quest Slice ([src/store/questSlice.ts](src/store/questSlice.ts))
Manages:
- Quest data (side, recurring, main)
- Quest operations (create, update, complete, delete)

### Key Services

#### supabaseService.ts
All database CRUD operations:
- Character, stats, abilities CRUD
- Trait and inventory management
- Quest operations
- Daily roll, hit dice, custom effect management
- Journal and action log operations

#### actionLogService.ts
Centralized action logging:
- `logQuestCompletion()`
- `logAbilityCheck()`
- `logSavingThrow()`
- `logLevelUp()`
- Automatically calculates XP rewards
- Stores full modifier breakdown

---

## UI/UX Design System

### Tailwind v4 Theme

**Recent Migration**: Upgraded from Tailwind v3 to v4 using new `@theme` syntax

#### Color Palette
Defined in [src/index.css](src/index.css):

```css
@theme {
  --color-base: #2a2d35;           /* Dark background */
  --color-card: #ffffff;           /* Card background */
  --color-card-secondary: #f8f9fa; /* Secondary card */

  --color-primary: #1a1a1a;        /* Primary text */
  --color-secondary: #4a5568;      /* Secondary text */
  --color-tertiary: #9ca3af;       /* Tertiary text */

  --color-red: #dc2626;            /* Primary accent */
  --color-red-hover: #b91c1c;      /* Red hover */
  --color-green: #16a34a;          /* Success */
  --color-green-hover: #15803d;    /* Green hover */
  --color-amber: #f59e0b;          /* Warning */

  --color-subtle: #e5e7eb;         /* Borders */

  --shadow-hard: 0 2px 0 rgba(0, 0, 0, 0.1);
  --shadow-card: 0 4px 0 rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 6px 0 rgba(0, 0, 0, 0.12);
}
```

#### Custom Utilities

**Corner Clip Effects** (diagonal corner cuts using clip-path):
```css
.corner-clip      /* 8px corners */
.corner-clip-sm   /* 4px corners */
.corner-clip-lg   /* 12px corners */
```

### Design Patterns

**Visual Identity**:
- **Hard Shadows**: Flat, offset shadows for a bold, modern look
- **Corner Clips**: Unique diagonal corner cuts on cards
- **Rounded Borders**: Consistent rounded corners on interactive elements
- **Transitions**: 200ms duration for hover/focus states
- **Active States**: Elements translate down and lose shadow on click for tactile feedback
- **Focus Rings**: 2px red outline with offset for accessibility
- **Cursor Hints**: Explicit cursor styles (cursor-pointer on interactive elements)

### shadcn/ui Components

**10 Components** in [src/components/ui/](src/components/ui/):
- `alert-dialog.tsx` - Modal confirmations
- `badge.tsx` - Status badges
- `button.tsx` - Buttons with variants
- `checkbox.tsx` - Checkboxes
- `dialog.tsx` - Dialogs/modals
- `form.tsx` - Form wrapper
- `input.tsx` - Text inputs
- `label.tsx` - Form labels
- `select.tsx` - Dropdown selects
- `textarea.tsx` - Multi-line text inputs

**Built on Radix UI Primitives**:
- @radix-ui/react-alert-dialog
- @radix-ui/react-checkbox
- @radix-ui/react-dialog
- @radix-ui/react-label
- @radix-ui/react-select
- @radix-ui/react-slot

**Styling Approach**:
- Uses **class-variance-authority (CVA)** for variant-based styling
- **clsx** for conditional class names
- **tailwind-merge** to safely merge Tailwind classes

### Utility Function

**cn() Helper** ([src/lib/utils.ts](src/lib/utils.ts)):
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Used throughout components to merge class names safely.

**Button Example** (showing CVA pattern):
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 rounded cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-red text-white shadow-hard hover:bg-red-hover active:shadow-none active:translate-y-0.5",
        secondary: "bg-card text-secondary border-2 border-red shadow-hard hover:bg-card-secondary hover:text-primary active:shadow-none active:translate-y-0.5",
        ghost: "text-secondary hover:text-red hover:bg-card-secondary",
        destructive: "bg-red text-white shadow-hard hover:bg-red-hover active:shadow-none active:translate-y-0.5",
        link: "text-red underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
      },
    },
  }
)
```

---

## Pages & Routes

### Main Application Pages

#### 1. Dashboard ([src/pages/Dashboard.tsx](src/pages/Dashboard.tsx))
**Largest file (42KB)** - Central hub displaying:
- Character information (name, class, level, XP progress bar)
- Core stats with modifiers (Body, Mind, Heart, Soul)
- 16 abilities grouped by core stat with usage counts
- Traits section (features, flaws, passives) with active states
- Inventory section with equipped items
- Daily state indicator (Difficult/Normal/Inspiration/Critical)
- Hit dice tracker with exhaustion level
- Quick log form for ability checks and saving throws
- Active temporary effects display
- Buttons to manage traits, inventory, and custom effects

#### 2. Quests Page ([src/pages/Quests.tsx](src/pages/Quests.tsx))
Quest management with tabs for three quest types:
- **Side Quests Tab**: List of one-time quests with checkboxes
- **Recurring Quests Tab**: Quests with completion counters
- **Main Quests Tab**: Hierarchical quest trees with nested checkboxes
- Create/edit/delete quest dialogs
- Quest form with quest type selection
- Progression milestone configuration for recurring quests
- Quest tree builder for main quests

#### 3. Journal Page ([src/pages/Journal.tsx](src/pages/Journal.tsx))
Daily journaling and activity log:
- Date navigation (previous day, next day, today)
- Daily d20 roll display with day state
- Free-form journal text editor (textarea)
- Action log showing all activities for selected date
- Filters for action types

#### 4. Stats Page ([src/pages/Stats.tsx](src/pages/Stats.tsx))
**Placeholder** - Planned for Phase 8
- Analytics and charts
- Progress tracking over time
- Currently shows "Stats page coming soon"

#### 5. Auth Page ([src/pages/Auth.tsx](src/pages/Auth.tsx))
Supabase authentication:
- Login/signup forms
- Password reset
- Loads seed data on first login

### Layout Components

#### Header ([src/components/layout/Header.tsx](src/components/layout/Header.tsx))
Top navigation bar with:
- App title
- Current page indicator
- User menu / logout

#### BottomNav ([src/components/layout/BottomNav.tsx](src/components/layout/BottomNav.tsx))
Mobile-friendly bottom navigation:
- Dashboard icon
- Quests icon
- Journal icon
- Stats icon
- Active route highlighting

---

## Recent Changes & Current State

### Recent Migrations

✅ **Tailwind v4 Migration** (December 2024)
- Migrated from Tailwind v3 to v4
- Updated to use new `@theme` syntax in [src/index.css](src/index.css)
- Updated color class names to match new config
- Converted CSS variables to Tailwind v4 format

✅ **Effect Array Migration** (December 2024)
- Converted `mechanical_effect` from single object to array in Traits
- Converted `passive_effect` from single object to array in Inventory Items
- Allows multiple effects per trait/item (e.g., "+2 nutrition AND advantage on discipline")
- Updated all effect processing logic in [calculations.ts](src/lib/calculations.ts)

✅ **UI Redesign** (In Progress)
- Current branch: `ui-redesign`
- Hard shadow design system implemented
- Corner clip effects added for unique geometric aesthetic
- Rounded borders on all interactive elements
- White headers on dark backgrounds
- Pointer cursor on interactive elements
- Active state animations (translate + shadow removal)

### Known Gaps & Future Work

**Stats Page (Phase 8)**:
- Placeholder page exists but not implemented
- Planned features:
  - Analytics dashboard
  - Progress charts over time
  - Ability usage heatmaps
  - XP/level progression graphs

**Multi-User Support**:
- Currently single-user application
- All data seeded for one specific user (Zachary Anderson)
- Would require significant refactoring for multi-user

**Current Branch**: `ui-redesign`

**Git Status**:
```
?? .claude/
?? tailwind.config.js
```

---

## Development Commands

### Available Scripts

```bash
npm run dev      # Start Vite dev server (default: http://localhost:5173)
npm run build    # TypeScript compile + Vite production build
npm run lint     # Run ESLint on entire codebase
npm run preview  # Preview production build locally
```

### Environment Setup

**Required Environment Variables** (`.env.local`):
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Path Aliasing

**Configured in vite.config.ts**:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

**Usage**:
```typescript
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Character } from '@/types'
```

Use consistently throughout the codebase instead of relative imports.

---

## Key Implementation Patterns

### Condition Evaluation

**Simple String Conditions**:
```typescript
import { evaluateCondition } from '@/lib/calculations'

// Condition examples: "drive > 0", "nutrition >= 5", "always"
const isActive = evaluateCondition(condition, abilities)
```

**Supported Operators**: `>`, `>=`, `<`, `<=`, `==`, `=`, `!=`

### Modifier Calculation with Context

**Calculate Total Modifier for an Ability**:
```typescript
import { calculateTotalModifier } from '@/lib/calculations'

const result = calculateTotalModifier(
  abilityName,        // e.g., "nutrition"
  baseModifier,       // From core stat
  abilities,          // All character abilities
  traits,             // Active traits
  inventory,          // Equipped items
  customEffects,      // Temporary effects
  dayState,           // { state, affectedStats, selectedStat }
  context             // 'passive_modifier' | 'ability_checks' | 'saving_throws'
)

// Returns:
{
  total: number,
  breakdown: Array<{ source: string, value: number }>,
  hasAdvantage: boolean,
  hasDisadvantage: boolean
}
```

**Context Usage**:
- `'passive_modifier'`: For displayed ability values on Dashboard
- `'ability_checks'`: When rolling ability checks
- `'saving_throws'`: When rolling saving throws
- Omit context for backward compatibility (applies all effects)

### Core Stat Recalculation

**Recalculate Core Stats from Abilities**:
```typescript
import { recalculateCoreStats } from '@/lib/calculations'

const updatedStats = recalculateCoreStats(coreStats, abilities)
```

Automatically called after:
- Level-up (ability base_value increases)
- Loading character data
- Any ability modification

### XP Calculation

**Calculate XP Required for Next Level**:
```typescript
import { calculateXPToNextLevel } from '@/lib/calculations'

const xpNeeded = calculateXPToNextLevel(currentLevel)
```

**Get XP Multiplier from Day State**:
```typescript
import { getXPMultiplier } from '@/lib/calculations'

const multiplier = getXPMultiplier(dayState) // Returns 2 if critical, otherwise 1
const actualXP = baseXP * multiplier
```

### Hit Dice Management

**Calculate Max Hit Dice**:
```typescript
import { calculateMaxHitDice } from '@/lib/calculations'

const maxHD = calculateMaxHitDice(bodyStatValue)
```

**Calculate Exhaustion Level**:
```typescript
import { calculateExhaustionLevel } from '@/lib/calculations'

const exhaustion = calculateExhaustionLevel(currentHD, daysAtZero)
```

### Effect Structure Pattern

**Creating a Trait with Multiple Effects**:
```typescript
const trait: Trait = {
  trait_name: "ARTIST",
  trait_type: "feature",
  description: "Creative boost when motivated",
  mechanical_effect: [
    {
      type: "stat_modifier",
      applies_to: ["passive_modifier"],
      stat_modifiers: [{ stat: "creation", modifier: 2 }],
      condition: "drive > 0"
    },
    {
      type: "advantage",
      applies_to: ["ability_checks"],
      affected_stats: ["creation"],
      modifier: 1,
      condition: "drive >= 5"
    }
  ],
  is_active: true  // Auto-calculated based on conditions
}
```

### Zustand Store Usage

**Accessing State**:
```typescript
import { useCharacterStore } from '@/store/characterSlice'

const character = useCharacterStore((state) => state.character)
const abilities = useCharacterStore((state) => state.abilities)
const updateAbility = useCharacterStore((state) => state.updateAbility)
```

**Triggering Actions**:
```typescript
import { useCharacterStore } from '@/store/characterSlice'

const { fetchCharacterData, updateCharacter } = useCharacterStore()

// Fetch from database
await fetchCharacterData(userId)

// Update character
await updateCharacter({ level: newLevel })
```

---

## Database Schema

### Supabase Migrations

**11 SQL Migration Files** in `/supabase/migrations/`:

1. **Characters Table**
   - id (uuid, primary key)
   - user_id (uuid, foreign key to auth.users)
   - name, class, level, current_xp, xp_to_next_level
   - timestamps

2. **Core Stats Table**
   - id, character_id
   - stat_name (body/mind/heart/soul)
   - base_value, current_value, modifier

3. **Abilities Table**
   - id, character_id, core_stat
   - ability_name
   - initial_value, base_value, current_value
   - times_used_this_level, total_times_used

4. **Traits Table**
   - id, character_id
   - trait_name, trait_type, description
   - mechanical_effect (JSONB array)
   - is_active

5. **Inventory Items Table**
   - id, character_id
   - item_name, description, item_type
   - passive_effect (JSONB array)
   - condition, is_equipped

6. **Quests Table**
   - id, character_id
   - quest_name, quest_type, core_stat (array)
   - abilities_used (array), xp_reward, difficulty_class
   - progression_milestone (JSONB array)
   - quest_tree (JSONB array)
   - times_completed, is_active, is_completed

7. **Main Quest Milestones Table** (Deprecated - now using quest_tree)
   - id, quest_id
   - milestone_name, description, sort_order
   - is_completed

8. **Daily Rolls Table**
   - id, character_id
   - roll_date, roll_value, day_state
   - affected_stats (array)

9. **Hit Dice Table**
   - id, character_id
   - max_hit_dice, current_hit_dice
   - exhaustion_level, days_at_zero
   - last_long_rest

10. **Custom Effects Table**
    - id, character_id
    - effect_name, effect_type
    - applies_to (array), affected_stats (array)
    - stat_modifiers (JSONB array), modifier
    - description, expires_at
    - effects (JSONB array for custom type)

11. **Journal Entries Table**
    - id, character_id
    - entry_date, journal_text

12. **Action Logs Table**
    - id, character_id
    - action_date, action_time, action_type
    - Quest fields: quest_id, quest_name, completion_status, xp_awarded
    - Roll fields: roll_type, ability_used, roll_value, modifier_value, modifier_breakdown (JSONB), total_value, difficulty_class, had_advantage, had_disadvantage, success
    - Item fields: item_id, item_name
    - Level-up fields: ability_increased, new_level
    - notes

13. **Inspiration Tokens Table**
    - id, character_id
    - token_count

### Row Level Security (RLS)

All tables have RLS enabled with policies keyed to `user_id`:
- Users can only read/write their own data
- Enforced at database level for security

### JSONB Fields

Several tables use JSONB for flexible array/object storage:
- `mechanical_effect` in Traits
- `passive_effect` in Inventory Items
- `progression_milestone` in Quests
- `quest_tree` in Quests
- `modifier_breakdown` in Action Logs
- `stat_modifiers` in Custom Effects
- `effects` in Custom Effects

---

## Best Practices for AI Assistants

When working on this project:

1. **Always read before modifying**: Use the Read tool to view files before making changes
2. **Maintain type safety**: Adhere to TypeScript types defined in [src/types/index.ts](src/types/index.ts)
3. **Follow design patterns**: Use the established patterns for effects, modifiers, and conditions
4. **Preserve calculations**: Don't modify formulas in [calculations.ts](src/lib/calculations.ts) without understanding impact
5. **Respect the architecture**: Keep state management in Zustand, database operations in supabaseService
6. **Use path aliases**: Always use `@/` instead of relative imports
7. **Match UI patterns**: Follow established shadcn/ui component usage and CVA patterns
8. **Test calculations**: Modifier and XP calculations are critical - verify changes don't break game balance
9. **Consider context**: Effect application is context-aware (passive/checks/saves) - don't break this
10. **Log actions**: User actions should be logged via actionLogService for history tracking

---

**End of PROJECT_REFERENCE.md**
