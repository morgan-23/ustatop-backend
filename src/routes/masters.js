const router = require("express").Router();
const { pool } = require("../db");
const auth = require("../middleware/auth");

// Barcha ustalar
router.get("/", async (req, res) => {
  const { category } = req.query;
  try {
    let query = 
      SELECT m.*, u.name, u.phone
      FROM masters m
      JOIN users u ON m.user_id = u.id
    ;
    const params = [];
    if (category) {
      query += " WHERE m.category = $1";
      params.push(category);
    }
    query += " ORDER BY m.rating DESC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Bitta usta
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      SELECT m.*, u.name, u.phone
       FROM masters m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = $1,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usta topilmadi" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Profil yaratish
router.post("/profile", auth, async (req, res) => {
  if (req.user.role !== "master") {
    return res.status(403).json({ error: "Ruxsat yo'q" });
  }
  const { category, location, price, bio } = req.body;
  try {
    const result = await pool.query(
      INSERT INTO masters (user_id, category, location, price, bio)
       VALUES ($1, $2, $3, $4, $5) RETURNING *,
      [req.user.id, category, location, price, bio]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Bo'sh/Band o'zgartirish
router.patch("/availability", auth, async (req, res) => {
  if (req.user.role !== "master") {
    return res.status(403).json({ error: "Ruxsat yo'q" });
  }
  const { is_available } = req.body;
  try {
    await pool.query(
      "UPDATE masters SET is_available = $1 WHERE user_id = $2",
      [is_available, req.user.id]
    );
    res.json({ message: "Yangilandi" });
  } catch (err) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;