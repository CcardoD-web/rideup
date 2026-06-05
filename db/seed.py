import subprocess
import json
import uuid
from datetime import datetime, timedelta

def run_sql(sql):
    print(f"Executing: {sql[:100]}...")
    result = subprocess.run(['team-db', sql], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return None
    return json.loads(result.stdout)

def seed():
    # 1. Users
    users = [
        {
            "id": str(uuid.uuid4()),
            "name": "Alice Seller",
            "email": "alice@example.com",
            "password_hash": "hashed_password_1",
            "role": "seller",
            "credit_score": 750
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bob Buyer",
            "email": "bob@example.com",
            "password_hash": "hashed_password_2",
            "role": "buyer",
            "credit_score": 620
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Charlie Dealer",
            "email": "charlie@example.com",
            "password_hash": "hashed_password_3",
            "role": "seller",
            "credit_score": 800
        }
    ]

    for user in users:
        run_sql(f"INSERT INTO users (id, name, email, password_hash, role, credit_score) VALUES ('{user['id']}', '{user['name']}', '{user['email']}', '{user['password_hash']}', '{user['role']}', {user['credit_score']});")

    # 2. Listings
    listings = [
        {
            "id": str(uuid.uuid4()),
            "seller_id": users[0]["id"],
            "make": "Toyota",
            "model": "Camry",
            "year": 2020,
            "mileage": 35000,
            "price": 22000,
            "description": "Reliable family car in great condition.",
            "images_urls": json.dumps(["https://example.com/camry1.jpg"]),
            "status": "active"
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": users[2]["id"],
            "make": "Honda",
            "model": "Civic",
            "year": 2018,
            "mileage": 50000,
            "price": 18000,
            "description": "Sporty and fuel-efficient.",
            "images_urls": json.dumps(["https://example.com/civic1.jpg"]),
            "status": "active"
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": users[0]["id"],
            "make": "Ford",
            "model": "F-150",
            "year": 2015,
            "mileage": 85000,
            "price": 25000,
            "description": "Tough truck for work or play.",
            "images_urls": json.dumps(["https://example.com/f1501.jpg"]),
            "status": "pending"
        }
    ]

    for listing in listings:
        run_sql(f"INSERT INTO listings (id, seller_id, make, model, year, mileage, price, description, images_urls, status) VALUES ('{listing['id']}', '{listing['seller_id']}', '{listing['make']}', '{listing['model']}', {listing['year']}, {listing['mileage']}, {listing['price']}, '{listing['description']}', '{listing['images_urls']}', '{listing['status']}');")

    # 3. Transactions
    transactions = [
        {
            "id": str(uuid.uuid4()),
            "listing_id": listings[2]["id"],
            "buyer_id": users[1]["id"],
            "seller_id": users[0]["id"],
            "amount": 25000,
            "type": "installment",
            "status": "completed"
        }
    ]

    for tx in transactions:
        run_sql(f"INSERT INTO transactions (id, listing_id, buyer_id, seller_id, amount, type, status) VALUES ('{tx['id']}', '{tx['listing_id']}', '{tx['buyer_id']}', '{tx['seller_id']}', {tx['amount']}, '{tx['type']}', '{tx['status']}');")

    # 4. Installment Plans
    plans = [
        {
            "id": str(uuid.uuid4()),
            "transaction_id": transactions[0]["id"],
            "total_amount": 25000,
            "down_payment": 5000,
            "monthly_payment": 600,
            "term_months": 36,
            "status": "active",
            "next_due_date": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        }
    ]

    for plan in plans:
        run_sql(f"INSERT INTO installment_plans (id, transaction_id, total_amount, down_payment, monthly_payment, term_months, status, next_due_date) VALUES ('{plan['id']}', '{plan['transaction_id']}', {plan['total_amount']}, {plan['down_payment']}, {plan['monthly_payment']}, {plan['term_months']}, '{plan['status']}', '{plan['next_due_date']}');")

    # 5. Payments
    payments = [
        {
            "id": str(uuid.uuid4()),
            "installment_plan_id": plans[0]["id"],
            "amount": 5000,
            "due_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "paid_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "status": "completed"
        }
    ]

    for p in payments:
        run_sql(f"INSERT INTO payments (id, installment_plan_id, amount, due_date, paid_date, status) VALUES ('{p['id']}', '{p['installment_plan_id']}', {p['amount']}, '{p['due_date']}', '{p['paid_date']}', '{p['status']}');")

if __name__ == "__main__":
    seed()
