import test from 'node:test';
import assert from 'node:assert/strict';
import {createTogetherClient} from '../adapter.js';
test('fails closed without configuration and refuses unrelated project',async()=>{
 for(const options of [{},{enabled:true,url:'https://nxfsuntmtmdawacxssas.supabase.co',publishableKey:'sb_publishable_test'},{enabled:true,url:'https://project.supabase.co',publishableKey:'service_role'}]){
  let calls=0; const client=createTogetherClient({...options,fetchImpl:()=>{calls++;}});
  await assert.rejects(client.listBooks(),/not configured/);assert.equal(calls,0);
 }
});
test('uses custom schema, auth session, expires fail-closed, and clears logout',async()=>{
 const calls=[];const client=createTogetherClient({enabled:true,url:'https://test.supabase.co',publishableKey:'sb_publishable_test',fetchImpl:async(path,options)=>{
  calls.push({path,...options});return {ok:true,status:200,json:async()=>path.includes('/token')?{access_token:'session',expires_in:3600,user:{id:'u'}}:[]};
 }});
 await assert.rejects(client.joinCircle('00000000-0000-0000-0000-000000000001'),/sign in/);
 await client.listBooks();assert.equal(calls.at(-1).headers['Accept-Profile'],'together');assert.equal(calls.at(-1).headers.Authorization,undefined);
 await client.signIn('reader@example.test','test-password');
 await client.saveProfile('Reader');assert.equal(calls.at(-1).headers.Authorization,'Bearer session');
 assert.deepEqual(JSON.parse(calls.at(-1).body),{action:'save_profile',payload:{pseudonym:'Reader'}});
 await client.signOut();await assert.rejects(client.saveProfile('Reader'),/sign in/);
});
test('never passes arbitrary query syntax as identifiers',()=>{
 const client=createTogetherClient();assert.throws(()=>client.listPosts('x&select=*'),/identifier/);
});
