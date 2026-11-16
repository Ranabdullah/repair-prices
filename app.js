'use strict';
const $ = selector=>document.querySelector(selector);
const h = value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const money = new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'});
const compare = (a,b)=>a.localeCompare(b,'en',{numeric:true,sensitivity:'base'});
const key='repair-prices-local-demo-v1';
function example(){
  return {
    pricing:{vat:13.5,labour:25,shipment:8.5,margin:15,method:'inclusive'},
    repairs:[
      {id:'s1',brand:'Orbit',model:'Orbit One',repair:'Screen replacement',cost:38,price:104},
      {id:'s2',brand:'Orbit',model:'Orbit One',repair:'Battery replacement',cost:17,price:72},
      {id:'s3',brand:'Nova',model:'Nova 2',repair:'Charging port repair',cost:19,price:79},
      {id:'s4',brand:'Nova',model:'Nova 2',repair:'Screen replacement',cost:45,price:125}
    ]
  };
}
function read(){
  try { return JSON.parse(localStorage.getItem(key)) || example(); }
  catch { return example(); }
}
let data=read();
const status=message=>{$('#message').textContent=message;};
function change(update,message){
  const next=read();
  try {
    update(next);
    localStorage.setItem(key,JSON.stringify(next));
    data=next;
    render();
    status(message);
    return true;
  } catch(error){status(error.message);return false;}
}
// The legacy mode keeps the original percentage deduction and profit/margin basis.
function netMultiplier(rules){
  return rules.method==='legacy'?1-rules.vat/100:1/(1+rules.vat/100);
}
function calcProfit(price,cost,shipment=data.pricing.shipment){
  return price*netMultiplier(data.pricing)-cost-data.pricing.labour-shipment;
}
function suggestedPrice(cost,shipment){
  const denominator=netMultiplier(data.pricing)-data.pricing.margin/100;
  if(denominator<=0) return null;
  const raw=(cost+data.pricing.labour+shipment)/denominator;
  const rounded=Math.max(5,(Math.floor(raw/5)+1)*5);
  return Number.isFinite(rounded) && rounded<=1000000 ? rounded : null;
}
function filtered(){
  const brand=$('#brand').value;
  const query=$('#search').value.trim().toLowerCase();
  return data.repairs.filter(row=>(!brand || row.brand===brand) && [row.brand,row.model,row.repair].some(value=>value.toLowerCase().includes(query))).sort((a,b)=>compare(a.brand,b.brand)||compare(a.model,b.model)||compare(a.repair,b.repair));
}
function catalogue(){
  const customer=$('#customer').checked;
  $('#catalogue').classList.toggle('customer',customer);
  $('#rows').innerHTML=filtered().map(row=>{
    const profit=calcProfit(row.price,row.cost);
    const margin=profit/row.price*100;
    return `<tr><td>${h(row.brand)}</td><td>${h(row.model)}</td><td>${h(row.repair)}</td><td>${money.format(row.price)}</td>
      <td class="internal">${money.format(row.cost)}</td><td class="internal ${margin>=data.pricing.margin?'good':'under'}">${money.format(profit)} · ${margin.toFixed(1)}%</td>
      <td class="internal"><button data-edit="${h(row.id)}">Edit</button><button data-remove="${h(row.id)}">Delete</button></td></tr>`;
  }).join('') || `<tr><td colspan="${customer?4:7}">No matching repairs.</td></tr>`;
}
const estimateForm=$('#estimateForm');
let suggestion=null;
function estimate(){
  if(![...estimateForm.elements].filter(el=>el.willValidate).every(el=>el.validity.valid)){
    $('#estimateResult').textContent='Enter valid costs and a selling price to calculate a quote.';
    $('#useSuggestion').disabled=true;
    return;
  }
  const {cost,shipment,price}=Object.fromEntries(new FormData(estimateForm));
  const profit=calcProfit(Number(price),Number(cost),Number(shipment));
  const margin=profit/Number(price)*100;
  suggestion=suggestedPrice(Number(cost),Number(shipment));
  $('#useSuggestion').disabled=suggestion===null;
  const stats=[['Estimated profit',money.format(profit)],['Margin',margin.toFixed(1)+'%'],['Suggested price',suggestion===null?'Target unavailable':money.format(suggestion)]];
  $('#estimateResult').innerHTML=stats.map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('');
}
function render(){
  const select=$('#brand');
  const brand=select.value;
  const brands=[...new Set(data.repairs.map(row=>row.brand))].sort(compare);
  select.innerHTML='<option value="">All brands</option>'+brands.map(value=>`<option value="${h(value)}">${h(value)}</option>`).join('');
  if(brands.includes(brand)) select.value=brand;
  catalogue();
  estimate();
}
const settings=$('#settingsForm');
function switchView(view){
  for(const button of document.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed',button.dataset.view===view);
  for(const panel of document.querySelectorAll('[data-panel]')) panel.hidden=panel.id!==view;
  $('#title').textContent={catalogue:'Price list',estimate:'Profit and pricing',settings:'Pricing settings'}[view];
  if(view==='settings') for(const [name,value] of Object.entries(data.pricing)) settings.elements[name].value=value;
}
for(const button of document.querySelectorAll('[data-view]')) button.onclick=()=>switchView(button.dataset.view);
for(const control of document.querySelectorAll('.filters input,.filters select')) control.oninput=catalogue;
$('#print').onclick=()=>window.print();
estimateForm.oninput=estimate;
estimateForm.onsubmit=event=>event.preventDefault();
$('#useSuggestion').onclick=()=>{
  if(suggestion===null) return;
  estimateForm.elements.price.value=suggestion;
  estimate();
};
settings.onsubmit=event=>{
  event.preventDefault();
  const values=Object.fromEntries(new FormData(settings));
  const rules={vat:Number(values.vat),labour:Number(values.labour),shipment:Number(values.shipment),margin:Number(values.margin),method:values.method};
  if(change(next=>{next.pricing=rules;},'Pricing settings saved.')){
    estimateForm.elements.shipment.value=rules.shipment;
    estimate();
  }
};
const dialog=$('#repairDialog');
const form=$('#repairForm');
let editing=null;
function edit(row){
  editing=row?.id ?? null;
  $('#repairTitle').textContent=row?'Edit repair':'Add repair';
  form.reset();
  if(row) for(const name of ['brand','model','repair','price','cost']) form.elements[name].value=row[name];
  dialog.showModal();
}
$('#add').onclick=()=>edit();
$('#cancel').onclick=()=>dialog.close();
$('#rows').onclick=event=>{
  const {edit:id,remove}=event.target.dataset;
  if(id) edit(data.repairs.find(row=>row.id===id));
  if(remove && confirm('Delete this repair from the price list?')) change(next=>{next.repairs=next.repairs.filter(row=>row.id!==remove);},'Repair deleted.');
};
form.onsubmit=event=>{
  event.preventDefault();
  const values=Object.fromEntries(new FormData(form));
  const row={id:editing || crypto.randomUUID(),brand:values.brand.trim(),model:values.model.trim(),repair:values.repair.trim(),price:Number(values.price),cost:Number(values.cost)};
  if(!row.brand || !row.model || !row.repair){alert('Enter a brand, device and service.');return;}
  if(change(next=>{
    const index=next.repairs.findIndex(item=>item.id===editing);
    if(editing && index<0) throw Error('This repair was deleted in another tab.');
    if(index<0) next.repairs.push(row);
    else next.repairs[index]=row;
  },'Repair saved.')) dialog.close();
  else alert($('#message').textContent);
};
$('#reset').onclick=()=>{
  if(!confirm('Reset the repairs and pricing settings to the fictional examples?')) return;
  if(change(next=>Object.assign(next,example()),'Sample data restored.')){
    form.reset();
    estimateForm.reset();
    estimateForm.elements.shipment.value=data.pricing.shipment;
    switchView(document.querySelector('[data-view][aria-pressed=true]').dataset.view);
    estimate();
  }
};
window.addEventListener('storage',event=>{if(event.key===key){data=read();render();}});
estimateForm.elements.shipment.value=data.pricing.shipment;
switchView('catalogue');
render();
