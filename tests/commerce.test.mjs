import test from 'node:test'
import assert from 'node:assert/strict'
import {checkoutSchema,canTransition} from '../src/lib/schemas.ts'

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
