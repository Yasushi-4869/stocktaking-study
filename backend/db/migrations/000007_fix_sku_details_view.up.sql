-- sku_details ビューを修正: 削除された商品のSKUを除外
DROP VIEW IF EXISTS sku_details;

CREATE VIEW sku_details AS
SELECT
    s.id AS sku_id,
    p.id AS product_id,
    p.name AS product_name,
    s.price,
    s.deleted_at
FROM skus s
JOIN products p ON s.product_id = p.id
WHERE p.deleted_at IS NULL;
