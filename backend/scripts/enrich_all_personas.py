#!/usr/bin/env python3
"""
Batch enrich all existing personas to match the full schema depth.
This script uses the enrich_existing_persona function to upgrade personas
with minimal data to the full enriched schema including core.mbt, 
decision_drivers, messaging, channel_behavior, etc.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import crud, schemas, database, persona_engine, models
import json


def enrich_all_personas(skip_already_enriched: bool = True):
    """Enrich all personas in the database."""
    db = database.SessionLocal()
    
    try:
        personas = db.query(models.Persona).all()
        print(f"🚀 Found {len(personas)} personas to process")
        print("=" * 60)
        
        enriched_count = 0
        skipped_count = 0
        failed_count = 0
        
        for i, persona in enumerate(personas, 1):
            try:
                print(f"\n[{i}/{len(personas)}] Processing: {persona.name} (ID: {persona.id})")
                
                # Parse existing JSON
                try:
                    persona_json = json.loads(persona.full_persona_json or "{}")
                except json.JSONDecodeError:
                    persona_json = {}
                
                # Check if already has full schema
                has_core = "core" in persona_json and persona_json.get("core", {}).get("mbt")
                has_schema_version = persona_json.get("schema_version")
                
                if skip_already_enriched and has_core and has_schema_version:
                    print(f"  ⏭️  Skipping: Already has full schema")
                    skipped_count += 1
                    continue
                
                # Enrich the persona
                enriched = persona_engine.enrich_existing_persona(persona_json)
                
                # Update in database
                updated = crud.update_persona(
                    db,
                    persona.id,
                    schemas.PersonaUpdate(full_persona_json=enriched)
                )
                
                if updated:
                    print(f"  ✅ Enriched successfully")
                    enriched_count += 1
                else:
                    print(f"  ❌ Failed to persist")
                    failed_count += 1
                    
            except Exception as e:
                print(f"  ❌ Error: {e}")
                failed_count += 1
                continue
        
        print("\n" + "=" * 60)
        print(f"✅ Successfully enriched: {enriched_count} personas")
        print(f"⏭️  Skipped (already enriched): {skipped_count} personas")
        if failed_count > 0:
            print(f"❌ Failed: {failed_count} personas")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def enrich_single_persona(persona_id: int):
    """Enrich a single persona by ID."""
    db = database.SessionLocal()
    
    try:
        persona = crud.get_persona(db, persona_id)
        if not persona:
            print(f"❌ Persona with ID {persona_id} not found")
            return
        
        print(f"🚀 Enriching persona: {persona.name} (ID: {persona.id})")
        
        try:
            persona_json = json.loads(persona.full_persona_json or "{}")
        except json.JSONDecodeError:
            persona_json = {}
        
        # Show before state
        print(f"\n📋 Before enrichment:")
        print(f"   - Has core.mbt: {'core' in persona_json and 'mbt' in persona_json.get('core', {})}")
        print(f"   - Has schema_version: {'schema_version' in persona_json}")
        print(f"   - Motivations count: {len(persona_json.get('motivations', []))}")
        
        # Enrich
        enriched = persona_engine.enrich_existing_persona(persona_json)
        
        # Update in database
        updated = crud.update_persona(
            db,
            persona.id,
            schemas.PersonaUpdate(full_persona_json=enriched)
        )
        
        if updated:
            print(f"\n✅ Enrichment successful!")
            print(f"\n📋 After enrichment:")
            print(f"   - Has core.mbt: {'core' in enriched and 'mbt' in enriched.get('core', {})}")
            print(f"   - Has schema_version: {'schema_version' in enriched}")
            print(f"   - Motivations count: {len(enriched.get('motivations', []))}")
            
            # Show a sample of the enriched MBT
            mbt = enriched.get("core", {}).get("mbt", {})
            if mbt:
                motivation = mbt.get("motivation", {})
                if motivation.get("primary_motivation"):
                    pm = motivation["primary_motivation"]
                    print(f"\n🎯 Primary Motivation: {pm.get('value', 'N/A')}")
        else:
            print(f"❌ Failed to persist enrichment")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Enrich personas to full schema depth")
    parser.add_argument(
        "--persona-id", "-p",
        type=int,
        help="Enrich a single persona by ID"
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Re-enrich personas even if they already have full schema"
    )
    
    args = parser.parse_args()
    
    if args.persona_id:
        enrich_single_persona(args.persona_id)
    else:
        enrich_all_personas(skip_already_enriched=not args.force)
