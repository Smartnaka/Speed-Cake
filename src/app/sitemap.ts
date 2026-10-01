import type {MetadataRoute} from 'next'
import {getProducts} from '@/lib/products'

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000').replace(/\/$/,'')
  const products=await getProducts()
  return [
    {url:base,lastModified:new Date(),changeFrequency:'daily',priority:1},
    {url:`${base}/cakes`,lastModified:new Date(),changeFrequency:'daily',priority:0.9},
    ...products.map(product=>({url:`${base}/cakes/${product.slug}`,lastModified:new Date(),changeFrequency:'weekly' as const,priority:0.8})),
  ]
}
