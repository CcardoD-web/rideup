import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface Car {
  id: string
  make: string
  model: string
  year: number
  price: number
  mileage: number
  image_url: string
  flexible_payment: boolean
}

export default function Listings() {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    make: '',
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    sort: 'newest'
  })

  const fetchListings = (currentFilters = filters) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (currentFilters.search) params.append('search', currentFilters.search)
    if (currentFilters.make) params.append('make', currentFilters.make)
    if (currentFilters.minPrice) params.append('minPrice', currentFilters.minPrice)
    if (currentFilters.maxPrice) params.append('maxPrice', currentFilters.maxPrice)
    if (currentFilters.minYear) params.append('minYear', currentFilters.minYear)
    if (currentFilters.maxYear) params.append('maxYear', currentFilters.maxYear)
    if (currentFilters.sort) params.append('sort', currentFilters.sort)

    fetch(`http://localhost:3001/api/listings?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setCars(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching listings:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchListings()
  }, [])

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const newFilters = { ...filters, [name]: value }
    setFilters(newFilters)
    
    // Auto-fetch for sort change
    if (name === 'sort') {
      fetchListings(newFilters)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchListings()
  }

  const clearFilters = () => {
    const defaultFilters = {
      search: '',
      make: '',
      minPrice: '',
      maxPrice: '',
      minYear: '',
      maxYear: '',
      sort: 'newest'
    }
    setFilters(defaultFilters)
    fetchListings(defaultFilters)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Car Listings</h1>
        <Link 
          to="/dashboard" 
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition font-bold"
        >
          Sell Your Car
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
        <form onSubmit={handleSearch} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                name="search"
                placeholder="Search by make, model, or keywords..."
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>
            <button 
              type="submit"
              className="bg-gray-900 text-white px-8 py-2.5 rounded-lg hover:bg-black transition font-bold"
            >
              Search
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Make</label>
              <input
                type="text"
                name="make"
                placeholder="e.g. Toyota"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={filters.make}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Price</label>
              <input
                type="number"
                name="minPrice"
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={filters.minPrice}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Price</label>
              <input
                type="number"
                name="maxPrice"
                placeholder="No max"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={filters.maxPrice}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Year</label>
              <input
                type="number"
                name="minYear"
                placeholder="2000"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={filters.minYear}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sort By</label>
              <select
                name="sort"
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                value={filters.sort}
                onChange={handleFilterChange}
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="year_desc">Year: Newest First</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                type="button"
                onClick={clearFilters}
                className="w-full h-[38px] text-sm text-blue-600 font-bold hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Loading matches...</p>
        </div>
      ) : cars.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed">
          <h3 className="text-xl font-bold text-gray-700 mb-2">No cars found</h3>
          <p className="text-gray-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cars.map((car) => (
            <div key={car.id} className="border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-white group">
              <div className="h-60 bg-gray-100 relative overflow-hidden">
                {car.image_url ? (
                  <img 
                    src={car.image_url} 
                    alt={`${car.year} ${car.make} ${car.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                {car.flexible_payment && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider">
                    Flexible
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {car.year} {car.make} {car.model}
                  </h2>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-black text-blue-600">${car.price.toLocaleString()}</span>
                  <span className="text-sm font-bold text-gray-400">| {car.mileage.toLocaleString()} mi</span>
                </div>
                <Link 
                  to={`/listings/${car.id}`}
                  className="block w-full text-center py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition font-black uppercase tracking-widest text-xs"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
