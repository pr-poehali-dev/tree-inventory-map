CREATE TABLE t_p59085732_tree_inventory_map.hedgerows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number SERIAL,
    name TEXT NOT NULL DEFAULT 'Живая изгородь',
    points JSONB NOT NULL,
    length_m NUMERIC(10,2),
    species TEXT NOT NULL DEFAULT 'Живая изгородь',
    status TEXT NOT NULL DEFAULT 'good',
    condition TEXT NOT NULL DEFAULT 'healthy',
    address TEXT,
    description TEXT,
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by_id INTEGER,
    created_by_name TEXT
);
