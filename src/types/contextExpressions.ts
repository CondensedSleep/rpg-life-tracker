/**
 * Context Expression System
 * 
 * Allows defining when effects apply using logical operators (AND, OR, NOT)
 * on tags. For example: "research AND ability_check OR literature AND ability_check"
 * 
 * Max nesting depth: 3 levels for UX clarity
 */

export type LogicalOperator = 'AND' | 'OR' | 'NOT';

export interface TagReference {
  category: 'rollType' | 'ability' | 'coreStat' | 'organizational';
  value: string;
}

export interface ContextNode {
  operator?: LogicalOperator;
  tag?: TagReference;
  children?: ContextNode[];
}

/**
 * Common context expression presets for quick effect creation
 */
export const CONTEXT_PRESETS: Record<string, { label: string; expression: ContextNode }> = {
  ANY_ABILITY_CHECK: {
    label: 'Any Ability Check',
    expression: {
      tag: { category: 'rollType', value: 'ability_check' }
    }
  },
  ANY_SAVING_THROW: {
    label: 'Any Saving Throw',
    expression: {
      tag: { category: 'rollType', value: 'saving_throw' }
    }
  },
  AGILITY_CHECKS: {
    label: 'Agility-based Checks',
    expression: {
      operator: 'AND',
      children: [
        { tag: { category: 'coreStat', value: 'agility' } },
        { tag: { category: 'rollType', value: 'ability_check' } }
      ]
    }
  },
  MIND_CHECKS: {
    label: 'Mind-based Checks',
    expression: {
      operator: 'AND',
      children: [
        { tag: { category: 'coreStat', value: 'mind' } },
        { tag: { category: 'rollType', value: 'ability_check' } }
      ]
    }
  },
  RESEARCH_OR_INVESTIGATION: {
    label: 'Research or Investigation',
    expression: {
      operator: 'OR',
      children: [
        { tag: { category: 'ability', value: 'research' } },
        { tag: { category: 'ability', value: 'investigation' } }
      ]
    }
  }
};

/**
 * Validate context expression structure and depth
 */
export function validateContextExpression(node: ContextNode, currentDepth = 0): { valid: boolean; error?: string } {
  const MAX_DEPTH = 3;

  if (currentDepth > MAX_DEPTH) {
    return { valid: false, error: `Context expression exceeds maximum nesting depth of ${MAX_DEPTH}` };
  }

  // Leaf node: must have a tag
  if (!node.operator && !node.tag) {
    return { valid: false, error: 'Leaf node must have a tag reference' };
  }

  // Operator node: must have children
  if (node.operator) {
    if (!node.children || node.children.length === 0) {
      return { valid: false, error: `Operator ${node.operator} must have at least one child` };
    }

    // NOT operator must have exactly one child
    if (node.operator === 'NOT' && node.children.length !== 1) {
      return { valid: false, error: 'NOT operator must have exactly one child' };
    }

    // Validate all children
    for (const child of node.children) {
      const childValidation = validateContextExpression(child, currentDepth + 1);
      if (!childValidation.valid) {
        return childValidation;
      }
    }
  }

  return { valid: true };
}

/**
 * Convert context expression to human-readable string
 */
export function expressionToString(node: ContextNode): string {
  if (node.tag) {
    return node.tag.value;
  }

  if (node.operator && node.children) {
    const childStrings = node.children.map(expressionToString);

    if (node.operator === 'NOT') {
      return `NOT (${childStrings[0]})`;
    }

    return `(${childStrings.join(` ${node.operator} `)})`;
  }

  return '';
}

/**
 * Evaluate if current roll tags satisfy the context expression
 */
export function matchesContext(
  expression: ContextNode | null | undefined,
  currentTags: {
    rollType?: string;
    ability?: string;
    coreStat?: string;
    organizational?: { category: string; value: string }[];
  }
): boolean {
  // No expression means applies to all contexts
  if (!expression) {
    return true;
  }

  // Leaf node: check if tag is present in current tags
  if (expression.tag) {
    const { category, value } = expression.tag;

    switch (category) {
      case 'rollType':
        return currentTags.rollType === value;
      case 'ability':
        return currentTags.ability === value;
      case 'coreStat':
        return currentTags.coreStat === value;
      case 'organizational':
        return currentTags.organizational?.some(tag => tag.value === value) || false;
      default:
        return false;
    }
  }

  // Operator node: evaluate children recursively
  if (expression.operator && expression.children) {
    const childResults = expression.children.map(child => matchesContext(child, currentTags));

    switch (expression.operator) {
      case 'AND':
        return childResults.every(result => result);
      case 'OR':
        return childResults.some(result => result);
      case 'NOT':
        return !childResults[0];
      default:
        return false;
    }
  }

  return false;
}

/**
 * Get all unique tag values referenced in an expression
 */
export function extractTagReferences(node: ContextNode): TagReference[] {
  const tags: TagReference[] = [];

  if (node.tag) {
    tags.push(node.tag);
  }

  if (node.children) {
    for (const child of node.children) {
      tags.push(...extractTagReferences(child));
    }
  }

  return tags;
}
