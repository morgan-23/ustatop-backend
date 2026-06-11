const router = require("express").Router();
const { pool } = require("../db");
const auth = require("../middleware/auth");

// Buyurtma berish
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "client") {
    return res.status(403).json({ error: "Faqat mijozlar buyurtma bera oladi" });
  }
  const { master_id, category, address, description, scheduled_time } = req.body;
  try {
    const master = await pool.query(
      "SELECT * FROM masters WHERE id = $1 AND is_available = true", [master_id]
    );
    if (master.rows.length === 0) {
      return res.status(400).json({ error: "Usta topilmadi yoki band" });
    }
    const result = await pool.query(
      INSERT INTO orders (client_id, master_id, category, address, description, scheduled_time, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *,
      [req.user.id, master_id, category, address, description, scheduled_time, master.rows[0].price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// O'z buyurtmalari
router.get("/my", auth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === "client") {
      query = 
        SELECT o.*, u.name as master_name, u.phone as master_phone
        FROM orders o
        JOIN masters m ON o.master_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE o.client_id = $1
        ORDER BY o.created_at DESC
      ;
      params = [req.user.id];
    } else {
      query = 
        SELECT o.*, u.name as client_name, u.phone as client_phone
        FROM orders o
        JOIN users u ON o.client_id = u.id
        JOIN masters m ON o.master_id = m.id
        WHERE m.user_id = $1
        ORDER BY o.created_at DESC
      ;
      params = [req.user.id];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Status o'zgartirish
router.patch("/:id/status", auth, async (req, res) => {
  const { status } = req.body;
  try {
    const order = await pool.query(
      SELECT o.* FROM orders o
       JOIN masters m ON o.master_id = m.id
       WHERE o.id = $1 AND m.user_id = $2,
      [req.params.id, req.user.id]
    );
    if (order.rows.length === 0) {
      return res.status(404).json({ error: "Buyurtma topilmadi" });
    }
    const result = await pool.query(
      "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (status === "done") {
      await pool.query(
        "UPDATE masters SET total_orders = total_orders + 1 WHERE user_id = $1",
        [req.user.id]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// To'lov holati
router.get("/:id/payment", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, price, payment_status, payment_method FROM orders WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Topilmadi" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;