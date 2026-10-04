-- count_items テーブル作成
CREATE TABLE count_items (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    sku_id INTEGER NOT NULL REFERENCES skus(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, sku_id)
);

-- インデックス
CREATE INDEX idx_count_items_session_id ON count_items(session_id);
CREATE INDEX idx_count_items_sku_id ON count_items(sku_id);
