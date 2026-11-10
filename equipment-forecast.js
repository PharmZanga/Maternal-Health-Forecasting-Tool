'use strict';

const MAX_YEARS = 20;
const MAX_ITEMS = 100;
const PLAN_FIELDS = ['country', 'district', 'facility', 'level', 'inventoryDate', 'startYear', 'years', 'currency'];
const ADJUSTMENTS = [
  ['retire', 'Scheduled retirements or expiries'],
  ['repair', 'Confirmed repairs'],
  ['arrive', 'Confirmed funded arrivals']
];
const STARTER_ITEMS = [
  ['Non-pneumatic anti-shock garment', 'reusable'],
  ['Ultrasound machine', 'reusable'],
  ['Blood pressure monitor', 'reusable'],
  ['Fetal Doppler', 'reusable'],
  ['CTG machine', 'reusable'],
  ['Calibrated blood collection drape', 'single'],
  ['Uterine balloon tamponade', 'single']
];

const blank = value => value === '' || value === undefined;
function number(value, {min = 0, max = Number.MAX_SAFE_INTEGER, whole = false} = {}) {
  if (blank(value) || !['string', 'number'].includes(typeof value) || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max && (!whole || Number.isSafeInteger(n)) ? n : null;
}
const count = value => number(value, {whole: true});

function yearRange(plan) {
  const start = number(plan.startYear, {min: 1900, max: 9980, whole: true});
  const length = number(plan.years, {min: 1, max: MAX_YEARS, whole: true});
  return start === null || length === null ? [] : Array.from({length}, (_, index) => start + index);
}

function newItem(name = '', type = 'reusable') {
  return {
    name, type, enabled: type === 'reusable', variant: '', service: '', method: 'workload',
    events: '', growth: '0', eligible: '100', coverage: '100', capacity: '', usable: '100',
    usePerEvent: '', points: '', unitsPerPoint: '', minimum: '0', buffer: '0',
    functional: '', nonfunctional: '', life: '', cost: '', evidence: '', readiness: '', schedule: {}
  };
}

function newPlan() {
  return {
    country: '', district: '', facility: '', level: '', inventoryDate: '', currency: '',
    startYear: String(new Date().getFullYear() + 1), years: '3',
    items: STARTER_ITEMS.map(([name, type]) => newItem(name, type))
  };
}

function starterItem(name = '', type = 'reusable') {
  return {...newItem(name, type), method: 'target', minimum: ''};
}

function examplePlan() {
  const plan = {...newPlan(), example: true, facility: 'Example Maternity Centre', currency: 'ZMW'};
  const nextYear = Number(plan.startYear) + 1;
  plan.items = [
    {...starterItem('Blood pressure monitor'), minimum: '6', functional: '4', nonfunctional: '1', life: '4', cost: '900',
      schedule: {[nextYear]: {retire: '1', repair: '1'}}},
    {...newItem('Ultrasound machine'), events: '1000', growth: '10', capacity: '250', functional: '2', nonfunctional: '0',
      life: '2', cost: '50000', schedule: {[nextYear]: {arrive: '1'}}},
    {...starterItem('Fetal Doppler'), minimum: '4', functional: '3', nonfunctional: '0', life: '5', cost: '1500'}
  ];
  return plan;
}

function demand(item, index) {
  const minimum = count(item.minimum);
  if (item.method === 'target') return minimum;
  const buffer = number(item.buffer, {max: 100});
  if (minimum === null || buffer === null) return null;
  let base;
  if (item.method === 'norm') {
    const points = count(item.points);
    const perPoint = number(item.unitsPerPoint);
    if (points === null || perPoint === null) return null;
    base = points * perPoint;
  } else {
    const events = count(item.events);
    const growth = number(item.growth, {min: -100, max: 1000});
    const eligible = number(item.eligible, {max: 100});
    const coverage = number(item.coverage, {max: 100});
    if ([events, growth, eligible, coverage].includes(null)) return null;
    const workload = events * (1 + growth / 100) ** index * (eligible / 100) * (coverage / 100);
    if (item.type === 'single') {
      const units = number(item.usePerEvent, {min: Number.MIN_VALUE});
      if (units === null) return null;
      base = workload * units;
    } else {
      const capacity = number(item.capacity, {min: Number.MIN_VALUE});
      const usable = number(item.usable, {min: Number.MIN_VALUE, max: 100});
      if (capacity === null || usable === null) return null;
      base = workload / (capacity * usable / 100);
    }
  }
  const required = Math.max(minimum, Math.ceil(Number((base * (1 + buffer / 100)).toPrecision(15))));
  return Number.isSafeInteger(required) ? required : null;
}

function forecastItem(item, years, plan, duplicate) {
  const reusable = item.type === 'reusable';
  const life = number(item.life, {min: 1, whole: true});
  const unitCost = number(item.cost);
  const currency = plan.currency.trim().toUpperCase();
  let existing = count(item.functional);
  let repairable = reusable ? count(item.nonfunctional) : 0;
  let purchased = 0;
  const orders = new Map();
  let blocked = '';
  if (!item.name.trim()) blocked = 'Enter an equipment or device name.';
  else if (duplicate) blocked = 'Use distinct names or variants for duplicate items.';
  else if (existing === null || repairable === null) blocked = 'Complete opening inventory. Use 0 if verified none.';
  else if (plan.inventoryDate && plan.inventoryDate > `${years[0]}-01-01`) blocked = 'Inventory date is after the first forecast year starts.';
  else if (reusable && years.length > 1 && life === null) blocked = 'Enter useful life for projected purchases.';

  return years.map((year, index) => {
    const required = demand(item, index);
    const row = {year, item, required, opening: null, retired: null, repair: null, arrive: null,
      available: null, buy: null, cost: null, closing: null, review: ''};
    if (blocked || required === null) {
      row.review = blocked || 'Complete valid requirement assumptions.';
      blocked ||= 'An earlier year has an unknown closing balance.';
      return row;
    }
    const changes = item.schedule[year] || {};
    const [retire, repair, arrive] = ADJUSTMENTS.map(([key]) => (
      blank(changes[key]) || (!reusable && key === 'repair') ? 0 : count(changes[key])
    ));
    if ([retire, repair, arrive].includes(null)) row.review = 'Annual adjustments must be whole, nonnegative units.';
    else if (retire > existing) row.review = 'Scheduled retirements or expiries exceed eligible opening stock.';
    else if (repair > repairable) row.review = 'Repairs exceed remaining nonfunctional units.';
    const modeledRetirement = reusable && life !== null ? (orders.get(year - life) || 0) : 0;
    const opening = existing + purchased;
    const retired = retire + modeledRetirement;
    const available = opening - retired + repair + arrive;
    if (!row.review && ![opening, retired, available].every(Number.isSafeInteger)) row.review = 'Supply total exceeds the supported range.';
    if (row.review) {
      blocked = 'An earlier year has an unknown closing balance.';
      return row;
    }

    const buy = Math.max(0, required - available);
    const extendedCost = buy * unitCost;
    const cost = buy === 0 ? 0 : unitCost !== null && /^[A-Z]{3}$/.test(currency) && Number.isFinite(extendedCost) ? extendedCost : null;
    const closing = reusable ? available + buy : available + buy - required;
    if (reusable) {
      existing += repair + arrive - retire;
      repairable -= repair;
      purchased += buy - modeledRetirement;
      orders.set(year, buy);
    } else {
      existing = closing;
    }
    const review = buy && cost === null ? 'Enter unit cost and currency.' : '';
    return {...row, opening, retired, repair, arrive, available, buy, cost, closing, review};
  });
}

function forecast(plan) {
  const years = yearRange(plan);
  if (!years.length) return [];
  const active = plan.items.filter(item => item.enabled);
  const key = item => JSON.stringify([item.name.trim().toLowerCase(), item.variant.trim().toLowerCase()]);
  const keys = active.map(key);
  return active.flatMap((item, index) => forecastItem(item, years, plan, keys.indexOf(keys[index]) !== keys.lastIndexOf(keys[index])))
    .sort((left, right) => left.year - right.year);
}

function parsePlan(raw) {
  const data = JSON.parse(raw);
  const source = data?.plan;
  if (data?.kind !== 'maternal-equipment-forecast' || data.version !== 1 || !Array.isArray(source?.items) || source.items.length > MAX_ITEMS) {
    throw new Error('Select a saved equipment forecast JSON file.');
  }
  function field(value) {
    if (typeof value !== 'string' || value.length > 2000) throw new Error('Invalid plan field.');
    return value;
  }
  const plan = Object.fromEntries(PLAN_FIELDS.map(key => [key, field(source[key])]));
  if (source.example === true) plan.example = true;
  if (plan.inventoryDate && !/^\d{4}-\d{2}-\d{2}$/.test(plan.inventoryDate)) throw new Error('Invalid inventory date.');
  plan.items = source.items.map(item => {
    if (!['single', 'reusable'].includes(item?.type) || !['target', 'workload', 'norm'].includes(item.method) || typeof item.enabled !== 'boolean' ||
        !item.schedule || typeof item.schedule !== 'object' || Array.isArray(item.schedule)) throw new Error('Invalid equipment record.');
    const values = newItem();
    Object.keys(values).filter(key => !['enabled', 'schedule'].includes(key)).forEach(key => { values[key] = field(item[key]); });
    values.enabled = item.enabled;
    for (const [year, changes] of Object.entries(item.schedule)) {
      if (!/^\d{4}$/.test(year) || !changes || typeof changes !== 'object' || Array.isArray(changes)) throw new Error('Invalid annual supply schedule.');
      values.schedule[year] = Object.fromEntries(ADJUSTMENTS.filter(([key]) => changes[key] !== undefined).map(([key]) => [key, field(changes[key])]));
    }
    return values;
  });
  return plan;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {newPlan, newItem, examplePlan, demand, forecast, yearRange, parsePlan};
} else {
  init();
}

function init() {
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
  const format = value => value === null ? 'Unknown' : value.toLocaleString(undefined, {maximumFractionDigits: 2});
  const name = item => [item.name.trim() || 'Unnamed item', item.variant.trim()].filter(Boolean).join(' · ');
  let plan = examplePlan();
  let selected = 0;
  let dirty = false;
  const steps = ['setup', 'assessment', 'results'];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const methodNames = {target:'Fixed number of units', workload:'Annual service workload', norm:'Units per service point'};

  function showStep(step, focus = true) {
    for (const id of steps) $(id).hidden = id !== step;
    for (const button of $('workflow').querySelectorAll('[data-step]')) {
      if (button.dataset.step === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    if (focus) $(step).querySelector('h2').focus();
  }

  function updateBanner() {
    $('plan-banner').dataset.example = String(!!plan.example);
    $('plan-label').textContent = plan.example ? 'Example plan · dummy data' : plan.facility.trim() || 'New facility plan';
    $('plan-help').textContent = plan.example
      ? 'The facility, stock and costs are fictional. Try changing the number of years below.'
      : 'Set the forecast years, enter equipment, then review what to buy.';
    $('blank').textContent = plan.example ? 'Start a real plan' : 'Start another plan';
    $('demo').textContent = plan.example ? 'Reset example' : 'Load example';
  }

  function replacePlan(next, step) {
    plan = next;
    selected = 0;
    dirty = false;
    $('filter').value = '';
    $('catalog').value = '';
    $('supply').open = false;
    $('message').textContent = 'Save your plan before closing or refreshing. Enter facility totals only.';
    renderPlan();
    showStep(step);
  }

  function mayReplace() {
    return !dirty || plan.example || window.confirm('Replace this plan and discard unsaved changes?');
  }

  function input(item, key, label, attributes = 'maxlength="160"') {
    return `<label>${label}<input data-field="${key}" value="${escape(item[key])}" ${attributes}></label>`;
  }
  function numeric(item, key, label, limits = 'min="0" step="1"') {
    return input(item, key, label, `type="number" ${limits}`);
  }
  function textArea(item, key, label) {
    return `<label>${label}<textarea data-field="${key}" rows="2" maxlength="1000">${escape(item[key])}</textarea></label>`;
  }

  function listItems() {
    $('item').innerHTML = plan.items.map((item, index) => `<option value="${index}">${escape(name(item))}${item.enabled ? '' : ' (excluded)'}</option>`).join('');
    $('item').value = String(selected);
    $('item').disabled = !plan.items.length;
    $('remove').disabled = !plan.items.length;
    $('add').disabled = plan.items.length >= MAX_ITEMS;
  }

  function renderEditor() {
    const item = plan.items[selected];
    if (!item) {
      $('editor').innerHTML = '<p class="notice note">Add an equipment or device record to begin.</p>';
      renderSchedule();
      return;
    }
    const reusable = item.type === 'reusable';
    const norm = item.method === 'norm';
    const target = item.method === 'target';
    const percent = 'min="0" max="100" step="any"';
    const methods = Object.entries(methodNames).map(([value, label]) =>
      `<option value="${value}" ${item.method === value ? 'selected' : ''}>${label}</option>`).join('');
    const detailsOpen = $('editor').querySelector('details')?.open;
    $('editor').innerHTML = `
      <div class="grid">
        ${input(item, 'name', 'Equipment name')}
        <label>How to estimate need<select data-field="method">${methods}</select></label>
      </div>
      <div class="grid">
        ${target ? '' : norm ? numeric(item, 'points', 'Planned service points') +
          numeric(item, 'unitsPerPoint', reusable ? 'Units per service point' : 'Annual units per service point', 'min="0" step="any"') :
          numeric(item, 'events', 'First-year service events') +
          numeric(item, 'growth', 'Annual activity growth (%)', 'min="-100" max="1000" step="any"') +
          numeric(item, 'eligible', 'Events eligible (%)', percent) +
          numeric(item, 'coverage', 'Target coverage (%)', percent) +
          (reusable ? numeric(item, 'capacity', 'Annual events per unit at full capacity', 'min="0" step="any"') +
            numeric(item, 'usable', 'Usable capacity (%)', percent) :
            numeric(item, 'usePerEvent', 'Device units per eligible event', 'min="0" step="any"'))}
        ${numeric(item, 'minimum', target ? (reusable ? 'Units needed' : 'Units needed each year') : 'Minimum units')}
        ${target ? '' : numeric(item, 'buffer', 'Demand buffer (%)', percent)}
      </div>
      <h3>Stock at the start of the forecast</h3>
      <p class="note">Enter 0 if there are none. Leave unknown counts blank.${reusable ? ' Enter how long a new unit lasts to forecast replacements.' : ''}</p>
      <div class="grid">
        ${numeric(item, 'functional', reusable ? 'Working units' : 'Usable units')}
        ${reusable ? numeric(item, 'nonfunctional', 'Out-of-service units') +
          numeric(item, 'life', 'Years a new unit lasts', 'min="1" step="1"') : ''}
        ${numeric(item, 'cost', 'Cost per unit (optional)', 'min="0" step="any"')}
      </div>
      ${!item.enabled || !reusable ? `<label class="notice"><input data-field="enabled" type="checkbox" ${item.enabled ? 'checked' : ''}> Include this device in the forecast</label>` : ''}
      <details ${detailsOpen ? 'open' : ''}>
        <summary>Optional item details</summary>
        <p class="note">Include a single-use device only if another platform does not already forecast it.</p>
        <div class="grid">
          <label>Classification<select data-field="type"><option value="reusable">Reusable equipment</option><option value="single" ${reusable ? '' : 'selected'}>Single-use device</option></select></label>
          ${reusable && item.enabled ? '<label><input data-field="enabled" type="checkbox" checked> Include this item in the forecast</label>' : ''}
          ${input(item, 'variant', 'Variant or specification')}
          ${input(item, 'service', 'Maternal health service or activity')}
          ${textArea(item, 'evidence', 'Data source and validation owner')}
          ${textArea(item, 'readiness', 'Installation, maintenance or training needs')}
        </div>
      </details>`;
    renderSchedule();
  }

  function renderSchedule() {
    const item = plan.items[selected];
    const years = yearRange(plan);
    if (!item || !years.length) {
      $('schedule').innerHTML = '<p class="note">Set a valid start year and forecast length and select an item.</p>';
      return;
    }
    const columns = ADJUSTMENTS.filter(([key]) => item.type === 'reusable' || key !== 'repair');
    $('schedule').innerHTML = `<table><thead><tr><th scope="col">Year</th>${columns.map(([, label]) =>
      `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${years.map(year =>
      `<tr><th scope="row">${year}</th>${columns.map(([key, label]) =>
        `<td><input aria-label="${label} ${year}" type="number" min="0" step="1" placeholder="0" data-year="${year}" data-adjustment="${key}" value="${escape(item.schedule[year]?.[key])}"></td>`
      ).join('')}</tr>`).join('')}</tbody></table>`;
  }

  function renderForecast() {
    const years = yearRange(plan);
    const filter = $('filter').value;
    $('filter').innerHTML = '<option value="">All years</option>' + years.map(year => `<option>${year}</option>`).join('');
    $('filter').value = years.includes(+filter) ? filter : '';
    const allRows = forecast(plan);
    const rows = allRows.filter(row => !$('filter').value || row.year === +$('filter').value);
    const empty = years.length ? 'Add or include an equipment item to see a forecast.' : 'Enter a valid first year and a horizon of 1 to 20 years.';
    const currency = escape(plan.currency.trim().toUpperCase());
    $('overview').innerHTML = allRows.length ? years.map(year => {
      const entries = allRows.filter(row => row.year === year);
      const known = entries.filter(row => row.buy !== null);
      const units = known.reduce((sum, row) => sum + row.buy, 0);
      const costed = known.filter(row => row.buy > 0 && row.cost !== null);
      const subtotal = costed.reduce((sum, row) => sum + row.cost, 0);
      const unknown = entries.length - known.length;
      const uncosted = known.filter(row => row.buy > 0 && row.cost === null).length;
      const review = [unknown ? `${unknown} item(s) need inputs` : '', uncosted ? `${uncosted} item(s) need a cost` : ''].filter(Boolean);
      return `<tr><th scope="row">${year}</th><td>${known.length ? format(units) : 'Unknown'}</td>
        <td>${costed.length ? format(subtotal) + ' ' + currency : known.length && !units ? '0' : '—'}</td>
        <td>${review.join(' · ') || 'Ready to review'}</td></tr>`;
    }).join('') : `<tr><td colspan="4">${empty}</td></tr>`;
    $('purchases').innerHTML = rows.map(row => `<tr><td>${row.year}</td><th scope="row">${escape(name(row.item))}</th>
      <td>${format(row.required)}</td><td>${format(row.available)}</td><td><strong>${format(row.buy)}</strong></td>
      <td>${escape(row.review || '—')}</td></tr>`).join('') || `<tr><td colspan="6">${empty}</td></tr>`;
    $('forecast').innerHTML = rows.map(row => `<tr><td>${row.year}</td><th scope="row">${escape(name(row.item))}</th>${[
      row.required, row.opening, row.retired, row.repair, row.arrive, row.available, row.buy
    ].map(value => `<td>${format(value)}</td>`).join('')}<td>${row.buy > 0 && row.cost === null ? 'Uncosted' : format(row.cost)}</td>
      <td>${format(row.closing)}</td><td>${escape(row.review || 'Ready for review')}</td></tr>`).join('') ||
      `<tr><td colspan="12">${years.length ? 'Include at least one equipment or device record.' : 'Enter a first forecast year and 1 to 20 years.'}</td></tr>`;
    $('export').disabled = !years.length || !plan.items.some(item => item.enabled);
  }

  function renderPlan() {
    PLAN_FIELDS.forEach(key => { $(key).value = plan[key]; });
    listItems();
    renderEditor();
    renderForecast();
    updateBanner();
  }

  for (const button of stepButtons) button.onclick = () => showStep(button.dataset.step);
  $('blank').onclick = () => {
    if (mayReplace()) replacePlan({...newPlan(), items: [starterItem()]}, 'setup');
  };
  $('demo').onclick = () => {
    if (mayReplace()) replacePlan(examplePlan(), 'results');
  };
  $('catalog').insertAdjacentHTML('beforeend', STARTER_ITEMS.map(([label, type], index) =>
    `<option value="${index}">${escape(label)}${type === 'single' ? ' (single-use)' : ''}</option>`).join(''));

  PLAN_FIELDS.forEach(key => { $(key).oninput = event => {
    plan[key] = event.target.value;
    dirty = true;
    if (key === 'startYear' || key === 'years') renderSchedule();
    if (key === 'facility') updateBanner();
    renderForecast();
  }; });
  $('item').onchange = () => {
    selected = Number($('item').value);
    $('supply').open = false;
    renderEditor();
  };
  $('add').onclick = () => {
    if (plan.items.length >= MAX_ITEMS) return;
    const option = $('catalog').value;
    selected = plan.items.push(starterItem(...(option === '' ? [] : STARTER_ITEMS[Number(option)]))) - 1;
    dirty = true;
    $('supply').open = false;
    listItems();
    renderEditor();
    renderForecast();
    $('editor').querySelector('[data-field="name"]').focus();
  };
  $('remove').onclick = () => {
    if (!plan.items[selected] || !window.confirm(`Remove ${name(plan.items[selected])} and its inputs?`)) return;
    plan.items.splice(selected, 1);
    dirty = true;
    selected = Math.max(0, Math.min(selected, plan.items.length - 1));
    listItems();
    renderEditor();
    renderForecast();
    $('add').focus();
  };
  $('editor').oninput = event => {
    const {field} = event.target.dataset;
    if (!field) return;
    const item = plan.items[selected];
    item[field] = field === 'enabled' ? event.target.checked : event.target.value;
    dirty = true;
    if (['method', 'type', 'enabled'].includes(field)) {
      if (field === 'type' && item.type === 'single') item.enabled = false;
      renderEditor();
      const control = $('editor').querySelector(`[data-field="${field}"]`);
      const options = control.closest('details');
      if (options) options.open = true;
      control.focus();
    }
    if (['enabled', 'name', 'variant', 'type'].includes(field)) listItems();
    renderForecast();
  };
  $('schedule').oninput = event => {
    const {year, adjustment} = event.target.dataset;
    if (!adjustment) return;
    const schedule = plan.items[selected].schedule;
    schedule[year] ||= {};
    schedule[year][adjustment] = event.target.value;
    dirty = true;
    renderForecast();
  };
  $('filter').onchange = renderForecast;
  function download(filename, value, type) {
    const url = URL.createObjectURL(new Blob([value], {type}));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('save').onclick = () => {
    download(plan.example ? 'example-equipment-plan.json' : 'maternal-equipment-plan.json', JSON.stringify({kind:'maternal-equipment-forecast', version:1, plan}, null, 2), 'application/json');
    dirty = false;
    $('message').textContent = 'Plan downloaded, including incomplete entries.';
  };
  $('load').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 5000000) throw new Error('Plan file exceeds 5 MB.');
      const loaded = parsePlan(await file.text());
      if (!mayReplace()) return;
      replacePlan(loaded, 'results');
      $('message').textContent = 'Plan loaded. Verify inventory, service inputs and supply timing.';
    } catch (error) {
      $('message').textContent = error.message;
    } finally {
      event.target.value = '';
    }
  };
  $('export').onclick = () => {
    const headers = ['Country', 'District', 'Facility', 'Care level', 'Inventory assessment date', 'Currency', 'Year',
      'Equipment or device', 'Variant', 'Classification', 'Service', 'Method', 'Required', 'Opening', 'Retired or expired',
      'Repairs', 'Funded arrivals', 'Available', 'Buy', 'Gap cost', 'Closing', 'Review', 'Evidence', 'Readiness', 'Plan type'];
    const rows = forecast(plan).map(row => [plan.country, plan.district, plan.facility, plan.level, plan.inventoryDate, plan.currency.trim().toUpperCase(),
      row.year, row.item.name, row.item.variant, row.item.type === 'single' ? 'Single-use device' : 'Reusable equipment',
      row.item.service, methodNames[row.item.method],
      row.required, row.opening, row.retired, row.repair, row.arrive, row.available, row.buy,
      row.buy > 0 && row.cost === null ? 'Uncosted' : row.cost, row.closing, row.review, row.item.evidence, row.item.readiness,
      plan.example ? 'Example – dummy data' : 'Facility plan']);
    const cell = value => '"' + String(value ?? 'Unknown').replace(/^(?:\s*[=+@-]|[\t\r\n])/, "'$&").replaceAll('"', '""') + '"';
    download(plan.example ? 'example-equipment-forecast.csv' : 'maternal-equipment-forecast.csv',
      '\ufeff' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  };
  renderPlan();
  showStep('results', false);
}
