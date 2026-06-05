# RideUp Database Schema

This project uses SQLite via Turso for the shared team database.

## Tables

### `users`
- `id`: TEXT (UUID, Primary Key)
- `email`: TEXT (Unique)
- `name`: TEXT
- `password_hash`: TEXT
- `role`: TEXT ('buyer', 'seller', 'admin')
- `created_at`: DATETIME

### `cars`
- `id`: TEXT (UUID, Primary Key)
- `seller_id`: TEXT (Foreign Key -> users.id)
- `make`: TEXT
- `model`: TEXT
- `year`: INTEGER
- `price`: REAL
- `mileage`: INTEGER
- `description`: TEXT
- `image_url`: TEXT
- `status`: TEXT ('available', 'pending', 'sold')
- `flexible_payment`: BOOLEAN (If seller accepts installment plans)
- `created_at`: DATETIME

### `transactions`
- `id`: TEXT (UUID, Primary Key)
- `car_id`: TEXT (Foreign Key -> cars.id)
- `buyer_id`: TEXT (Foreign Key -> users.id)
- `seller_id`: TEXT (Foreign Key -> users.id)
- `total_price`: REAL
- `payment_method`: TEXT ('outright', 'financed', 'installments')
- `status`: TEXT ('pending', 'completed', 'cancelled')
- `created_at`: DATETIME

### `installment_plans`
- `id`: TEXT (UUID, Primary Key)
- `transaction_id`: TEXT (Foreign Key -> transactions.id)
- `total_amount`: REAL
- `down_payment`: REAL
- `monthly_payment`: REAL
- `duration_months`: INTEGER
- `interest_rate`: REAL
- `remaining_balance`: REAL
- `status`: TEXT ('active', 'completed', 'defaulted')
- `created_at`: DATETIME

### `payments`
- `id`: TEXT (UUID, Primary Key)
- `plan_id`: TEXT (Foreign Key -> installment_plans.id, Nullable for outright)
- `transaction_id`: TEXT (Foreign Key -> transactions.id)
- `amount`: REAL
- `payment_date`: DATETIME
- `status`: TEXT ('pending', 'completed', 'failed')
- `stripe_payment_intent_id`: TEXT
