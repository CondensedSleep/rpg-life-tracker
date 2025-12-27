/**
 * Reset Progress Script
 * 
 * To reset your XP and quest completions, run these SQL queries in your Supabase Dashboard:
 * 
 * 1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
 * 2. Click "SQL Editor"
 * 3. Paste and run these queries:
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Reset XP and Quest Progress                        ║
╚═══════════════════════════════════════════════════════════════╝

📋 Copy and run these SQL queries in Supabase SQL Editor:
   (https://supabase.com/dashboard)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Reset character XP to 0
UPDATE characters 
SET current_xp = 0 
WHERE user_id = auth.uid();

-- Reset all quest completions
UPDATE quests 
SET 
  is_completed = false, 
  times_completed = 0, 
  completed_at = null 
WHERE character_id IN (
  SELECT id FROM characters WHERE user_id = auth.uid()
);

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ After running the queries, refresh your browser!

`)

