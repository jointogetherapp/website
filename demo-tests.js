'use strict';
const assert=require('node:assert/strict');
const {initialState,reduce,status,CAPACITY,MINIMUM}=require('./demo.js');
let checks=0;
function test(name,fn){fn();checks++;console.log('✓ '+name);}
function apply(s,type,id){return reduce(s,{type,id});}
function invariant(s){
 assert(s.confirmed.length<=CAPACITY);
 const all=[...s.confirmed,...s.queue,...(s.offer?[s.offer]:[])];
 assert.equal(new Set(all).size,all.length);
 if(s.offer)assert(s.confirmed.length<CAPACITY);
 if(s.phase==='cancelled'){assert.equal(s.offer,null);assert.equal(s.queue.length,0);}
}
test('Starts with five confirmed, Jordan offered, Taylor queued',()=>{const s=initialState();assert.equal(s.confirmed.length,5);assert.equal(s.offer,'jordan');assert.deepEqual(s.queue,['taylor']);invariant(s);});
test('Accepting once fills the table; repeated acceptance does nothing',()=>{let s=apply(initialState(),'accept','jordan');assert.equal(s.confirmed.length,6);assert.equal(s.offer,null);s=apply(s,'accept','jordan');assert.equal(s.confirmed.length,6);invariant(s);});
test('Decline and expiry move FIFO queue without a phantom RSVP',()=>{for(const action of ['decline','expire']){let s=apply(initialState(),action,'jordan');assert.equal(s.offer,'taylor');assert.equal(s.confirmed.length,5);assert.deepEqual(s.queue,[]);s=apply(s,'accept','taylor');assert.equal(s.confirmed.length,6);invariant(s);}});
test('Cancelling a full-table player opens offer to next member',()=>{let s=apply(initialState(),'accept','jordan');s=apply(s,'cancel','you');assert.equal(s.offer,'taylor');assert.equal(s.confirmed.length,5);invariant(s);});
test('Pending offer does not count toward decision minimum',()=>{let s=apply(initialState(),'cancel','sam');s=apply(s,'cancel','alex');assert.equal(s.confirmed.length,3);assert.equal(s.offer,'jordan');s=apply(s,'deadline');assert.equal(s.phase,'cancelled');assert.equal(s.confirmed.length,3);const before=JSON.stringify(s);s=apply(s,'accept','jordan');assert.equal(JSON.stringify(s),before);invariant(s);});
test('Exactly four confirmed pass the deadline',()=>{let s=apply(initialState(),'cancel','sam');assert.equal(s.confirmed.length,MINIMUM);s=apply(s,'deadline');assert.equal(s.phase,'going');assert.equal(status(s).className,'is-ready');assert.equal(s.offer,'jordan');});
test('Late drop below minimum is flagged; acceptance restores readiness',()=>{let s=apply(initialState(),'deadline');s=apply(s,'cancel','sam');s=apply(s,'cancel','alex');assert.equal(status(s).className,'is-risk');s=apply(s,'accept','jordan');assert.equal(status(s).className,'is-ready');invariant(s);});
test('Rejoining respects current offer and FIFO instead of stealing seat',()=>{let s=apply(initialState(),'cancel','you');s=apply(s,'rsvp','you');assert.deepEqual(s.queue,['taylor','you']);assert.equal(s.offer,'jordan');s=apply(s,'leave','you');assert.deepEqual(s.queue,['taylor']);invariant(s);});
test('Uncontested open seat permits direct RSVP',()=>{let s=apply(initialState(),'decline','jordan');s=apply(s,'decline','taylor');s=apply(s,'cancel','you');s=apply(s,'rsvp','you');assert(s.confirmed.includes('you'));assert.equal(s.offer,null);});
test('Reducer never mutates its source; reset restores defaults',()=>{const s=initialState(),before=JSON.stringify(s);apply(s,'accept','jordan');assert.equal(JSON.stringify(s),before);let changed=apply(s,'cancel','you');changed=apply(changed,'view','jordan');assert.deepEqual(apply(changed,'reset'),initialState());});
test('Invalid or repeated actions cannot duplicate people or overflow',()=>{
 let seed=7;const random=n=>{seed=(seed*1664525+1013904223)>>>0;return Math.floor(seed / 4294967296 * n);};
 let s=initialState();const actions=['accept','decline','expire','rsvp','cancel','leave','deadline','reset','view'];const people=['you','sam','alex','priya','morgan','jordan','taylor','unknown'];
 for(let i=0;i<10000;i++){s=apply(s,actions[random(actions.length)],people[random(people.length)]);invariant(s);}
});
console.log(`${checks} tests passed.`);
