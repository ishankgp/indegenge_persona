-- Insert sample personas directly into the database
-- Run with: sqlite3 pharma_personas.db < insert_personas.sql

-- Global Personas (no brand)
INSERT INTO personas (name, age, gender, condition, location, brand_id, persona_type, full_persona_json, created_at)
VALUES 
('Maria Santos', 52, 'Female', 'Type 2 Diabetes', 'Miami, Florida', NULL, 'Patient', 
'{"name": "Maria Santos", "demographics": {"age": 52, "gender": "Female", "location": "Miami, Florida", "occupation": "Restaurant Owner"}, "medical_background": "Diagnosed with Type 2 Diabetes 5 years ago. Currently on metformin.", "motivations": ["Stay healthy for grandchildren", "Maintain energy for work"], "beliefs": ["Diet is the foundation of health", "Family support is essential"], "pain_points": ["Difficulty managing diet", "Cost of medications"]}',
datetime('now')),

('Robert Chen', 45, 'Male', 'Hypertension', 'Seattle, Washington', NULL, 'Patient',
'{"name": "Robert Chen", "demographics": {"age": 45, "gender": "Male", "location": "Seattle, Washington", "occupation": "Software Engineer"}, "medical_background": "Diagnosed with hypertension 2 years ago. BP well controlled.", "motivations": ["Prevent cardiovascular events", "Use technology to optimize health"], "beliefs": ["Data-driven decisions lead to better outcomes"], "pain_points": ["Remembering medications", "Managing work stress"]}',
datetime('now')),

('Dr. Angela Morrison', 58, 'Female', 'Type 2 Diabetes', 'Chicago, Illinois', NULL, 'HCP',
'{"name": "Dr. Angela Morrison", "demographics": {"age": 58, "gender": "Female", "location": "Chicago, Illinois", "occupation": "Endocrinologist"}, "specialty": "Endocrinology", "practice_setup": "Large academic medical center", "motivations": ["Achieve optimal glycemic control", "Stay current with treatments"], "beliefs": ["Personalized medicine improves outcomes"], "pain_points": ["Insurance prior auth delays", "Patient non-adherence"]}',
datetime('now'));

-- Mounjaro Personas (brand_id = 1 assuming Mounjaro is the first brand)
INSERT INTO personas (name, age, gender, condition, location, brand_id, persona_type, full_persona_json, created_at)
VALUES 
('Jennifer Williams', 48, 'Female', 'Type 2 Diabetes', 'Austin, Texas', 1, 'Patient',
'{"name": "Jennifer Williams", "demographics": {"age": 48, "gender": "Female", "location": "Austin, Texas", "occupation": "Marketing Director"}, "medical_background": "Type 2 Diabetes diagnosed 3 years ago. Started Mounjaro 6 months ago. A1C dropped from 8.2% to 6.5%.", "motivations": ["Achieve diabetes remission", "Maintain weight loss with Mounjaro"], "beliefs": ["GLP-1/GIP dual agonists are breakthrough", "Weight management is key"], "pain_points": ["Initial GI side effects", "High cost even with insurance"]}',
datetime('now')),

('Michael Thompson', 55, 'Male', 'Type 2 Diabetes', 'Phoenix, Arizona', 1, 'Patient',
'{"name": "Michael Thompson", "demographics": {"age": 55, "gender": "Male", "location": "Phoenix, Arizona", "occupation": "Construction Manager"}, "medical_background": "Type 2 Diabetes for 8 years. Started Mounjaro 3 months ago. A1C was 9.1%, now 7.4%.", "motivations": ["Avoid insulin injections", "Reduce pill burden"], "beliefs": ["Results speak louder than marketing", "Convenience matters for compliance"], "pain_points": ["Insurance prior auth was frustrating", "Nausea in first weeks"]}',
datetime('now')),

('Dr. David Park', 42, 'Male', 'Type 2 Diabetes', 'San Diego, California', 1, 'HCP',
'{"name": "Dr. David Park", "demographics": {"age": 42, "gender": "Male", "location": "San Diego, California", "occupation": "Primary Care Physician"}, "specialty": "Family Medicine", "practice_setup": "Community health clinic", "motivations": ["Offer patients modern treatments", "Achieve better outcomes"], "beliefs": ["Dual GIP/GLP-1 mechanism provides superior efficacy"], "pain_points": ["Prior authorization burden", "Cost barriers for uninsured"]}',
datetime('now')),

('Sarah Mitchell', 62, 'Female', 'Type 2 Diabetes', 'Denver, Colorado', 1, 'Patient',
'{"name": "Sarah Mitchell", "demographics": {"age": 62, "gender": "Female", "location": "Denver, Colorado", "occupation": "Retired Teacher"}, "medical_background": "Type 2 Diabetes for 15 years. Started Mounjaro after failing other GLP-1. Now at 7.0% A1C.", "motivations": ["Stay active and independent", "Simplify medication regimen"], "beliefs": ["Newer medications can work when others fail", "Once-weekly is manageable"], "pain_points": ["Navigating Medicare Part D", "Managing refrigeration while traveling"]}',
datetime('now'));









