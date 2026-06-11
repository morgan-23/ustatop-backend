const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");

// Ro'yxatdan o'tish
router.post("/register", async (req, res) => {
  const { name, phone, password, role } = req.body;

  if (!name  !phone  !password || !role) {
    return res.status(400).json({ error: "Barcha maydonlar to'ldirilishi shart" });
  }

  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE phone = $1", [phone]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Bu telefon allaqachon ro'yxatdan o'tgan" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, phone, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, role",
      [name, phone, hashedPassword, role]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Kirish
router.post("/login", async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: "Telefon va parol kiritilishi shart" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE phone = $1", [phone]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Parol noto'g'ri" });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// FCM token saqlash
router.post("/fcm-token", async (req, res) => {
  const { fcm_token } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token yo'q" });

  try {
    const jwt_token = authHeader.split(" ")[1];
    const decoded = require("jsonwebtoken").verify(jwt_token, process.env.JWT_SECRET);
    await pool.query(
      "UPDATE users SET fcm_token = $1 WHERE id = $2",
      [fcm_token, decoded.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Xato" });
  }
});

module.exports = router;