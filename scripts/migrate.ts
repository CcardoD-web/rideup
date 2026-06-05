import { execSync } from 'child_process'

const runSql = (sql: string) => {
  console.log(`Executing: ${sql.substring(0, 100)}...`)
  try {
    const result = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`).toString()
    return JSON.parse(result)
  } catch (error) {
    console.error('Error executing SQL:', error)
    return null
  }
}

export const migrate = () => {
  console.log('Starting migration...')

  // Drop existing tables if they exist to start fresh (for development)
  runSql('DROP TABLE IF EXISTS payments;')
  runSql('DROP TABLE IF EXISTS financing_applications;')
  runSql('DROP TABLE IF EXISTS installment_plans;')
  runSql('DROP TABLE IF EXISTS transactions;')
  runSql('DROP TABLE IF EXISTS cars;')
  runSql('DROP TABLE IF EXISTS listings;') // Add this
  runSql('DROP TABLE IF EXISTS users;')

  // Create Users table
  runSql(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('buyer', 'seller', 'admin')) NOT NULL,
      credit_score INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Create Cars table
  runSql(`
    CREATE TABLE cars (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      price REAL NOT NULL,
      mileage INTEGER NOT NULL,
      description TEXT,
      image_url TEXT,
      status TEXT CHECK(status IN ('available', 'pending', 'sold')) DEFAULT 'available',
      flexible_payment BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(seller_id) REFERENCES users(id)
    );
  `)

  // Create Transactions table
  runSql(`
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      car_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      total_price REAL NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('outright', 'financed', 'installment')) NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(car_id) REFERENCES cars(id),
      FOREIGN KEY(buyer_id) REFERENCES users(id),
      FOREIGN KEY(seller_id) REFERENCES users(id)
    );
  `)

  // Create Installment Plans table
  runSql(`
    CREATE TABLE installment_plans (
      id TEXT PRIMARY KEY,
      car_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      down_payment REAL NOT NULL,
      monthly_payment REAL NOT NULL,
      duration_months INTEGER NOT NULL,
      interest_rate REAL DEFAULT 0,
      remaining_balance REAL NOT NULL,
      status TEXT CHECK(status IN ('proposed', 'active', 'completed', 'defaulted')) DEFAULT 'proposed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(car_id) REFERENCES cars(id),
      FOREIGN KEY(buyer_id) REFERENCES users(id),
      FOREIGN KEY(seller_id) REFERENCES users(id)
    );
  `)

  // Create Financing Applications table
  runSql(`
    CREATE TABLE financing_applications (
      id TEXT PRIMARY KEY,
      car_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      income REAL NOT NULL,
      employment TEXT NOT NULL,
      requested_term INTEGER NOT NULL,
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(car_id) REFERENCES cars(id),
      FOREIGN KEY(buyer_id) REFERENCES users(id)
    );
  `)

  // Create Payments table
  runSql(`
    CREATE TABLE payments (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT CHECK(status IN ('pending', 'completed', 'failed')) DEFAULT 'completed',
      FOREIGN KEY(plan_id) REFERENCES installment_plans(id)
    );
  `)

  console.log('Migration completed.')
}

if (import.meta.url.endsWith(process.argv[1])) {
  migrate()
}
