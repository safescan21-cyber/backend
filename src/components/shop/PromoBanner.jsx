import React from 'react'
import { Link } from 'react-router-dom'
import { FaTruck, FaMoneyBillWave, FaHeadset, FaBoxOpen } from 'react-icons/fa'

const PromoBanner = () => {
  const bannerItems = [
    {
      id: 1,
      title: "Free Delivery",
      description: "Offers convenience and the ability to shop from anywhere, anytime.",
      icon: FaTruck,
      link: "/promo/free-delivery",
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
      hoverColor: "hover:text-blue-600",
      bgGradient: "from-blue-50 to-transparent"
    },
    {
      id: 2,
      title: "Money Back",
      description: "E-commerce have a review system where customers can share feedback.",
      icon: FaMoneyBillWave,
      link: "/promo/money-back-guarantee",
      color: "green",
      gradient: "from-green-500 to-green-600",
      hoverColor: "hover:text-green-600",
      bgGradient: "from-green-50 to-transparent"
    },
    {
      id: 3,
      title: "Strong Support",
      description: "Offer customer support services to assist customers with queries.",
      icon: FaHeadset,
      link: "/promo/customer-support",
      color: "purple",
      gradient: "from-purple-500 to-purple-600",
      hoverColor: "hover:text-purple-600",
      bgGradient: "from-purple-50 to-transparent"
    },
    {
      id: 4,
      title: "Track Order",
      description: "Get real-time updates on your delivery with live tracking.",
      icon: FaBoxOpen,
      link: "/track-order",
      color: "orange",
      gradient: "from-orange-500 to-red-500",
      hoverColor: "hover:text-orange-600",
      bgGradient: "from-orange-50 to-transparent",
      // Special flag for track order to show blinking button
      isTrackOrder: true
    }
  ]

  return (
    <section className="py-8 sm:py-12 md:py-16 px-4 sm:px-6 md:px-8 lg:px-16 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          
          {bannerItems.map((item) => {
            const IconComponent = item.icon
            return (
              <Link 
                key={item.id}
                to={item.link}
                className="group relative overflow-hidden bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-4 sm:p-5 md:p-6 lg:p-8 text-center border border-gray-100 block"
              >
                {/* Background decoration */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                {/* Icon - Responsive sizing */}
                <div className={`relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mb-4 sm:mb-5 md:mb-6 bg-gradient-to-br ${item.gradient} rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="text-2xl sm:text-3xl md:text-3xl text-white" />
                </div>
                
                {/* Content - Responsive typography */}
                <h4 className={`relative text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800 mb-2 sm:mb-3 ${item.hoverColor} transition-colors duration-300`}>
                  {item.title}
                </h4>
                <p className="relative text-gray-600 leading-relaxed text-xs sm:text-sm md:text-base">
                  {item.description}
                </p>
                
                {/* Track Now Button - Only for Track Order section, with blinking animation */}
                {item.isTrackOrder && (
                  <div className="relative mt-4">
                    <span className="inline-block px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-md animate-pulse hover:animate-none transition-all duration-300 hover:scale-105">
                      Track Now →
                    </span>
                  </div>
                )}
                
                {/* Hover underline effect - Responsive positioning */}
                <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 sm:h-1 bg-${item.color}-500 group-hover:w-12 sm:group-hover:w-16 transition-all duration-300 rounded-full`}></div>
              </Link>
            )
          })}

        </div>

        {/* Optional: Mobile swipe indicator */}
        <div className="block lg:hidden text-center mt-6 sm:mt-8">
          <div className="inline-flex gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Swipe to see more →</p>
        </div>
      </div>
    </section>
  )
}

export default PromoBanner