import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const Dealsection = () => {
  // Calculate target date (7 days from now)
  const [targetDate] = useState(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const distance = targetDate - now

      if (distance < 0) {
        clearInterval(timer)
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <section className='w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16'>
      <div className='max-w-7xl mx-auto'>
        <div 
          className='relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-6 sm:p-8 lg:p-12 shadow-2xl'
        >
          {/* Animated background pattern */}
          <div 
            className='absolute inset-0 opacity-20'
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              animation: 'slide 20s linear infinite'
            }}
          />
          
          {/* Add custom animations */}
          <style>
            {`
              @keyframes slide {
                0% { transform: translate(0, 0); }
                100% { transform: translate(40px, 40px); }
              }
              
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
              
              .animate-pulse-slow {
                animation: pulse 2s ease-in-out infinite;
              }
              
              .animate-pulse-slow:nth-child(2) { animation-delay: 0.5s; }
              .animate-pulse-slow:nth-child(3) { animation-delay: 1s; }
              .animate-pulse-slow:nth-child(4) { animation-delay: 1.5s; }
            `}
          </style>

          {/* Content container */}
          <div className='relative z-10 text-center'>
            
            {/* Badge */}
            <div className='inline-block mb-4 sm:mb-6'>
              <span className='inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/20 backdrop-blur-sm text-yellow-300 text-xs sm:text-sm font-bold tracking-wider'>
                <span className='text-base sm:text-lg'>⚡</span>
                LIMITED TIME OFFER
              </span>
            </div>

            {/* Discount Text */}
            <h5 className='text-yellow-300 text-sm sm:text-base lg:text-lg font-semibold tracking-wider mb-3 sm:mb-4 uppercase'>
              Get Up To 20% Discount
            </h5>

            {/* Main Heading */}
            <h4 className='text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 drop-shadow-lg'>
              Deals Of This Month
            </h4>

            {/* Description */}
            <p className='text-white/90 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 lg:mb-10 px-2 leading-relaxed'>
              Our Women's Fashion Deals of the Month are here to make your style dreams a reality 
              without breaking the bank. Discover a curated collection of exquisite clothing, 
              accessories, and footwear, all handpicked to elevate your wardrobe.
            </p>

            {/* Countdown Timer */}
            <div className='flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 lg:mb-10'>
              
              {/* Days */}
              <div className='animate-pulse-slow bg-black/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 min-w-[70px] sm:min-w-[90px] md:min-w-[100px] border border-white/20'>
                <h4 className='text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold'>
                  {String(timeLeft.days).padStart(2, '0')}
                </h4>
                <p className='text-yellow-300 text-xs sm:text-sm font-semibold uppercase tracking-wider mt-1 sm:mt-2'>
                  Days
                </p>
              </div>

              {/* Hours */}
              <div className='animate-pulse-slow bg-black/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 min-w-[70px] sm:min-w-[90px] md:min-w-[100px] border border-white/20'>
                <h4 className='text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold'>
                  {String(timeLeft.hours).padStart(2, '0')}
                </h4>
                <p className='text-yellow-300 text-xs sm:text-sm font-semibold uppercase tracking-wider mt-1 sm:mt-2'>
                  Hours
                </p>
              </div>

              {/* Minutes */}
              <div className='animate-pulse-slow bg-black/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 min-w-[70px] sm:min-w-[90px] md:min-w-[100px] border border-white/20'>
                <h4 className='text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold'>
                  {String(timeLeft.minutes).padStart(2, '0')}
                </h4>
                <p className='text-yellow-300 text-xs sm:text-sm font-semibold uppercase tracking-wider mt-1 sm:mt-2'>
                  Mins
                </p>
              </div>

              {/* Seconds */}
              <div className='animate-pulse-slow bg-black/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 min-w-[70px] sm:min-w-[90px] md:min-w-[100px] border border-white/20'>
                <h4 className='text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold'>
                  {String(timeLeft.seconds).padStart(2, '0')}
                </h4>
                <p className='text-yellow-300 text-xs sm:text-sm font-semibold uppercase tracking-wider mt-1 sm:mt-2'>
                  Secs
                </p>
              </div>
            </div>

            {/* CTA Button with React Router Link */}
            <Link to="/shop" className='inline-block'>
              <button 
                className='group relative overflow-hidden bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold py-3 sm:py-4 px-6 sm:px-8 md:px-10 rounded-full text-sm sm:text-base md:text-lg shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1'
              >
                <span className='relative z-10 flex items-center gap-2'>
                  Shop Now 
                  <span className='transition-transform duration-300 group-hover:translate-x-1'>→</span>
                </span>
                <div className='absolute inset-0 bg-gradient-to-r from-yellow-500 to-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
              </button>
            </Link>

            {/* Optional: Additional links for different categories */}
            <div className='mt-6 sm:mt-8 flex flex-wrap justify-center gap-3 sm:gap-4'>
              <Link 
                to="/shop?category=women" 
                className='text-white/80 hover:text-white text-xs sm:text-sm transition-colors duration-300 underline-offset-2 hover:underline'
              >
                Women's Collection
              </Link>
              <span className='text-white/40'>•</span>
              <Link 
                to="/shop?category=accessories" 
                className='text-white/80 hover:text-white text-xs sm:text-sm transition-colors duration-300 underline-offset-2 hover:underline'
              >
                Accessories
              </Link>
              <span className='text-white/40'>•</span>
              <Link 
                to="/shop?category=footwear" 
                className='text-white/80 hover:text-white text-xs sm:text-sm transition-colors duration-300 underline-offset-2 hover:underline'
              >
                Footwear
              </Link>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

export default Dealsection