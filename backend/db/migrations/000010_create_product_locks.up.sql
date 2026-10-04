-- 商品ロックテーブル
-- セッション単位で商品をロックし、カウント変更を防止する
CREATE TABLE product_locks (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    locked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, product_id)
);

CREATE INDEX idx_product_locks_session_id ON product_locks(session_id);
