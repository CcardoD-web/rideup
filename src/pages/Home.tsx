import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-5xl font-extrabold mb-6">
        The Flexible Way to <span className="text-blue-600">Buy & Sell</span> Cars
      </h1>
      <p className="text-xl text-gray-600 mb-12 max-w-2xl">
        Peer-to-peer car marketplace where buyers can pay outright, get financed, or set up installment plans.
      </p>
      <div className="flex gap-4">
        <Link to="/listings" className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
          Browse Cars
        </Link>
        <Link to="/signup" className="px-8 py-3 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition">
          Sell Your Car
        </Link>
      </div>
    </div>
  )
}
