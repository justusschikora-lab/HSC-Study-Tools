/* ── STORAGE KEYS ── */
const KEY = 'hsc_dash_v2';
const TK  = 'hsc_timer_v2';
const PK  = 'hsc_pomo_v1';

/* ── SUBJECTS ── */
const SUBJECTS = [
  {id:'eng', name:'English Advanced',   short:'English', icon:'📚', color:'var(--eng)', bg:'var(--engb)', br:'var(--engbr)', url:'english/index.html', lsKey:'hsceng_progress',
   examDate:'2026-10-13', examLabel:'Paper 1 · 13 Oct 09:50', examDate2:'2026-10-14', examLabel2:'Paper 2 · 14 Oct 09:25',
   links:[{l:'Common Module — 1984',h:'common'},{l:'Module A — Tempest/Hagseed',h:'moda'},{l:'Module B — T.S. Eliot',h:'modb'},{l:'Module C — Discursive',h:'modc'}]},
  {id:'math', name:'Maths Standard 2',  short:'Maths',   icon:'📐', color:'var(--math)', bg:'var(--mathb)', br:'var(--mathbr)', url:'math/index.html', lsKey:'hscmath_progress',
   examDate:'2026-10-19', examLabel:'Written · 19 Oct 09:20',
   links:[{l:'Algebra',h:'algebra'},{l:'Measurement',h:'measurement'},{l:'Financial Maths',h:'financial'},{l:'Statistics',h:'statistics'}]},
  {id:'bio', name:'Biology',            short:'Bio',     icon:'🧬', color:'var(--bio)', bg:'var(--biob)', br:'var(--biobr)', url:'biology/index.html', lsKey:'hscbio_progress',
   examDate:'2026-10-21', examLabel:'Written · 21 Oct 09:25',
   links:[{l:'Module 5 — Heredity',h:'m5'},{l:'Module 6 — Genetic Change',h:'m6'},{l:'Module 7 — Infectious Disease',h:'m7'},{l:'Module 8 — Immune System',h:'m8'}]},
  {id:'chem', name:'Chemistry',         short:'Chem',    icon:'⚗️', color:'var(--chem)', bg:'var(--chemb)', br:'var(--chembr)', url:'chemistry/index.html', lsKey:'hscchem_progress',
   examDate:'2026-10-30', examLabel:'Written · 30 Oct 09:25',
   links:[{l:'Module 5 — Equilibrium',h:'m5'},{l:'Module 6 — Acid/Base',h:'m6'},{l:'Module 7 — Organic Chem',h:'m7'},{l:'Module 8 — Applying Chem',h:'m8'}]},
  {id:'ger', name:'German Continuers',  short:'German',  icon:'🇩🇪', color:'var(--ger)', bg:'var(--gerb)', br:'var(--gerbr)', url:'german/index.html', lsKey:'hscger_progress',
   examDate:'2026-08-08', examLabel:'Oral · 8 Aug 10:30', examDate2:'2026-10-13', examLabel2:'Written · 13 Oct 14:00',
   links:[{l:'Text Analysis Devices',h:'lang'},{l:'Oral Exam Prep',h:'oral'},{l:'Topic Vocab Banks',h:'vocab'},{l:'Quiz Mode',h:'quiz'}]},
];

const PAPER_YEARS = {eng:[2019,2020,2021,2022,2023,2024],math:[2019,2020,2021,2022,2023,2024],bio:[2019,2020,2021,2022,2023,2024],chem:[2019,2020,2021,2022,2023,2024],ger:[2019,2020,2021,2022,2023,2024]};

/* ── STATE ── */
const DEF = {todos:[],sessions:[],theme:'black',streak:[],dailyGoalSec:10800,notes:'',papers:{},targets:{},timerMode:'timer',studyMode:'stopwatch',allocatedMin:60,prefs:{}};
let S = load();

function load(){
  try{const s=JSON.parse(localStorage.getItem(KEY));if(s)return Object.assign({},JSON.parse(JSON.stringify(DEF)),s);}catch(e){}
  return JSON.parse(JSON.stringify(DEF));
}
let _svT;
function save(){clearTimeout(_svT);_svT=setTimeout(()=>localStorage.setItem(KEY,JSON.stringify(S)),300);}

/* ── UTILS ── */
function esc(s){return(s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function sj(id){return SUBJECTS.find(s=>s.id===id)||null;}
function today(){return new Date().toISOString().slice(0,10);}
function daysTo(d){return Math.max(0,Math.ceil((new Date(d)-new Date())/86400000));}
function fmt(s){return[Math.floor(s/3600),Math.floor((s%3600)/60),s%60].map(n=>String(n).padStart(2,'0')).join(':');}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}
function beep(){try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator();const g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;g.gain.setValueAtTime(.22,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.55);o.start();o.stop(ctx.currentTime+.55);}catch(e){}}

function markStreak(){const t=today();if(!S.streak.includes(t)){S.streak.push(t);if(S.streak.length>90)S.streak=S.streak.slice(-90);save();}}
function getStreak(){let c=0;const d=new Date();for(;;){const s=d.toISOString().slice(0,10);if(S.streak.includes(s)){c++;d.setDate(d.getDate()-1);}else break;}return c;}
function getProg(s){try{const d=JSON.parse(localStorage.getItem(s.lsKey));if(!d)return 0;const n=Object.values(d.check||{}).filter(Boolean).length;const tot=d.totalTopics||(s.id==='bio'||s.id==='chem'?80:20);return Math.min(100,Math.round(n/tot*100));}catch(e){return 0;}}
function todayStudiedSec(){return S.sessions.filter(s=>s.date===today()&&s.duration>0).reduce((a,s)=>a+(s.duration||0),0);}
function weekDays(){const n=new Date(),mon=new Date(n);mon.setDate(n.getDate()-((n.getDay()+6)%7));return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d.toISOString().slice(0,10);});}
function allExamsSorted(){
  return[
    ...SUBJECTS.map(s=>({short:s.short,label:s.examLabel,date:s.examDate,color:s.color,bg:s.bg,name:s.name,icon:s.icon})),
    ...SUBJECTS.filter(s=>s.examDate2).map(s=>({short:s.short,label:s.examLabel2,date:s.examDate2,color:s.color,bg:s.bg,name:s.name,icon:s.icon})),
  ].sort((a,b)=>new Date(a.date)-new Date(b.date));
}

/* ── TIMER STATE ── */
function getTS(){try{return JSON.parse(localStorage.getItem(TK))||{running:false,elapsed:0,startedAt:null,subject:'eng'};}catch(e){return{running:false,elapsed:0,startedAt:null,subject:'eng'};}}
function saveTS(ts){localStorage.setItem(TK,JSON.stringify(ts));}
function timerSec(){const ts=getTS();return(ts.running&&ts.startedAt)?ts.elapsed+Math.floor((Date.now()-ts.startedAt)/1000):ts.elapsed;}

/* ── POMODORO STATE ── */
function getPomo(){try{return JSON.parse(localStorage.getItem(PK))||{phase:'work',remaining:1500,running:false,startedAt:null,round:0};}catch(e){return{phase:'work',remaining:1500,running:false,startedAt:null,round:0};}}
function savePomo(p){localStorage.setItem(PK,JSON.stringify(p));}

/* ── PAPERS ── */
function togglePaper(sid,yr){if(!S.papers)S.papers={};if(!S.papers[sid])S.papers[sid]={};const p=S.papers[sid][yr]||{done:false,score:null};S.papers[sid][yr]={done:!p.done,score:!p.done?p.score:null};save();renderView();}
function setPaperScore(sid,yr,val){if(!S.papers)S.papers={};if(!S.papers[sid])S.papers[sid]={};if(!S.papers[sid][yr])S.papers[sid][yr]={done:true,score:null};S.papers[sid][yr].score=val!=null&&val!==''?+val:null;save();}
function setTarget(sid,hrs){if(!S.targets)S.targets={};S.targets[sid]=hrs;save();}
function editGoal(){const h=+(prompt('Daily goal in hours:',+(S.dailyGoalSec/3600).toFixed(1))||0);if(h>0&&h<=24){S.dailyGoalSec=Math.round(h*3600);save();renderView();}}
function clearHist(){if(confirm('Clear all session history?')){S.sessions=[];save();renderView();}}
