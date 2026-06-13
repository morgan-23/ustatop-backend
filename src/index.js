const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { createTables } = require("./db");
const authRoutes = require("./routes/auth");
const mastersRoutes = require("./routes/masters");
const ordersRoutes = require("./routes/orders");
const paymentRoutes = require("./routes/payment");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "UstaTop Backend ishlayapti!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/masters", mastersRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payment", paymentRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log('Server ishga tushdi: ${PORT}');
  await createTables();
});