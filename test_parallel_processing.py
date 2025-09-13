#!/usr/bin/env python3
"""
Test script to verify parallel processing in multimodal cohort analysis
"""

import requests
import json
import time
import base64
from pathlib import Path

# Create a simple test image (1x1 pixel PNG)
def create_test_image():
    """Create a minimal PNG image for testing"""
    # 1x1 transparent PNG in base64
    png_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA4nEKtAAAAABJRU5ErkJggg=="
    return base64.b64decode(png_data)

def test_parallel_processing():
    """Test the parallel processing functionality"""
    
    print("🧪 Testing Parallel Processing for Multimodal Analysis")
    print("=" * 60)
    
    # Backend URL
    base_url = "http://localhost:8000"
    
    # First, get available personas
    print("📋 Fetching available personas...")
    personas_response = requests.get(f"{base_url}/personas/")
    if personas_response.status_code != 200:
        print(f"❌ Failed to fetch personas: {personas_response.status_code}")
        return
    
    personas = personas_response.json()
    print(f"✅ Found {len(personas)} personas")
    
    if len(personas) < 3:
        print("⚠️ Need at least 3 personas to test parallel processing effectively")
        return
    
    # Select first 3-5 personas for testing
    selected_persona_ids = [p['id'] for p in personas[:5]]
    print(f"🎯 Selected personas: {selected_persona_ids}")
    
    # Test multimodal analysis with parallel processing
    print("\n🚀 Starting parallel multimodal analysis test...")
    
    # Create test image
    test_image_data = create_test_image()
    
    # Prepare multipart form data
    files = [
        ('stimulus_images', ('test_image.png', test_image_data, 'image/png'))
    ]
    
    data = {
        'persona_ids': json.dumps(selected_persona_ids),
        'metrics': json.dumps(['clarity', 'appeal', 'trustworthiness']),
        'content_type': 'both',
        'stimulus_text': 'This is a test message for parallel processing analysis.'
    }
    
    print(f"📊 Request data: {len(selected_persona_ids)} personas, 3 metrics, text + image")
    
    # Record start time
    start_time = time.time()
    
    # Make the request
    print("🔄 Sending request...")
    response = requests.post(
        f"{base_url}/cohorts/analyze-multimodal",
        files=files,
        data=data,
        timeout=120  # 2 minute timeout
    )
    
    # Record end time
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"⏱️ Request completed in {duration:.2f} seconds")
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Analysis completed successfully!")
        print(f"📊 Results summary:")
        print(f"   - Cohort size: {result.get('cohort_size', 'N/A')}")
        print(f"   - Individual responses: {len(result.get('individual_responses', []))}")
        print(f"   - Summary statistics available: {'Yes' if result.get('summary_statistics') else 'No'}")
        print(f"   - Insights generated: {len(result.get('insights', []))}")
        
        # Check for any errors in individual responses
        individual_responses = result.get('individual_responses', [])
        successful_responses = [r for r in individual_responses if 'error' not in r]
        failed_responses = [r for r in individual_responses if 'error' in r]
        
        print(f"   - Successful persona analyses: {len(successful_responses)}")
        if failed_responses:
            print(f"   - Failed persona analyses: {len(failed_responses)}")
            for failed in failed_responses:
                print(f"     * {failed.get('persona_name', 'Unknown')}: {failed.get('error', 'Unknown error')}")
        
        # Calculate average time per persona (approximate)
        avg_time_per_persona = duration / len(selected_persona_ids)
        print(f"   - Average time per persona: {avg_time_per_persona:.2f} seconds")
        
        if duration < len(selected_persona_ids) * 5:  # Less than 5 seconds per persona suggests parallelization
            print("🚀 Performance suggests parallel processing is working!")
        else:
            print("⚠️ Performance suggests sequential processing or slow responses")
            
    else:
        print(f"❌ Analysis failed with status code: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    test_parallel_processing()