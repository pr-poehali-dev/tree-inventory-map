ALTER TABLE t_p59085732_tree_inventory_map.trees ADD COLUMN IF NOT EXISTS number SERIAL;

-- Проставляем номера существующим деревьям по дате создания
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM t_p59085732_tree_inventory_map.trees
)
UPDATE t_p59085732_tree_inventory_map.trees t
SET number = n.rn
FROM numbered n
WHERE t.id = n.id;
