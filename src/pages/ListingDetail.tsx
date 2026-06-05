import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ---- Types ----
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

type PurchaseOption = 'cash' | 'finance' | 'installment' | null

// Confetti-like success screen component
function SuccessScreen({ title, message, car, onClose }: { title: string; message: string; car: CarDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl animate-[scaleIn_0.3s_ease-out]">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <p className="text-sm text-gray-500">{car.year} {car.make} {car.model}</p>
          <p className="text-2xl font-black text-blue-600">${car.price.toLocaleString()}</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/dashboard"
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
          >
            View My Dashboard
          </Link>
          <button
            onClick={onClose}
            className="py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
          >
            Browse More
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [car, setCar] = useState<CarDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedOption, setSelectedOption] = useState<PurchaseOption>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successInfo, setSuccessInfo] = useState({ title: '', message: '' })

  // Financing form state
  const [income, setIncome] = useState('')
  const [employment, setEmployment] = useState('')
  const [financeTerm, setFinanceTerm] = useState('36')
  const [financingResult, setFinancingResult] = useState<{ status: string; message: string; id?: string } | null>(null)

  // Installment form state
  const [downPayment, setDownPayment] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [installmentTerm, setInstallmentTerm] = useState('12')

  // Alert state
  const [alertMsg, setAlertMsg] = useState('')
  const [alertType, setAlertType] = useState<'error' | 'success' | 'info'>('info')

  const showAlert = (msg: string, type: 'error' | 'success' | 'info') => {
    setAlertMsg(msg)
    setAlertType(type)
    setTimeout(() => setAlertMsg(''), 4000)
  }

  const fetchCar = () => {
    setLoading(true)
    fetch(`http://localhost:3001/api/listings/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setCar(data)
        setLoading(false)
        if (data.price) {
          const twentyPct = Math.floor(data.price * 0.2)
          const monthly = Math.floor((data.price - twentyPct) / 12)
          setDownPayment(String(twentyPct))
          setMonthlyPayment(String(monthly))
        }
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchCar() }, [id])

  // Reset form when toggling options
  const toggleOption = (opt: PurchaseOption) => {
    setSelectedOption(selectedOption === opt ? null : opt)
    setFinancingResult(null)
    setAlertMsg('')
  }

  // ---- Cash Purchase ----
  const handlePayCash = async () => {
    if (!user) return showAlert('Please login to purchase', 'error')
    setSubmitting(true)
    try {
      const res = await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rideup_token')}`
        },
        body: JSON.stringify({ car_id: id, payment_method: 'outright' })
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessInfo({ title: 'Purchase Complete! 🚗', message: 'Congratulations! You now own this vehicle. Coordinate pickup with the seller.' })
        setShowSuccess(true)
      } else {
        showAlert(data.error || 'Purchase failed', 'error')
      }
    } catch {
      showAlert('Network error. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Financing ----
  const handleApplyFinancing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return showAlert('Please login to apply', 'error')
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
          requested_term: Number(financeTerm)
        })
      })
      const data = await res.json()
      setFinancingResult(data)
      if (data.status === 'approved') {
        setSuccessInfo({
          title: 'Financing Approved! ✅',
          message: 'Your application was approved instantly! Complete the purchase below.'
        })
        setShowSuccess(true)
      }
    } catch {
      showAlert('Network error. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCompleteFinancedPurchase = async () => {
    if (!financingResult?.id) return
    setSubmitting(true)
    try {
      const res = await fetch(`http://localhost:3001/api/financing/${financingResult.id}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('rideup_token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessInfo({
          title: 'Purchase Complete! 🚗',
          message: 'Your financed purchase went through. Check your dashboard for payment details.'
        })
        setShowSuccess(true)
      } else {
        showAlert(data.error || 'Failed to complete purchase', 'error')
      }
    } catch {
      showAlert('Network error.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Installment ----
  const handleProposeInstallment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return showAlert('Please login to propose a plan', 'error')
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
          buyer_id: user.id,
          down_payment: Number(downPayment),
          monthly_payment: Number(monthlyPayment),
          duration_months: Number(installmentTerm)
        })
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessInfo({
          title: 'Proposal Sent! 📋',
          message: 'Your installment plan proposal has been sent to the seller. They will review and approve it. Check your dashboard for updates.'
        })
        setShowSuccess(true)
      } else {
        showAlert(data.error || 'Failed to create plan', 'error')
      }
    } catch {
      showAlert('Network error.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const totalInstallmentCost = Number(downPayment) + (Number(monthlyPayment) * Number(installmentTerm))
  const isOwnListing = user && car && user.id === car.seller_id

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

      {/* Toast Alert */}
      {alertMsg && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg font-bold text-sm transition-all ${
          alertType === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
          alertType === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
          'bg-blue-100 text-blue-700 border border-blue-200'
        }`}>
          {alertMsg}
        </div>
      )}

      {/* Success Screen */}
      {showSuccess && car && (
        <SuccessScreen
          title={successInfo.title}
          message={successInfo.message}
          car={car}
          onClose={() => { setShowSuccess(false); fetchCar() }}
        />
      )}

      {/* Car Details */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Image */}
          <div className="bg-gray-100 aspect-video lg:aspect-auto lg:h-full relative">
            {car.image_url ? (
              <img src={car.image_url} alt={`${car.year} ${car.make} ${car.model}`} className="w-full h-full object-cover absolute inset-0" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl absolute inset-0">
                No Image Available
              </div>
            )}
            {car.status !== 'available' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-3xl font-bold uppercase tracking-widest border-4 border-white p-4 rounded-xl">
                  {car.status}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-8 flex flex-col justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 mb-2">
                {car.year} {car.make} {car.model}
              </h1>
              <p className="text-3xl font-black text-blue-600 mb-6">${car.price.toLocaleString()}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Mileage</p>
                  <p className="font-bold text-lg">{car.mileage.toLocaleString()} mi</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Seller</p>
                  <p className="font-bold text-lg">{car.seller_name}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{car.description || 'No description provided.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Options */}
      {car.status === 'available' && !isOwnListing && (
        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900 mb-6">Choose How to Pay</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* OPTION 1: Cash */}
            <div className={`bg-white border-2 rounded-2xl overflow-hidden transition-all ${
              selectedOption === 'cash' ? 'border-gray-800 shadow-lg' : 'border-gray-100 hover:border-gray-300'
            }`}>
              <button
                onClick={() => toggleOption('cash')}
                className="w-full p-6 text-left"
              >
                <div className="text-3xl mb-3">💰</div>
                <h3 className="font-black text-lg text-gray-900">Pay Cash</h3>
                <p className="text-sm text-gray-500 mt-1">One-time payment, own it today</p>
                <p className="text-2xl font-black text-gray-900 mt-3">${car.price.toLocaleString()}</p>
                {selectedOption === 'cash' && (
                  <span className="inline-block mt-3 text-xs font-bold text-gray-500">▼ Hide details</span>
                )}
              </button>

              {selectedOption === 'cash' && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Vehicle Price</span>
                      <span className="font-bold">${car.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                      <span className="font-bold">Total Due Today</span>
                      <span className="font-black text-gray-900">${car.price.toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={handlePayCash}
                    disabled={submitting}
                    className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><span className="animate-spin">⏳</span> Processing...</>
                    ) : (
                      'Purchase Now'
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* OPTION 2: Financing */}
            <div className={`bg-white border-2 rounded-2xl overflow-hidden transition-all ${
              selectedOption === 'finance' ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-gray-100 hover:border-blue-300'
            }`}>
              <button
                onClick={() => toggleOption('finance')}
                className="w-full p-6 text-left"
              >
                <div className="text-3xl mb-3">💳</div>
                <h3 className="font-black text-lg text-gray-900">Apply for Financing</h3>
                <p className="text-sm text-gray-500 mt-1">Get approved instantly with good credit</p>
                <p className="text-sm text-gray-500 mt-1">From ~${Math.floor(car.price / 36).toLocaleString()}/mo for 36 months</p>
                {!car.flexible_payment && (
                  <span className="inline-block mt-2 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Available for all buyers</span>
                )}
                {selectedOption === 'finance' && (
                  <span className="inline-block mt-3 text-xs font-bold text-blue-500">▼ Hide details</span>
                )}
              </button>

              {selectedOption === 'finance' && (
                <div className="px-6 pb-6 border-t border-blue-100 pt-4">
                  {financingResult ? (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-xl ${
                        financingResult.status === 'approved' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
                      }`}>
                        <p className="font-bold">{financingResult.status === 'approved' ? '✅ Approved!' : '⏳ Under Review'}</p>
                        <p className="text-sm mt-1">{financingResult.message}</p>
                      </div>
                      {financingResult.status === 'approved' && (
                        <button
                          onClick={handleCompleteFinancedPurchase}
                          disabled={submitting}
                          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:bg-blue-400"
                        >
                          {submitting ? 'Completing...' : 'Complete Purchase with Financing'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleApplyFinancing} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Annual Income ($)</label>
                        <input type="number" required value={income} onChange={e => setIncome(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="e.g. 50000" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Employment</label>
                        <select value={employment} onChange={e => setEmployment(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                          <option value="">Select...</option>
                          <option value="Full-time">Full-time</option>
                          <option value="Part-time">Part-time</option>
                          <option value="Self-employed">Self-employed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Loan Term</label>
                        <select value={financeTerm} onChange={e => setFinanceTerm(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                          <option value="12">12 Months</option>
                          <option value="24">24 Months</option>
                          <option value="36">36 Months</option>
                          <option value="48">48 Months</option>
                          <option value="60">60 Months</option>
                        </select>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Est. monthly</span>
                          <span className="font-bold">${Math.floor(car.price / Number(financeTerm)).toLocaleString()}/mo</span>
                        </div>
                      </div>
                      <button disabled={submitting}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:bg-blue-400">
                        {submitting ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* OPTION 3: Installment Plan */}
            <div className={`bg-white border-2 rounded-2xl overflow-hidden transition-all ${
              selectedOption === 'installment' ? 'border-green-500 shadow-lg shadow-green-100' : 'border-gray-100 hover:border-green-300'
            }`}>
              <button
                onClick={() => toggleOption('installment')}
                disabled={!car.flexible_payment}
                className={`w-full p-6 text-left ${!car.flexible_payment ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-3xl mb-3">📋</div>
                <h3 className="font-black text-lg text-gray-900">Installment Plan</h3>
                <p className="text-sm text-gray-500 mt-1">Pay over time, directly with seller</p>
                {car.flexible_payment ? (
                  <p className="text-sm mt-1 text-green-600 font-medium">✅ Seller accepts installments</p>
                ) : (
                  <span className="inline-block mt-2 text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">Not available for this listing</span>
                )}
                {selectedOption === 'installment' && (
                  <span className="inline-block mt-3 text-xs font-bold text-green-500">▼ Hide details</span>
                )}
              </button>

              {selectedOption === 'installment' && car.flexible_payment && (
                <div className="px-6 pb-6 border-t border-green-100 pt-4">
                  <form onSubmit={handleProposeInstallment} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Down Payment ($)</label>
                      <input type="number" required value={downPayment} onChange={e => setDownPayment(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Term (Months)</label>
                        <select value={installmentTerm} onChange={e => setInstallmentTerm(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                          <option value="6">6 Months</option>
                          <option value="12">12 Months</option>
                          <option value="18">18 Months</option>
                          <option value="24">24 Months</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Monthly ($)</label>
                        <input type="number" required value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Down payment</span>
                        <span className="font-bold">${Number(downPayment).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total over {installmentTerm} months</span>
                        <span className="font-bold">${(Number(monthlyPayment) * Number(installmentTerm)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
                        <span className="font-bold">Total</span>
                        <span className="font-black">${totalInstallmentCost.toLocaleString()}</span>
                      </div>
                      {totalInstallmentCost > car.price && (
                        <p className="text-xs text-green-700 mt-1">⚠️ {(totalInstallmentCost - car.price).toLocaleString()} above asking price</p>
                      )}
                    </div>
                    <button disabled={submitting}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition disabled:bg-green-400">
                      {submitting ? 'Sending...' : 'Propose to Seller'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Not available or own listing state */}
      {car.status !== 'available' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h3 className="text-xl font-bold text-yellow-800 mb-1">This vehicle is {car.status}</h3>
          <p className="text-yellow-700">It is no longer available for purchase.</p>
        </div>
      )}

      {isOwnListing && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">👋</p>
          <h3 className="text-xl font-bold text-blue-800 mb-1">This is your listing</h3>
          <p className="text-blue-700">View purchase options and manage this listing from your dashboard.</p>
          <Link to="/dashboard" className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">
            Go to Dashboard
          </Link>
        </div>
      )}
    </div>
  )
}