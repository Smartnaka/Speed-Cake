import {notFound} from 'next/navigation'
import {getProducts} from '@/lib/products'
import {ProductDetails} from '@/components/product-details'
export async function generateMetadata({params}:{params:{slug:string}}){const product=(await getProducts()).find(p=>p.slug===params.slug);return {title:product?.name||'Cake',description:product?.description||'Explore cakes from Speed Cake.',alternates:{canonical:`/cakes/${params.slug}`},openGraph:{title:product?.name||'Cake',description:product?.description||'Explore cakes from Speed Cake.',images:product?.image?[product.image]:[]}} }
export default async function ProductPage({params}:{params:{slug:string}}){const product=(await getProducts()).find(p=>p.slug===params.slug);if(!product)notFound();return <ProductDetails product={product}/>}
