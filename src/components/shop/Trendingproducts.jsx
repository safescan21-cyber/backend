import React from 'react'
import ProductCard from "./ProductCards"
import products from "../../assets/data/products.json"

const Trendingproducts = () => {
  
  const [visibleProducts, setVisibleProducts] = React.useState(8)

  const loadMoreProducts = () => {
    setVisibleProducts((prevVisible) => prevVisible + 4);
  }

  // Get only the visible products
  const displayedProducts = products.slice(0, visibleProducts);
  const hasMoreProducts = visibleProducts < products.length;

  return (
    <section className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section - Centered */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-gray-800">
          Trending Products
        </h2>
        <p className="text-gray-600 max-w-3xl mx-auto text-sm md:text-base px-4">
          Check out our Industrial trending products that are popular among our customers. 
          From the latest gadgets to stylish apparel, we have something for everyone. 
          Don't miss out on these hot items!
        </p>
      </div>

      {/* Products Grid - Responsive */}
      <div className="mb-8">
        <ProductCard products={displayedProducts} />
      </div>

      {/* Load More Button - Centered */}
      {hasMoreProducts && (
        <div className="text-center mt-8">
          <button
            onClick={loadMoreProducts}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg 
                     hover:bg-blue-700 transition-colors duration-300 
                     shadow-md hover:shadow-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Load More Products
          </button>
        </div>
      )}

      {/* Optional: Show count of visible products */}
      <div className="text-center mt-4 text-sm text-gray-500">
        Showing {visibleProducts} of {products.length} products
      </div>
    </section>
  )
}

export default Trendingproducts