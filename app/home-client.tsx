'use client'

import { useEffect } from 'react'

export default function HomeClient() {
  useEffect(() => {
    console.log('HomeClient component mounted')
  }, [])

  return null
}
