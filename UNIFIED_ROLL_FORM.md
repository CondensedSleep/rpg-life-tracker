# Unified Roll Form System

## Overview

The Unified Roll Form is a tag-based UI for logging **any type of roll** in the RPG Life Tracker. It provides:
- ✅ Real-time tag auto-completion
- ✅ Live roll preview before logging
- ✅ Multiple dice support (d20 + d4 + d6, etc.)
- ✅ Auto-detection of applicable traits, items, and effects
- ✅ Structured tag storage for querying and display

---

## Architecture

### Core Components

1. **[src/types/tags.ts](src/types/tags.ts)** - Tag type definitions
2. **[src/lib/taggedRollSystem.ts](src/lib/taggedRollSystem.ts)** - Roll logging with tags
3. **[src/components/UnifiedRollForm.tsx](src/components/UnifiedRollForm.tsx)** - UI component
4. **Database Migration** - `tags` JSONB column in `action_log` table

### Tag Structure

```typescript
interface RollTags {
  // Core context (mutually exclusive)
  rollType?: 'ability_check' | 'saving_throw' | 'attack' | 'damage' | 'initiative'
  ability?: string
  coreStat?: string

  // Dice rolled
  dice: DieRoll[] // [{ die: 'd20', value: 15 }, { die: 'd4', value: 3 }]

  // Modifiers
  modifiers: ModifierTag[] // ['advantage', 'critical_success']
  customModifiers: CustomModifierTag[]

  // Effects
  traits: TraitTag[] // User-added + auto-detected
  items: ItemTag[]
  effects: EffectTag[]

  // Organizational (user-defined)
  organizational: OrganizationalTag[]

  // DC
  dc?: number
}
```

---

## User Workflow

### 1. Select Tags
User clicks buttons to add tags:
- **Roll Type**: Ability Check / Saving Throw / Attack / etc.
- **Ability**: Drive, Language, Openness, etc.
- **Dice**: Add d4, d6, d8, d10, d12, d20, d100
- **Modifiers**: Advantage, Disadvantage
- **Traits/Items**: Manually add specific traits or items

### 2. Tag Auto-Completion
System automatically adds related tags:
- Adding "Ability: Drive" → auto-adds "Core Stat: Body"
- Adding "Ability: Language" + "Ability Check" → auto-detects "Trait: Logician" in preview
- Rolling 20 on d20 → auto-adds "Critical Success"
- Adding both "Advantage" + "Disadvantage" → changes to "Flat"

### 3. Enter Dice Values
For each die tag added, a number input appears:
- d20: input for d20 roll
- d4: input for d4 roll
- etc.

### 4. Live Preview
As soon as minimum requirements are met (roll type + ability + dice values), system shows:
- Total roll value (sum of all dice + modifiers)
- Success/failure vs DC
- Modifier breakdown (base ability + traits + items + effects)
- XP awarded
- Auto-detected effects that will apply

### 5. Submit
Click "Log Roll" to persist to database with complete structured tags.

---

## Tag Categories & Behavior

### Mutually Exclusive Tags
Only one per roll:
- **Roll Type**: Can't be both "Ability Check" and "Saving Throw"
- **Ability**: Only one ability per roll
- **Core Stat**: Auto-set based on ability, can't manually conflict

Adding a conflicting tag removes the previous one.

### Multiple Tags
Can have many:
- **Dice**: d20 + d4 + d6 + d6 (multiple dice of same type allowed)
- **Traits**: Multiple traits can apply
- **Items**: Multiple equipped items can apply
- **Effects**: Multiple custom effects can apply

### Cosmetic vs. Functional Tags

**Functional** (affect calculation):
- Roll Type, Ability, Core Stat
- Traits, Items, Effects (if system detects they apply)
- DC

**Cosmetic** (display/organizational):
- Advantage/Disadvantage (purely informational - actual advantage is calculated by system)
- Critical Success/Critical Failure (auto-added based on d20 roll)
- Organizational tags (Quest, Location, NPC, etc.)

---

## Tag Storage

### Database Schema

```sql
ALTER TABLE action_log
ADD COLUMN tags JSONB DEFAULT '{}'::jsonb;

CREATE INDEX idx_action_log_tags ON action_log USING gin(tags);
```

### Example Stored Tags

```json
{
  "rollType": "ability_check",
  "ability": "drive",
  "coreStat": "body",
  "dice": [
    { "die": "d20", "value": 15 },
    { "die": "d4", "value": 3 }
  ],
  "modifiers": ["advantage", "critical_success"],
  "traits": [
    { "id": "trait-123", "name": "Addict", "isUserAdded": false }
  ],
  "items": [
    { "id": "item-456", "name": "Energy Drink", "isUserAdded": true }
  ],
  "dc": 15
}
```

### Display Format

Tags are stored as lowercase with underscores but displayed with proper formatting:
- Stored: `ability_check` → Displayed: "Ability Check"
- Stored: `saving_throw` → Displayed: "Saving Throw"

---

## Integration with Existing System

### Compatibility

The unified roll form works **perfectly** with the refactored roll system:

1. **No Redundancy**: Tags set the context, system calculates effects automatically
2. **Auto-Detection**: System detects which traits/items apply based on conditions
3. **Preview-First**: Calls `executeRoll()` to calculate, then shows preview
4. **Same Backend**: Uses same `executeRoll()` and effect calculation logic

### Migration Path

**Old System**:
- Separate forms for ability checks and saving throws
- Manual advantage/disadvantage checkboxes
- No visibility into modifiers until after logging

**New System**:
- One unified form for all roll types
- Tag-based selection with auto-completion
- Live preview shows everything before logging
- Structured tags for better querying

**Backward Compatible**: Old rolls without tags still display correctly. New rolls have rich tag data.

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Ability checks and saving throws
- ✅ Multiple dice support
- ✅ Auto-tag detection
- ✅ Live preview

### Phase 2 (Planned)
- [ ] Attack rolls with damage calculation
- [ ] Custom modifier formulas (+d4, +1d6, etc.)
- [ ] Tag templates (save common combinations)
- [ ] Tag-based filtering in action log

### Phase 3 (Future)
- [ ] Organizational tag search/filter
- [ ] Roll analytics by tag
- [ ] Tag autocomplete based on history
- [ ] Bulk tag editing

---

## Code Examples

### Adding a New Roll Type

```typescript
// 1. Add to RollTypeTag enum in src/types/tags.ts
export const RollTypeTag = {
  // ...existing
  INITIATIVE: 'initiative',
}

// 2. Add display label
export const TAG_DISPLAY_LABELS: Record<string, string> = {
  // ...existing
  initiative: 'Initiative',
}

// 3. Add to tag selector in UnifiedRollForm
// (automatically available via RollTypeTag enum)
```

### Querying Rolls by Tags

```typescript
// Get all advantage rolls
const { data } = await supabase
  .from('action_log')
  .select('*')
  .contains('tags', { modifiers: ['advantage'] })

// Get all rolls using "Drive" ability
const { data } = await supabase
  .from('action_log')
  .select('*')
  .contains('tags', { ability: 'drive' })

// Get all critical successes
const { data } = await supabase
  .from('action_log')
  .select('*')
  .contains('tags', { modifiers: ['critical_success'] })
```

---

## Benefits

### For Users
- 🎯 **Clarity**: See all modifiers before logging
- 🚀 **Speed**: Tag auto-completion reduces clicks
- 📊 **Context**: Organizational tags for better history
- 🎲 **Flexibility**: Support for any dice combination

### For Developers
- 🧹 **Clean Code**: One form instead of many
- 🔍 **Queryable**: JSONB indexes for fast tag searches
- 📈 **Scalable**: Adding new roll types is trivial
- 🧪 **Testable**: Tags are structured data, easy to validate

### For the System
- ✅ **No Redundancy**: Tags inform context, system calculates effects
- ⚡ **Performance**: Single calculation with live preview
- 🎯 **Accuracy**: Preview shows exact outcome before logging
- 🔒 **Integrity**: Auto-detected tags can't be manually broken

---

## Questions & Answers

### Q: Can I add Advantage manually even if the system doesn't detect it?
**A**: Yes! Manually added "Advantage" tag will be passed to the roll calculation. The system will honor it unless there's also Disadvantage (which cancels to Flat).

### Q: What if I tag a trait that doesn't actually apply?
**A**: The system will ignore it in calculations. Tags are informational, but the calculation logic still checks conditions. However, it will be stored for organizational purposes.

### Q: Can I have multiple d20s in one roll?
**A**: Technically yes, but the system only uses the first d20 for crit detection. Additional d20s are just added to the total. This is mostly for custom rolls.

### Q: How do I add custom modifiers like +d4?
**A**: Phase 2 feature. For now, you can add extra dice (d4) or use the "Additional Modifier" field for flat bonuses.

---

## Summary

The Unified Roll Form is a **tag-driven, preview-first system** that:
1. Replaces separate roll forms with one unified UI
2. Auto-completes tags based on context
3. Shows live preview with all calculations
4. Stores structured tags for rich querying
5. Works seamlessly with the refactored roll system

It's designed to be **scalable**, **intuitive**, and **powerful** while maintaining D&D 5e authenticity.
