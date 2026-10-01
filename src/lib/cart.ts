'use client'
export type CartChoice={value:string;label:string;fee_kobo:number}
export type CartItem={key:string;productId:string;variantId:string;slug:string;name:string;image:string;size:string;unitPrice:number;quantity:number;message:string;choices?:Record<string,CartChoice[]>}
const KEY='speedcake-cart-v1'
export function readCart():CartItem[]{if(typeof window==='undefined')return[];try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
export function writeCart(items:CartItem[]){localStorage.setItem(KEY,JSON.stringify(items));window.dispatchEvent(new Event('speedcake-cart'))}
export function addCartItem(item:CartItem){const cart=readCart(),old=cart.find(x=>x.key===item.key);if(old)old.quantity+=item.quantity;else cart.push(item);writeCart(cart)}
