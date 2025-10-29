ALTER TABLE requirements\n  ADD COLUMN IF NOT EXISTS ai_type_suggestion text,\n  ADD COLUMN IF NOT EXISTS ai_type_confidence numeric,\n  ADD COLUMN IF NOT EXISTS ai_type_reason text;
