-- Preset tags (user_id = null means available to all users)
insert into tags (name, color, is_preset, user_id) values
  ('Breakfast',         '#f59e0b', true, null),
  ('Brunch',            '#f97316', true, null),
  ('Lunch',             '#10b981', true, null),
  ('Dinner',            '#6366f1', true, null),
  ('Snack',             '#ec4899', true, null),
  ('Dessert',           '#8b5cf6', true, null),
  ('Appetizer',         '#ef4444', true, null),
  ('Side Dish',         '#14b8a6', true, null),
  ('Drink',             '#0ea5e9', true, null),
  ('Quick',             '#84cc16', true, null),
  ('Make Ahead',        '#a78bfa', true, null),
  ('Freezer-Friendly',  '#60a5fa', true, null),
  ('Vegetarian',        '#4ade80', true, null),
  ('Vegan',             '#22c55e', true, null),
  ('Gluten-Free',       '#fbbf24', true, null),
  ('Dairy-Free',        '#fb923c', true, null),
  ('Italian',           '#f43f5e', true, null),
  ('Mexican',           '#e11d48', true, null),
  ('Asian',             '#dc2626', true, null),
  ('American',          '#2563eb', true, null),
  ('Mediterranean',     '#0891b2', true, null)
on conflict (user_id, name) do nothing;
