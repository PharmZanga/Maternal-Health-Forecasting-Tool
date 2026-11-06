
// Country assessment entries stay in this browser until exported.
const assessmentFlags=['Authorized','Routine','Selected facilities','Expansion planned','Not provided'];
const assessmentBlank=()=>({country:'',profile:REFERENCE.profile.map(()=>''),facilities:REFERENCE.levels.map(()=>Array(6).fill('')),readiness:REFERENCE.services.map(()=>REFERENCE.levels.map(()=>Array(8).fill(''))),volumes:REFERENCE.indicators.map(()=>REFERENCE.levels.map(()=>Array(4).fill(''))),roles:REFERENCE.roles.map(()=>Array(3).fill(''))});
let assessment=assessmentBlank(),assessmentDirty=false;
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function assessmentField(path,label,value,type='text'){
 return `<input data-assess="${path}" aria-label="${esc(label)}" type="${type}" ${type==='number'?'min="0" step="1"':''} maxlength="3000" value="${esc(value)}">`;
}
function assessmentRegion(country){return REFERENCE.countries.find(c=>c.country===country)?.region||''}
function assessmentProblems(data){
 const errors=[];
 const count=(v,label)=>{if(v!==''&&(!Number.isFinite(+v)||+v<0||!Number.isInteger(+v)))errors.push(label+' must be a nonnegative whole number.');};
 data.facilities.forEach((row,i)=>{row.slice(0,4).forEach((v,k)=>count(v,REFERENCE.levels[i]+' '+['facilities','delivery facilities','emergency facilities','year'][k]));if(row[0]!==''&&[1,2].some(k=>row[k]!==''&&+row[k]>+row[0]))errors.push(REFERENCE.levels[i]+': service facilities exceed total public facilities.');});
 const year=(v,label)=>{if(v!==''&&(!Number.isInteger(+v)||+v<1900||+v>2200))errors.push(label+' must be a year from 1900 to 2200.');};
 data.facilities.forEach(row=>year(row[3],'Facility year'));
 data.readiness.forEach((levels,i)=>levels.forEach((row,j)=>{if(row[4]==='Yes'&&row.slice(0,4).includes('Yes'))errors.push(REFERENCE.services[i]+' / '+REFERENCE.levels[j]+': Not provided conflicts with another Yes.');year(row[6],'Readiness year');}));
 data.volumes.forEach(levels=>levels.forEach(row=>{count(row[0],'Annual volume');year(row[1],'Volume year');}));
 return errors;
}
function assessmentSummary(){
 const errors=assessmentProblems(assessment);
 const completeReady=assessment.readiness.flat().filter(r=>r.slice(0,5).every(v=>v==='Yes'||v==='No')&&r.slice(5).every(v=>v!=='')&&!(r[4]==='Yes'&&r.slice(0,4).includes('Yes'))).length;
 const completeVolumes=assessment.volumes.flat().filter(r=>r.every(v=>v!=='')&&Number.isInteger(+r[0])&&+r[0]>=0&&Number.isInteger(+r[1])&&+r[1]>=1900).length;
 $('assessment-summary').textContent=`${completeReady} / 85 service-level records complete; ${completeVolumes} / 65 annual-volume records complete. ${errors.length?errors[0]:'Blank and Unknown entries remain incomplete; completion does not imply country approval.'}`;
 $('assessment-region').textContent=assessmentRegion(assessment.country)+(assessment.country==='Somalia'?' — AS is retained from the supplied list; confirm the intended region code.':'');
 return errors;
}
function bindAssessmentFields(){document.querySelectorAll('#p5 [data-assess]').forEach(el=>el.oninput=el.onchange=()=>{let target=assessment;const path=el.dataset.assess.split('.');for(const k of path.slice(0,-1))target=target[k];target[path.at(-1)]=el.value;assessmentDirty=true;assessmentSummary()});}
function readinessBuild(){
 const i=+$('assessment-service').value||0;
 $('assessment-readiness').innerHTML='<thead><tr><th>Facility reporting level</th>'+assessmentFlags.map(f=>'<th>'+f+'</th>').join('')+'<th>Source</th><th>Year</th><th>Validation owner</th></tr></thead><tbody>'+REFERENCE.levels.map((level,j)=>'<tr><th scope="row">'+esc(level)+'</th>'+assessment.readiness[i][j].map((v,k)=>'<td>'+(k<5?`<select data-assess="readiness.${i}.${j}.${k}" aria-label="${esc(REFERENCE.services[i]+' / '+level+' / '+assessmentFlags[k])}"><option value="">Unknown / unanswered</option>`+['Yes','No','Unknown'].map(x=>`<option ${v===x?'selected':''}>${x}</option>`).join('')+'</select>':assessmentField(`readiness.${i}.${j}.${k}`,REFERENCE.services[i]+' / '+level+' / '+['Source','Year','Owner'][k-5],v,k===6?'number':'text'))+'</td>').join('')+'</tr>').join('')+'</tbody>';
 bindAssessmentFields();
}
function volumesBuild(){
 const j=+$('assessment-volume-level').value||0;
 $('assessment-volumes').innerHTML='<thead><tr><th>Annual indicator</th><th>Volume</th><th>Year</th><th>Source</th><th>Validation owner</th></tr></thead><tbody>'+REFERENCE.indicators.map((indicator,i)=>'<tr><th scope="row">'+esc(indicator)+'</th>'+assessment.volumes[i][j].map((v,k)=>'<td>'+assessmentField(`volumes.${i}.${j}.${k}`,indicator+' / '+REFERENCE.levels[j]+' / '+['Volume','Year','Source','Owner'][k],v,k<2?'number':'text')+'</td>').join('')+'</tr>').join('')+'</tbody>';
 bindAssessmentFields();
}
function mappingBuild(){
 const selected=$('assessment-domain').value;
 $('assessment-mapping').innerHTML='<thead><tr><th>Service</th><th>Equipment or device</th><th>Associated commodities and consumables</th><th>Forecasting linkage</th></tr></thead><tbody>'+REFERENCE.mapping.filter(r=>!selected||r.domain===selected).map(r=>'<tr>'+['service','equipment','consumables','linkage'].map(k=>'<td>'+esc(r[k])+'</td>').join('')+'</tr>').join('')+'</tbody>';
}
function assessmentBuild(){
 $('assessment-country').innerHTML='<option value="">Select country</option>'+REFERENCE.countries.map(c=>`<option ${c.country===assessment.country?'selected':''}>${esc(c.country)}</option>`).join('');
 $('assessment-profile').innerHTML=REFERENCE.profile.map((q,i)=>`<label class="f" for="assessment-profile-${i}">${esc(q)}</label><textarea id="assessment-profile-${i}" data-assess="profile.${i}" maxlength="3000" rows="2">${esc(assessment.profile[i])}</textarea>`).join('');
 $('assessment-facilities').innerHTML='<thead><tr><th>Facility reporting level</th><th>Public facilities</th><th>Providing deliveries</th><th>Providing emergency obstetric care</th><th>Year</th><th>Source</th><th>Validation owner</th></tr></thead><tbody>'+REFERENCE.levels.map((level,i)=>'<tr><th scope="row">'+esc(level)+'</th>'+assessment.facilities[i].map((v,k)=>'<td>'+assessmentField(`facilities.${i}.${k}`,level+' / '+['Public facilities','Deliveries','Emergency care','Year','Source','Owner'][k],v,k<4?'number':'text')+'</td>').join('')+'</tr>').join('')+'</tbody>';
 $('assessment-partners').innerHTML='<thead><tr><th>Stakeholder role</th><th>Responsibility</th><th>Country responsible unit</th><th>Validation or approval task</th><th>Status or evidence</th></tr></thead><tbody>'+REFERENCE.roles.map((r,i)=>'<tr><th scope="row">'+esc(r.role)+'</th><td>'+esc(r.responsibility)+'</td>'+assessment.roles[i].map((v,k)=>'<td>'+assessmentField(`roles.${i}.${k}`,r.role+' / '+['Responsible unit','Validation task','Status or evidence'][k],v)+'</td>').join('')+'</tr>').join('')+'</tbody>';
 readinessBuild();volumesBuild();mappingBuild();bindAssessmentFields();assessmentSummary();
}
function assessmentValidateImport(value){
 if(!value||value.version!==1||value.kind!=='maternal-country-assessment'||!value.assessment)throw Error('Not a country assessment file');
 const d=value.assessment,b=assessmentBlank();
 if(typeof d.country!=='string'||d.country!==''&&!REFERENCE.countries.some(c=>c.country===d.country))throw Error('Unknown country');
 const valid=(a,shape)=>Array.isArray(a)&&a.length===shape.length&&a.every((v,i)=>Array.isArray(shape[i])?valid(v,shape[i]):typeof v==='string'&&v.length<=3000);
 for(const k of ['profile','facilities','readiness','volumes','roles'])if(!valid(d[k],b[k]))throw Error('Invalid '+k+' records');
 if(d.readiness.some(levels=>levels.some(r=>r.slice(0,5).some(v=>!['','Yes','No','Unknown'].includes(v)))))throw Error('Invalid service flags');
 const errors=assessmentProblems(d);if(errors.length)throw Error(errors[0]);
 return Object.fromEntries(['country','profile','facilities','readiness','volumes','roles'].map(k=>[k,d[k]]));
}
$('assessment-service').innerHTML=REFERENCE.services.map((s,i)=>`<option value="${i}">${esc(s)}</option>`).join('');
$('assessment-volume-level').innerHTML=REFERENCE.levels.map((s,i)=>`<option value="${i}">${esc(s)}</option>`).join('');
$('assessment-domain').innerHTML='<option value="">All service areas</option>'+[...new Set(REFERENCE.mapping.map(r=>r.domain))].map(s=>`<option>${esc(s)}</option>`).join('');
$('assessment-service').onchange=readinessBuild;$('assessment-volume-level').onchange=volumesBuild;$('assessment-domain').onchange=mappingBuild;
$('assessment-country').onchange=()=>{if(assessmentDirty&&assessment.country&&$('assessment-country').value!==assessment.country){$('assessment-country').value=assessment.country;$('assessment-message').textContent='Save this assessment, then use Start new assessment before changing its country.';return}assessment.country=$('assessment-country').value;assessmentSummary()};
$('assessment-new').onclick=()=>{if(assessmentDirty){$('assessment-message').textContent='Save your current assessment first, then select Discard current entries and start new to clear it.';$('assessment-discard').classList.remove('hide');return}assessment=assessmentBlank();assessmentBuild()};
$('assessment-discard').onclick=()=>{assessment=assessmentBlank();assessmentDirty=false;assessmentBuild();$('assessment-discard').classList.add('hide');$('assessment-message').textContent='New blank assessment started.'};
$('assessment-save').onclick=()=>{const errors=assessmentSummary();if(errors.length){$('assessment-message').textContent='Correct before saving: '+errors[0];return}download('maternal-country-assessment.json',JSON.stringify({kind:'maternal-country-assessment',version:1,assessment},null,2),'application/json');$('assessment-message').textContent='Assessment downloaded. Entries remain in this browser until the page is closed or refreshed.'};
$('assessment-load').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(assessmentDirty)throw Error('Save current entries and start a new assessment before loading another file');if(file.size>2000000)throw Error('File exceeds 2 MB');const next=assessmentValidateImport(JSON.parse(await file.text()));assessment=next;assessmentDirty=true;assessmentBuild();$('assessment-message').textContent='Assessment restored. Review sources, years and country validation.'}catch(err){$('assessment-message').textContent='Could not load: '+err.message}finally{e.target.value=''}};
$('assessment-csv').onclick=()=>{
 const errors=assessmentSummary();if(errors.length){$('assessment-message').textContent='Correct before exporting: '+errors[0];return}
 const rows=[['Country','Region','Record type','Service or indicator','Facility level','Field','Value']];
 const add=(type,subject,level,field,value)=>rows.push([assessment.country,assessmentRegion(assessment.country),type,subject,level,field,value]);
 assessment.profile.forEach((v,i)=>add('Profile',REFERENCE.profile[i],'','Response',v));
 assessment.facilities.forEach((r,i)=>r.forEach((v,k)=>add('Facility counts','',REFERENCE.levels[i],['Public facilities','Delivery facilities','Emergency facilities','Year','Source','Owner'][k],v)));
 assessment.readiness.forEach((levels,i)=>levels.forEach((r,j)=>r.forEach((v,k)=>add('Service readiness',REFERENCE.services[i],REFERENCE.levels[j],[...assessmentFlags,'Source','Year','Owner'][k],v))));
 assessment.volumes.forEach((levels,i)=>levels.forEach((r,j)=>r.forEach((v,k)=>add('Service volume',REFERENCE.indicators[i],REFERENCE.levels[j],['Annual volume','Year','Source','Owner'][k],v))));
 assessment.roles.forEach((r,i)=>r.forEach((v,k)=>add('Partner role',REFERENCE.roles[i].role,'',['Responsible unit','Validation task','Status or evidence'][k],v)));
 download('maternal-country-assessment.csv','\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');$('assessment-message').textContent='Assessment CSV downloaded. Blank values represent missing answers.';
};
assessmentBuild();
