res.json({ error: { code: -32601, message: { uz: "Metod topilmadi" } }, id });
  } catch (e) {
    console.error(e);
    res.json({ error: { code: -32700, message: { uz: "Server xatosi" } }, id });
  }
});

// ── CLICK ──────────────────────────────────────────
router.post("/click/prepare", async (req, res) => {
  const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string } = req.body;
  const mySign = crypto.createHash("md5").update(${click_trans_id}${service_id}${process.env.CLICK_SECRET_KEY}${merchant_trans_id}${amount}${action}${sign_time}).digest("hex");
  if (mySign !== sign_string) return res.json({ error: -1, error_note: "Imzo xato" });

  const order = await pool.query("SELECT * FROM orders WHERE id = $1", [merchant_trans_id]);
  if (!order.rows[0]) return res.json({ error: -5, error_note: "Buyurtma topilmadi" });
  if (order.rows[0].payment_status === "paid") return res.json({ error: -4, error_note: "Allaqachon to'langan" });

  await pool.query(
    "INSERT INTO transactions (click_id, order_id, amount, state, create_time) VALUES ($1, $2, $3, 0, $4) ON CONFLICT (click_id) DO NOTHING",
    [click_trans_id, merchant_trans_id, amount, Date.now()]
  );
  res.json({ click_trans_id, merchant_trans_id, merchant_prepare_id: click_trans_id, error: 0, error_note: "Success" });
});

router.post("/click/complete", async (req, res) => {
  const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string, error } = req.body;
  const mySign = crypto.createHash("md5").update(${click_trans_id}${service_id}${process.env.CLICK_SECRET_KEY}${merchant_trans_id}${click_trans_id}${amount}${action}${sign_time}).digest("hex");
  if (mySign !== sign_string) return res.json({ error: -1, error_note: "Imzo xato" });
  if (error < 0) {
    await pool.query("UPDATE transactions SET state = -1 WHERE click_id = $1", [click_trans_id]);
    return res.json({ error: 0, error_note: "Bekor qilindi" });
  }
  await pool.query("UPDATE transactions SET state = 2, perform_time = $1 WHERE click_id = $2", [Date.now(), click_trans_id]);
  await pool.query("UPDATE orders SET payment_status = 'paid', payment_method = 'click' WHERE id = $1", [merchant_trans_id]);
  res.json({ click_trans_id, merchant_trans_id, merchant_confirm_id: 1, error: 0, error_note: "Success" });
});

// ── TO'LOV URL ─────────────────────────────────────
router.get("/url/:orderId", auth, async (req, res) => {
  const { method } = req.query;
  try {
    const order = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.orderId]);
    if (!order.rows[0]) return res.status(404).json({ error: "Topilmadi" });
    const amount = order.rows[0].price;
    let url = "";
    if (method === "payme") {
      const params = Buffer.from(JSON.stringify({ m: process.env.PAYME_ID, ac: { order_id: req.params.orderId }, a: amount * 100 })).toString("base64");
      url = https://checkout.paycom.uz/${params};
    }
    if (method === "click") {
      url = https://my.click.uz/services/pay?service_id=${process.env.CLICK_SERVICE_ID}&merchant_id=${process.env.CLICK_MERCHANT_ID}&amount=${amount}&transaction_param=${req.params.orderId}&return_url=ustatop://payment-success;
    }
    res.json({ url, amount, order_id: req.params.orderId });
  } catch (e) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;