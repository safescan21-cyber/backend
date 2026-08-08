import React, { useState, useEffect } from 'react';

const IndustrialBlogSection = () => {
  // Sample industrial company reviews data
  const companyReviews = [
    {
      id: 1,
      companyName: "Global Industrial Solutions Inc.",
      industry: "Manufacturing",
      product: "Heavy-Duty Pneumatic Press",
      rating: 5,
      review: "This industrial press has increased our production efficiency by 40% while maintaining exceptional safety standards. The build quality is outstanding.",
      logo: "🏭",
      date: "2024-03-15",
      verified: true
    },
    {
      id: 2,
      companyName: "Precision Engineering Corp",
      industry: "Aerospace",
      product: "CNC Machining Center",
      rating: 5,
      review: "The precision and reliability of this equipment have been crucial for our aerospace components. Excellent after-sales support and maintenance.",
      logo: "✈️",
      date: "2024-03-10",
      verified: true
    },
    {
      id: 3,
      companyName: "Energy Systems Ltd.",
      industry: "Power Generation",
      product: "Industrial Turbine System",
      rating: 4,
      review: "Robust performance with minimal downtime. The energy efficiency has significantly reduced our operational costs.",
      logo: "⚡",
      date: "2024-03-05",
      verified: true
    },
    {
      id: 4,
      companyName: "Construction Masters LLC",
      industry: "Construction",
      product: "Hydraulic Excavator",
      rating: 5,
      review: "Exceptional durability and power. This equipment handles our toughest job sites with ease and reliability.",
      logo: "🏗️",
      date: "2024-02-28",
      verified: true
    },
    {
      id: 5,
      companyName: "Chemical Process Industries",
      industry: "Chemical",
      product: "Industrial Reactor Vessel",
      rating: 4,
      review: "Corrosion-resistant and highly efficient. Perfect for our specialized chemical processes with excellent safety features.",
      logo: "🧪",
      date: "2024-02-20",
      verified: true
    },
    {
      id: 6,
      companyName: "Logistics Plus",
      industry: "Transportation",
      product: "Automated Conveyor System",
      rating: 5,
      review: "Revolutionized our warehouse operations. The automation capabilities have tripled our sorting efficiency.",
      logo: "🚚",
      date: "2024-02-15",
      verified: true
    }
  ];

  // Animation on scroll state
  const [animatedCards, setAnimatedCards] = useState([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setAnimatedCards((prev) => [...prev, entry.target.dataset.id]);
          }
        });
      },
      { threshold: 0.1, rootMargin: '20px' }
    );

    const cards = document.querySelectorAll('.review-card');
    cards.forEach((card) => observer.observe(card));

    return () => {
      cards.forEach((card) => observer.unobserve(card));
    };
  }, []);

  // Star rating component
  const StarRating = ({ rating }) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, index) => (
          <svg
            key={index}
            className={`w-4 h-4 transition-all duration-200 ${
              index < rating 
                ? 'text-yellow-400 drop-shadow-sm' 
                : 'text-gray-200 dark:text-gray-700'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          {rating}.0
        </span>
      </div>
    );
  };

  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400 rounded-full filter blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12 md:mb-16">
          {/* Badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
            <span className="mr-2">⭐</span>
            Trusted by Industry Leaders
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Industrial Partner Testimonials
          </h2>
          
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Trusted by leading industrial companies worldwide. See what industry professionals 
            say about our cutting-edge products and services.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {companyReviews.map((review, index) => (
            <div
              key={review.id}
              data-id={review.id}
              className={`review-card transform transition-all duration-500 ease-out ${
                animatedCards.includes(String(review.id))
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-gray-100 dark:border-gray-700 h-full flex flex-col">
                {/* Gradient top bar */}
                <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-600 group-hover:from-blue-600 group-hover:to-purple-700 transition-all duration-300"></div>
                
                <div className="p-6 flex-1 flex flex-col">
                  {/* Company Header */}
                  <div className="flex items-start mb-4">
                    <div className="text-4xl mr-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 p-3 rounded-xl shadow-inner">
                      {review.logo}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight mb-1">
                        {review.companyName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {review.industry}
                      </p>
                    </div>
                  </div>

                  {/* Product and Rating */}
                  <div className="mb-4">
                    <div className="inline-block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium mb-2">
                      {review.product}
                    </div>
                    <StarRating rating={review.rating} />
                  </div>

                  {/* Review Text */}
                  <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed flex-1">
                    "{review.review}"
                  </p>

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(review.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    {review.verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Statistics Section - Enhanced */}
        <div className="mt-16 md:mt-20">
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
              {[
                { value: "98%", label: "Customer Satisfaction", icon: "😊" },
                { value: "500+", label: "Industrial Clients", icon: "🏭" },
                { value: "4.8/5", label: "Average Rating", icon: "⭐" },
                { value: "24/7", label: "Expert Support", icon: "🛠️" }
              ].map((stat, idx) => (
                <div key={idx} className="group">
                  <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300">
                    {stat.icon}
                  </div>
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section - Enhanced */}
        <div className="text-center mt-12 md:mt-16">
          
         
        </div>

        {/* Decorative quote marks */}
        <div className="absolute top-1/4 left-0 text-8xl text-gray-200 dark:text-gray-700/20 font-serif select-none pointer-events-none">
          "
        </div>
        <div className="absolute bottom-1/4 right-0 text-8xl text-gray-200 dark:text-gray-700/20 font-serif select-none pointer-events-none transform rotate-180">
          "
        </div>
      </div>
    </section>
  );
};

export default IndustrialBlogSection;