'use client'

import React from 'react'

export default function SectionSkeleton() {
    return (
        <div className="py-16 md:py-24 border-b border-gray-100 animate-pulse">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <div className="flex flex-col items-center mb-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full mb-6" />
                    <div className="h-10 w-64 bg-gray-100 rounded-lg mb-4" />
                    <div className="h-4 w-96 bg-gray-100 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-48 bg-gray-100 rounded-2xl" />
                    ))}
                </div>
            </div>
        </div>
    )
}
