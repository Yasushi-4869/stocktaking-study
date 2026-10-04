-- 作成した部分インデックスの削除
DROP INDEX IF EXISTS products_name_unique_idx;

-- 元の制約を復元（注意: 論理削除されたデータと重複がある場合、この復元は失敗する可能性があります）
ALTER TABLE products ADD CONSTRAINT products_name_key UNIQUE (name);
