
// Equipment defaults are illustrative planning assumptions, not clinical norms.
const EQ=[
 ['Delivery bed','births',30,1],['Examination light','births',60,1],
 ['Blood pressure monitor','births',120,1],['Fetal Doppler','births',120,1],
 ['Vacuum delivery set','assist',20,0],['Operating table','cs',40,0],
 ['Anaesthesia workstation','cs',40,0],['Patient monitor','cs',40,0],
 ['Infusion pump','complications',30,1],['Oxygen concentrator','complications',20,1],
 ['Suction machine','births',60,1],['Steam sterilizer','births',120,1],
 ['Newborn resuscitation bag and mask set','births',60,1]
].map(([name,driver,capacity,minimum])=>({name,driver,capacity,minimum,functional:'',nonfunctional:'',due:'',repairs:'',incoming:'',age:'',life:'',lead:'',cost:''}));
const EQFIELDS=[['capacity','Events / unit / month'],['minimum','Minimum units'],['functional','Functional units'],['nonfunctional','Nonfunctional units'],['due','Functional units retiring in period'],['repairs','Confirmed repairs in period'],['incoming','Confirmed arrivals in period'],['age','Oldest functional unit age (years)'],['life','Expected life (years)'],['lead','Lead time (months)'],['cost','Landed unit cost']];
function equipmentBuild(){
 $('eqtable').innerHTML='<thead><tr><th>Equipment / activity driver</th>'+EQFIELDS.map(f=>'<th>'+f[1]+'</th>').join('')+'<th>Required units</th><th>Procurement gap</th><th>Estimated cost</th><th>Review</th></tr></thead><tbody>'+EQ.map((r,i)=>'<tr><td>'+r.name+'<small>'+r.driver+'</small></td>'+EQFIELDS.map(([k,label])=>'<td><input aria-label="'+r.name+': '+label+'" type="number" min="'+(k==='capacity'?1:0)+'" step="'+(['capacity','life','lead','cost'].includes(k)?'any':'1')+'" data-row="'+i+'" data-key="'+k+'" value="'+r[k]+'"></td>').join('')+'<td id="eqreq'+i+'"></td><td id="eqgap'+i+'"></td><td id="eqcost'+i+'"></td><td id="eqreview'+i+'"></td></tr>').join('')+'</tbody>';
 document.querySelectorAll('#eqtable input').forEach(el=>el.oninput=()=>{EQ[+el.dataset.row][el.dataset.key]=el.value;equipmentCalc()});
}
function equipmentResult(r,births,months,cs,assist,complications,use,peak){
 const activity={births,cs:births*cs,assist:births*assist,complications:births*complications}[r.driver];
 const valid=(k,min=0,whole=false)=>r[k]!==''&&Number.isFinite(+r[k])&&+r[k]>=min&&(!whole||Number.isInteger(+r[k]));
 if(!valid('capacity',Number.MIN_VALUE)||!valid('minimum',0,true)||!(use>0&&use<=1)||!(peak>=0&&peak<=2)||!Number.isFinite(activity))return {required:null,gap:null,cost:null,review:'Check capacity and planning inputs'};
 const required=Math.max(+r.minimum,Math.ceil(activity*(1+peak)/(+r.capacity*use)));
 if(!['functional','nonfunctional','due','repairs','incoming'].every(k=>valid(k,0,true)))return {required,gap:null,cost:null,review:'Complete inventory and supply; enter 0 if none'};
 if(+r.due>+r.functional||+r.repairs>+r.nonfunctional)return {required,gap:null,cost:null,review:'Retiring units exceed functional, or repairs exceed nonfunctional'};
 const gap=Math.max(0,required-(+r.functional-+r.due + +r.repairs + +r.incoming));
 const review=[];
 if(r.lead===''||!valid('lead'))review.push('Verify lead time');else if(+r.lead>months&&gap)review.push('Lead time exceeds horizon');
 if(r.life===''||!valid('life',Number.MIN_VALUE))review.push('Verify life and retirement schedule');
 if(r.age!==''&&valid('age')&&valid('life',Number.MIN_VALUE)&&+r.age+months/12>=+r.life&&+r.functional>0)review.push('Age threshold reached within horizon; review retiring count');
 return {required,gap,cost:gap===0?0:valid('cost')?gap*+r.cost:null,review:review.join('; ')||'Validate timing and readiness'};
}
let eqResults=[];
function equipmentCalc(){
 const births=+$('births').value,months=+$('months').value,cs=+$('cs').value/100,assist=+$('assist').value/100;
 // Sum is a workload proxy; overlapping complications can require multiple device uses.
 const complications=['pe','pph','sepsis'].reduce((n,k)=>n + +$('r_'+k).value/100,0);
 const use=+$('equse').value/100,peak=+$('eqpeak').value/100;
 eqResults=EQ.map(r=>equipmentResult(r,births,months,cs,assist,complications,use,peak));
 const invalid=!(births>0&&Number.isFinite(births)&&months>=1&&months<=24&&Number.isInteger(months)&&cs>=0&&assist>=0&&cs+assist<=1&&$('equse').value!==''&&$('eqpeak').value!=='');
 if(invalid)eqResults=EQ.map(()=>({required:null,gap:null,cost:null,review:'Enter positive births and a whole planning period of 1–24 months'}));
 eqResults.forEach((r,i)=>{ $('eqreq'+i).textContent=r.required??'Unknown';$('eqgap'+i).textContent=r.gap??'Unknown';$('eqcost'+i).textContent=r.cost===null?'Uncosted':r.cost.toLocaleString(undefined,{maximumFractionDigits:2});$('eqreview'+i).textContent=r.review; });
 const known=eqResults.filter(r=>r.gap!==null),uncosted=known.filter(r=>r.gap>0&&r.cost===null).length;
 $('eqsummary').innerHTML=[['Planning period',months+' months'],['Inventory rows complete',known.length+' / '+EQ.length],['Gap units (known rows)',known.reduce((n,r)=>n+r.gap,0)],['Costed subtotal (currency above)',known.reduce((n,r)=>n+(r.cost??0),0).toLocaleString()],['Gap rows without cost',uncosted]].map(([l,v])=>'<div class="kpi"><b>'+v+'</b><span>'+l+'</span></div>').join('');
}
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
const csvCell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
equipmentBuild();equipmentCalc();
['equse','eqpeak'].forEach(id=>$(id).oninput=equipmentCalc);
$('eqexport').onclick=()=>{equipmentCalc();const headers=['Facility','Assessment date','Currency','Monthly births','Months','Usable capacity %','Peak %','Equipment','Driver',...EQFIELDS.map(f=>f[1]),'Required','Gap','Cost','Review'];const rows=EQ.map((r,i)=>[$('eqfacility').value,$('eqdate').value,$('eqcurrency').value,$('births').value,$('months').value,$('equse').value,$('eqpeak').value,r.name,r.driver,...EQFIELDS.map(([k])=>r[k]),eqResults[i].required??'Unknown',eqResults[i].gap??'Unknown',eqResults[i].cost??'Uncosted',eqResults[i].review]);download('maternal-equipment-forecast.csv','\ufeff'+[headers,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8')};
const PLANIDS=['births','months','cs','assist','buf',...RISKS.map(r=>'r_'+r.k),'eqfacility','eqdate','eqcurrency','equse','eqpeak'];
$('saveplan').onclick=()=>{download('maternal-health-plan.json',JSON.stringify({version:1,inputs:Object.fromEntries(PLANIDS.map(id=>[id,$(id).value])),fte:FTE_H,questionnaire:A,equipment:EQ},null,2),'application/json');$('eqmsg').textContent='Planning data exported. Keep the file securely if it includes respondent details.'};
$('loadplan').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('File too large');const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.equipment)||data.equipment.length!==EQ.length||!data.inputs||typeof data.questionnaire!=='object'||!data.questionnaire)throw Error('Invalid planning file');
 const scalar=v=>typeof v==='string'||typeof v==='number'&&Number.isFinite(v);
 for(const id of PLANIDS){const v=data.inputs[id];if(!scalar(v))throw Error('Missing or invalid input: '+id);const el=$(id);if(el.type==='number'||el.type==='range'){if(v===''||!Number.isFinite(+v)||(el.min!==''&&+v<+el.min)||(el.max!==''&&+v>+el.max))throw Error('Out-of-range input: '+id)}}
 if(+data.inputs.cs + +data.inputs.assist>100||!Number.isInteger(+data.inputs.months))throw Error('Invalid delivery mix or planning period');
 if(!Number.isFinite(+data.fte)||+data.fte<=0)throw Error('Invalid FTE hours');
 data.equipment.forEach((r,i)=>{if(r.name!==EQ[i].name||!EQFIELDS.every(([k])=>scalar(r[k])&&(r[k]===''||Number.isFinite(+r[k])&&+r[k]>=0)))throw Error('Invalid equipment row')});
 for(const f of QS.flatMap(s=>s.f)){const v=data.questionnaire[f[0]];if(v!==undefined&&(!scalar(v)||(f[2]==='s'&&v!==''&&!f[3].includes(v))||(['n','p'].includes(f[2])&&v!==''&&(!Number.isFinite(+v)||+v<0||f[2]==='p'&&+v>100))))throw Error('Invalid questionnaire answer')}
 PLANIDS.forEach(id=>{$(id).value=data.inputs[id];if($(id+'v'))$(id+'v').textContent=$(id).value+'%'});FTE_H=+data.fte;
 QS.flatMap(s=>s.f).forEach(f=>{const k=f[0];A[k]=data.questionnaire[k]??'';$('q_'+k).value=A[k]});
 data.equipment.forEach((r,i)=>EQFIELDS.forEach(([k])=>EQ[i][k]=r[k]));qprog();equipmentBuild();calc();equipmentCalc();$('calib').textContent='Restored planning data';$('eqmsg').textContent='Planning data loaded. Review inventory dates and assumptions.';
 }catch(err){$('eqmsg').textContent='Could not load planning file: '+err.message}finally{e.target.value=''}};
