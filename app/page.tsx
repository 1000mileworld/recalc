import { Page as CalculatorPage } from "@/components/app-calculator-page"
import HomeClient from './home-client'

export default function HomePage() {
  console.log('HomePage component rendered')

  return (
    <>
      <HomeClient />
      <CalculatorPage />
    </>
  )
}
