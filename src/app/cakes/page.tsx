import {Suspense} from 'react'
import CakesContent from '@/components/cakes-content'
export default function Cakes(){return <Suspense fallback={<main className="container py-20">Loading cakes…</main>}><CakesContent/></Suspense>}
