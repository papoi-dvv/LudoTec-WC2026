"use client"

import React from 'react'

export default function Error({ error }: { error: Error }) {
  console.error(error)
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="max-w-xl w-full p-8 bg-white rounded shadow">
        <h1 className="text-2xl font-bold text-red-700">Se produjo un error</h1>
        <p className="mt-2 text-gray-600">Lo sentimos — algo falló en el servidor.</p>
      </div>
    </div>
  )
}
