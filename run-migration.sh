#!/bin/bash

# RPG Life Tracker - Database Migration Helper
# This script helps you apply the database migration to convert effects to arrays

echo "🎮 RPG Life Tracker - Database Migration Helper"
echo "================================================"
echo ""
echo "This will apply the migration to convert all effects and milestones to array format."
echo ""
echo "Choose your migration method:"
echo ""
echo "1. Supabase CLI (Recommended if installed)"
echo "2. Manual SQL Editor (Copy/paste instructions)"
echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
  1)
    echo ""
    echo "🚀 Applying migration with Supabase CLI..."
    echo ""
    
    # Check if supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
      echo "❌ Supabase CLI not found. Please install it first:"
      echo "   npm install -g supabase"
      echo "   or visit: https://supabase.com/docs/guides/cli"
      exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "supabase/config.toml" ]; then
      echo "❌ supabase/config.toml not found. Please run this from the project root."
      exit 1
    fi
    
    echo "📋 Linking to your Supabase project..."
    supabase link
    
    echo ""
    echo "📤 Pushing migration to database..."
    supabase db push
    
    echo ""
    echo "✅ Migration complete!"
    echo ""
    echo "🔍 To verify, run these queries in your Supabase SQL Editor:"
    echo ""
    echo "   -- Check traits"
    echo "   SELECT id, trait_name, jsonb_typeof(mechanical_effect) as type"
    echo "   FROM traits WHERE mechanical_effect IS NOT NULL;"
    echo ""
    echo "   -- Check inventory"
    echo "   SELECT id, item_name, jsonb_typeof(passive_effect) as type"
    echo "   FROM inventory WHERE passive_effect IS NOT NULL;"
    echo ""
    echo "   -- Check quests"
    echo "   SELECT id, quest_name, jsonb_typeof(progression_milestone) as type"
    echo "   FROM quests WHERE progression_milestone IS NOT NULL;"
    echo ""
    echo "All types should be 'array'."
    ;;
    
  2)
    echo ""
    echo "📋 Manual Migration Instructions"
    echo "=================================="
    echo ""
    echo "1. Open your Supabase Dashboard: https://app.supabase.com"
    echo "2. Navigate to: Your Project → SQL Editor"
    echo "3. Create a new query"
    echo "4. Copy the contents of:"
    echo "   supabase/migrations/20241201100000_migrate_effects_to_arrays.sql"
    echo "5. Paste into the SQL Editor"
    echo "6. Click 'Run' to execute"
    echo ""
    echo "The migration file location:"
    echo "$(pwd)/supabase/migrations/20241201100000_migrate_effects_to_arrays.sql"
    echo ""
    echo "Would you like to open the migration file now? (y/n)"
    read -p "> " open_file
    
    if [ "$open_file" = "y" ] || [ "$open_file" = "Y" ]; then
      if command -v code &> /dev/null; then
        code supabase/migrations/20241201100000_migrate_effects_to_arrays.sql
        echo "✅ Opened in VS Code"
      elif command -v open &> /dev/null; then
        open supabase/migrations/20241201100000_migrate_effects_to_arrays.sql
        echo "✅ Opened with default editor"
      else
        cat supabase/migrations/20241201100000_migrate_effects_to_arrays.sql
      fi
    fi
    
    echo ""
    echo "After running the migration, use the verification queries at the"
    echo "bottom of the migration file to confirm everything worked correctly."
    ;;
    
  *)
    echo "❌ Invalid choice. Please run again and select 1 or 2."
    exit 1
    ;;
esac

echo ""
echo "📚 For more details, see MIGRATION_SUMMARY.md"
echo ""
