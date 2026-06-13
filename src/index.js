const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const createTables = async () => {
  const sql = "CREATE TABLE IF NOT EXISTS users (" +
    "id SERIAL PRIMARY KEY," +
    "name VARCHAR(100) NOT NULL," +
    "phone VARCHAR(20) UNIQUE NOT NULL," +
    "password VARCHAR(255) NOT NULL," +
    "role VARCHAR(10) NOT NULL," +
    "fcm_token TEXT," +
    "created_at TIMESTAMP DEFAULT NOW()" +
    "); " +
    "CREATE TABLE IF NOT EXISTS masters (" +
    "id SERIAL PRIMARY KEY," +
    "user_id INTEGER REFERENCES users(id) ON DELETE CASCADE," +
    "category VARCHAR(50) NOT NULL," +
    "location VARCHAR(100)," +
    "price INTEGER NOT NULL," +
    "rating DECIMAL(2,1) DEFAULT 5.0," +
    "total_orders INTEGER DEFAULT 0," +
    "is_available BOOLEAN DEFAULT true," +
    "bio TEXT," +
    "created_at TIMESTAMP DEFAULT NOW()" +
    "); " +
    "CREATE TABLE IF NOT EXISTS orders (" +
    "id SERIAL PRIMARY KEY," +
    "client_id INTEGER REFERENCES users(id)," +
    "master_id INTEGER REFERENCES masters(id)," +
    "category VARCHAR(50)," +
    "address TEXT NOT NULL," +
    "description TEXT," +
    "s
