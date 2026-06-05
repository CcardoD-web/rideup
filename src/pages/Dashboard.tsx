import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import CreateListingForm from '../components/CreateListingForm'

interface Car {
  id: string
  make: string
  model: string
  year: number
  price: number
  status: string
}

interface FinancingApp {
  id: string
  car_id: string
  make: string
  model: string
  year: number
  price: number
  status: string
  buyer_name?: string
}

interface InstallmentPlan {
  id: string
  car_id: string
  make: string
  model: string
  year: number
  total_amount: number
  remaining_balance: number
  monthly_payment: number
  status: string
  buyer_name?: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const [myCars, setMyCars] = useState<Car[]>([])
  const [apps, setApps] = useState<FinancingApp[]>([])
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const fetchData = async () => {
    const token = localStorage.getItem('rideup_token')
    if (!token) return

    try {
      // My listings
      const carsRes = await fetch('http://localhost:3001/api/my-listings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setMyCars(await carsRes.json())

      // Financing apps
      const appsRes = await fetch('http://localhost:3001/api/financing/applications', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setApps(await appsRes.json())

      // Installment plans
      const plansRes = await fetch('http://localhost:3001/api/installments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setPlans(await plansRes.json())

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleApprovePlan = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/installments/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('rideup_token')}` }
      })
      if (res.ok) {
        alert('Plan approved!')
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handlePayment = async (id: string, amount: number) => {
    try {
      const res = await fetch(`http://localhost:3001/api/payments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rideup_token')}` 
        },
        body: JSON.stringify({ plan_id: id, amount })
      })
      if (res.ok) {
        alert('Payment successful!')
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Welcome, {user?.name}!</h1>
          <p className="text-gray-500 font-medium">Manage your {user?.role} account and activity.</p>
        </div>
        {user?.role === 'buyer' && (
          <div className="mt-4 md:mt-0 flex items-center gap-4 bg-blue-50 px-6 py-4 rounded-xl border border-blue-100">
            <div className="text-blue-600">
              <p className="text-xs font-bold uppercase tracking-wider">Credit Score</p>
              <p className="text-3xl font-black">{user.credit_score || 'N/A'}</p>
            </div>
          </div>
        )}
        {user?.role === 'seller' && (
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="mt-4 md:mt-0 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            {showCreateForm ? 'Cancel' : 'Create New Listing'}
          </button>
        )}
      </div>

      {showCreateForm && user?.role === 'seller' && (
        <div className="mb-10 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Create New Listing</h2>
          <CreateListingForm onSuccess={() => {
            setShowCreateForm(false)
            fetchData()
          }} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Listings Section */}
        <div className="p-6 border rounded-xl shadow-sm bg-white">
          <h2 className="text-xl font-bold mb-4">
            {user?.role === 'seller' ? 'My Listings' : 'Activity'}
          </h2>
          {loading ? <p>Loading...</p> : (
            <div className="space-y-4">
              {myCars.map(car => (
                <div key={car.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-bold">{car.year} {car.make} {car.model}</p>
                    <p className="text-sm text-gray-500">${car.price.toLocaleString()}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    car.status === 'available' ? 'bg-green-100 text-green-700' : 
                    car.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {car.status}
                  </span>
                </div>
              ))}
              {myCars.length === 0 && <p className="text-gray-400 italic">No listings found.</p>}
            </div>
          )}
        </div>

        {/* Financing Applications */}
        <div className="p-6 border rounded-xl shadow-sm bg-white">
          <h2 className="text-xl font-bold mb-4">Financing Applications</h2>
          <div className="space-y-4">
            {apps.map(app => (
              <div key={app.id} className="p-4 border rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="font-bold">{app.year} {app.make} {app.model}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>{app.status}</span>
                </div>
                {user?.role === 'seller' && <p className="text-sm text-gray-500">Applicant: {app.buyer_name}</p>}
                <p className="text-sm text-gray-500">Value: ${app.price.toLocaleString()}</p>
              </div>
            ))}
            {apps.length === 0 && <p className="text-gray-400 italic">No applications found.</p>}
          </div>
        </div>

        {/* Installment Plans */}
        <div className="p-6 border rounded-xl shadow-sm bg-white lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Installment Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className="p-6 border rounded-2xl bg-gray-50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{plan.year} {plan.make} {plan.model}</h3>
                    {user?.role === 'seller' && <p className="text-sm text-gray-500">Buyer: {plan.buyer_name}</p>}
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    plan.status === 'active' ? 'bg-green-100 text-green-700' : 
                    plan.status === 'proposed' ? 'bg-blue-100 text-blue-700' : 
                    'bg-gray-100 text-gray-700'
                  }`}>{plan.status}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Remaining</p>
                    <p className="font-black text-xl">${plan.remaining_balance.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Monthly</p>
                    <p className="font-black text-xl">${plan.monthly_payment.toLocaleString()}</p>
                  </div>
                </div>

                {user?.role === 'seller' && plan.status === 'proposed' && (
                  <button 
                    onClick={() => handleApprovePlan(plan.id)}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                  >
                    Approve Proposal
                  </button>
                )}

                {user?.role === 'buyer' && plan.status === 'active' && plan.remaining_balance > 0 && (
                  <button 
                    onClick={() => handlePayment(plan.id, plan.monthly_payment)}
                    className="w-full py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                  >
                    Pay Monthly Installment (${plan.monthly_payment})
                  </button>
                )}
              </div>
            ))}
            {plans.length === 0 && <p className="text-gray-400 italic">No installment plans found.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
