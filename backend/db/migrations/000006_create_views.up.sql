-- sku_details ビュー作成
CREATE VIEW sku_details AS
SELECT
    s.id AS sku_id,
    p.id AS product_id,
    p.name AS product_name,
    s.price,
    s.deleted_at
FROM skus s
JOIN products p ON s.product_id = p.id;
