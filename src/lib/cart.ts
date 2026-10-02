'use client'
export type CartChoice={value:string;label:string;fee_kobo:number}
export type CartItem={key:string;productId:string;variantId:string;slug:string;name:string;image:string;size:string;unitPrice:number;quantity:number;message:string;choices?:Record<string,CartChoice[]>}
const KEY='speedcake-cart-v1'
export function readCart():CartItem[]{if(typeof window==='undefined')return[];try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
export function writeCart(items:CartItem[]){localStorage.setItem(KEY,JSON.stringify(items));window.dispatchEvent(new Event('speedcake-cart'))}
export function addCartItem(item:CartItem,options?:{replace?:boolean}){
  const cart=readCart();
  const oldIndex=cart.findIndex(x=>x.key===item.key);
  if(oldIndex>=0){
    if(options?.replace){
      cart[oldIndex]={...item};
    }else{
      cart[oldIndex].quantity=Math.min(30,cart[oldIndex].quantity+item.quantity);
    }
  }else{
    cart.push(item);
  }
  writeCart(cart);
}
export function isCartItemValid(item:unknown):item is CartItem{
  if(!item||typeof item!=='object')return false;
  const candidate=item as Partial<CartItem>;
  return (
    typeof candidate.productId==='string'&&
    candidate.productId.trim().length>0&&
    typeof candidate.variantId==='string'&&
    candidate.variantId.trim().length>0&&
    typeof candidate.quantity==='number'&&
    Number.isInteger(candidate.quantity)&&
    candidate.quantity>=1&&
    candidate.quantity<=30&&
    typeof candidate.unitPrice==='number'&&
    candidate.unitPrice>=0
  );
}
export function clearCart(){
  if(typeof window==='undefined')return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('speedcake-cart'));
}

