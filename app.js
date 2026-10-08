(() => {
  'use strict';
  const KEY = 'daily-plate-v1';
  const groups = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  const icons = ['☀', '◐', '☾', '♧'];
  const $ = id => document.getElementById(id);
  const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const parseDate = value => new Date(`${value}T12:00:00`);
  const dateText = value => parseDate(value).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric',year:'numeric'});
  const number = value => Number(value).toLocaleString(undefined,{maximumFractionDigits:1});
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let state = {entries:[],goals:[]};
  let selected = localDate(), editing = null, deleting = null, toastTimer;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.entries) && Array.isArray(saved.goals)) {
      state.entries = saved.entries.filter(e => e && typeof e.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && typeof e.name === 'string' && groups.includes(e.meal) && Number.isFinite(e.calories) && e.calories >= 0 && ['protein','carbs','fat'].every(k => Number.isFinite(e[k]) && e[k]>=0));
      state.goals = saved.goals.filter(g => g && /^\d{4}-\d{2}-\d{2}$/.test(g.date) && Number.isFinite(g.value) && g.value>0);
    }
  } catch (_) { showToast('Saved records could not be loaded.'); }
  function showToast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => $('toast').hidden = true,4000); }
  function persist(next) { try { localStorage.setItem(KEY,JSON.stringify(next)); state=next; return true; } catch (_) { showToast('Could not save. Check your browser storage settings.'); return false; } }
  function goalFor(date) { const goals = state.goals.filter(g => g.date<=date).sort((a,b)=>b.date.localeCompare(a.date)); return goals.length ? goals[0].value : null; }
  function daily(date) { const entries=state.entries.filter(e=>e.date===date); return {entries,calories:entries.reduce((n,e)=>n+e.calories,0),protein:entries.reduce((n,e)=>n+e.protein,0),carbs:entries.reduce((n,e)=>n+e.carbs,0),fat:entries.reduce((n,e)=>n+e.fat,0)}; }
  function render() {
    const day=daily(selected), goal=goalFor(selected);
    $('date').value=selected;
    $('date-title').textContent = `${selected===localDate()?'Today · ':''}${dateText(selected)}`;
    $('today').hidden=selected===localDate();
    $('total').textContent=number(day.calories);
    $('remaining').textContent=goal ? number(Math.abs(goal-day.calories)) : '—';
    $('remaining-label').textContent=goal && day.calories>goal?'Over goal':'Remaining';
    $('goal-display').textContent=goal ? `${number(goal)} kcal` : 'Not set';
    $('ring').style.background=`conic-gradient(${goal && day.calories>goal?'#ca9b69':'#83a86c'} ${goal?Math.min(360,day.calories/goal*360):0}deg, #edf1e8 0deg)`;
    $('balance-message').textContent=!goal?'Set a goal to see your daily balance.':!day.entries.length?'Your day is ready for its first meal.':day.calories>goal?'Your logged calories are above your goal.':`${Math.round(day.calories/goal*100)}% of your daily goal logged.`;
    const macroEnergy=day.protein*4+day.carbs*4+day.fat*9;
    $('macros').innerHTML=[['protein','Protein','#9aac81',4],['carbs','Carbs','#d9bd79',4],['fat','Fat','#c8a293',9]].map(([key,label,color,mult])=>`<div class="macro-row"><div class="macro-label"><b>${label}</b><span>${number(day[key])} g</span></div><div class="macro-track"><div class="macro-fill" style="background:${color};width:${macroEnergy?day[key]*mult/macroEnergy*100:0}%"></div></div></div>`).join('');
    $('meal-count').textContent=day.entries.length?`${day.entries.length} ${day.entries.length===1?'entry':'entries'} · ${number(day.calories)} kcal logged`:'Your meals, all in one place.';
    $('meal-list').innerHTML=groups.map((group,index)=>{
      const entries=day.entries.filter(e=>e.meal===group), total=entries.reduce((n,e)=>n+e.calories,0);
      return `<article class="meal-group"><div class="meal-group-head"><div class="meal-heading"><span class="meal-icon">${icons[index]}</span><div><h3>${group}</h3><p>${entries.length?`${entries.length} ${entries.length===1?'entry':'entries'}`:'Nothing logged yet'}</p></div></div><div class="group-actions"><b>${number(total)} <span class="muted">kcal</span></b><button class="add-meal" data-add="${group}" aria-label="Add ${group.toLowerCase()}">+</button></div></div>${entries.length?entries.map(e=>`<div class="food-row"><div><div class="food-name">${escape(e.name)}</div><div class="food-note">${escape(e.serving || '1 entry')}${e.protein||e.carbs||e.fat?` · P ${number(e.protein)}g / C ${number(e.carbs)}g / F ${number(e.fat)}g`:''}</div></div><div class="food-actions"><strong>${number(e.calories)} kcal</strong><button class="icon-button" data-edit="${escape(e.id)}" aria-label="Edit ${escape(e.name)}">✎</button><button class="icon-button" data-delete="${escape(e.id)}" aria-label="Delete ${escape(e.name)}">×</button></div></div>`).join(''):`<div class="meal-empty">Add something delicious to your day.</div>`}</article>`;
    }).join('');
    renderHistory();
  }
  function renderHistory() {
    const dates=[...new Set(state.entries.map(e=>e.date))].sort().reverse();
    const sum=state.entries.reduce((n,e)=>n+e.calories,0);
    $('history-summary').innerHTML=`<div><strong>${dates.length}</strong><span>Days logged</span></div><div><strong>${state.entries.length}</strong><span>Meal entries</span></div><div><strong>${number(dates.length?Math.round(sum/dates.length):0)}</strong><span>Average kcal / logged day</span></div>`;
    $('history-empty').hidden=!!dates.length;
    $('history-rows').innerHTML=dates.map(date=>{const day=daily(date),goal=goalFor(date);return `<tr><td>${escape(dateText(date))}</td><td>${day.entries.length}</td><td>${number(day.calories)} kcal</td><td>${goal?`${number(goal)} kcal`:'—'}</td><td><button class="text-button" data-view="${date}">View day ↗</button></td></tr>`;}).join('');
  }
  function openMeal(meal='Breakfast',entry=null) {
    editing=entry?entry.id:null; $('meal-form').reset(); $('form-title').textContent=entry?'Edit entry':'Log a meal';
    $('food-name').value=entry?entry.name:''; $('meal-type').value=entry?entry.meal:meal;
    for(const key of ['calories','protein','carbs','fat','serving']) $(key).value=entry?(entry[key]||''):'';
    if(entry) $('calories').value=entry.calories;
    $('logging-date').textContent=`Logging for ${dateText(selected)}.`;
    $('meal-dialog').showModal(); $('food-name').focus();
  }
  function changeDate(value) { if(!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parseDate(value).getTime())) return; selected=value;render(); }
  function switchView(history) { $('journal-view').hidden=history; $('history-view').hidden=!history; $('history-tab').classList.toggle('active',history);$('journal-tab').classList.toggle('active',!history);document.querySelector('.breadcrumb').textContent=history?'YOUR HISTORY':'YOUR DAILY JOURNAL'; }
  $('add-top').onclick=()=>openMeal();
  $('meal-list').onclick=event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.add)openMeal(button.dataset.add);if(button.dataset.edit){const entry=state.entries.find(e=>e.id===button.dataset.edit);if(entry)openMeal(entry.meal,entry);}if(button.dataset.delete){deleting=button.dataset.delete;const entry=state.entries.find(e=>e.id===deleting);if(entry){$('delete-name').textContent=entry.name;$('delete-dialog').showModal();}}};
  $('meal-form').onsubmit=event=>{event.preventDefault();const name=$('food-name').value.trim();if(!name){$('food-name').setCustomValidity('Enter a food or meal name.');$('food-name').reportValidity();return;}const entry={id:editing||`meal-${Date.now()}-${Math.random().toString(36).slice(2)}`,date:selected,name,meal:$('meal-type').value,serving:$('serving').value.trim()};for(const key of ['calories','protein','carbs','fat'])entry[key]=Number($(key).value||0);const entries=editing?state.entries.map(e=>e.id===editing?entry:e):[...state.entries,entry];if(persist({...state,entries})){$('meal-dialog').close();render();showToast(editing?'Entry updated':'Meal added to your journal');}};
  $('food-name').oninput=()=> $('food-name').setCustomValidity('');
  $('confirm-delete').onclick=()=>{if(persist({...state,entries:state.entries.filter(e=>e.id!==deleting)})){$('delete-dialog').close();render();showToast('Entry deleted');}};
  $('edit-goal').onclick=()=>{$('goal-input').value=goalFor(localDate())||'';$('goal-dialog').showModal();$('goal-input').focus();};
  $('goal-form').onsubmit=event=>{event.preventDefault();const date=localDate(),value=Number($('goal-input').value);if(persist({...state,goals:[...state.goals.filter(g=>g.date!==date),{date,value}]})){$('goal-dialog').close();render();showToast('Daily goal saved');}};
  document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>$(button.dataset.close).close());
  $('previous').onclick=()=>{const date=parseDate(selected);date.setDate(date.getDate()-1);changeDate(localDate(date));};
  $('next').onclick=()=>{const date=parseDate(selected);date.setDate(date.getDate()+1);changeDate(localDate(date));};
  $('date').onchange=event=>changeDate(event.target.value);$('today').onclick=()=>changeDate(localDate());
  $('journal-tab').onclick=()=>switchView(false);$('history-tab').onclick=()=>switchView(true);
  $('history-rows').onclick=event=>{const button=event.target.closest('[data-view]');if(button){changeDate(button.dataset.view);switchView(false);}};
  $('export').onclick=()=>{
    if(!state.entries.length){showToast('Log a meal before exporting your records.');return;}
    const cell=value=>`"${String(value ?? '').replace(/"/g,'""')}"`;
    const rows=[['Date','Meal','Food','Serving / note','Calories (kcal)','Protein (g)','Carbs (g)','Fat (g)','Daily goal (kcal)'],...state.entries.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,e.meal,e.name,e.serving,e.calories,e.protein,e.carbs,e.fat,goalFor(e.date)])];
    const safeCell=value=>cell(typeof value==='string' && /^[=+\-@\t\r]/.test(value)?`'${value}`:value);
    const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(safeCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=`daily-plate-${localDate()}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('Records exported');
  };
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  render();
})();
