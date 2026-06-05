import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface CarDetail {
  id: string
  make: string
  model: string
  year: number
  price: number
  mileage: number
  image_url: string
  description: string
  flexible_payment: boolean
  seller_id: string
  seller_name: string
  status: string
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [car, setCar] = useState<CarDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFinancingModal, setShowFinancingModal] = useState(false)
  const [showInstallmentModal, setShowInstallmentModal] = useState(false)
  
  // Financing form state
  const [income, setIncome] = useState('')
  const [employment, setEmployment] = useState('')
  const [term, setTerm] = useState('36')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  // Installment form state
  const [downPayment, setDownPayment] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [installmentTerm, setInstallmentTerm] = useState('12')

  useEffect(() => {
    fetch(`http://localhost:3001/api/listings/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setCar(data)
        setLoading(false)
        if (data.price) {
          setDownPayment(String(Math.floor(data.price * 0.2)))
          setMonthlyPayment(String(Math.floor((data.price * 0.8) / 12)))
        }
      })
      .catch((err) => {
        console.error('Error fetching listing detail:', err)
        setLoading(false)
      })
  }, [id])

  const handleApplyFinancing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return alert('Please login to apply')
    setSubmitting(true)
    try {
      const res = await fetch('http://localhost:3001/api/financing/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rideup_token')}`
        },
        body: JSON.stringify({
          car_id: id,
          income: Number(income),
          employment,
          requested_term: Number(term)
        })
      })
      const data = await res.json()
      setMessage(data.message)
      if (res.ok) {
        setTimeout(() => {
          setShowFinancingModal(false)
          setMessage('')
        }, 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleProposeInstallment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return alert('Please login to propose a plan')
    setSubmitting(true)
    try {
      const res = await fetch('http://localhost:3001/api/installments/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rideup_token')}`
        },
        body: JSON.stringify({
          car_id: id,
          buyer_id: user.id, // For this demo, we'll just allow setup. In real app, seller would approve.
          down_payment: Number(downPayment),
          monthly_payment: Number(monthlyPayment),
          duration_months: Number(installmentTerm)
        })
      })
      const data = await res.json()
      if (res.ok) {
        alert('Proposal sent successfully! View status in your dashboard.')
        setShowInstallmentModal(false)
      } else {
        alert(data.error)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center text-xl">Loading car details...</div>
  }

  if (!car) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Listing Not Found</h1>
        <Link to="/listings" className="text-blue-600 hover:underline">Back to listings</Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/listings" className="text-blue-600 hover:underline mb-6 inline-block">
        &larr; Back to listings
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="bg-gray-100 rounded-2xl overflow-hidden aspect-video relative">
            {car.image_url ? (
              <img 
                src={car.image_url} 
                alt={`${car.year} ${car.make} ${car.model}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                No Image Available
              </div>
            )}
            {car.status !== 'available' && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="text-white text-3xl font-bold uppercase tracking-widest border-4 border-white p-4">
                  {car.status}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col">
          <h1 className="text-4xl font-extrabold mb-2">{car.year} {car.make} {car.model}</h1>
          <p className="text-2xl font-bold text-blue-600 mb-6">${car.price.toLocaleString()}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-gray-500 text-sm">Mileage</p>
              <p className="font-bold text-lg">{car.mileage.toLocaleString()} mi</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-gray-500 text-sm">Seller</p>
              <p className="font-bold text-lg">{car.seller_name}</p>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3">Description</h3>
            <p className="text-gray-700 leading-relaxed">{car.description || 'No description provided.'}</p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={() => alert('Contacting seller...')}
              className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold text-lg hover:bg-gray-900 transition"
            >
              Pay Cash / Contact Seller
            </button>
            
            {car.flexible_payment && car.status === 'available' && (
              <div className="border-2 border-blue-500 bg-blue-50 p-6 rounded-xl">
                <h4 className="text-blue-800 font-bold text-lg mb-2 flex items-center">
                  <span className="mr-2">💳</span> RideUp Flex Options
                </h4>
                <p className="text-blue-700 mb-4">
                  Choose the best way to pay for this vehicle.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    onClick={() => setShowFinancingModal(true)}
                    className="py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                  >
                    Apply for Financing
                  </button>
                  <button 
                    onClick={() => setShowInstallmentModal(true)}
                    className="py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                  >
                    Setup Installment Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financing Modal */}
      {showFinancingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
            <button 
              onClick={() => setShowFinancingModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6">Financing Application</h2>
            {message ? (
              <div className={`p-4 rounded-lg mb-6 ${message.includes('approved') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {message}
              </div>
            ) : (
              <form onSubmit={handleApplyFinancing} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income ($)</label>
                  <input 
                    type="number" required
                    value={income} onChange={(e) => setIncome(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                  <select 
                    value={employment} onChange={(e) => setEmployment(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="">Select...</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Self-employed">Self-employed</option>
                    <option value="Unemployed">Unemployed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loan Term (Months)</label>
                  <select 
                    value={term} onChange={(e) => setTerm(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="12">12 Months</option>
                    <option value="24">24 Months</option>
                    <option value="36">36 Months</option>
                    <option value="48">48 Months</option>
                    <option value="60">60 Months</option>
                  </select>
                </div>
                <button 
                  disabled={submitting}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Installment Modal */}
      {showInstallmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
            <button 
              onClick={() => setShowInstallmentModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6">Installment Plan Proposal</h2>
            <p className="text-gray-600 mb-6 text-sm">
              Agree on terms directly with the seller. RideUp helps track payments and provides security for both parties.
            </p>
            <form onSubmit={handleProposeInstallment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment ($)</label>
                <input 
                  type="number" required
                  value={downPayment} onChange={(e) => setDownPayment(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term (Months)</label>
                  <select 
                    value={installmentTerm} onChange={(e) => setInstallmentTerm(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                    <option value="18">18 Months</option>
                    <option value="24">24 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly ($)</label>
                  <input 
                    type="number" required
                    value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span>Car Price:</span>
                  <span className="font-bold">${car.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Total Payments:</span>
                  <span className="font-bold">${(Number(downPayment) + (Number(monthlyPayment) * Number(installmentTerm))).toLocaleString()}</span>
                </div>
              </div>
              <button 
                className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
              >
                Propose Terms to Seller
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
