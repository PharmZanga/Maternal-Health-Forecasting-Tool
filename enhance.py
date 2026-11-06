from pathlib import Path
p=Path('maternal-needs-forecast.html')
s=Path('maternal-needs-forecast.original.html').read_text(encoding='utf-8')
s=s.replace('</style>', '''
.equipment-table{min-width:1600px}.equipment-table input{min-width:80px}.equipment-table th{vertical-align:bottom;min-width:88px}.equipment-table th:first-child{min-width:220px}
.equipment-table label{display:block}.equipment-table small{display:block;color:var(--muted)}
button:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
@media print{.tabs,.actions{display:none}.scroll{overflow:visible}.equipment-table{min-width:0;font-size:8px}.equipment-table input{min-width:0;padding:0}.wrap{max-width:none}}
</style>''')
s=s.replace('<button role="tab" id="t3"', '<button role="tab" id="t4" aria-selected="false">Equipment forecast</button>\n<button role="tab" id="t3"')
equipment='''
<section id="p4" class="hide">
<div class="panel">
<h2>Maternal equipment and device forecast</h2>
<p>Uses the Facility forecast activity and planning period. These illustrative device categories and capacity assumptions are not a national equipment standard. Validate service packages, peak concurrency and specifications with facility teams before procurement.</p>
<div class="qgrid">
<div><label class="f" for="eqfacility">Facility / planning unit</label><input id="eqfacility" type="text" placeholder="Name and service level"></div>
<div><label class="f" for="eqdate">Inventory assessment date</label><input id="eqdate" type="date"></div>
<div><label class="f" for="eqcurrency">Cost currency</label><input id="eqcurrency" type="text" placeholder="e.g. ZMW"></div>
<div><label class="f" for="equse">Usable capacity (%)</label><input id="equse" type="number" min="1" max="100" value="80"></div>
<div><label class="f" for="eqpeak">Peak demand allowance (%)</label><input id="eqpeak" type="number" min="0" max="200" value="20"></div>
</div>
<p class="note">Capacity is events per device per month at full availability, including cleaning and turnaround. Usable capacity accounts for downtime and operating hours. Minimum units reflect simultaneous service readiness; enter locally agreed values, including zero for services not provided. Functional excludes nonfunctional equipment. Due for replacement is a subset of functional units retiring within this planning period. Repairs and confirmed arrivals must be usable before needed.</p>
<div id="eqsummary" class="kpis" aria-live="polite"></div>
<div class="scroll"><table id="eqtable" class="equipment-table"></table></div>
<p class="note">Required = max(minimum units, ceiling(monthly eligible events × (1 + peak allowance) ÷ (events per unit per month × usable capacity))). Surviving units = functional − due for replacement + confirmed repairs + confirmed incoming. Procurement gap = max(0, required − surviving units). Nonfunctional units are recorded separately; only confirmed repairs count toward supply. Replacement age and lead time inform manual review and do not automatically create units or orders. Estimate each facility separately before aggregating; pooled country totals conceal local gaps.</p>
<div class="actions"><button class="btn" id="eqexport">Export equipment CSV</button><button class="btn alt" id="saveplan">Save planning data</button><label class="btn alt">Load planning data<input id="loadplan" type="file" accept="application/json,.json" hidden></label></div>
<p id="eqmsg" role="status" class="note">Inventory is blank until entered. Save planning data to retain your work; nothing is sent to a server.</p>
</div></section>
'''
s=s.replace('<section id="p3"',equipment+'\n<section id="p3"')
s=s.replace('[1,2,3].forEach','[1,2,3,4].forEach')
s=s.replace('tot:per*mult*(1+buffer)', 'tot:per*mult*(1+(cat.n==="Staff time and beds"?0:buffer))')
s=s.replace('$("births").oninput=calc;$("months").oninput=calc;', '$("births").oninput=()=>{calc();equipmentCalc()};$("months").oninput=()=>{calc();equipmentCalc()};')
s=s.replace('$(id+"v").textContent=$(id).value+"%";calc()', '$(id+"v").textContent=$(id).value+"%";calc();equipmentCalc()')
s=s.replace('calc();tab(2)', 'calc();equipmentCalc();tab(2)')
s=s.replace('{t:"9. Data systems"', '''{t:"10. Equipment governance and readiness",f:[["eq_register","Asset register coverage and last verification date","t"],["eq_level","Service packages and equipment standards by facility level","t"],["eq_status","Definition and verification of functional status","t"],["eq_age","Asset age, expected life and replacement policy","t"],["eq_maintenance","Preventive maintenance schedule and repair arrangements","t"],["eq_engineers","Biomedical technicians and service coverage","t"],["eq_utilization","Utilization, peak demand and downtime data sources","t"],["eq_infra","Electricity, water, oxygen, sterilization and installation readiness","t"],["eq_accessories","Required accessories, consumables and compatible devices","t"],["eq_training","Operator training and competency gaps","t"],["eq_procurement","Tender specifications, supplier support and lead times","t"],["eq_orders","Confirmed orders, delivery dates and funding commitments","t"],["eq_costs","Equipment, installation, training and maintenance budget","t"],["eq_disposal","Decommissioning and safe disposal policy","t"],["eq_sources","Evidence sources, missing data and validation owner","t"]]},
{t:"9. Data systems"''')
s=s.replace('s.f.filter(f=>A[f[0]])','s.f.filter(f=>A[f[0]]!==undefined&&A[f[0]]!=="")')
s=s.replace('[["births","Births per year (country or catchment)"', '[["scope","Scope of annual births","s",["Single facility","District or catchment","Country"]],["births","Births per year (country or catchment)"')
s=s.replace('const d={births:1440', 'const d={scope:"Single facility",births:1440')
s=s.replace('$("qapply").onclick=()=>{let n=0;', '''$("qapply").onclick=()=>{let n=0;
if(A.births!==undefined&&A.births!==""&&A.scope!=="Single facility"){$("qmsg").textContent="To apply annual births, select Single facility scope and enter that facility's annual births. Country and catchment totals require separate facility allocations.";return}
if(QS.flatMap(s=>s.f).some(f=>['n','p'].includes(f[2])&&A[f[0]]!==undefined&&A[f[0]]!==""&&(!Number.isFinite(+A[f[0]])||+A[f[0]]<0||f[2]==='p'&&+A[f[0]]>100))){$("qmsg").textContent="Correct negative or invalid numbers and percentages outside 0–100 before applying.";return}
if((A.cs!==undefined&&A.cs!==""?+A.cs:+$("cs").value)+(A.assist!==undefined&&A.assist!==""?+A.assist:+$("assist").value)>100){$("qmsg").textContent="Caesarean and assisted birth shares together must not exceed 100%.";return}
''')
s=s.replace('mix.cs,60','mix.cs,100').replace('mix.assist,20','mix.assist,100').replace('prev[r.k],40','prev[r.k],100')
s=s.replace('Math.max(1,Math.round(A.births/12))','A.births/12')
s=s.replace('if(+A.safety>0)set','if(A.safety!==undefined&&A.safety!==""&&+A.safety>=0)set')
s=s.replace('$(id+"v").textContent=$(id).value+"%";calc();equipmentCalc()', 'if(id==="cs"||id==="assist")$(id).value=Math.min(+$(id).value,100-+$(id==="cs"?"assist":"cs").value);$(id+"v").textContent=$(id).value+"%";calc();equipmentCalc()')
s=s.replace('10. Equipment governance and readiness','9. Equipment governance and readiness').replace('9. Data systems','10. Data systems')
js=Path('equipment.js').read_text(encoding='utf-8')
s=s.replace('</style>','details.panel summary{font-weight:700;cursor:pointer} .assessment-wide{min-width:1150px}.assessment-wide input,.assessment-wide select{min-width:110px} .assessment-wide th:first-child{min-width:200px} .assessment-wide td{vertical-align:top} #assessment-mapping td{vertical-align:top}\n</style>')
s=s.replace('<button role="tab" id="t1"','<button role="tab" id="t5" aria-selected="false">Country and services</button>\n<button role="tab" id="t1"')
s=s.replace('<section id="p3"',Path('country-services.html').read_text(encoding='utf-8')+'\n<section id="p3"')
s=s.replace('[1,2,3,4].forEach','[1,2,3,4,5].forEach')
s=s.replace('<h1>Birth needs forecaster</h1>','<h1>Maternal health needs and equipment planning</h1>')
s=s.replace('See what one birth needs, then scale it to a facility or district. Quantities are editable planning assumptions, not clinical orders.','Assess country services, explore equipment and consumable links, and plan facility requirements. Quantities and service mappings are consultation assumptions for local validation.')
reference='const REFERENCE='+Path('service-reference.json').read_text(encoding='utf-8')+';\n'
s=s.replace('<title>Birth Needs Forecaster</title>','<title>Maternal Health Planning and Country Questionnaire</title>')
s=s.replace('>Country and services</button>','>Service mapping</button>').replace('>Country questionnaire</button>','>Clinical context</button>')
s=s.replace('<button role="tab" id="t5"','<button role="tab" id="t6" aria-selected="false">Country questionnaire</button>\n<button role="tab" id="t5"')
s=s.replace('<section id="p5"',Path('clarified-questionnaire.html').read_text(encoding='utf-8')+'\n<section id="p5"')
s=s.replace('[1,2,3,4,5].forEach','[1,2,3,4,5,6].forEach')
s=s.replace('</style>','.cq-section{margin-bottom:16px}.cq-question{border:1px solid var(--line);border-radius:8px;margin:18px 0;padding:16px}.cq-question legend{font-weight:600;padding:0 6px}.cq-wide{min-width:1100px}.cq-wide input,.cq-wide select{min-width:110px}.cq-wide th:first-child{min-width:200px} .cq-wide label.f{font-size:.76rem;font-weight:400}\n</style>')
clarified='const CLARIFIED='+Path('clarified-reference.json').read_text(encoding='utf-8')+';\n'
s=s.replace('</script>',js+'\n'+reference+Path('country-services.js').read_text(encoding='utf-8')+'\n'+clarified+Path('clarified-questionnaire.js').read_text(encoding='utf-8')+'\ntab(6);\n</script>')
p.write_text(s,encoding='utf-8')
