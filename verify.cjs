const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const html=fs.readFileSync('maternal-needs-forecast.html','utf8');
const elements=new Map();
function el(id){if(!elements.has(id))elements.set(id,{id,value:'',min:'',max:'',type:'text',textContent:'',classList:{toggle(){},remove(){}},style:{},setAttribute(){},click(){}});return elements.get(id)}
function parse(markup){for(const m of markup.matchAll(/<(input|select|textarea|button|div|i|td|section)[^>]*\bid="([^"]+)"[^>]*>/g)){const node=el(m[2]);for(const k of ['value','min','max','type']){const v=m[0].match(new RegExp('\\b'+k+'="([^"]*)"'));if(v)node[k]=v[1]}}}
parse(html);
for(const node of elements.values())Object.defineProperty(node,'innerHTML',{set(v){this._html=v;parse(v)},get(){return this._html||''},configurable:true});
// New dynamically generated elements use the same lightweight DOM property.
const origEl=el;
const document={getElementById(id){const n=origEl(id);if(!Object.getOwnPropertyDescriptor(n,'innerHTML'))Object.defineProperty(n,'innerHTML',{set(v){this._html=v;parse(v)},get(){return this._html||''}});return n},querySelectorAll(){return []},createElement(){return {click(){}}}};
const ctx=vm.createContext({document,console,Blob,URL,setTimeout, navigator:{clipboard:{writeText:async()=>{}}}});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const run=s=>vm.runInContext(s,ctx);
assert.equal(run('EQ.length'),13);
assert.equal(run('eqResults[0].required'),6);
assert.equal(run('eqResults[0].gap'),null);
run("Object.assign(EQ[0],{functional:4,nonfunctional:2,due:1,repairs:1,incoming:0,cost:100,lead:4,life:10});equipmentCalc()");
assert.equal(run('eqResults[0].gap'),2);
assert.equal(run('eqResults[0].cost'),200);
assert.match(run('eqResults[0].review'),/Lead time exceeds horizon/);
run('EQ[0].due=5;equipmentCalc()');assert.equal(run('eqResults[0].gap'),null);
run('EQ[0].due=1;EQ[0].repairs=3;equipmentCalc()');assert.equal(run('eqResults[0].gap'),null);
run('EQ[0].repairs=1;EQ[0].functional=0.5;equipmentCalc()');assert.equal(run('eqResults[0].gap'),null);
run("EQ[0].functional=4;EQ[0].cost='';equipmentCalc()");assert.equal(run('eqResults[0].cost'),null);
run("EQ[0].incoming=10;equipmentCalc()");assert.equal(run('eqResults[0].gap'),0);assert.equal(run('eqResults[0].cost'),0);
run("$('equse').value=0;equipmentCalc()");assert.equal(run('eqResults[0].required'),null);
run("$('equse').value=80;$('months').value=0;equipmentCalc()");assert.equal(run('eqResults[0].required'),null);
run("$('months').value=3;$('births').value=240;equipmentCalc()");assert.equal(run('eqResults[0].required'),12);
assert.equal(run("rows({vag:1},{},1,0.5).find(c=>c.n==='Staff time and beds').items.find(x=>x.it.n==='Midwife time').tot"),8);
assert.equal(run("rows({vag:1},{},1,0.5)[0].items.find(x=>x.it.n==='Oxytocin 10 IU').tot"),1.5);
assert.equal(run("csvCell('=1+1')"),'"\'=1+1"');
run("let downloaded;download=(name,data,type)=>{downloaded={name,data,type}};$('saveplan').onclick()");
const saved=run('downloaded.data');
run("$('births').value=1;EQ[0].functional=0");
(async()=>{
 el('loadplan').files=[{size:saved.length,text:async()=>saved}];
 await run("$('loadplan').onchange({target:$('loadplan')})");
 assert.equal(el('births').value,240);assert.equal(run('EQ[0].functional'),4);
 el('loadplan').files=[{size:4,text:async()=>'{bad'}];
 await run("$('loadplan').onchange({target:$('loadplan')})");
 assert.match(el('eqmsg').textContent,/Could not load/);assert.equal(el('births').value,240);
 run("$('eqexport').onclick()");assert.match(run('downloaded.data'),/Delivery bed/);
 console.log('Passed: script initialization, capacity, gaps, replacement and repair validation, missing costs, invalid inputs, activity linkage, staff buffer, CSV escaping, save/load and malformed file handling.');
})().catch(e=>{console.error(e);process.exitCode=1});
