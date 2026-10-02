import type {Product} from '@/lib/demo-products'
import {getPublicProducts} from '@/lib/catalogue-db'

export async function getProducts(): Promise<Product[]> {
  return getPublicProducts()
}
