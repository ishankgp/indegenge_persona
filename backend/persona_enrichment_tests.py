#!/usr/bin/env python3
"""
Automated tests for the persona enrichment functionality.

Run with: python persona_enrichment_tests.py
Or with pytest: pytest persona_enrichment_tests.py -v
"""

import sys
import os
import json

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import persona_engine


def test_enriches_minimal_persona():
    """Test that a minimal persona gets enriched with full schema."""
    minimal_persona = {
        "name": "Maria Santos",
        "demographics": {
            "age": 45,
            "gender": "Female",
            "location": "Los Angeles, CA"
        },
        "condition": "Type 2 Diabetes",
        "motivations": ["Manage blood sugar"],
        "beliefs": ["Diet matters"],
        "pain_points": ["Hard to maintain routine"]
    }
    
    enriched = persona_engine.enrich_existing_persona(minimal_persona)
    
    # Check schema version is present
    assert "schema_version" in enriched, "Missing schema_version"
    assert enriched["schema_version"] == "1.0.0", f"Wrong schema_version: {enriched['schema_version']}"
    
    # Check persona type
    assert "persona_type" in enriched, "Missing persona_type"
    
    # Check core structure exists
    assert "core" in enriched, "Missing core structure"
    core = enriched["core"]
    
    # Check MBT structure
    assert "mbt" in core, "Missing mbt in core"
    mbt = core["mbt"]
    assert "motivation" in mbt, "Missing motivation in mbt"
    assert "beliefs" in mbt, "Missing beliefs in mbt"
    assert "tension" in mbt, "Missing tension in mbt"
    
    # Check motivation details
    motivation = mbt["motivation"]
    assert "primary_motivation" in motivation, "Missing primary_motivation"
    assert "value" in motivation["primary_motivation"], "Missing value in primary_motivation"
    assert motivation["primary_motivation"]["value"], "primary_motivation value is empty"
    
    # Check other core sections
    assert "decision_drivers" in core, "Missing decision_drivers"
    assert "messaging" in core, "Missing messaging"
    assert "channel_behavior" in core, "Missing channel_behavior"
    
    # Check legacy fields are preserved
    assert "name" in enriched, "Missing name"
    assert enriched["name"] == "Maria Santos", f"Name mismatch: {enriched['name']}"
    
    print("✅ test_enriches_minimal_persona PASSED")
    return True


def test_preserves_existing_data():
    """Test that existing data is preserved during enrichment."""
    persona_with_data = {
        "name": "John Smith",
        "demographics": {
            "age": 55,
            "gender": "Male",
            "location": "Boston, MA",
            "occupation": "Engineer"
        },
        "condition": "Hypertension",
        "motivations": ["Lower blood pressure", "Reduce medication"],
        "beliefs": ["Lifestyle changes work"],
        "pain_points": ["Side effects from current meds"],
        "medical_background": "Diagnosed 5 years ago",
        "lifestyle_and_values": "Active lifestyle, values family time"
    }
    
    enriched = persona_engine.enrich_existing_persona(persona_with_data)
    
    # Original name should be preserved
    assert enriched["name"] == "John Smith", f"Name not preserved: {enriched['name']}"
    
    # Demographics should be preserved in legacy format
    assert enriched.get("demographics", {}).get("age") == 55, "Age not preserved"
    assert enriched.get("demographics", {}).get("gender") == "Male", "Gender not preserved"
    
    print("✅ test_preserves_existing_data PASSED")
    return True


def test_handles_empty_persona():
    """Test that an empty persona gets enriched with defaults."""
    empty_persona = {}
    
    enriched = persona_engine.enrich_existing_persona(empty_persona)
    
    # Should still have schema structure
    assert "schema_version" in enriched, "Missing schema_version for empty persona"
    assert "core" in enriched, "Missing core for empty persona"
    assert "mbt" in enriched["core"], "Missing mbt for empty persona"
    
    # Should have a name (even if default)
    assert "name" in enriched, "Missing name for empty persona"
    
    print("✅ test_handles_empty_persona PASSED")
    return True


def test_enriched_fields_have_status_and_confidence():
    """Test that enriched fields have status and confidence metadata."""
    minimal_persona = {
        "name": "Test",
        "demographics": {"age": 40, "gender": "Female"},
        "condition": "Asthma"
    }
    
    enriched = persona_engine.enrich_existing_persona(minimal_persona)
    
    # Check that MBT fields have enriched structure
    mbt = enriched.get("core", {}).get("mbt", {})
    
    # Check primary_motivation has enriched structure
    primary_motivation = mbt.get("motivation", {}).get("primary_motivation", {})
    assert "value" in primary_motivation, "Missing value in primary_motivation"
    assert "status" in primary_motivation, "Missing status in primary_motivation"
    assert "confidence" in primary_motivation, "Missing confidence in primary_motivation"
    assert primary_motivation["status"] in ["suggested", "confirmed", "empty"], \
        f"Invalid status: {primary_motivation['status']}"
    assert 0.0 <= primary_motivation["confidence"] <= 1.0, \
        f"Invalid confidence: {primary_motivation['confidence']}"
    
    print("✅ test_enriched_fields_have_status_and_confidence PASSED")
    return True


def test_meta_section_created():
    """Test that meta section is created with proper fields."""
    persona = {
        "name": "Meta Test",
        "demographics": {"age": 30, "gender": "Male"},
        "condition": "Obesity"
    }
    
    enriched = persona_engine.enrich_existing_persona(persona)
    
    assert "meta" in enriched, "Missing meta section"
    meta = enriched["meta"]
    
    # Check required meta fields
    assert "persona_id" in meta, "Missing persona_id in meta"
    assert "name" in meta, "Missing name in meta"
    assert "indication" in meta, "Missing indication in meta"
    assert "created_at" in meta, "Missing created_at in meta"
    
    print("✅ test_meta_section_created PASSED")
    return True


def test_enriched_string_helper():
    """Test _enriched_string helper."""
    result = persona_engine._enriched_string("Test value", confidence=0.8)
    
    assert result["value"] == "Test value", f"Wrong value: {result['value']}"
    assert result["status"] == "suggested", f"Wrong status: {result['status']}"
    assert result["confidence"] == 0.8, f"Wrong confidence: {result['confidence']}"
    assert result["evidence"] == [], f"Wrong evidence: {result['evidence']}"
    
    print("✅ test_enriched_string_helper PASSED")
    return True


def test_enriched_string_empty():
    """Test _enriched_string with empty value."""
    result = persona_engine._enriched_string("")
    
    assert result["value"] == "", f"Wrong value: {result['value']}"
    assert result["status"] == "empty", f"Wrong status for empty: {result['status']}"
    
    print("✅ test_enriched_string_empty PASSED")
    return True


def test_enriched_list_helper():
    """Test _enriched_list helper."""
    result = persona_engine._enriched_list(["Item 1", "Item 2"], confidence=0.7)
    
    assert result["value"] == ["Item 1", "Item 2"], f"Wrong value: {result['value']}"
    assert result["status"] == "suggested", f"Wrong status: {result['status']}"
    assert result["confidence"] == 0.7, f"Wrong confidence: {result['confidence']}"
    
    print("✅ test_enriched_list_helper PASSED")
    return True


def run_all_tests():
    """Run all tests and report results."""
    tests = [
        test_enriches_minimal_persona,
        test_preserves_existing_data,
        test_handles_empty_persona,
        test_enriched_fields_have_status_and_confidence,
        test_meta_section_created,
        test_enriched_string_helper,
        test_enriched_string_empty,
        test_enriched_list_helper,
    ]
    
    print("=" * 60)
    print("Running Persona Enrichment Tests")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"❌ {test.__name__} FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"❌ {test.__name__} ERROR: {e}")
            failed += 1
    
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
