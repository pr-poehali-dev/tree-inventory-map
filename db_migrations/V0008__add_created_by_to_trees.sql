ALTER TABLE t_p59085732_tree_inventory_map.trees
  ADD COLUMN IF NOT EXISTS created_by_id INTEGER,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;
