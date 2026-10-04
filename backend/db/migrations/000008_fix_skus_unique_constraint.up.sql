-- 旧制約の削除
ALTER TABLE skus DROP CONSTRAINT IF EXISTS skus_product_id_price_key;

-- 部分インデックスの作成（deleted_atがNULLのレコードのみユニーク制約を適用）
CREATE UNIQUE INDEX skus_product_id_price_unique_idx ON skus (product_id, price) WHERE deleted_at IS NULL;
