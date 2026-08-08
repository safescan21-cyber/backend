// CategoryPage.jsx
import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'

const CategoryPage = () => {
  const { categoriesName } = useParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryInfo, setCategoryInfo] = useState({})
  const navigate = useNavigate()

  // Category display names mapping
  const categoryNames = {
    'load-cells': 'Load Cells',
    'controllers': 'Controllers',
    'weighing-scales': 'Weighing Scales',
    'accessories': 'Accessories',
    'dress': 'Dress Collection',
    'jewellery': 'Jewellery',
    'cosmetics': 'Cosmetics'
  }

  // Your product data
  const allProducts = [
    {
      "_id": 1,
      "name": "Industrial Load Cell - 50kg",
      "category": "load-cells",
      "description": "High-precision compression load cell for industrial weighing systems. Capacity: 50kg.",
      "price": 79.99,
      "oldPrice": 99.99,
      "image": "https://picsum.photos/id/124/400/300",
      "color": "black",
      "rating": 4.5,
      "author": "admin"
    },
    {
      "_id": 2,
      "name": "Digital Weighing Controller",
      "category": "controllers",
      "description": "Advanced digital controller for automated weighing systems with LCD display.",
      "price": 149.99,
      "oldPrice": 199.99,
      "image": "https://picsum.photos/id/0/400/300",
      "color": "red",
      "rating": 4.0
    },
    {
      "_id": 3,
      "name": "Stainless Steel Load Cell - 200kg",
      "category": "load-cells",
      "description": "Rugged stainless steel load cell for harsh industrial environments. Capacity: 200kg.",
      "price": 199.99,
      "image": "https://picsum.photos/id/108/400/300",
      "color": "gold",
      "rating": 4.7
    },
    {
      "_id": 4,
      "name": "Touchscreen Weighing Controller",
      "category": "controllers",
      "description": "Intelligent touchscreen controller with data logging and remote monitoring.",
      "price": 19.99,
      "image": "https://picsum.photos/id/152/400/300",
      "color": "red",
      "rating": 4.2
    },
    {
      "_id": 5,
      "name": "Platform Weighing Scale - 500kg",
      "category": "weighing-scales",
      "description": "Heavy-duty platform scale for industrial and warehouse use. Capacity: 500kg.",
      "price": 29.99,
      "oldPrice": 39.99,
      "image": "https://picsum.photos/id/30/400/300",
      "color": "blue",
      "rating": 4.3
    },
    {
      "_id": 6,
      "name": "Bench Weighing Scale - 100kg",
      "category": "weighing-scales",
      "description": "Compact bench scale for industrial counting and weighing applications.",
      "price": 89.99,
      "image": "https://picsum.photos/id/20/400/300",
      "color": "black",
      "rating": 4.4
    },
    {
      "_id": 7,
      "name": "Precision Load Cell - 1000kg",
      "category": "load-cells",
      "description": "High-capacity precision load cell for industrial silos and tanks. Capacity: 1000kg.",
      "price": 299.99,
      "oldPrice": 349.99,
      "image": "https://picsum.photos/id/15/400/300",
      "color": "silver",
      "rating": 4.8
    },
    {
      "_id": 8,
      "name": "Programmable Weight Controller",
      "category": "controllers",
      "description": "Multi-functional weight controller with setpoint control and RS232 output.",
      "price": 39.99,
      "image": "https://picsum.photos/id/177/400/300",
      "color": "beige",
      "rating": 4.1
    },
    {
      "_id": 9,
      "name": "Crane Weighing Scale - 5 Ton",
      "category": "weighing-scales",
      "description": "Dynamometer crane scale for heavy lifting and industrial weighing.",
      "price": 49.99,
      "image": "https://picsum.photos/id/96/400/300",
      "color": "black",
      "rating": 4.6
    },
    {
      "_id": 10,
      "name": "Wireless Load Cell Controller",
      "category": "controllers",
      "description": "Wireless controller for remote load cell monitoring and data acquisition.",
      "price": 59.99,
      "oldPrice": 79.99,
      "image": "https://picsum.photos/id/70/400/300",
      "color": "green",
      "rating": 3.5
    },
    {
      "_id": 11,
      "name": "S-Type Load Cell - 500kg",
      "category": "load-cells",
      "description": "Tension and compression S-type load cell for hanging scales and hoppers.",
      "price": 129.99,
      "oldPrice": 159.99,
      "image": "https://picsum.photos/id/95/400/300",
      "color": "silver",
      "rating": 4.4
    },
    {
      "_id": 12,
      "name": "Industrial Floor Scale - 2000kg",
      "category": "weighing-scales",
      "description": "Heavy-duty floor scale with ramp access for pallet and forklift weighing.",
      "price": 499.99,
      "oldPrice": 599.99,
      "image": "https://picsum.photos/id/48/400/300",
      "color": "gray",
      "rating": 4.9
    },
    {
      "_id": 13,
      "name": "PID Weighing Controller",
      "category": "controllers",
      "description": "PID controller with auto-tuning for batching and filling applications.",
      "price": 189.99,
      "image": "https://picsum.photos/id/26/400/300",
      "color": "black",
      "rating": 4.3
    },
    {
      "_id": 14,
      "name": "Mini Load Cell - 20kg",
      "category": "load-cells",
      "description": "Compact button-style load cell for medical and laboratory scales.",
      "price": 49.99,
      "image": "https://picsum.photos/id/112/400/300",
      "color": "silver",
      "rating": 4.2
    },
    {
      "_id": 15,
      "name": "Truck Weighbridge Scale - 50 Ton",
      "category": "weighing-scales",
      "description": "Industrial weighbridge for heavy trucks and containers. Capacity: 50 tons.",
      "price": 2499.99,
      "oldPrice": 2999.99,
      "image": "https://picsum.photos/id/111/400/300",
      "color": "gray",
      "rating": 4.8
    },
    {
      "_id": 16,
      "name": "Multi-Channel Load Cell Amplifier",
      "category": "controllers",
      "description": "4-channel amplifier for multiple load cell summing and signal conditioning.",
      "price": 159.99,
      "image": "https://picsum.photos/id/60/400/300",
      "color": "black",
      "rating": 4.5
    },
    {
      "_id": 17,
      "name": "High-Temperature Load Cell - 300kg",
      "category": "load-cells",
      "description": "Load cell rated for high-temperature environments up to 200°C.",
      "price": 249.99,
      "oldPrice": 299.99,
      "image": "https://picsum.photos/id/131/400/300",
      "color": "gold",
      "rating": 4.6
    },
    {
      "_id": 18,
      "name": "Batching Controller with Printer",
      "category": "controllers",
      "description": "Automatic batching controller with built-in thermal printer for labels.",
      "price": 279.99,
      "image": "https://picsum.photos/id/133/400/300",
      "color": "white",
      "rating": 4.4
    },
    {
      "_id": 19,
      "name": "Waterproof Load Cell - 100kg",
      "category": "load-cells",
      "description": "IP68 rated waterproof load cell for outdoor and washdown applications.",
      "price": 179.99,
      "oldPrice": 219.99,
      "image": "https://picsum.photos/id/41/400/300",
      "color": "blue",
      "rating": 4.7
    },
    {
      "_id": 20,
      "name": "Portable Digital Crane Scale - 10 Ton",
      "category": "weighing-scales",
      "description": "Portable digital crane scale with remote display and overload alarm.",
      "price": 349.99,
      "image": "https://picsum.photos/id/110/400/300",
      "color": "yellow",
      "rating": 4.3
    }
  ]

  useEffect(() => {
    setLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      const filteredProducts = allProducts.filter(
        product => product.category === categoriesName
      )
      
      setProducts(filteredProducts)
      setCategoryInfo({
        name: categoryNames[categoriesName] || categoriesName,
        displayName: categoriesName.replace('-', ' ').toUpperCase()
      })
      setLoading(false)
    }, 500)
  }, [categoriesName])

  // Handle product click - navigate to SingleProduct page
  const handleProductClick = (productId) => {
    navigate(`/shop/${productId}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Category Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 capitalize">
          {categoryInfo.name || categoryInfo.displayName}
        </h1>
        <p className="text-lg text-gray-600">
          {products.length} {products.length === 1 ? 'product' : 'products'} found
        </p>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">We couldn't find any products in this category.</p>
            <Link 
              to="/categories" 
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200"
            >
              Browse All Categories
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div 
              key={product._id} 
              onClick={() => handleProductClick(product._id)}
              className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
            >
              {/* Product Image */}
              <div className="relative h-64 overflow-hidden bg-gray-100">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {product.oldPrice && (
                  <span className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-md">
                    SALE
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[56px]">
                  {product.name}
                </h3>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2 min-h-[40px]">
                  {product.description}
                </p>

                {/* Price */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-bold text-orange-600">
                    ${product.price}
                  </span>
                  {product.oldPrice && (
                    <span className="text-gray-400 line-through text-sm">
                      ${product.oldPrice}
                    </span>
                  )}
                </div>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-gray-500 capitalize">
                    Color: {product.color}
                  </span>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                    <span className="text-gray-700 font-medium">{product.rating}</span>
                    <span className="text-gray-400">/5</span>
                  </div>
                </div>

                {/* View Button */}
                <button className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-200">
                  View Product
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CategoryPage