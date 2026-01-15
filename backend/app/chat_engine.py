from openai import OpenAI
import os
import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from . import crud, schemas
from .utils import get_openai_client, MODEL_NAME

# Configure logging
logger = logging.getLogger(__name__)

# Constants
MAX_HISTORY_MESSAGES = 20

class ChatEngine:
    """
    Manages multi-turn conversations with personas.
    Handles context construction, prompt engineering, and message persistence.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.client = get_openai_client()

    def create_session(self, persona_id: int, brand_id: Optional[int] = None) -> schemas.ChatSession:
        """Initialize a new chat session."""
        session_data = schemas.ChatSessionCreate(
            persona_id=persona_id,
            brand_id=brand_id,
            name="New Conversation"
        )
        return crud.create_chat_session(self.db, session_data)

    def process_message(self, session_id: int, user_message: str) -> schemas.ChatMessage:
        """
        Process a user message and generate a persona response.
        1. Save user message.
        2. Build context.
        3. Call LLM.
        4. Save and return assistant response.
        """
        if not self.client:
            raise RuntimeError("OpenAI client not initialized")

        # 1. Save user message
        user_msg_data = schemas.ChatMessageCreate(
            role="user",
            content=user_message
        )
        crud.create_chat_message(self.db, user_msg_data, session_id)

        # 2. Build context
        session = crud.get_chat_session(self.db, session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        persona = crud.get_persona(self.db, session.persona_id)
        if not persona:
            raise ValueError(f"Persona {session.persona_id} not found")

        # Parse persona data for the system prompt
        try:
            persona_data = json.loads(persona.full_persona_json) if persona.full_persona_json else {}
        except json.JSONDecodeError:
            persona_data = {}

        system_prompt = self._build_system_prompt(persona, persona_data)
        
        # Get history
        # We fetch more than we might send to allow for token budgeting logic if needed later
        history = crud.get_chat_history(self.db, session_id, limit=MAX_HISTORY_MESSAGES)
        
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            # Skip messages with empty content or invalid roles if any exist (safety check)
            if msg.content and msg.role in ["user", "assistant"]:
                messages.append({"role": msg.role, "content": msg.content})

        # 3. Call LLM
        try:
            logger.info(f"🤖 Sending chat request for session {session_id} with {len(messages)} messages")
            response = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                temperature=0.7, # Slightly creative but grounded
                max_completion_tokens=500
            )
            
            assistant_text = response.choices[0].message.content
            
            # Simple thought process extraction if the model used it (not explicit here, but good placeholder)
            thought_process = None 
            
            # 4. Save and return assistant response
            asst_msg_data = schemas.ChatMessageCreate(
                role="assistant",
                content=assistant_text,
                thought_process=thought_process
            )
            saved_msg = crud.create_chat_message(self.db, asst_msg_data, session_id)
            
            # Update session name if it's the first exchange and still generic
            if len(history) <= 2 and session.name == "New Conversation":
                self._update_session_name(session, user_message)

            return saved_msg

        except Exception as e:
            logger.error(f"❌ Chat generation failed: {e}")
            raise RuntimeError(f"Chat generation failed: {str(e)}")

    def _build_system_prompt(self, persona, persona_data: Dict[str, Any]) -> str:
        """Construct the system prompt defining the persona."""
        name = persona.name
        age = persona.age
        gender = persona.gender
        condition = persona.condition
        role = persona.persona_type or "Patient"
        
        # Extract rich attributes if available
        bio = persona_data.get("bio", "") # Assuming bio might exist in full_persona or we use core_insight
        background = persona_data.get("medical_background", "")
        lifestyle = persona_data.get("lifestyle", "")
        
        # MBT
        mbt_section = ""
        core = persona_data.get("core", {})
        if core:
            motivations = ", ".join(core.get("motivations", []))
            beliefs = ", ".join(core.get("beliefs", []))
            tensions = ", ".join(core.get("tensions", []))
            mbt_section = f"""
            **Psychographics:**
            - Motivations: {motivations}
            - Beliefs: {beliefs}
            - Tensions/Frustrations: {tensions}
            """
        
        prompt = f"""
        You are simulating a specific person. You are NOT an AI assistant. You are {name}.
        
        **Profile:**
        - Role: {role}
        - Age: {age}
        - Gender: {gender}
        - Condition: {condition}
        
        **Background:**
        {background}
        {lifestyle}
        
        {mbt_section}
        
        **Instructions:**
        1. Stay in character at all times. Never break the fourth wall.
        2. Speak naturally, using the tone and vocabulary appropriate for your background.
        3. If you have a specific medical condition, reflect the typical patient journey, frustrations, and knowledge level of that condition.
        4. Do not offer professional medical advice if you are a patient. Share your *experience*.
        5. If you are an HCP, speak with clinical expertise but realistic practice constraints.
        6. Keep responses relatively concise (conversational length), unless asked for a detailed story.
        """
        return prompt.strip()

    def _update_session_name(self, session, initial_message: str):
        """Generate a short title based on the first topic."""
        # Simple heuristic for now: truncate user message
        new_name = (initial_message[:30] + '...') if len(initial_message) > 30 else initial_message
        session.name = new_name
        self.db.commit()
