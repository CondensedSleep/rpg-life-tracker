import { z } from 'zod'

// ============================================================================
// MECHANICAL EFFECT SCHEMA (for Traits)
// ============================================================================

export const statModifierSchema = z.object({
  stat: z.string().min(1, 'Stat is required'),
  modifier: z.number(),
})

export const mechanicalEffectItemSchema = z.object({
  type: z.enum(['stat_modifier', 'advantage', 'disadvantage', 'custom']).optional(),
  affected_stats: z.array(z.string()).optional(),  // For advantage/disadvantage
  stat_modifiers: z.array(statModifierSchema).optional(),  // For stat_modifier with individual modifiers
  modifier: z.number().optional(),  // Flat modifier for advantage/disadvantage
  condition: z.string().optional(),
  description: z.string().optional(),
})

export const mechanicalEffectSchema = z.array(mechanicalEffectItemSchema).optional().nullable()

export type MechanicalEffectFormValues = z.infer<typeof mechanicalEffectItemSchema>

// ============================================================================
// PASSIVE EFFECT SCHEMA (for Inventory)
// ============================================================================

export const passiveEffectItemSchema = z.object({
  type: z.enum(['stat_modifier', 'advantage', 'disadvantage', 'custom']).optional(),
  affected_stats: z.array(z.string()).optional(),  // For advantage/disadvantage
  stat_modifiers: z.array(statModifierSchema).optional(),  // For stat_modifier with individual modifiers
  modifier: z.number().optional(),  // Flat modifier for advantage/disadvantage
  condition: z.string().optional(),
  description: z.string().optional(),
})

export const passiveEffectSchema = z.array(passiveEffectItemSchema).optional().nullable()

export type PassiveEffectFormValues = z.infer<typeof passiveEffectItemSchema>

// ============================================================================
// TRAIT VALIDATION SCHEMA
// ============================================================================

export const traitFormSchema = z.object({
  trait_name: z.string().min(1, 'Trait name is required').max(100),
  trait_type: z.enum(['feature', 'flaw', 'passive'], {
    required_error: 'Trait type is required',
  }),
  description: z.string().optional(),
  mechanical_effect: mechanicalEffectSchema,
})

export type TraitFormValues = z.infer<typeof traitFormSchema>

// ============================================================================
// INVENTORY VALIDATION SCHEMA
// ============================================================================

export const inventoryFormSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(100),
  item_type: z.enum(['tool', 'comfort', 'consumable', 'debuff'], {
    required_error: 'Item type is required',
  }),
  description: z.string().optional(),
  passive_effect: passiveEffectSchema,
  condition: z.string().optional(),
  is_equipped: z.boolean().default(true),
})

export type InventoryFormValues = z.infer<typeof inventoryFormSchema>

// ============================================================================
// QUEST VALIDATION SCHEMA
// ============================================================================

export const progressionMilestoneItemSchema = z.object({
  ability: z.string().min(1, 'Ability name is required'),
  every: z.number().min(1, 'Must be at least 1'),
  gain: z.number().min(1, 'Must gain at least 1'),
})

export const progressionMilestoneSchema = z.array(progressionMilestoneItemSchema).optional().nullable()

export type ProgressionMilestoneFormValues = z.infer<typeof progressionMilestoneItemSchema>

export const questFormSchema = z.object({
  quest_name: z.string().min(1, 'Quest name is required').max(200),
  quest_type: z.enum(['daily', 'weekly', 'monthly', 'main'], {
    required_error: 'Quest type is required',
  }),
  core_stat: z.enum(['body', 'mind', 'heart', 'soul'], {
    required_error: 'Core stat is required',
  }),
  abilities_used: z.array(z.string()).optional().nullable(),
  xp_reward: z.number().min(0, 'XP reward must be positive').default(1),
  difficulty_class: z.number().min(1).max(30).optional().nullable(),
  progression_milestone: progressionMilestoneSchema,
  description: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(), // ISO date string
  is_active: z.boolean().default(true),
})

export type QuestFormValues = z.infer<typeof questFormSchema>
