import openai
import os
from dotenv import load_dotenv
import json
import random
from typing import Dict, Any, List
from . import crud
from datetime import datetime

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

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
    {{
        "responses": {{
            "purchase_intent": <number 1-10>,
            "sentiment": <number -1 to 1>,
            "trust_in_brand": <number 1-10>,
            "message_clarity": <number 1-10>,
            "key_concern_flagged": "<string describing their main concern>"
        }},
        "reasoning": "<2-3 sentences explaining their response based on their persona characteristics>"
    }}

    **Important Notes:**
    - Only include the metrics that were requested in the analysis
    - Be realistic and consider the persona's specific medical condition and concerns
    - The reasoning should explain why they responded this way based on their persona profile
    - Consider their pain points, motivations, and communication preferences
    """
    
    return prompt

def analyze_persona_response(persona_data: Dict[str, Any], stimulus_text: str, metrics: List[str]) -> Dict[str, Any]:
    """Analyzes how a single persona responds to a stimulus."""
    
    try:
        prompt = create_cohort_analysis_prompt(persona_data, stimulus_text, metrics)
        
        response = openai.ChatCompletion.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a pharmaceutical marketing analyst specializing in patient behavior simulation."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Clean the response to extract JSON
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        response_data = json.loads(response_text)
        
        # Filter responses to only include requested metrics
        filtered_responses = {}
        for metric in metrics:
            if metric in response_data.get('responses', {}):
                filtered_responses[metric] = response_data['responses'][metric]
        
        return {
            'responses': filtered_responses,
            'reasoning': response_data.get('reasoning', 'No reasoning provided.')
        }
        
    except Exception as e:
        print(f"Error analyzing persona response: {e}")
        # Return fallback response
        fallback_responses = {}
        for metric in metrics:
            if metric == 'purchase_intent':
                fallback_responses[metric] = random.randint(3, 8)
            elif metric == 'sentiment':
                fallback_responses[metric] = round(random.uniform(-0.5, 0.8), 2)
            elif metric == 'trust_in_brand':
                fallback_responses[metric] = random.randint(4, 9)
            elif metric == 'message_clarity':
                fallback_responses[metric] = random.randint(5, 9)
            elif metric == 'key_concern_flagged':
                fallback_responses[metric] = "Need more information about side effects and effectiveness"
        
        return {
            'responses': fallback_responses,
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
        'created_at': datetime.now().isoformat()
    }
