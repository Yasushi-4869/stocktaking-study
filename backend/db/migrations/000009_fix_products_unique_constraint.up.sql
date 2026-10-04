-- 旧制約の削除
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_key;

-- 部分インデックスの作成（deleted_atがNULLのレコードのみユニーク制約を適用）
CREATE UNIQUE INDEX products_name_unique_idx ON products (name) WHERE deleted_at IS NULL;
