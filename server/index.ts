import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'rideup-secret-key';

app.use(cors());
app.use(express.json());

const runSql = (sql: string) => {
  try {
    const result = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`).toString();
    return JSON.parse(result);
  } catch (error) {
    console.error('Error executing SQL:', error);
    return null;
  }
};

// Middleware to authenticate JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const sanitize = (val: any) => {
  if (typeof val !== 'string') return val;
  return val.replace(/'/g, "''");
};

// Signup
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const id = uuidv4();

  const result = runSql(`
    INSERT INTO users (id, name, email, password_hash, role, credit_score)
    VALUES ('${id}', '${name}', '${email}', '${hashedPassword}', '${role}', 650);
  `);

  if (!result) {
    return res.status(500).json({ error: 'Failed to create user' });
  }

  const token = jwt.sign({ id, email, role }, JWT_SECRET);
  res.json({ token, user: { id, name, email, role } });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const users = runSql(`SELECT * FROM users WHERE email = '${email}';`);
  if (!users || users.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = users[0];
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, credit_score: user.credit_score } });
});

// Get Profile
app.get('/api/auth/profile', authenticateToken, (req: any, res) => {
  const users = runSql(`SELECT id, name, email, role, credit_score, created_at FROM users WHERE id = '${req.user.id}';`);
  if (!users || users.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(users[0]);
});

// Get All Listings
app.get('/api/listings', (req, res) => {
  const { search, make, model, minPrice, maxPrice, minYear, maxYear, maxMileage, sort } = req.query;
  
  let query = "SELECT * FROM cars WHERE status = 'available'";

  if (search) {
    const s = sanitize(search);
    query += ` AND (make LIKE '%${s}%' OR model LIKE '%${s}%' OR description LIKE '%${s}%')`;
  }
  if (make) {
    query += ` AND make = '${sanitize(make)}'`;
  }
  if (model) {
    query += ` AND model = '${sanitize(model)}'`;
  }
  if (minPrice) {
    query += ` AND price >= ${Number(minPrice)}`;
  }
  if (maxPrice) {
    query += ` AND price <= ${Number(maxPrice)}`;
  }
  if (minYear) {
    query += ` AND year >= ${Number(minYear)}`;
  }
  if (maxYear) {
    query += ` AND year <= ${Number(maxYear)}`;
  }
  if (maxMileage) {
    query += ` AND mileage <= ${Number(maxMileage)}`;
  }

  switch (sort) {
    case 'price_asc':
      query += ' ORDER BY price ASC';
      break;
    case 'price_desc':
      query += ' ORDER BY price DESC';
      break;
    case 'year_desc':
      query += ' ORDER BY year DESC';
      break;
    case 'newest':
    default:
      query += ' ORDER BY created_at DESC';
      break;
  }

  const cars = runSql(query);
  res.json(cars || []);
});

// Get Listing Detail
app.get('/api/listings/:id', (req, res) => {
  const cars = runSql(`SELECT l.*, u.name as seller_name FROM cars l JOIN users u ON l.seller_id = u.id WHERE l.id = '${req.params.id}';`);
  if (!cars || cars.length === 0) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  res.json(cars[0]);
});

// Create Listing
app.post('/api/listings', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Only sellers can create listings' });
  }

  const { make, model, year, mileage, price, description, image_url, flexible_payment } = req.body;
  const id = uuidv4();
  const seller_id = req.user.id;

  const result = runSql(`
    INSERT INTO cars (id, seller_id, make, model, year, mileage, price, description, image_url, status, flexible_payment)
    VALUES ('${id}', '${seller_id}', '${make}', '${model}', ${year}, ${mileage}, ${price}, '${description}', '${image_url || ''}', 'available', ${flexible_payment ? 1 : 0});
  `);

  if (!result) {
    return res.status(500).json({ error: 'Failed to create listing' });
  }

  res.status(201).json({ id, message: 'Listing created successfully' });
});

// Get My Listings
app.get('/api/my-listings', authenticateToken, (req: any, res) => {
  const cars = runSql(`SELECT * FROM cars WHERE seller_id = '${req.user.id}' ORDER BY created_at DESC;`);
  res.json(cars || []);
});

// Financing Applications
app.post('/api/financing/apply', authenticateToken, (req: any, res) => {
  const { car_id, income, employment, requested_term } = req.body;
  const buyer_id = req.user.id;
  const id = uuidv4();

  // Simple auto-approval logic for now
  const userResult = runSql(`SELECT credit_score FROM users WHERE id = '${buyer_id}';`);
  const creditScore = userResult?.[0]?.credit_score || 0;
  const status = creditScore >= 600 ? 'approved' : 'pending';

  const result = runSql(`
    INSERT INTO financing_applications (id, car_id, buyer_id, income, employment, requested_term, status)
    VALUES ('${id}', '${car_id}', '${buyer_id}', ${income}, '${sanitize(employment)}', ${requested_term}, '${status}');
  `);

  if (!result) {
    return res.status(500).json({ error: 'Failed to submit application' });
  }

  res.status(201).json({ id, status, message: status === 'approved' ? 'Financing approved!' : 'Application submitted for review.' });
});

// Complete purchase with financing
app.post('/api/financing/:id/complete', authenticateToken, (req: any, res) => {
  const appId = req.params.id;
  const application = runSql(`SELECT fa.*, c.price, c.seller_id FROM financing_applications fa JOIN cars c ON fa.car_id = c.id WHERE fa.id = '${appId}' AND fa.buyer_id = '${req.user.id}';`);
  
  if (!application || application.length === 0) return res.status(404).json({ error: 'Application not found' });
  if (application[0].status !== 'approved') return res.status(400).json({ error: 'Application is not approved' });

  const { car_id, buyer_id, seller_id, price } = application[0];

  // Record transaction
  const txId = uuidv4();
  const txResult = runSql(`
    INSERT INTO transactions (id, car_id, buyer_id, seller_id, total_price, payment_method, status)
    VALUES ('${txId}', '${car_id}', '${buyer_id}', '${seller_id}', ${price}, 'financed', 'completed');
  `);

  if (!txResult) return res.status(500).json({ error: 'Failed to record transaction' });

  // Mark car as sold
  runSql(`UPDATE cars SET status = 'sold' WHERE id = '${car_id}';`);
  
  // Update application status to mark it as used
  runSql(`UPDATE financing_applications SET status = 'completed' WHERE id = '${appId}';`);

  res.json({ message: 'Purchase completed with financing!', transaction_id: txId });
});

app.get('/api/financing/applications', authenticateToken, (req: any, res) => {
  let query = '';
  if (req.user.role === 'buyer') {
    query = `SELECT fa.*, c.make, c.model, c.year, c.price FROM financing_applications fa JOIN cars c ON fa.car_id = c.id WHERE fa.buyer_id = '${req.user.id}' ORDER BY fa.created_at DESC;`;
  } else {
    query = `SELECT fa.*, c.make, c.model, c.year, c.price, u.name as buyer_name FROM financing_applications fa JOIN cars c ON fa.car_id = c.id JOIN users u ON fa.buyer_id = u.id WHERE c.seller_id = '${req.user.id}' ORDER BY fa.created_at DESC;`;
  }
  const apps = runSql(query);
  res.json(apps || []);
});

// Installment Plans
app.post('/api/installments/setup', authenticateToken, (req: any, res) => {
  const { car_id, buyer_id, down_payment, monthly_payment, duration_months } = req.body;
  const seller_id = req.user.role === 'seller' ? req.user.id : null; 
  const id = uuidv4();

  const carResult = runSql(`SELECT price, seller_id FROM cars WHERE id = '${car_id}';`);
  if (!carResult || carResult.length === 0) return res.status(404).json({ error: 'Car not found' });
  
  const actualSellerId = carResult[0].seller_id;
  const totalPrice = carResult[0].price;
  const remainingBalance = totalPrice - down_payment;

  // If buyer is proposing, status is 'proposed'. If seller is setting up, status is 'active'.
  const status = req.user.role === 'seller' ? 'active' : 'proposed';
  const finalBuyerId = req.user.role === 'buyer' ? req.user.id : buyer_id;

  const result = runSql(`
    INSERT INTO installment_plans (id, car_id, buyer_id, seller_id, total_amount, down_payment, monthly_payment, duration_months, remaining_balance, status)
    VALUES ('${id}', '${car_id}', '${finalBuyerId}', '${actualSellerId}', ${totalPrice}, ${down_payment}, ${monthly_payment}, ${duration_months}, ${remainingBalance}, '${status}');
  `);

  if (!result) {
    return res.status(500).json({ error: 'Failed to set up installment plan' });
  }

  res.status(201).json({ id, status, message: status === 'active' ? 'Installment plan active!' : 'Proposal sent to seller!' });
});

app.post('/api/installments/:id/approve', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'seller') return res.status(403).json({ error: 'Only sellers can approve plans' });
  
  const planId = req.params.id;
  const plan = runSql(`SELECT car_id FROM installment_plans WHERE id = '${planId}' AND seller_id = '${req.user.id}';`);
  if (!plan || plan.length === 0) return res.status(404).json({ error: 'Plan not found' });

  runSql(`UPDATE installment_plans SET status = 'active' WHERE id = '${planId}';`);
  runSql(`UPDATE cars SET status = 'pending' WHERE id = '${plan[0].car_id}';`);

  res.json({ message: 'Plan approved and car marked as pending' });
});

app.get('/api/installments', authenticateToken, (req: any, res) => {
  let query = '';
  if (req.user.role === 'buyer') {
    query = `SELECT ip.*, c.make, c.model, c.year FROM installment_plans ip JOIN cars c ON ip.car_id = c.id WHERE ip.buyer_id = '${req.user.id}' ORDER BY ip.created_at DESC;`;
  } else {
    query = `SELECT ip.*, c.make, c.model, c.year, u.name as buyer_name FROM installment_plans ip JOIN cars c ON ip.car_id = c.id JOIN users u ON ip.buyer_id = u.id WHERE ip.seller_id = '${req.user.id}' ORDER BY ip.created_at DESC;`;
  }
  const plans = runSql(query);
  res.json(plans || []);
});

// Payments
// Alias for payments by plan ID
app.post('/api/payments/:planId/pay', authenticateToken, (req: any, res) => {
  const { amount } = req.body;
  const planId = req.params.planId;
  const paymentId = uuidv4();

  // Verify plan belongs to user
  const plan = runSql(`SELECT * FROM installment_plans WHERE id = '${planId}' AND buyer_id = '${req.user.id}';`);
  if (!plan || plan.length === 0) return res.status(404).json({ error: 'Plan not found' });

  const result = runSql(`INSERT INTO payments (id, plan_id, amount, status) VALUES ('${paymentId}', '${planId}', ${amount}, 'completed');`);
  if (!result) return res.status(500).json({ error: 'Failed to record payment' });

  runSql(`UPDATE installment_plans SET remaining_balance = remaining_balance - ${amount} WHERE id = '${planId}';`);

  const updated = runSql(`SELECT * FROM installment_plans WHERE id = '${planId}';`);
  if (updated && updated[0].remaining_balance <= 0) {
    runSql(`UPDATE installment_plans SET status = 'completed' WHERE id = '${planId}';`);
    const { car_id, buyer_id, seller_id, total_amount } = updated[0];
    runSql(`UPDATE cars SET status = 'sold' WHERE id = '${car_id}';`);
    const txId = uuidv4();
    runSql(`
      INSERT INTO transactions (id, car_id, buyer_id, seller_id, total_price, payment_method, status)
      VALUES ('${txId}', '${car_id}', '${buyer_id}', '${seller_id}', ${total_amount}, 'installment', 'completed');
    `);
  }

  res.status(201).json({ id: paymentId, message: 'Payment successful!' });
});

// Get my payment plans (with next due info)
app.get('/api/my-payments', authenticateToken, (req: any, res) => {
  const plans = runSql(`
    SELECT ip.*, c.make, c.model, c.year, c.image_url
    FROM installment_plans ip
    JOIN cars c ON ip.car_id = c.id
    WHERE ip.buyer_id = '${req.user.id}'
    ORDER BY ip.created_at DESC
  `);

  // Enrich with payment counts
  const enriched = (plans || []).map((plan: any) => {
    const payments = runSql(`SELECT COUNT(*) as count FROM payments WHERE plan_id = '${plan.id}' AND status = 'completed'`);
    return { ...plan, payments_made: payments?.[0]?.count || 0 };
  });

  res.json(enriched);
});

app.post('/api/payments', authenticateToken, (req: any, res) => {
  const { plan_id, amount } = req.body;
  const id = uuidv4();

  const result = runSql(`INSERT INTO payments (id, plan_id, amount, status) VALUES ('${id}', '${plan_id}', ${amount}, 'completed');`);
  if (!result) return res.status(500).json({ error: 'Failed to record payment' });

  // Update remaining balance
  runSql(`UPDATE installment_plans SET remaining_balance = remaining_balance - ${amount} WHERE id = '${plan_id}';`);
  
  // Check if completed
  const plan = runSql(`SELECT * FROM installment_plans WHERE id = '${plan_id}';`);
  if (plan && plan[0].remaining_balance <= 0) {
    runSql(`UPDATE installment_plans SET status = 'completed' WHERE id = '${plan_id}';`);
    const { car_id, buyer_id, seller_id, total_amount } = plan[0];
    runSql(`UPDATE cars SET status = 'sold' WHERE id = '${car_id}';`);
    const txId = uuidv4();
    runSql(`
      INSERT INTO transactions (id, car_id, buyer_id, seller_id, total_price, payment_method, status)
      VALUES ('${txId}', '${car_id}', '${buyer_id}', '${seller_id}', ${total_amount}, 'installment', 'completed');
    `);
  }

  res.status(201).json({ id, message: 'Payment recorded successfully' });
});

app.get('/api/installments/:id/payments', authenticateToken, (req: any, res) => {
  const payments = runSql(`SELECT * FROM payments WHERE plan_id = '${req.params.id}' ORDER BY payment_date DESC;`);
  res.json(payments || []);
});

// Transactions (Direct Sales)
app.post('/api/transactions', authenticateToken, (req: any, res) => {
  const { car_id, payment_method } = req.body;
  const buyer_id = req.user.id;
  const id = uuidv4();

  const carResult = runSql(`SELECT price, seller_id, status FROM cars WHERE id = '${car_id}';`);
  if (!carResult || carResult.length === 0) return res.status(404).json({ error: 'Car not found' });
  if (carResult[0].status !== 'available') return res.status(400).json({ error: 'Car is no longer available' });

  const { price, seller_id } = carResult[0];

  const result = runSql(`
    INSERT INTO transactions (id, car_id, buyer_id, seller_id, total_price, payment_method, status)
    VALUES ('${id}', '${car_id}', '${buyer_id}', '${seller_id}', ${price}, '${payment_method}', 'completed');
  `);

  if (!result) {
    return res.status(500).json({ error: 'Failed to record transaction' });
  }

  // Mark car as sold
  runSql(`UPDATE cars SET status = 'sold' WHERE id = '${car_id}';`);

  res.status(201).json({ id, message: 'Purchase successful!' });
});

app.get('/api/transactions', authenticateToken, (req: any, res) => {
  let query = '';
  if (req.user.role === 'buyer') {
    query = `SELECT t.*, c.make, c.model, c.year FROM transactions t JOIN cars c ON t.car_id = c.id WHERE t.buyer_id = '${req.user.id}' ORDER BY t.created_at DESC;`;
  } else {
    query = `SELECT t.*, c.make, c.model, c.year FROM transactions t JOIN cars c ON t.car_id = c.id WHERE t.seller_id = '${req.user.id}' ORDER BY t.created_at DESC;`;
  }
  const transactions = runSql(query);
  res.json(transactions || []);
});

// ====== DASHBOARD SPECIFIC ENDPOINTS ======

// Buyer purchases endpoint (enriched with car/seller details)
app.get('/api/dashboard/purchases', authenticateToken, (req: any, res) => {
  const query = `
    SELECT t.*, c.make, c.model, c.year, c.image_url, u.name as seller_name
    FROM transactions t
    JOIN cars c ON t.car_id = c.id
    JOIN users u ON t.seller_id = u.id
    WHERE t.buyer_id = '${req.user.id}'
    ORDER BY t.created_at DESC
  `;
  const purchases = runSql(query);
  res.json(purchases || []);
});

// Seller sales endpoint
app.get('/api/dashboard/sales', authenticateToken, (req: any, res) => {
  const query = `
    SELECT t.*, c.make, c.model, c.year, c.image_url, u.name as buyer_name
    FROM transactions t
    JOIN cars c ON t.car_id = c.id
    JOIN users u ON t.buyer_id = u.id
    WHERE t.seller_id = '${req.user.id}'
    ORDER BY t.created_at DESC
  `;
  const sales = runSql(query);
  res.json(sales || []);
});

// Seller earnings summary
app.get('/api/dashboard/earnings', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Only sellers can view earnings' });
  }

  const totalSold = runSql(`
    SELECT COALESCE(SUM(total_price), 0) as total_earnings, COUNT(*) as total_sales
    FROM transactions
    WHERE seller_id = '${req.user.id}' AND status = 'completed'
  `);

  const pendingEarnings = runSql(`
    SELECT COALESCE(SUM(remaining_balance), 0) as pending_amount, COUNT(*) as active_plans
    FROM installment_plans
    WHERE seller_id = '${req.user.id}' AND status = 'active'
  `);

  res.json({
    total_earnings: totalSold?.[0]?.total_earnings || 0,
    total_sales: totalSold?.[0]?.total_sales || 0,
    pending_earnings: pendingEarnings?.[0]?.pending_amount || 0,
    active_installment_plans: pendingEarnings?.[0]?.active_plans || 0
  });
});

// Buyer payment history
app.get('/api/dashboard/payment-history', authenticateToken, (req: any, res) => {
  const query = `
    SELECT p.*, ip.monthly_payment, ip.total_amount, ip.remaining_balance,
           c.make, c.model, c.year, c.image_url
    FROM payments p
    JOIN installment_plans ip ON p.plan_id = ip.id
    JOIN cars c ON ip.car_id = c.id
    WHERE ip.buyer_id = '${req.user.id}'
    ORDER BY p.payment_date DESC
  `;
  const payments = runSql(query);
  res.json(payments || []);
});

// Buyer next payment due
app.get('/api/dashboard/next-payment', authenticateToken, (req: any, res) => {
  const query = `
    SELECT ip.*, c.make, c.model, c.year, c.image_url
    FROM installment_plans ip
    JOIN cars c ON ip.car_id = c.id
    WHERE ip.buyer_id = '${req.user.id}' AND ip.status = 'active' AND ip.remaining_balance > 0
    ORDER BY ip.created_at ASC
    LIMIT 1
  `;
  const nextPayment = runSql(query);

  if (nextPayment && nextPayment.length > 0) {
    const plan = nextPayment[0];
    const paymentCount = runSql(`SELECT COUNT(*) as count FROM payments WHERE plan_id = '${plan.id}' AND status = 'completed'`);
    const paymentsMade = paymentCount?.[0]?.count || 0;
    res.json({
      ...plan,
      payments_made: paymentsMade,
      next_installment_number: paymentsMade + 1,
      total_installments: plan.duration_months
    });
  } else {
    res.json(null);
  }
});

// Unified transaction history for current user
app.get('/api/dashboard/transactions', authenticateToken, (req: any, res) => {
  const query = `
    SELECT t.*,
           c.make, c.model, c.year, c.image_url,
           buyer.name as buyer_name,
           seller.name as seller_name
    FROM transactions t
    JOIN cars c ON t.car_id = c.id
    JOIN users buyer ON t.buyer_id = buyer.id
    JOIN users seller ON t.seller_id = seller.id
    WHERE t.buyer_id = '${req.user.id}' OR t.seller_id = '${req.user.id}'
    ORDER BY t.created_at DESC
  `;
  const transactions = runSql(query);
  res.json(transactions || []);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
