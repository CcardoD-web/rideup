-- Initial Schema for RideUp

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('buyer', 'seller')) NOT NULL,
    credit_score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE listings (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    mileage INTEGER NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    images_urls TEXT, -- JSON array of strings
    status TEXT CHECK(status IN ('active', 'sold', 'pending')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(seller_id) REFERENCES users(id)
);

CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT CHECK(type IN ('cash', 'finance', 'installment')) NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(listing_id) REFERENCES listings(id),
    FOREIGN KEY(buyer_id) REFERENCES users(id),
    FOREIGN KEY(seller_id) REFERENCES users(id)
);

CREATE TABLE installment_plans (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    down_payment REAL NOT NULL,
    monthly_payment REAL NOT NULL,
    term_months INTEGER NOT NULL,
    status TEXT NOT NULL,
    next_due_date DATETIME,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    installment_plan_id TEXT NOT NULL,
    amount REAL NOT NULL,
    due_date DATETIME NOT NULL,
    paid_date DATETIME,
    status TEXT NOT NULL,
    FOREIGN KEY(installment_plan_id) REFERENCES installment_plans(id)
);
