const assert = require('node:assert/strict');
const {newPlan, newItem, examplePlan, forecast, yearRange, parsePlan} = require('./equipment-forecast.js');

const item = Object.assign(newItem('Ultrasound machine'), {
  events: '1000', capacity: '250', functional: '2', nonfunctional: '1', life: '2', cost: '100',
  schedule: {2028: {retire: '1', repair: '1', arrive: '1'}}
});
const plan = {...newPlan(), startYear: '2027', years: '4', currency: 'ZMW', items: [item]};
assert.deepEqual(yearRange(plan), [2027, 2028, 2029, 2030]);
assert.deepEqual(yearRange({...plan, years: '21'}), []);
assert.deepEqual(yearRange({...plan, years: '1.5'}), []);
const results = forecast(plan);
assert.deepEqual(results.map(row => row.required), [4, 4, 4, 4]);
assert.deepEqual(results.map(row => row.retired), [0, 1, 2, 0]);
assert.deepEqual(results.map(row => row.buy), [2, 0, 1, 0]);
assert.deepEqual(results.map(row => row.cost), [200, 0, 100, 0]);
assert.deepEqual(forecast({...plan, years: '1'}), results.slice(0, 1));

const scenario = changes => forecast({...plan, items: [{...item, ...changes}]});
assert.deepEqual(scenario({growth: '10'}).map(row => row.required), [4, 5, 5, 6]);
assert.deepEqual(scenario({method: 'norm', points: '2', unitsPerPoint: '2', buffer: '10'}).map(row => row.required), [5, 5, 5, 5]);
assert.deepEqual(scenario({functional: ''}).map(row => row.buy), [null, null, null, null]);
assert.deepEqual(scenario({functional: '0', schedule: {}}).map(row => row.buy), [4, 0, 4, 0]);
assert.deepEqual(scenario({schedule: {2028: {repair:'1'}, 2029: {repair:'1'}}}).map(row => row.buy), [2, 0, null, null]);
assert.equal(scenario({schedule: {2028: {retire:'3'}}})[1].buy, null);
assert.equal(forecast({...plan, inventoryDate: '2027-02-01'})[0].buy, null);
assert.equal(forecast({...plan, currency: ''})[0].cost, null);
assert.equal(scenario({functional: '4', cost: ''})[0].cost, 0);
assert.ok(forecast({...plan, items: [item, {...item}]}).every(row => row.buy === null));

const device = Object.assign(newItem('Drape', 'single'), {
  events: '100', usePerEvent: '1', functional: '150', cost: '1',
  schedule: {2028: {retire: '10', arrive: '15'}}
});
assert.deepEqual(forecast({...plan, items: [device]}), []);
device.enabled = true;
const singleUse = forecast({...plan, items: [device]});
assert.deepEqual(singleUse.map(row => row.buy), [0, 45, 100, 100]);
assert.deepEqual(singleUse.map(row => row.closing), [50, 0, 0, 0]);

const save = plan => JSON.stringify({kind:'maternal-equipment-forecast', version:1, plan});
assert.deepEqual(parsePlan(save(plan)), plan);
assert.throws(() => parsePlan(save({...plan, items: [{...item, schedule: {oops: {}}}]})), /annual supply/);
assert.throws(() => parsePlan('{"version":1,"equipment":[]}'), /saved equipment forecast/);
const example = examplePlan();
assert.deepEqual(forecast(example).map(row => row.buy), [2,2,1,0,0,0,0,2,0]);
assert.deepEqual(parsePlan(save(example)), example);
assert.ok(forecast({...example, years:'20'}).every(row => row.buy !== null));
console.log('Equipment forecast calculations, carry-forward, replacements, single-use scope and JSON validated.');
