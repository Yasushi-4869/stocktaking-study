-- 作成した部分インデックスの削除
DROP INDEX IF EXISTS skus_product_id_price_unique_idx;

-- 元の制約を復元（注意: 論理削除されたデータと重複がある場合、この復元は失敗する可能性があります）
-- そのため、復元時は慎重に行う必要がありますが、downマイグレーションとしては元の状態に戻す定義をします。
ALTER TABLE skus ADD CONSTRAINT skus_product_id_price_key UNIQUE (product_id, price);
