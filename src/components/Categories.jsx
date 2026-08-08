// Categories.jsx
import React from 'react'
import { Link } from 'react-router-dom'

const Categories = () => {
    const categories = [
        {
            name: 'Load Cells',
            path: 'load-cells',
            num: '01',
            image: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=400&q=80',
        },
        {
            name: 'Controllers',
            path: 'controllers',
            num: '02',
            image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
        },
        {
            name: 'Weighing Scales',
            path: 'weighing-scales',
            num: '03',
            image: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?w=400&q=80',
        },
        {
            name: 'Accessories',
            path: 'accessories',
            num: '04',
            image: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&q=80',
        },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 max-w-7xl mx-auto">
            {categories.map((category) => (
                <Link
                    key={category.name}
                    to={`/categories/${category.path}`}
                    className="group relative overflow-hidden rounded-xl aspect-[3/4] block"
                    style={{
                        backgroundImage: `url(${category.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#041c35cc] via-[#041c3533] to-transparent transition-all duration-300 group-hover:from-[#041c35aa]" />

                    {/* Zoom effect via pseudo-scale trick using inner div */}
                    <div
                        className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
                        style={{
                            backgroundImage: `url(${category.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            zIndex: -1,
                        }}
                    />

                    {/* Arrow icon on hover */}
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/15 border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M2 10L10 2M10 2H4M10 2V8" />
                        </svg>
                    </div>

                    {/* Label */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-[11px] tracking-widest text-blue-200/75 uppercase mb-1">
                            {category.num}
                        </p>
                        <h4 className="text-[15px] font-medium text-[#E6F1FB] leading-snug">
                            {category.name}
                        </h4>
                    </div>
                </Link>
            ))}
        </div>
    )
}

export default Categories