import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import CreateListingForm from '../components/CreateListingForm'

// ---- Types ----
interface Car {
  id: string
  make: string
  model: string
  year: number
  price: number
  mileage: number
  status: string
  created_at: string
  image_url?: string
}

/*
interface FinancingApp {
  id: string
  car_id: string
  make: string
  model: string
  year: number
  price: number
  status: string
  buyer_name?: string
  created_at: string
}
*/

interface InstallmentPlan {
  id: string
  car_id: string
  make: string
  model: string
  year: number
  total_amount: number
  down_payment: number
  remaining_balance: number
  monthly_payment: number
  duration_months: number
  status: string
  buyer_name?: string
  created_at: string
}

interface Transaction {
  id: string
  car_id: string
  buyer_id: string
  seller_id: string
  total_price: number
  payment_method: string
  status: string
  make: string
  model: string
  year: number
  image_url?: string
  buyer_name?: string
  seller_name?: string
  created_at: string
}

interface PaymentRecord {
  id: string
  plan_id: string
  amount: number
  payment_date: string
  status: string
  make: string
  model: string
  year: number
  monthly_payment: number
  remaining_balance: number
}

interface EarningsSummary {
  total_earnings: number
  total_sales: number
  pending_earnings: number
  active_installment_plans: number
}

interface NextPayment {
  id: string
  make: string
  model: string
  year: number
  monthly_payment: number
  remaining_balance: number
  duration_months: number
  payments_made: number
  next_installment_number: number
  total_installments: number
}

const API = 'http://localhost:3001/api'
const token = () => localStorage.getItem('rideup_token')

// ---- Helpers ----
function statusBadge(status: string) {
  const styles: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    sold: 'bg-gray-100 text-gray-700',
    completed: 'bg-green-100 text-green-700',
    active: 'bg-green-100 text-green-700',
    proposed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
    defaulted: 'bg-red-100 text-red-700',
    outright: 'bg-purple-100 text-purple-700',
    financed: 'bg-indigo-100 text-indigo-700',
    installments: 'bg-teal-100 text-teal-700',
    approved: 'bg-emerald-100 text-emerald-700',
    pending_review: 'bg-orange-100 text-orange-700',
  }
  const s = styles[status] || 'bg-gray-100 text-gray-700'
  return `text-xs font-bold px-3 py-1 rounded-full ${s}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ---- Dashboard Component ----
export default function Dashboard() {
  const { user } = useAuth()
  const role = user?.role || 'buyer'

  // Data states
  const [myCars, setMyCars] = useState<Car[]>([])
  // const [apps, setApps] = useState<FinancingApp[]>([])
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [purchases, setPurchases] = useState<Transaction[]>([])
  const [sales, setSales] = useState<Transaction[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [nextPayment, setNextPayment] = useState<NextPayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [sellerTab, setSellerTab] = useState<'listings' | 'sold' | 'installments' | 'transactions'>('listings')
  const [buyerTab, setBuyerTab] = useState<'purchases' | 'installments' | 'payments' | 'transactions'>('purchases')
  const [listingFilter, setListingFilter] = useState<'all' | 'available' | 'pending' | 'sold'>('all')

  const fetchData = async () => {
    const t = token()
    if (!t) return

    const headers = { 'Authorization': `Bearer ${t}` }

    try {
      // Common fetches
      const [carsRes, plansRes, txRes] = await Promise.all([
        fetch(`${API}/my-listings`, { headers }),
        // fetch(`${API}/financing/applications`, { headers }),
        fetch(`${API}/installments`, { headers }),
        fetch(`${API}/dashboard/transactions`, { headers }),
      ])

      if (carsRes.ok) setMyCars(await carsRes.json())
      // if (appsRes.ok) setApps(await appsRes.json())
      if (plansRes.ok) setPlans(await plansRes.json())
      if (txRes.ok) setTransactions(await txRes.json())

      // Role-specific fetches
      if (role === 'buyer') {
        const [purRes, payRes, nextRes] = await Promise.all([
          fetch(`${API}/dashboard/purchases`, { headers }),
          fetch(`${API}/dashboard/payment-history`, { headers }),
          fetch(`${API}/dashboard/next-payment`, { headers }),
        ])
        if (purRes.ok) setPurchases(await purRes.json())
        if (payRes.ok) setPaymentHistory(await payRes.json())
        if (nextRes.ok) setNextPayment(await nextRes.json())
      }

      if (role === 'seller') {
        const [salesRes, earnRes] = await Promise.all([
          fetch(`${API}/dashboard/sales`, { headers }),
          fetch(`${API}/dashboard/earnings`, { headers }),
        ])
        if (salesRes.ok) setSales(await salesRes.json())
        if (earnRes.ok) setEarnings(await earnRes.json())
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // ---- Actions ----
  /*
  const [selectedPlanPayments, setSelectedPlanPayments] = useState<any[]>([])
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)

  const fetchPayments = async (planId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/installments/${planId}/payments`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('rideup_token')}` }
      })
      setSelectedPlanPayments(await res.json())
      setShowPaymentsModal(true)
    } catch (err) {
      console.error(err)
    }
  }
  */

  const handleApprovePlan = async (id: string) => {
    const res = await fetch(`${API}/installments/${id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token()}` },
    })
    if (res.ok) { alert('Plan approved!'); fetchData() }
  }

  const handlePayment = async (planId: string, amount: number) => {
    const res = await fetch(`${API}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify({ plan_id: planId, amount }),
    })
    if (res.ok) { alert('Payment successful!'); fetchData() }
  }

  // ---- Derived data ----
  const activeListings = myCars.filter(c => c.status === 'available')
  const soldListings = myCars.filter(c => c.status === 'sold')
  const pendingListings = myCars.filter(c => c.status === 'pending')
  const filteredCars = listingFilter === 'all' ? myCars : myCars.filter(c => c.status === listingFilter)
  const activePlans = plans.filter(p => p.status === 'active' || p.status === 'proposed')

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-xl text-gray-500">Loading your dashboard...</div>
      </div>
    )
  }

  // ==================== BUYER DASHBOARD ====================
  if (role === 'buyer') {
    const activeInstallmentPlans = plans.filter(p => p.status === 'active')
    const totalOwed = activeInstallmentPlans.reduce((sum, p) => sum + p.remaining_balance, 0)

    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black text-gray-900 mb-1">Welcome, {user?.name}!</h1>
              <p className="text-gray-500 font-medium">Your buyer dashboard &amp; activity.</p>
            </div>
            <div className="flex items-center gap-6 bg-blue-50 px-6 py-4 rounded-xl border border-blue-100">
              <div className="text-blue-600 text-center">
                <p className="text-xs font-bold uppercase tracking-wider">Credit Score</p>
                <p className="text-3xl font-black">{user?.credit_score || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Purchases</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{purchases.length}</p>
          </div>
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Active Plans</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{activeInstallmentPlans.length}</p>
          </div>
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Remaining Balance</p>
            <p className="text-3xl font-black text-amber-600 mt-1">${totalOwed.toLocaleString()}</p>
          </div>
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Payments Made</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{paymentHistory.length}</p>
          </div>
        </div>

        {/* Next Payment Due */}
        {nextPayment && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 mb-8 text-white shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-blue-100 text-sm font-bold uppercase tracking-wider">Next Payment Due</p>
                <h3 className="text-2xl font-bold mt-1">{nextPayment.year} {nextPayment.make} {nextPayment.model}</h3>
                <p className="text-blue-100 mt-1">
                  Installment {nextPayment.next_installment_number} of {nextPayment.total_installments}
                  {' '}&middot; {nextPayment.payments_made} paid, ${nextPayment.remaining_balance.toLocaleString()} remaining
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-blue-100">Amount Due</p>
                  <p className="text-4xl font-black">${nextPayment.monthly_payment.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handlePayment(nextPayment.id, nextPayment.monthly_payment)}
                  className="px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition shadow-lg"
                >
                  Pay Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 overflow-x-auto">
          {(['purchases', 'installments', 'payments', 'transactions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setBuyerTab(tab)}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm capitalize whitespace-nowrap transition ${
                buyerTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab === 'purchases' && '🛒 '}
              {tab === 'installments' && '📋 '}
              {tab === 'payments' && '💳 '}
              {tab === 'transactions' && '📄 '}
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Purchases Tab */}
          {buyerTab === 'purchases' && (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">My Purchases</h2>
              {purchases.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">🛒</p>
                  <p className="text-lg font-medium">No purchases yet</p>
                  <p className="text-sm mt-1">Browse listings and buy your first car!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-sm text-gray-500 uppercase tracking-wide">
                        <th className="pb-3 font-semibold">Car</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Payment</th>
                        <th className="pb-3 font-semibold">Seller</th>
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map(tx => (
                        <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-4 font-medium">{tx.year} {tx.make} {tx.model}</td>
                          <td className="py-4 font-bold">${tx.total_price.toLocaleString()}</td>
                          <td className="py-4"><span className={statusBadge(tx.payment_method)}>{tx.payment_method}</span></td>
                          <td className="py-4 text-gray-500">{tx.seller_name}</td>
                          <td className="py-4 text-gray-500 text-sm">{formatDate(tx.created_at)}</td>
                          <td className="py-4"><span className={statusBadge(tx.status)}>{tx.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Installment Plans Tab (Buyer) */}
          {buyerTab === 'installments' && (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">My Installment Plans</h2>
              {activePlans.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-lg font-medium">No installment plans</p>
                  <p className="text-sm mt-1">Look for listings with flexible payment options.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map(plan => (
                    <div key={plan.id} className="border rounded-2xl p-5 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-lg">{plan.year} {plan.make} {plan.model}</h3>
                        <span className={statusBadge(plan.status)}>{plan.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                          <p className="font-bold">${plan.total_amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Monthly</p>
                          <p className="font-bold">${plan.monthly_payment.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Remaining</p>
                          <p className="font-bold text-amber-600">${plan.remaining_balance.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Term</p>
                          <p className="font-bold">{plan.duration_months} months</p>
                        </div>
                      </div>
                      {plan.status === 'active' && plan.remaining_balance > 0 && (
                        <button
                          onClick={() => handlePayment(plan.id, plan.monthly_payment)}
                          className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
                        >
                          Pay ${plan.monthly_payment.toLocaleString()} Now
                        </button>
                      )}
                      {plan.status === 'proposed' && (
                        <p className="text-sm text-gray-500 italic text-center">Awaiting seller approval...</p>
                      )}
                      {plan.status === 'completed' && (
                        <div className="text-center py-2 bg-green-100 text-green-700 rounded-xl font-bold">✅ Paid in Full</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payment History Tab */}
          {buyerTab === 'payments' && (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">Payment History</h2>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">💳</p>
                  <p className="text-lg font-medium">No payments yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-sm text-gray-500 uppercase tracking-wide">
                        <th className="pb-3 font-semibold">Car</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map(p => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-4 font-medium">{p.year} {p.make} {p.model}</td>
                          <td className="py-4 font-bold text-green-600">${p.amount.toLocaleString()}</td>
                          <td className="py-4 text-gray-500 text-sm">{formatDate(p.payment_date)}</td>
                          <td className="py-4"><span className={statusBadge(p.status)}>{p.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Transaction History Tab (Buyer) */}
          {buyerTab === 'transactions' && (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">Transaction History</h2>
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">📄</p>
                  <p className="text-lg font-medium">No transactions yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-sm text-gray-500 uppercase tracking-wide">
                        <th className="pb-3 font-semibold">Car</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Method</th>
                        <th className="pb-3 font-semibold">Role</th>
                        <th className="pb-3 font-semibold">Counterparty</th>
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-4 font-medium">{tx.year} {tx.make} {tx.model}</td>
                          <td className="py-4 font-bold">${tx.total_price.toLocaleString()}</td>
                          <td className="py-4"><span className={statusBadge(tx.payment_method)}>{tx.payment_method}</span></td>
                          <td className="py-4">
                            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                              {tx.buyer_id === user?.id ? 'Buyer' : 'Seller'}
                            </span>
                          </td>
                          <td className="py-4 text-gray-500">
                            {tx.buyer_id === user?.id ? tx.seller_name : tx.buyer_name}
                          </td>
                          <td className="py-4 text-gray-500 text-sm">{formatDate(tx.created_at)}</td>
                          <td className="py-4"><span className={statusBadge(tx.status)}>{tx.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ==================== SELLER DASHBOARD ====================
  const totalEarnings = earnings?.total_earnings || 0
  // const totalSales = earnings?.total_sales || 0
  const pendingAmount = earnings?.pending_earnings || 0
  const activeInstallmentCount = earnings?.active_installment_plans || 0

  // Installment plans where seller receives payments (plans owed to seller)
  const installmentPlansOwed = plans.filter(p => p.status === 'active')

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-1">Welcome, {user?.name}!</h1>
            <p className="text-gray-500 font-medium">Your seller dashboard &amp; performance.</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            {showCreateForm ? '✕ Cancel' : '+ Create New Listing'}
          </button>
        </div>
      </div>

      {/* Create Listing Form */}
      {showCreateForm && (
        <div className="mb-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Create New Listing</h2>
          <CreateListingForm onSuccess={() => { setShowCreateForm(false); fetchData() }} />
        </div>
      )}

      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Active Listings</p>
          <p className="text-3xl font-black text-blue-600 mt-1">{activeListings.length}</p>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Sold</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{soldListings.length}</p>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Total Earnings</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">${totalEarnings.toLocaleString()}</p>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Pending Installments</p>
          <p className="text-3xl font-black text-amber-600 mt-1">${pendingAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 overflow-x-auto">
        {(['listings', 'sold', 'installments', 'transactions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSellerTab(tab)}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm capitalize whitespace-nowrap transition ${
              sellerTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab === 'listings' && '🚗 '}
            {tab === 'sold' && '✅ '}
            {tab === 'installments' && '💵 '}
            {tab === 'transactions' && '📄 '}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Listings Tab */}
        {sellerTab === 'listings' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold">My Listings</h2>
              <div className="flex gap-2">
                {(['all', 'available', 'pending', 'sold'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setListingFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                      listingFilter === f ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {f} {f === 'all' ? `(${myCars.length})` : f === 'available' ? `(${activeListings.length})` : f === 'pending' ? `(${pendingListings.length})` : `(${soldListings.length})`}
                  </button>
                ))}
              </div>
            </div>

            {filteredCars.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">🚗</p>
                <p className="text-lg font-medium">No listings found</p>
                <p className="text-sm mt-1">Create your first listing to start selling!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-sm text-gray-500 uppercase tracking-wide">
                      <th className="pb-3 font-semibold">Car</th>
                      <th className="pb-3 font-semibold">Price</th>
                      <th className="pb-3 font-semibold">Mileage</th>
                      <th className="pb-3 font-semibold">Listed</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCars.map(car => (
                      <tr key={car.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-4 font-medium">{car.year} {car.make} {car.model}</td>
                        <td className="py-4 font-bold">${car.price.toLocaleString()}</td>
                        <td className="py-4 text-gray-500">{car.mileage?.toLocaleString() || '—'} mi</td>
                        <td className="py-4 text-gray-500 text-sm">{formatDate(car.created_at)}</td>
                        <td className="py-4"><span className={statusBadge(car.status)}>{car.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sold Tab */}
        {sellerTab === 'sold' && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Sold Listings</h2>
            {soldListings.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-lg font-medium">No sales yet</p>
                <p className="text-sm mt-1">Your sold cars will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {soldListings.map(car => (
                  <div key={car.id} className="border rounded-2xl p-5 bg-gray-50 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg">{car.year} {car.make} {car.model}</h3>
                      <p className="text-2xl font-black text-emerald-600">${car.price.toLocaleString()}</p>
                      <p className="text-sm text-gray-500 mt-1">Sold on {formatDate(car.created_at)}</p>
                    </div>
                    <span className={statusBadge('sold')}>Sold</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sales transactions */}
            {sales.length > 0 && (
              <>
                <h3 className="text-lg font-bold mt-8 mb-4">Sales Transactions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-sm text-gray-500 uppercase tracking-wide">
                        <th className="pb-3 font-semibold">Car</th>
                        <th className="pb-3 font-semibold">Buyer</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Method</th>
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map(tx => (
                        <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-4 font-medium">{tx.year} {tx.make} {tx.model}</td>
                          <td className="py-4 text-gray-500">{tx.buyer_name}</td>
                          <td className="py-4 font-bold">${tx.total_price.toLocaleString()}</td>
                          <td className="py-4"><span className={statusBadge(tx.payment_method)}>{tx.payment_method}</span></td>
                          <td className="py-4 text-gray-500 text-sm">{formatDate(tx.created_at)}</td>
                          <td className="py-4"><span className={statusBadge(tx.status)}>{tx.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Installments Tab (Seller) */}
        {sellerTab === 'installments' && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-2">Installment Payments Owed to You</h2>
            <p className="text-gray-500 mb-6 text-sm">
              {activeInstallmentCount > 0
                ? `You have ${activeInstallmentCount} active plan${activeInstallmentCount > 1 ? 's' : ''} totaling $${pendingAmount.toLocaleString()} in remaining payments.`
                : 'No active installment plans.'}
            </p>

            {installmentPlansOwed.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">💵</p>
                <p className="text-lg font-medium">No installment payments owed</p>
                <p className="text-sm mt-1">When buyers set up installment plans with you, they'll appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {installmentPlansOwed.map(plan => (
                  <div key={plan.id} className="border rounded-2xl p-5 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{plan.year} {plan.make} {plan.model}</h3>
                        <p className="text-sm text-gray-500">Buyer: {plan.buyer_name || 'Unknown'}</p>
                      </div>
                      <span className={statusBadge(plan.status)}>{plan.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                        <p className="font-bold">${plan.total_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Monthly</p>
                        <p className="font-bold">${plan.monthly_payment.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Remaining</p>
                        <p className="font-bold text-amber-600">${plan.remaining_balance.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Term</p>
                        <p className="font-bold">{plan.duration_months} months</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Proposed plans (awaiting seller approval) */}
            {plans.filter(p => p.status === 'proposed').length > 0 && (
              <>
                <h3 className="text-lg font-bold mt-8 mb-4">Pending Approval</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.filter(p => p.status === 'proposed').map(plan => (
                    <div key={plan.id} className="border border-blue-200 rounded-2xl p-5 bg-blue-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg">{plan.year} {plan.make} {plan.model}</h3>
                          <p className="text-sm text-gray-500">Buyer: {plan.buyer_name || 'Unknown'}</p>
                        </div>
                        <span className={statusBadge('proposed')}>Proposed</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Down Payment</p>
                          <p className="font-bold">${plan.down_payment.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Monthly</p>
                          <p className="font-bold">${plan.monthly_payment.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Term</p>
                          <p className="font-bold">{plan.duration_months} months</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                          <p className="font-bold">${plan.total_amount.toLocaleString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleApprovePlan(plan.id)}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                      >
                        Approve Plan
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Transaction History Tab (Seller) */}
        {sellerTab === 'transactions' && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Transaction History</h2>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">📄</p>
                <p className="text-lg font-medium">No transactions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-sm text-gray-500 uppercase tracking-wide">
                      <th className="pb-3 font-semibold">Car</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Method</th>
                      <th className="pb-3 font-semibold">Buyer</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-4 font-medium">{tx.year} {tx.make} {tx.model}</td>
                        <td className="py-4 font-bold">${tx.total_price.toLocaleString()}</td>
                        <td className="py-4"><span className={statusBadge(tx.payment_method)}>{tx.payment_method}</span></td>
                        <td className="py-4 text-gray-500">{tx.buyer_name}</td>
                        <td className="py-4 text-gray-500 text-sm">{formatDate(tx.created_at)}</td>
                        <td className="py-4"><span className={statusBadge(tx.status)}>{tx.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}