import { spawnSync } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

const runSql = (sql: string) => {
  console.log(`Executing: ${sql.substring(0, 100)}...`)
  const result = spawnSync('team-db', [sql], { encoding: 'utf-8' })
  if (result.error) {
    console.error('Error executing SQL:', result.error)
    return null
  }
  if (result.status !== 0) {
    console.error('SQL Error:', result.stderr)
    return null
  }
  try {
    return JSON.parse(result.stdout)
  } catch (e) {
    return result.stdout
  }
}

export const seed = async () => {
  console.log('Starting seeding...')

  const aliceId = uuidv4()
  const bobId = uuidv4()
  const charlieId = uuidv4()

  // Seed Users
  const hashedPass = await bcrypt.hash('password123', 10)
  console.log('Hashed Pass:', hashedPass)
  runSql(`INSERT INTO users (id, email, name, password_hash, role, credit_score) VALUES ('${aliceId}', 'alice@example.com', 'Alice Seller', '${hashedPass}', 'seller', 750);`)
  runSql(`INSERT INTO users (id, email, name, password_hash, role, credit_score) VALUES ('${bobId}', 'bob@example.com', 'Bob Buyer', '${hashedPass}', 'buyer', 620);`)
  runSql(`INSERT INTO users (id, email, name, password_hash, role, credit_score) VALUES ('${charlieId}', 'charlie@example.com', 'Charlie Dealer', '${hashedPass}', 'seller', 800);`)

  const car1Id = uuidv4()
  const car2Id = uuidv4()

  // Seed Cars
  runSql(`INSERT INTO cars (id, seller_id, make, model, year, price, mileage, description, image_url, status, flexible_payment) VALUES ('${car1Id}', '${aliceId}', 'Toyota', 'Camry', 2020, 22000, 35000, 'Reliable Camry', 'https://example.com/camry.jpg', 'available', 1);`)
  runSql(`INSERT INTO cars (id, seller_id, make, model, year, price, mileage, description, image_url, status, flexible_payment) VALUES ('${car2Id}', '${charlieId}', 'Honda', 'Civic', 2018, 18000, 50000, 'Sporty Civic', 'https://example.com/civic.jpg', 'available', 1);`)

  console.log('Seeding completed.')
}

if (import.meta.url.endsWith(process.argv[1])) {
  seed()
}
