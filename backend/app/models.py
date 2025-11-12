from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float
from sqlalchemy.sql import func
from .database import Base
import datetime

class Persona(Base):
    __tablename__ = "personas"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    persona_type = Column(String, default="Patient")
    persona_subtype = Column(String, nullable=True)
    tagline = Column(Text, nullable=True)
    # Store input attributes for filtering
    age = Column(Integer)
    gender = Column(String)
    condition = Column(String)
    location = Column(String)
    specialty = Column(String, nullable=True)
    practice_setup = Column(Text, nullable=True)
    system_context = Column(Text, nullable=True)
    decision_influencers = Column(Text, nullable=True)
    adherence_to_protocols = Column(String, nullable=True)
    channel_use = Column(Text, nullable=True)
    decision_style = Column(String, nullable=True)
    core_insight = Column(Text, nullable=True)
    # Store all generated data as a single JSON string for flexibility
    full_persona_json = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Simulation(Base):
    __tablename__ = "simulations"
    
    id = Column(Integer, primary_key=True, index=True)
    persona_id = Column(Integer, index=True)
    scenario = Column(Text)
    parameters = Column(JSON)
    results = Column(JSON)
    response_rate = Column(Float)
    insights = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SavedSimulation(Base):
    __tablename__ = "saved_simulations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, unique=True)
    simulation_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
