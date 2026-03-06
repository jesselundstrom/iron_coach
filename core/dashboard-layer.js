function isSportWorkout(w){return w.type==='sport'||w.type==='hockey';}
let _lastTmSignature='';
function computeFatigue(){
  const now=Date.now();
  const liftS=workouts.filter(w=>!isSportWorkout(w)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const sportS=workouts.filter(w=>isSportWorkout(w)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const daysSinceLift=liftS.length?(now-new Date(liftS[0].date).getTime())/864e5:99;
  const daysSinceSport=sportS.length?(now-new Date(sportS[0].date).getTime())/864e5:99;
  const last72h=workouts.filter(w=>now-new Date(w.date).getTime()<3*864e5);
  let recentSets=0,recentRPE=0,rpeCount=0;
  last72h.forEach(w=>{
    if(!isSportWorkout(w))w.exercises?.forEach(e=>recentSets+=e.sets.length);
    if(w.rpe){recentRPE+=w.rpe;rpeCount++;}
  });
  const avgRecentRPE=rpeCount?recentRPE/rpeCount:7;
  const recentHasSport=last72h.some(w=>isSportWorkout(w));
  const sc=getSportConfig();
  const cfg=FATIGUE_CONFIG;
  let muscular=Math.max(0,cfg.muscularBase-daysSinceLift*cfg.muscularDecay)+Math.min(30,recentSets*cfg.setsWeight)+(recentHasSport?sc.muscularBonus:0);
  let cns=Math.max(0,cfg.cnsBase-daysSinceLift*cfg.cnsDecay)+(avgRecentRPE-5)*cfg.rpeWeight+(recentHasSport?sc.cnsBonus:0);
  const extraToday=last72h.filter(w=>isSportWorkout(w)&&w.subtype==='extra').length;
  cns+=extraToday*sc.extraCns;
  muscular=Math.min(100,Math.max(0,muscular));cns=Math.min(100,Math.max(0,cns));
  return{muscular:Math.round(muscular),cns:Math.round(cns),overall:Math.round(muscular*.5+cns*.5),daysSinceLift,daysSinceSport,recentSets,avgRecentRPE};
}
function wasSportRecently(hours){
  const sc=getSportConfig();
  hours=hours||sc.recentHours;
  return workouts.some(w=>isSportWorkout(w)&&(Date.now()-new Date(w.date).getTime())<hours*3600000);
}
// Backward-compat alias used by program files
function wasHockeyRecently(hours){return wasSportRecently(hours);}
function getRecoveryColor(r){return r>=85?'var(--green)':r>=60?'var(--orange)':'var(--accent)';}
function getRecoveryGradient(r){
  if(r>=85)return{start:'#2eddb1',mid:'#7cf2d6',end:'#119b79',glow:'rgba(46,221,177,0.48)'};
  if(r>=60)return{start:'#ffd166',mid:'#ffc24a',end:'#f08a22',glow:'rgba(255,185,78,0.44)'};
  return{start:'#ff9b76',mid:'#ff7a5c',end:'#ff5a44',glow:'rgba(255,106,84,0.42)'};
}
function getReadinessLabel(o){
  const r=100-o;
  if(r>=75)return{label:'Fully Recovered',color:'var(--green)'};
  if(r>=50)return{label:'Mostly Recovered',color:'var(--orange)'};
  if(r>=30)return{label:'Partially Fatigued',color:'var(--orange)'};
  return{label:'High Fatigue',color:'var(--accent)'};
}
function updateFatigueBars(f){
  ['muscular','cns','overall'].forEach(k=>{
    const el=document.getElementById('f-'+k),vEl=document.getElementById('f-'+k+'-val');
    const recovery=100-f[k];
    if(el){
      const bars=getRecoveryGradient(recovery);
      el.style.width=recovery+'%';
      el.style.setProperty('--bar-start',bars.start);
      el.style.setProperty('--bar-mid',bars.mid);
      el.style.setProperty('--bar-end',bars.end);
      el.style.setProperty('--bar-glow',bars.glow);
    }
    if(vEl)vEl.textContent=recovery+'%';
  });
  const overallRec=100-f.overall;
  let badgeText,badgeCls;
  if(overallRec>=85){badgeText='GO';badgeCls='rbadge-go';}
  else if(overallRec>=60){badgeText='CAUTION';badgeCls='rbadge-caution';}
  else{badgeText='REST';badgeCls='rbadge-rest';}
  const badgeEl=document.getElementById('recovery-badge');
  if(badgeEl)badgeEl.innerHTML=`<span class="readiness-badge ${badgeCls}">${badgeText}</span>`;
}

// DATA HELPERS
function buildExerciseIndex(){
  exerciseIndex={};
  workouts.forEach(w=>{
    w.exercises?.forEach(e=>{
      if(!exerciseIndex[e.name]||new Date(w.date)>new Date(exerciseIndex[e.name].date))
        exerciseIndex[e.name]={sets:e.sets,date:w.date};
    });
  });
}
function getPreviousSets(name){return exerciseIndex[name]?.sets||null;}
function getSuggested(name){const prev=getPreviousSets(name);if(!prev?.length)return null;const max=Math.max(...prev.map(s=>parseFloat(s.weight)||0));return prev.every(s=>s.done)?Math.round((max+2.5)*2)/2:max;}

// WEEK STRIP
function renderWeekStrip(){
  const strip=document.getElementById('week-strip');
  const today=new Date(),todayDow=today.getDay();
  const start=new Date(today);start.setDate(today.getDate()-((todayDow+6)%7));
  const sn=schedule.sportName||'Sport';
  strip.innerHTML='';
  for(let i=0;i<7;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    const dow=d.getDay(),isToday=d.toDateString()===today.toDateString();
    const logged=workouts.filter(w=>new Date(w.date).toDateString()===d.toDateString());
    const isSportDay=schedule.sportDays.includes(dow);
    const hasLift=logged.some(w=>!isSportWorkout(w)),hasSport=logged.some(w=>isSportWorkout(w));
    const isLogged=hasLift||hasSport;
    let cls='day-pill'+(isSportDay?' sport':'')+(isToday?' today':'')+(isLogged?' logged':'');
    let icon=hasLift&&hasSport?'WS':hasLift?'W':hasSport?'S':(isSportDay?'S':'');
    const bottom=isLogged?`<div class="day-check">✓</div>`:`<div style="font-size:11px;margin-top:2px;min-height:14px">${icon}</div>`;
    strip.innerHTML+=`<div class="${cls}" onclick="toggleDayDetail(${i})"><div class="day-label">${DAY_NAMES[dow]}</div><div class="day-num">${d.getDate()}</div>${bottom}</div>`;
  }
  const todayIsSportDay=schedule.sportDays.includes(todayDow);
  const todayLogged=workouts.filter(w=>new Date(w.date).toDateString()===today.toDateString());
  const tHasLift=todayLogged.some(w=>!isSportWorkout(w)),tHasSport=todayLogged.some(w=>isSportWorkout(w));
  let s='';
  if(tHasLift&&tHasSport)s=`<span style="color:var(--green);font-weight:700">Workout + ${sn} logged</span>`;
  else if(tHasLift)s=`<span style="color:var(--green);font-weight:700">Workout logged</span>`;
  else if(tHasSport)s=`<span style="color:var(--blue);font-weight:700">${sn} logged</span>`;
  else if(todayIsSportDay)s=`<span style="color:var(--blue);font-weight:700">${sn} day</span>`;
  document.getElementById('today-status').innerHTML=s;
}

function toggleDayDetail(dayIdx){
  const panel=document.getElementById('day-detail-panel');
  if(!panel)return;
  if(panel.dataset.active===String(dayIdx)&&panel.style.display!=='none'){
    panel.style.display='none';
    panel.dataset.active='';
    document.querySelectorAll('#week-strip .day-pill').forEach(p=>p.classList.remove('active'));
    return;
  }
  panel.dataset.active=String(dayIdx);
  document.querySelectorAll('#week-strip .day-pill').forEach((p,i)=>p.classList.toggle('active',i===dayIdx));
  const today=new Date(),todayDow=today.getDay();
  const start=new Date(today);start.setDate(today.getDate()-((todayDow+6)%7));
  const d=new Date(start);d.setDate(start.getDate()+dayIdx);
  const logged=workouts.filter(w=>new Date(w.date).toDateString()===d.toDateString());
  if(logged.length){
    const items=[];
    logged.forEach(w=>{
      if(isSportWorkout(w)){
        items.push(`<div class="day-detail-item"><span style="color:var(--blue)">${w.name||(schedule.sportName||'Sport')}</span></div>`);
      } else {
        const names=(w.exercises||[]).map(e=>e.name);
        if(names.length)names.forEach(n=>items.push(`<div class="day-detail-item">${n}</div>`));
        else items.push(`<div class="day-detail-item" style="color:var(--muted)">Workout</div>`);
      }
    });
    panel.innerHTML=items.join('');
  } else {
    const dow=d.getDay(),isSportDay=schedule.sportDays.includes(dow),isPast=d<today&&!d.toDateString()===today.toDateString();
    const label=isSportDay?(schedule.sportName||'Sport')+' day':'No session logged';
    panel.innerHTML=`<div class="day-detail-item" style="color:var(--muted)">${label}</div>`;
  }
  panel.style.display='block';
}

// DASHBOARD
function updateDashboard(){
  renderWeekStrip();
  const f=computeFatigue();updateFatigueBars(f);
  const prog=getActiveProgram(),ps=getActiveProgramState();

  // Training Maxes - dynamic per program
  const tmGrid=document.getElementById('tm-grid');
  const tmTitle=document.getElementById('tm-section-title');
  if(tmGrid&&prog.getDashboardTMs){
    const tms=prog.getDashboardTMs(ps);
    const tmSignature=tms.map(t=>`${t.name}:${t.value}`).join('|');
    const tmChanged=!!_lastTmSignature&&tmSignature!==_lastTmSignature;
    _lastTmSignature=tmSignature;
    tmGrid.innerHTML=tms.map((t,i)=>`<div class="lift-stat${tmChanged?' tm-updated':''}" style="--tm-delay:${i*65}ms"><div class="value">${t.value}</div><div class="label">${t.name}</div></div>`).join('');
    if(tmTitle)tmTitle.textContent=prog.dashboardStatsLabel||'Training Maxes';
  }

  // Weekly session progress
  const now=new Date(),sow=new Date(now);sow.setDate(now.getDate()-((now.getDay()+6)%7));sow.setHours(0,0,0,0);
  const freq=ps.daysPerWeek||3;
  const doneThisWeek=workouts.filter(w=>(w.program===prog.id||(!w.program&&w.type===prog.id))&&new Date(w.date)>=sow).length;
  const sportThisWeek=workouts.filter(w=>isSportWorkout(w)&&new Date(w.date)>=sow).length;
  const sn=schedule.sportName||'Sport';
  const pillsEl=document.getElementById('session-pills');
  if(pillsEl)pillsEl.innerHTML=Array.from({length:freq},(_,i)=>`<div class="session-pill${i<doneThisWeek?' done':''}"></div>`).join('');
  let volText=doneThisWeek+'/'+freq+' sessions';
  if(sportThisWeek)volText+=' · '+sportThisWeek+' '+sn.toLowerCase();
  if(doneThisWeek>=freq)volText+=' ✓';
  document.getElementById('volume-text').textContent=volText;

  // Today's Plan - uses program's getBlockInfo
  const recovery=100-f.overall,todayDow=new Date().getDay();
  const isSportDay=schedule.sportDays.includes(todayDow);
  const hadSportRecently=wasSportRecently(36);
  const bi=prog.getBlockInfo?prog.getBlockInfo(ps):{name:'',weekLabel:'',isDeload:false,pct:null,modeDesc:'',modeName:''};
  const modeDescHtml=bi.modeDesc?`<div style="font-size:11px;color:var(--muted);margin-bottom:10px;padding:0 2px">${bi.modeDesc}</div>`:'';
  const startBtn=`<button class="btn btn-primary" style="margin-top:12px;width:100%" onclick="goToLog()">Start Session</button>`;
  let rec='',cardAccent=false;
  if(doneThisWeek>=freq) rec=modeDescHtml+`<div style="font-weight:700;color:var(--green);margin-bottom:6px">Week complete!</div><div style="font-size:13px;color:var(--muted)">All ${freq} sessions done. Rest up.</div>`;
  else if(recovery<40) rec=modeDescHtml+`<div style="font-weight:700;color:var(--accent);margin-bottom:6px">High fatigue - rest or deload</div><div style="font-size:13px;color:var(--muted)">Recovery ${recovery}%. ${bi.isDeload?'Good timing - deload!':'Consider resting today.'} ${freq-doneThisWeek} session${freq-doneThisWeek>1?'s':''} left.</div>`;
  else if(isSportDay){cardAccent=true;rec=modeDescHtml+`<div style="font-weight:700;color:var(--blue);margin-bottom:6px">${sn} day</div><div style="font-size:13px;color:var(--muted)">Pick an upper-body day on the Log tab, or rest. ${freq-doneThisWeek} session${freq-doneThisWeek>1?'s':''} left this week.</div>${startBtn}`;}
  else if(hadSportRecently){cardAccent=true;rec=modeDescHtml+`<div style="font-weight:700;color:var(--blue);margin-bottom:6px">Post-${sn.toLowerCase()}</div><div style="font-size:13px;color:var(--muted)">Legs may be fatigued. The Log tab will suggest an upper-focused day. ${freq-doneThisWeek} left.</div>${startBtn}`;}
  else if(bi.isDeload){cardAccent=true;rec=modeDescHtml+`<div style="font-weight:700;color:var(--green);margin-bottom:6px">Deload week</div><div style="font-size:13px;color:var(--muted)">Recovery ${recovery}%. ${freq-doneThisWeek} session${freq-doneThisWeek>1?'s':''} left.</div>${startBtn}`;}
  else{cardAccent=true;rec=modeDescHtml+`<div style="font-weight:700;color:var(--accent);margin-bottom:6px">Training day</div><div style="font-size:13px;color:var(--muted)">Recovery ${recovery}% - ${recovery>=75?'feeling fresh, push it':'moderate effort'}. ${freq-doneThisWeek} session${freq-doneThisWeek>1?'s':''} left this week.</div>${startBtn}`;}
  document.getElementById('next-session-content').innerHTML=rec;
  document.getElementById('next-session-content').parentElement.style.borderColor=cardAccent?'var(--accent)':'';
  document.getElementById('header-sub').textContent=`${prog.name||'Training'} - ${bi.name||''} - ${bi.weekLabel||''} - Recovery ${recovery}%`;
}
