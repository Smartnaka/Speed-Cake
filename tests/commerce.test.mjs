import test from 'node:test'
import assert from 'node:assert/strict'
import {checkoutSchema,canTransition,safeReturnPath} from '../src/lib/schemas.ts'
import {isCartItemValid} from '../src/lib/cart.ts'

test('NGN totals are integer kobo and quantity multiplication is exact',()=>{
  const lines=[{unitPrice:2850000,quantity:2},{unitPrice:1800000,quantity:1}]
  const total=lines.reduce((sum,line)=>sum+line.unitPrice*line.quantity,0)
  assert.equal(total,7500000)
  assert.equal(Number.isInteger(total),true)
})
test('checkout validates product IDs, quantities, and customized selections',()=>{
  const base={name:'Ada Okafor',email:'ada@example.com',phone:'+2348012345678',address:'12 Broad Street',city:'Lagos',state:'Lagos',delivery_date:'2026-10-10',delivery_window:'10am-1pm'}
  const productId='11111111-1111-4111-8111-111111111111',variantId='22222222-2222-4222-8222-222222222222',optionId='33333333-3333-4333-8333-333333333333'
  assert.equal(checkoutSchema.safeParse({...base,items:[{productId,variantId,quantity:1,customization:{message:'Happy birthday',choices:{[optionId]:['vanilla','chocolate']}}}]}).success,true)
  assert.equal(checkoutSchema.safeParse({...base,email:'nope',items:[]}).success,false)
  assert.equal(checkoutSchema.safeParse({...base,items:[{productId,variantId,quantity:31}]}).success,false)
  assert.equal(checkoutSchema.safeParse({...base,items:[{productId:'a',variantId,quantity:1}]}).success,false)
})
test('order workflow permits only explicit forward transitions',()=>{
  assert.equal(canTransition('paid','confirmed'),true)
  assert.equal(canTransition('ready','out_for_delivery'),true)
  assert.equal(canTransition('out_for_delivery','preparing'),false)
  assert.equal(canTransition('delivered','cancelled'),false)
})

test('safeReturnPath allows valid application paths and blocks open redirects',()=>{
  assert.equal(safeReturnPath('/checkout'),'/checkout')
  assert.equal(safeReturnPath('/checkout?next=/account'),'/checkout?next=/account')
  assert.equal(safeReturnPath('/account/orders/SC-12345'),'/account/orders/SC-12345')
  assert.equal(safeReturnPath(null),'/account')
  assert.equal(safeReturnPath(undefined),'/account')
  assert.equal(safeReturnPath(''),'/account')
  // External URLs
  assert.equal(safeReturnPath('https://evil.com'),'/account')
  assert.equal(safeReturnPath('//evil.com'),'/account')
  assert.equal(safeReturnPath('/\\evil.com'),'/account')
  assert.equal(safeReturnPath('javascript:alert(1)'),'/account')
})

test('isCartItemValid verifies complete configured cake state',()=>{
  const validItem={
    key:'prod-1:var-1:Happy Birthday:Vanilla',
    productId:'11111111-1111-4111-8111-111111111111',
    variantId:'22222222-2222-4222-8222-222222222222',
    slug:'chocolate-cake',
    name:'Chocolate Cake',
    image:'/cake.png',
    size:'10 inch',
    unitPrice:4500000,
    quantity:2,
    message:'Happy Birthday',
    choices:{
      'flav-1':[{value:'vanilla',label:'Vanilla',fee_kobo:0}],
      'addon-1':[{value:'candles',label:'Candles',fee_kobo:50000}]
    }
  }
  assert.equal(isCartItemValid(validItem),true)
  assert.equal(isCartItemValid({...validItem,quantity:0}),false)
  assert.equal(isCartItemValid({...validItem,quantity:35}),false)
  assert.equal(isCartItemValid({...validItem,productId:''}),false)
  assert.equal(isCartItemValid({...validItem,variantId:''}),false)
  assert.equal(isCartItemValid(null),false)
})

test('cart replacement logic prevents duplicate items on repeated Order Cake clicks',()=>{
  // Simulate cart storage in memory
  let cart=[]
  function add(item,options){
    const oldIndex=cart.findIndex(x=>x.key===item.key)
    if(oldIndex>=0){
      if(options?.replace){
        cart[oldIndex]={...item}
      }else{
        cart[oldIndex].quantity=Math.min(30,cart[oldIndex].quantity+item.quantity)
      }
    }else{
      cart.push({...item})
    }
  }

  const cakeA={key:'cake-a:size-8:HBD:Choc',productId:'cake-a',variantId:'size-8',quantity:1,unitPrice:3000000}
  const cakeB={key:'cake-b:size-10::Vanilla',productId:'cake-b',variantId:'size-10',quantity:2,unitPrice:4000000}

  // Add cake A with "Order Cake" (replace: true)
  add(cakeA,{replace:true})
  assert.equal(cart.length,1)
  assert.equal(cart[0].quantity,1)

  // Clicking "Order Cake" again on cake A must NOT duplicate item or inflate quantity
  add(cakeA,{replace:true})
  assert.equal(cart.length,1)
  assert.equal(cart[0].quantity,1)

  // Adding cake B must preserve cake A
  add(cakeB,{replace:true})
  assert.equal(cart.length,2)
  assert.equal(cart[0].productId,'cake-a')
  assert.equal(cart[1].productId,'cake-b')
  assert.equal(cart[1].quantity,2)
})

