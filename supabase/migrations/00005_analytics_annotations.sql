-- Loving Charmz — Analytics annotations
-- Phase 4: Free-form notes pinned to specific dates on the revenue chart

CREATE TABLE IF NOT EXISTS analytics_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_date DATE NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  color TEXT DEFAULT 'plum' CHECK (color IN ('plum', 'mint', 'cream', 'ink')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_annotations_date
  ON analytics_annotations(annotation_date);

ALTER TABLE analytics_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read annotations"
  ON analytics_annotations FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage annotations"
  ON analytics_annotations FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
