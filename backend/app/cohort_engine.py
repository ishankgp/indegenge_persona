from openai import OpenAI
import os
from dotenv import load_dotenv
import json
import random
import re
import logging
import asyncio
import concurrent.futures
from typing import Dict, Any, List, Optional
from . import crud
from datetime import datetime

load_dotenv()

# Initialize OpenAI client after loading environment variables
client = OpenAI()
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o")  # Use gpt-4o for vision capabilities

# Configure logging
logger = logging.getLogger(__name__)

# Model token limit (allow overriding via env)
MODEL_MAX_TOKENS = int(os.getenv("OPENAI_MODEL_MAX_TOKENS", "32768"))


def _estimate_tokens_for_text(text: str) -> int:
    """Very small heuristic to estimate tokens from characters.
    Uses a chars-per-token heuristic (avg 4 chars/token) and adds small padding.
    This is conservative and intended for budgeting only.
    """
    if not text:
        return 0
    # basic heuristic: 1 token per ~4 characters
    return max(1, int(len(text) / 4) + 2)


def _validate_openai_setup():
    """Validate OpenAI configuration and provide helpful error messages."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("❌ OPENAI_API_KEY environment variable not set!")
        logger.error("💡 Set your OpenAI API key: export OPENAI_API_KEY='your-key-here'")
        return False
    
    if api_key.startswith("sk-"):
        logger.info("✅ OpenAI API key format appears valid")
    else:
        logger.warning("⚠️ OpenAI API key format might be invalid (should start with 'sk-')")
    
    logger.info(f"🤖 Using model: {MODEL_NAME}")
    return True


def _extract_json(text: str) -> str:
    """Attempt to extract the first JSON object from arbitrary model text."""
    if not text:
        return "{}"
    # Remove fences
    if text.startswith("```"):
        text = re.sub(r"^```(json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    # Fast path
    try:
        json.loads(text)
        return text
    except Exception:
        pass
    # Regex object match
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        candidate = match.group(0)
        try:
            json.loads(candidate)
            return candidate
        except Exception:
            return "{}"
    return "{}"


def _chat_json(messages: List[Dict[str, Any]], max_completion_tokens: Optional[int] = None) -> Dict[str, Any]:
    """Call chat.completions ensuring JSON-only output via instruction. Returns parsed dict or {}."""
    
    # Validate setup first
    if not _validate_openai_setup():
        logger.error("❌ OpenAI setup validation failed")
        return {"error": "OpenAI API not configured properly"}
    
    # Estimate prompt tokens conservatively
    prompt_text = "".join([part.get("text", "") for m in messages for part in m.get("content", []) if part.get("type") == "text"])
    prompt_tokens = _estimate_tokens_for_text(prompt_text)
    logger.info(f"🤖 Calling GPT-4o: messages={len(messages)}, estimated_prompt_tokens={prompt_tokens}")

    # Compute completion budget if not provided
    if max_completion_tokens is None:
        # Reserve 10% of model max tokens as overhead, and allow remaining for completion
        reserved = max(256, int(MODEL_MAX_TOKENS * 0.1))
        available = max(256, MODEL_MAX_TOKENS - reserved - prompt_tokens)
        # Cap completion tokens to a reasonable ceiling
        max_completion_tokens = min(2048, available)
    logger.info(f"🧮 Using max_completion_tokens={max_completion_tokens} (model_max={MODEL_MAX_TOKENS})")
    
    # Inject enforcement instruction (append to last user message as minimal change)
    enforce = "\n\nReturn ONLY valid JSON. No commentary, no code fences."
    if messages and messages[-1].get("role") == "user":
        # Append to existing text content piece(s)
        for part in messages[-1].get("content", []):
            if part.get("type") == "text":
                part["text"] += enforce
                break
        else:
            messages[-1]["content"].append({"type": "text", "text": enforce})

    try:
        logger.info(f"🚀 Sending request to OpenAI model: {MODEL_NAME}")
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            max_completion_tokens=max_completion_tokens,
        )
        logger.info("✅ OpenAI response received")
        
        raw = response.choices[0].message.content if response.choices else "{}"
        logger.info(f"📝 Raw response length: {len(raw)} chars")
        
        if raw and len(raw) > 0:
            logger.info(f"📝 Raw response preview: {raw[:200]}...")
        else:
            logger.error("❌ Empty response from OpenAI API")
            logger.error("💡 This could indicate API key issues, model access problems, or content policy violations")
            return {"error": "Empty response from OpenAI"}
        
        json_str = _extract_json(raw)
        logger.info(f"🔍 Extracted JSON length: {len(json_str)} chars")
        
        try:
            parsed = json.loads(json_str)
            logger.info(f"✅ JSON parsed successfully, keys: {list(parsed.keys())}")
            return parsed
        except Exception as parse_error:
            logger.error(f"❌ JSON parsing failed: {parse_error}")
            logger.error(f"❌ Failed JSON: {json_str}")
            return {"error": f"JSON parsing failed: {parse_error}", "raw_content": raw[:500]}
            
    except Exception as api_error:
        logger.error(f"❌ OpenAI API call failed: {api_error}")
        if "authentication" in str(api_error).lower():
            logger.error("💡 Authentication error - check your OPENAI_API_KEY")
        elif "quota" in str(api_error).lower():
            logger.error("💡 Quota exceeded - check your OpenAI account billing")
        elif "rate" in str(api_error).lower():
            logger.error("💡 Rate limit exceeded - wait and retry")
        return {"error": f"OpenAI API error: {api_error}"}

def create_cohort_analysis_prompt(persona_data: Dict[str, Any], stimulus_text: str, metrics: List[str]) -> str:
    """Creates a prompt for analyzing how a persona responds to a stimulus."""
    
    # Convert metrics to readable descriptions
    metric_descriptions = {
        'purchase_intent': 'Purchase Intent (1-10 scale): How likely is this persona to ask their doctor about this product?',
        'sentiment': 'Sentiment (-1 to 1 scale): What is their emotional response to this message?',
        'trust_in_brand': 'Trust in Brand (1-10 scale): How does this message affect their trust in the brand?',
        'message_clarity': 'Message Clarity (1-10 scale): How clear and understandable is this message to them?',
        'key_concern_flagged': 'Key Concern: What is their primary concern or question about this message?'
    }
    
    selected_metrics = [metric_descriptions.get(metric, metric) for metric in metrics]
    
    prompt = f"""
    **Role:** You are an AI expert in pharmaceutical marketing and patient behavior analysis. You need to simulate how a specific patient persona would respond to a marketing message or stimulus.

    **Persona Information:**
    {json.dumps(persona_data, indent=2)}

    **Stimulus Text:**
    "{stimulus_text}"

    **Analysis Request:**
    Please analyze how this specific persona would respond to the stimulus above. Consider their medical condition, lifestyle, concerns, and demographics.

    **Required Metrics to Analyze:**
    {chr(10).join(f"- {metric}" for metric in selected_metrics)}

    **Output Format:**
    Generate a response in pure JSON format. Do not include any text, code block markers, or explanations before or after the JSON object. The JSON object must have the following structure:
    {
        "responses": {
            "purchase_intent": <number 1-10>,
            "sentiment": <number -1 to 1>,
            "trust_in_brand": <number 1-10>,
            "message_clarity": <number 1-10>,
            "key_concern_flagged": "<string describing their main concern>"
        },
        "reasoning": "<2-3 sentences explaining their response based on their persona characteristics>"
    }

    **Important Notes:**
    - Only include the metrics that were requested in the analysis
    - Be realistic and consider the persona's specific medical condition and concerns
    - The reasoning should explain why they responded this way based on their persona profile
    - Consider their pain points, motivations, and communication preferences
    """
    
    return prompt

def generate_tool_preamble(persona_count: int, metrics: List[str], stimulus_text: str) -> str:
    """Generates a short tool preamble; deterministic fallback only (removed extra model call for cost)."""
    steps = [
        "Validate inputs and metrics",
        "Simulate persona reactions",
        "Compute cohort statistics",
        "Derive key insights",
        "Return structured JSON",
    ]
    bullets = "\n".join([f"- {s}" for s in steps])
    return (
        f"Analyze {persona_count} persona(s) for stimulus alignment across metrics: {', '.join(metrics) if metrics else 'none'}.\n\n" + bullets
    )

def analyze_persona_response(persona_data: Dict[str, Any], stimulus_text: str, metrics: List[str]) -> Dict[str, Any]:
    """Analyzes how a single persona responds to a stimulus using chat completions."""
    prompt = create_cohort_analysis_prompt(persona_data, stimulus_text, metrics)
    messages = [
        {"role": "system", "content": [{"type": "text", "text": "You are a pharmaceutical marketing analyst specializing in patient behavior simulation."}]},
        {"role": "user", "content": [{"type": "text", "text": prompt}]},
    ]
    try:
        data = _chat_json(messages)
        filtered = {}
        for metric in metrics:
            if metric in data.get('responses', {}):
                filtered[metric] = data['responses'][metric]
        return {
            'responses': filtered,
            'reasoning': data.get('reasoning', 'No reasoning provided.')
        }
    except Exception as e:
        print(f"Error analyzing persona response: {e}")
        fallback = {}
        for metric in metrics:
            if metric == 'purchase_intent':
                fallback[metric] = random.randint(3, 8)
            elif metric == 'sentiment':
                fallback[metric] = round(random.uniform(-0.5, 0.8), 2)
            elif metric == 'trust_in_brand':
                fallback[metric] = random.randint(4, 9)
            elif metric == 'message_clarity':
                fallback[metric] = random.randint(5, 9)
            elif metric == 'key_concern_flagged':
                fallback[metric] = "Need more information about side effects and effectiveness"
        return {
            'responses': fallback,
            'reasoning': 'Analysis failed, using fallback response.'
        }

def calculate_summary_statistics(individual_responses: List[Dict[str, Any]], metrics: List[str]) -> Dict[str, Any]:
    """Calculates summary statistics for the cohort analysis."""
    
    summary = {}
    
    for metric in metrics:
        if metric == 'key_concern_flagged':
            # For text-based metrics, find most common concern
            concerns = [resp['responses'].get(metric, '') for resp in individual_responses if resp['responses'].get(metric)]
            if concerns:
                # Simple approach: take the first non-empty concern
                summary[metric] = next((c for c in concerns if c), 'No concerns identified')
        else:
            # For numeric metrics, calculate statistics
            values = [resp['responses'].get(metric) for resp in individual_responses if resp['responses'].get(metric) is not None]
            if values:
                summary[f"{metric}_avg"] = round(sum(values) / len(values), 2)
                summary[f"{metric}_min"] = min(values)
                summary[f"{metric}_max"] = max(values)
                summary[f"{metric}_count"] = len(values)
    
    return summary

def generate_cohort_insights(individual_responses: List[Dict[str, Any]], stimulus_text: str) -> List[str]:
    """Generates insights from the cohort analysis."""
    
    insights = []
    
    # Analyze purchase intent patterns
    purchase_intents = [resp['responses'].get('purchase_intent') for resp in individual_responses if resp['responses'].get('purchase_intent')]
    if purchase_intents:
        avg_purchase_intent = sum(purchase_intents) / len(purchase_intents)
        if avg_purchase_intent >= 7:
            insights.append("High purchase intent detected across the cohort - message resonates well with target audience.")
        elif avg_purchase_intent <= 4:
            insights.append("Low purchase intent - consider revising message to address key concerns.")
        else:
            insights.append("Moderate purchase intent - message has potential but may need refinement.")
    
    # Analyze sentiment patterns
    sentiments = [resp['responses'].get('sentiment') for resp in individual_responses if resp['responses'].get('sentiment')]
    if sentiments:
        avg_sentiment = sum(sentiments) / len(sentiments)
        if avg_sentiment >= 0.5:
            insights.append("Positive sentiment detected - message creates favorable emotional response.")
        elif avg_sentiment <= -0.2:
            insights.append("Negative sentiment detected - message may be causing concern or confusion.")
        else:
            insights.append("Neutral sentiment - message is well-received but may need emotional enhancement.")
    
    # Analyze trust patterns
    trust_scores = [resp['responses'].get('trust_in_brand') for resp in individual_responses if resp['responses'].get('trust_in_brand')]
    if trust_scores:
        avg_trust = sum(trust_scores) / len(trust_scores)
        if avg_trust >= 7:
            insights.append("High brand trust impact - message effectively builds credibility.")
        elif avg_trust <= 4:
            insights.append("Low brand trust impact - consider adding more credibility elements.")
    
    # Analyze message clarity
    clarity_scores = [resp['responses'].get('message_clarity') for resp in individual_responses if resp['responses'].get('message_clarity')]
    if clarity_scores:
        avg_clarity = sum(clarity_scores) / len(clarity_scores)
        if avg_clarity <= 6:
            insights.append("Message clarity concerns detected - consider simplifying language or adding explanations.")
    
    # Analyze common concerns
    concerns = [resp['responses'].get('key_concern_flagged') for resp in individual_responses if resp['responses'].get('key_concern_flagged')]
    if concerns:
        # Find most common concern patterns
        concern_text = ' '.join(concerns).lower()
        if 'side effect' in concern_text or 'safety' in concern_text:
            insights.append("Safety and side effects are primary concerns - consider addressing these more prominently.")
        if 'cost' in concern_text or 'price' in concern_text:
            insights.append("Cost concerns detected - consider addressing affordability or insurance coverage.")
        if 'effectiveness' in concern_text or 'work' in concern_text:
            insights.append("Effectiveness concerns detected - consider providing more efficacy data or testimonials.")
    
    if not insights:
        insights.append("Analysis complete. Consider reviewing individual responses for detailed insights.")
    
    return insights

def run_cohort_analysis(persona_ids: List[int], stimulus_text: str, metrics: List[str], db) -> Dict[str, Any]:
    """Runs a complete cohort analysis for the given personas and stimulus."""
    
    # Get persona data from database
    personas = []
    for persona_id in persona_ids:
        persona = crud.get_persona(db, persona_id)
        if persona:
            personas.append(persona)
    
    if not personas:
        raise ValueError("No valid personas found for the provided IDs")
    
    # Optional: generate a brief tool preamble for the UI
    preamble_text = generate_tool_preamble(len(personas), metrics, stimulus_text)

    # Analyze each persona's response
    individual_responses = []
    for persona in personas:
        # Parse the JSON string to get the persona data
        persona_data = json.loads(persona.full_persona_json)
        analysis_result = analyze_persona_response(persona_data, stimulus_text, metrics)
        
        individual_responses.append({
            'persona_id': persona.id,
            'persona_name': persona.name,
            'responses': analysis_result['responses'],
            'reasoning': analysis_result['reasoning']
        })
    
    # Calculate summary statistics
    summary_stats = calculate_summary_statistics(individual_responses, metrics)
    
    # Generate insights
    insights = generate_cohort_insights(individual_responses, stimulus_text)
    
    return {
        'cohort_size': len(personas),
        'stimulus_text': stimulus_text,
        'metrics_analyzed': metrics,
        'individual_responses': individual_responses,
        'summary_statistics': summary_stats,
        'insights': insights,
        'preamble': preamble_text,
        'created_at': datetime.now().isoformat()
    }


def create_multimodal_analysis_prompt(persona_data: Dict[str, Any], stimulus_text: str, stimulus_images: List[Dict], content_type: str, metrics: List[str]) -> str:
    """Creates a prompt for analyzing how a persona responds to multimodal stimulus (text + images)."""
    
    # Convert metrics to readable descriptions
    metric_descriptions = {
        'purchase_intent': 'Purchase Intent (1-10 scale): How likely is this persona to ask their doctor about this product?',
        'sentiment': 'Sentiment (-1 to 1 scale): What is their emotional response to this message?',
        'trust_in_brand': 'Trust in Brand (1-10 scale): How does this message affect their trust in the brand?',
        'message_clarity': 'Message Clarity (1-10 scale): How clear and understandable is this message to them?',
        'key_concern_flagged': 'Key Concern: What is their primary concern or question about this message?'
    }
    
    selected_metrics = [metric_descriptions.get(metric, metric) for metric in metrics]
    
    # Build content description
    content_description = ""
    if content_type == 'text':
        content_description = f"Text Message: {stimulus_text}"
    elif content_type == 'image':
        content_description = f"Visual Content: {len(stimulus_images)} image(s) provided"
    elif content_type == 'both':
        content_description = f"Text Message: {stimulus_text}\nVisual Content: {len(stimulus_images)} image(s) provided"
    
    prompt = f"""
You are analyzing how a specific pharmaceutical persona responds to marketing content. 

PERSONA PROFILE:
- Name: {persona_data.get('name', 'Unknown')}
- Age: {persona_data.get('age', 'Not specified')}
- Gender: {persona_data.get('gender', 'Not specified')}
- Health Condition: {persona_data.get('condition', 'Not specified')}
- Location: {persona_data.get('location', 'Not specified')}

DETAILED PERSONA CHARACTERISTICS:
{json.dumps(persona_data.get('full_persona', {}), indent=2)}

MARKETING CONTENT TO ANALYZE:
{content_description}

ANALYSIS TASK:
Analyze how this specific persona would respond to the provided content. Consider their unique characteristics, health condition, concerns, and behavioral patterns.

For each of the following metrics, provide your analysis:

{chr(10).join([f"- {metric}" for metric in selected_metrics])}

RESPONSE FORMAT:
Provide a JSON response with the following structure:
{{
    "analysis_summary": "Brief overview of how this persona responds to the content",
    "metrics": {{
        // For each requested metric, provide the score and reasoning
    }},
    "key_insights": [
        "List of 2-3 key insights about this persona's response"
    ],
    "behavioral_prediction": "How this persona would likely behave after seeing this content"
}}

Be specific and consider the persona's unique characteristics in your analysis.
"""
    
    return prompt


def _process_persona_multimodal(persona, stimulus_text: str, stimulus_images: List[Dict], content_type: str, metrics: List[str]) -> Dict[str, Any]:
    """
    Process a single persona for multimodal analysis.
    This function is designed to be called in parallel.
    """
    logger.info(f"🔄 Processing persona: {persona.name} (ID: {persona.id})")
    
    # Parse the full persona JSON to get all the detailed information
    try:
        full_persona = json.loads(persona.full_persona_json) if persona.full_persona_json else {}
        logger.info(f"✅ Parsed persona data for {persona.name}")
    except Exception as parse_error:
        logger.error(f"❌ Error parsing persona JSON for {persona.name}: {parse_error}")
        full_persona = {}
    
    persona_data = {
        'id': persona.id,
        'name': persona.name,
        'persona_type': persona.persona_type,
        'age': persona.age,
        'gender': persona.gender,
        'condition': persona.condition,
        'location': persona.location,
        'full_persona': full_persona
    }
    
    # Create multimodal prompt
    logger.info(f"🔄 Creating multimodal prompt for {persona.name}")
    prompt = create_multimodal_analysis_prompt(persona_data, stimulus_text, stimulus_images, content_type, metrics)
    logger.info(f"✅ Prompt created, length: {len(prompt)} chars")
    
    # Prepare messages for GPT-5
    messages = [
        {
            "role": "user",
            "content": []
        }
    ]
    
    # Add text content
    messages[0]["content"].append({
        "type": "text",
        "text": prompt
    })
    
    # Add images if provided
    if stimulus_images and content_type in ['image', 'both']:
        logger.info(f"🖼️ Adding {len(stimulus_images)} images to analysis for {persona.name}")
        for j, image_info in enumerate(stimulus_images):
            data_url = f"data:{image_info['content_type']};base64,{image_info['data']}"
            logger.info(f"🖼️ Image {j+1}: {image_info['filename']}, type: {image_info['content_type']}, data URL length: {len(data_url)}")
            messages[0]["content"].append({
                "type": "image_url",
                "image_url": {
                    "url": data_url
                }
            })
    else:
        logger.info(f"📝 Text-only analysis for {persona.name}")
    
    try:
        logger.info(f"🚀 Calling GPT-5 for {persona.name}...")
        logger.info(f"📊 Message content parts: {len(messages[0]['content'])}")
        
        data = _chat_json(messages)
        logger.info(f"✅ GPT-5 response received for {persona.name}")
        logger.info(f"📊 Response keys: {list(data.keys())}")
        
        result = {
            'persona_id': persona.id,
            'persona_name': persona_data.get('name', f'Persona {persona.id}'),
            'condition': persona.condition,
            'analysis_summary': data.get('analysis_summary', ''),
            'metrics': data.get('metrics', {}),
            'key_insights': data.get('key_insights', []),
            'behavioral_prediction': data.get('behavioral_prediction', ''),
            'raw_response': json.dumps(data)[:500]
        }
        logger.info(f"✅ Analysis completed for {persona.name}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error analyzing persona {persona.id} ({persona.name}): {e}")
        logger.error(f"❌ Full error traceback:", exc_info=True)
        return {
            'persona_id': persona.id,
            'persona_name': f"Persona {persona.id}",
            'condition': persona.condition,
            'analysis_summary': f"Error in analysis: {str(e)}",
            'metrics': {},
            'key_insights': [],
            'behavioral_prediction': 'Unable to generate prediction due to error',
            'error': str(e)
        }


def run_multimodal_cohort_analysis(persona_ids: List[int], stimulus_text: str, stimulus_images: List[Dict], content_type: str, metrics: List[str], db) -> Dict[str, Any]:
    """
    Runs a multimodal cohort analysis using GPT-5's vision capabilities for image processing.
    """
    logger.info(f"🔄 Starting multimodal analysis: {len(persona_ids)} personas, content_type={content_type}")
    logger.info(f"📝 Text length: {len(stimulus_text) if stimulus_text else 0}")
    logger.info(f"🖼️ Images provided: {len(stimulus_images)}")
    logger.info(f"📊 Metrics: {metrics}")
    
    # Get personas from database
    personas = []
    for persona_id in persona_ids:
        persona = crud.get_persona(db, persona_id)
        if persona:
            personas.append(persona)
            logger.info(f"✅ Loaded persona {persona_id}: {persona.name}")
        else:
            logger.error(f"❌ Persona {persona_id} not found in database")
    
    if not personas:
        logger.error("❌ No valid personas found")
        raise ValueError("No valid personas found")
    
    logger.info(f"✅ Loaded {len(personas)} valid personas")
    
    # Process all personas in parallel using ThreadPoolExecutor
    logger.info(f"� Starting parallel processing of {len(personas)} personas...")
    individual_responses = []
    
    # Determine the optimal number of workers (max 5 to avoid overwhelming OpenAI API)
    max_workers = min(5, len(personas))
    logger.info(f"🔧 Using {max_workers} parallel workers for processing")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all persona processing tasks
        future_to_persona = {
            executor.submit(_process_persona_multimodal, persona, stimulus_text, stimulus_images, content_type, metrics): persona 
            for persona in personas
        }
        
        # Collect results as they complete
        for future in concurrent.futures.as_completed(future_to_persona):
            persona = future_to_persona[future]
            try:
                result = future.result()
                individual_responses.append(result)
                logger.info(f"✅ Completed processing for {persona.name}")
            except Exception as e:
                logger.error(f"❌ Exception occurred while processing {persona.name}: {e}")
                # Add error response for failed persona
                individual_responses.append({
                    'persona_id': persona.id,
                    'persona_name': f"Persona {persona.id}",
                    'condition': persona.condition,
                    'analysis_summary': f"Processing error: {str(e)}",
                    'metrics': {},
                    'key_insights': [],
                    'behavioral_prediction': 'Unable to generate prediction due to processing error',
                    'error': str(e)
                })
    
    logger.info(f"🎯 Parallel analysis complete for all personas. Successful: {len([r for r in individual_responses if 'error' not in r])}/{len(individual_responses)}")
    
    # Calculate summary statistics for multimodal analysis
    logger.info("📊 Calculating summary statistics...")
    summary_stats = calculate_multimodal_summary_statistics(individual_responses, metrics)
    
    # Generate insights for multimodal content
    logger.info("💡 Generating cohort insights...")
    insights = generate_multimodal_cohort_insights(individual_responses, stimulus_text, stimulus_images, content_type)
    
    # Create content summary
    content_summary = f"Content Type: {content_type}"
    if stimulus_text:
        content_summary += f" | Text: {stimulus_text[:100]}{'...' if len(stimulus_text) > 100 else ''}"
    if stimulus_images:
        content_summary += f" | Images: {len(stimulus_images)} uploaded"
    
    return {
        'cohort_size': len(personas),
        'content_type': content_type,
        'stimulus_text': stimulus_text,
        'stimulus_images_count': len(stimulus_images) if stimulus_images else 0,
        'content_summary': content_summary,
        'metrics_analyzed': metrics,
        'individual_responses': individual_responses,
        'summary_statistics': summary_stats,
        'insights': insights,
        'created_at': datetime.now().isoformat()
    }


def calculate_multimodal_summary_statistics(responses: List[Dict], metrics: List[str]) -> Dict[str, Any]:
    """Calculate summary statistics for multimodal analysis responses."""
    stats = {}
    
    for metric in metrics:
        values = []
        for response in responses:
            metric_data = response.get('metrics', {}).get(metric)
            if isinstance(metric_data, dict) and 'score' in metric_data:
                try:
                    values.append(float(metric_data['score']))
                except (ValueError, TypeError):
                    continue
            elif isinstance(metric_data, (int, float)):
                values.append(float(metric_data))
        
        if values:
            stats[metric] = {
                'mean': sum(values) / len(values),
                'min': min(values),
                'max': max(values),
                'count': len(values)
            }
        else:
            stats[metric] = {
                'mean': 0,
                'min': 0,
                'max': 0,
                'count': 0
            }
    
    return stats


def generate_multimodal_cohort_insights(responses: List[Dict], stimulus_text: str, stimulus_images: List[Dict], content_type: str) -> List[str]:
    """Generate insights for multimodal cohort analysis."""
    insights = []
    
    # Content type specific insights
    if content_type == 'image':
        insights.append(f"Visual-only analysis completed for {len(stimulus_images)} image(s)")
    elif content_type == 'both':
        insights.append(f"Multimodal analysis combining text and {len(stimulus_images)} image(s)")
    
    # Response consistency insights
    successful_responses = [r for r in responses if 'error' not in r]
    if len(successful_responses) < len(responses):
        insights.append(f"{len(responses) - len(successful_responses)} personas had analysis errors")
    
    # Key insights from responses
    all_insights = []
    for response in successful_responses:
        all_insights.extend(response.get('key_insights', []))
    
    if all_insights:
        insights.append(f"Generated {len(all_insights)} total insights across all personas")
    
    return insights
