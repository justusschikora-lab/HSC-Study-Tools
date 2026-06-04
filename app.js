/* ── NAVIGATION ── */
let _currentView = 'dashboard';
let _activeSubj  = 'eng';

function navTo(view) {
  _currentView = view;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => {
    const active = v.id === 'view-' + view;
    v.classList.toggle('active', active);
    v.hidden = !active;
  });
  const labels = {dashboard:'Dashboard',timer:'Study Timer',subjects:'Subjects',schedule:'Schedule',goals:'Goals'};
  document.querySelector('.topbar h1').textContent = labels[view] || view;
  renderView();
  if (view === 'goals') requestAnimationFrame(drawGraph);
  if (view === 'timer') requestAnimationFrame(() => { drawLineGraph28d(); drawLineGraphAll(); });
}

function renderView() {
  switch (_currentView) {
    case 'dashboard': renderDashboard(); break;
    case 'timer':     renderTimer();     break;
    case 'subjects':  renderSubjects();  break;
    case 'schedule':  renderSchedule();  break;
    case 'goals':     renderGoals();     break;
  }
  updateSideStreak();
  renderSidebarTimer();
}

/* ── GO TO SUBJECT PAGE ── */
function go(id) {
  const s = sj(id);
  if (!s) return;
  S.sessions.push({date:today(),time:new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}),subject:id,section:'General',duration:0});
  save();
  window.location = s.url;
}
function goSec(id, h) {
  const s = sj(id);
  if (!s) return;
  S.sessions.push({date:today(),time:new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}),subject:id,section:h,duration:0});
  save();
  window.location = s.url + '#' + h;
}

/* ── SIDEBAR STREAK ── */
function updateSideStreak() {
  const el = document.getElementById('sideStreak');
  if (!el) return;
  const streak = getStreak();
  el.innerHTML = `<span style="font-size:15px">🔥</span><span><b>${streak}</b> day streak</span>`;
}

/* ── SIDEBAR PERSISTENT TIMER ── */
function renderSidebarTimer() {
  const el = document.getElementById('sideTimerWrap');
  if (!el) return;
  const ts = getTS(), tS = sj(ts.subject) || SUBJECTS[0];
  const sec = timerSec();
  const sMode = S.studyMode || 'stopwatch';
  const allocSec = (S.allocatedMin || 60) * 60;
  const dispSec = sMode === 'countdown' ? Math.max(0, allocSec - sec) : sec;
  const todayS = todayStudiedSec() + (ts.running ? sec : 0);
  const gPct = Math.min(100, Math.round(todayS / S.dailyGoalSec * 100));

  el.className = 'side-timer' + (ts.running ? ' running' : '');
  el.style.setProperty('--st-color', tS.color);
  el.style.setProperty('--st-glow', tS.color + '44');

  el.innerHTML = `
    <div class="st-top">
      <span class="st-label">${ts.running ? '● Live' : '⏱ Timer'}</span>
      <span class="st-dot" style="background:${tS.color};${ts.running?'box-shadow:0 0 6px '+tS.color:'opacity:.4'}"></span>
    </div>
    <div class="st-disp" id="sideTimerDisp" style="color:${tS.color}">${fmt(dispSec)}</div>
    <div class="st-subj">${tS.icon} ${tS.name}</div>
    <div class="st-bar"><i id="sideTimerBar" style="width:${gPct}%;background:${tS.color}"></i></div>`;
}

/* ── TOPBAR DATE ── */
function updateDate() {
  const el = document.getElementById('topDate');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'});
}

/* ── HELPERS ── */
function getTermWeek() {
  const terms = [
    {t:1,s:'2026-01-27',e:'2026-04-09'},
    {t:2,s:'2026-04-28',e:'2026-07-03'},
    {t:3,s:'2026-07-21',e:'2026-09-25'},
    {t:4,s:'2026-10-13',e:'2026-12-18'},
  ];
  const now = new Date();
  for (const t of terms) {
    const s=new Date(t.s), e=new Date(t.e);
    if (now>=s && now<=e) {
      const wk = Math.ceil((now-s+864e5)/(7*864e5));
      return `Term ${t.t}, Week ${wk}`;
    }
  }
  return null;
}

function getSuggestedTopic(s) {
  const doy = Math.floor((new Date()-new Date(new Date().getFullYear(),0,1))/864e5);
  return s.links[doy % s.links.length] || s.links[0];
}

function ringHTML(pct, color, size=64) {
  const r = 15.9, circ = 2*Math.PI*r;
  const filled = (pct/100)*circ;
  return `<svg class="ring-svg" viewBox="0 0 36 36" style="width:${size}px;height:${size}px;transform:rotate(-90deg)">
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2.5"/>
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="${color}" stroke-width="2.5"
      stroke-dasharray="${filled.toFixed(2)} ${circ.toFixed(2)}" stroke-linecap="round"/>
  </svg>`;
}

/* ══════════════════════════════════════════
   DASHBOARD VIEW
══════════════════════════════════════════ */
function renderDashboard() {
  const view = document.getElementById('view-dashboard');
  const ts = getTS(), tS = sj(ts.subject) || SUBJECTS[0];
  const sec = timerSec();
  const todayS = todayStudiedSec() + (ts.running ? sec : 0);
  const gPct = Math.min(100, Math.round(todayS / S.dailyGoalSec * 100));
  const wds = weekDays();
  const wSec = S.sessions.filter(s=>wds.includes(s.date)&&s.duration>0).reduce((a,s)=>a+(s.duration||0),0);
  const wPct = Math.min(100, Math.round(wSec / S.dailyGoalSec / 7 * 100));
  const allocSec = (S.allocatedMin || 60) * 60;
  const dispSec = (S.studyMode||'stopwatch') === 'countdown' ? Math.max(0, allocSec - sec) : sec;
  const exams = allExamsSorted().filter(e=>daysTo(e.date)>0);
  const nextExam = exams[0];
  const isCritical = nextExam && daysTo(nextExam.date) <= 14;
  const termWeek = getTermWeek();
  const focusTopic = getSuggestedTopic(tS);

  // Update topbar subtitle with term info
  const dateEl = document.getElementById('topDate');
  if (dateEl) {
    const d = new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'});
    dateEl.textContent = termWeek ? `${d} · ${termWeek}` : d;
  }

  const cMap = {eng:'var(--eng)',bio:'var(--bio)',chem:'var(--chem)',math:'var(--math)',ger:'var(--ger)'};

  view.innerHTML = `<div class="dash">

    <!-- ROW 1: Banner — active study subject -->
    <div class="dash-banner-v2${ts.running?' banner-running':''}"
      style="background:${tS.bg};border-color:${tS.color};--bgl:${tS.color}44;--bgli:${tS.color}18">
      <div class="dbv2-left">
        <div>
          <div class="dbv2-label">
            <span class="dbv2-arrow" style="color:${tS.color}">${tS.icon}</span>
            <span style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--mu);font-weight:600">Now Studying</span>
            ${ts.running
              ? `<span class="dbv2-tag" style="background:${tS.bg};color:${tS.color};border:1px solid ${tS.br}">● Live</span>`
              : `<span class="dbv2-tag" style="background:var(--sf2);color:var(--mu);border:1px solid var(--bd)">○ Paused</span>`}
          </div>
          <div style="display:flex;align-items:center;gap:14px">
            <div>
              <div class="dbv2-days" style="color:${tS.color}" id="bannerTime">${fmt(dispSec)}</div>
              <div class="dbv2-dayslabel">${(S.studyMode||'stopwatch')==='countdown'?'remaining':'elapsed'}</div>
            </div>
            <div class="dbv2-info">
              <div class="dbv2-subject">
                <span class="dbv2-dot" style="background:${tS.color}"></span>
                <span style="color:${tS.color};font-size:18px;font-family:'Bricolage Grotesque',sans-serif">${tS.name}</span>
              </div>
              <div class="dbv2-desc">${esc(tS.examLabel)} · ${daysTo(tS.examDate)}d to exam</div>
            </div>
          </div>
        </div>
      </div>
      <div class="dbv2-right">
        ${exams.slice(0,4).map(e=>`
          <div class="dbv2-exam-chip">
            <span class="dbv2-dot" style="background:${e.color}"></span>
            <span style="color:var(--mu)">${esc(e.short)}</span>
            <span style="font-weight:700;color:${e.color}">${daysTo(e.date)}d</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- ROW 2: 5 Subject cards + timer widget (slot 6) -->
    <div class="dash-subjects-v2">
      ${SUBJECTS.map(s => {
        const p = getProg(s);
        const sp = (S.papers||{})[s.id]||{};
        const yrs = PAPER_YEARS[s.id]||[];
        const done = yrs.filter(y=>sp[y]?.done).length;
        const topic = getSuggestedTopic(s);
        return `<div class="subj-card-v2" style="border-color:${ts.subject===s.id?s.color:'var(--bd)'}" onclick="go('${s.id}')">
          <div class="scv2-top">
            <div class="scv2-name">${s.name}</div>
            <div class="scv2-dot" style="background:${s.color}"></div>
          </div>
          <div class="scv2-num" style="color:${s.color}">${p}</div>
          <div class="scv2-pct-label">% course</div>
          <div class="scv2-bar"><i style="width:${p}%;background:${s.color}"></i></div>
          <div class="scv2-foot">
            <div class="scv2-row">
              <span>Next exam</span>
              <span class="scv2-badge" style="background:${s.bg};color:${s.color};border:1px solid ${s.br}">${daysTo(s.examDate)}d</span>
            </div>
            <div class="scv2-row" style="margin-top:6px">
              <span>Papers done</span>
              <b style="color:${done===yrs.length&&done>0?'var(--bio)':'var(--tx)'}">${done}/${yrs.length}</b>
            </div>
          </div>
        </div>`;
      }).join('')}

      <!-- Slot 6: Timer widget -->
      <div class="subj-card-v2 timer-grid-card" style="border-color:${tS.color};background:linear-gradient(160deg,${tS.bg},transparent 70%)">
        <div class="scv2-top" style="margin-bottom:2px">
          <div style="font-size:11px;font-weight:600;color:var(--tx)">Study Timer</div>
          <span class="tgc-status" style="background:${ts.running?tS.bg:'var(--sf2)'};color:${ts.running?tS.color:'var(--mu)'};border:1px solid ${ts.running?tS.br:'var(--bd)'}">
            ${ts.running?'● Live':'○ Idle'}
          </span>
        </div>
        <div class="ts-row" style="margin-bottom:4px">
          ${SUBJECTS.map(s=>`<button class="tsb${ts.subject===s.id?' on':''}" style="${ts.subject===s.id?`background:${s.color};border-color:${s.br};color:#fff`:''};padding:3px 7px;font-size:10px" onclick="setTimerSubj('${s.id}')">${s.short}</button>`).join('')}
        </div>
        <div class="ts-row" style="margin-bottom:2px">
          <button class="tsb${(S.studyMode||'stopwatch')==='stopwatch'?' on':''}" style="${(S.studyMode||'stopwatch')==='stopwatch'?`background:${tS.color};border-color:${tS.br};color:#fff`:''};font-size:10px;padding:3px 8px" onclick="setStudyMode('stopwatch')">⏱ SW</button>
          <button class="tsb${S.studyMode==='countdown'?' on':''}" style="${S.studyMode==='countdown'?`background:${tS.color};border-color:${tS.br};color:#fff`:''};font-size:10px;padding:3px 8px" onclick="setStudyMode('countdown')">⏳ ${S.allocatedMin||60}m</button>
        </div>
        <div class="tgc-disp" id="tDisp" style="color:${tS.color}">${fmt(dispSec)}</div>
        <div class="pb" style="height:3px"><i id="tGoalBar" style="width:${(S.studyMode||'stopwatch')==='countdown'?Math.min(100,Math.round(sec/allocSec*100)):gPct}%;background:${tS.color}"></i></div>
        <div class="tgc-btns">
          <button class="tgc-btn ${ts.running?'pause':'start'}" id="tStartBtn"
            style="background:${ts.running?'rgba(245,158,11,.15)':tS.color};color:${ts.running?'#f59e0b':'#fff'};border:1px solid ${ts.running?'rgba(245,158,11,.3)':'transparent'}"
            onclick="${ts.running?'timerPause()':'timerStart()'}">
            ${ts.running?'⏸ Pause':'▶ Start'}
          </button>
          <button class="tgc-btn stop" id="tStopBtn"
            style="background:var(--sf2);border:1px solid var(--bd);color:var(--mu);display:${ts.running||ts.elapsed>0?'block':'none'}"
            onclick="timerStop()">⏹</button>
        </div>
        <div style="margin-top:4px;font-size:10px;color:var(--mu);text-align:center" id="tGoalLbl">
          ${(S.studyMode||'stopwatch')==='countdown'?(sec>0?`${fmt(sec)} elapsed · ${fmt(Math.max(0,allocSec-sec))} left`:fmt(allocSec)+' set'):`${fmt(todayS)} today`}
        </div>
      </div>
    </div>

    <!-- ROW 3: Goals + Focus block -->
    <div class="dash-bottom-v2">

      <!-- Goals with rings -->
      <div class="card" style="padding:14px 16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:13px;font-weight:600">Study goals</span>
          <span style="font-size:13px;color:var(--mu)">🔥 ${getStreak()} day streak</span>
        </div>
        <div class="goals-ring-wrap">
          <div class="ring-item">
            ${ringHTML(gPct,'var(--eng)')}
            <div class="ring-info">
              <div class="ring-pct" style="color:var(--eng)">${gPct}%</div>
              <div class="ring-label">Today</div>
              <div class="ring-val">${fmt(todayS)} <span style="color:var(--mu);font-weight:400">/ ${(S.dailyGoalSec/3600).toFixed(0)}h</span></div>
            </div>
          </div>
          <div class="ring-item">
            ${ringHTML(wPct,'var(--bio)')}
            <div class="ring-info">
              <div class="ring-pct" style="color:var(--bio)">${wPct}%</div>
              <div class="ring-label">This week</div>
              <div class="ring-val">${(wSec/3600).toFixed(1)}h <span style="color:var(--mu);font-weight:400">/ ${(S.dailyGoalSec*7/3600).toFixed(0)}h</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Focus block -->
      <div class="card" style="padding:14px 16px">
        <div class="focus-v2">
          <div class="focus-v2-head">
            <span class="focus-v2-title">Today's focus block</span>
            <div class="focus-mode-toggle">
              <button class="focus-mode-btn on">Auto</button>
              <button class="focus-mode-btn" onclick="navTo('timer')">Manual →</button>
            </div>
          </div>
          <div class="focus-v2-badge">
            <span class="focus-v2-badge-dot" style="background:${tS.color}"></span>
            <span class="focus-v2-badge-label">${tS.short} · Suggested</span>
          </div>
          <div class="focus-v2-topic">${esc(focusTopic?.l || tS.name)}</div>
          <div class="focus-v2-mastery">
            <div class="focus-v2-mastery-row">
              <span>Topic mastery</span>
              <span>${getProg(tS)}%</span>
            </div>
            <div class="focus-v2-bar"><i style="width:${getProg(tS)}%;background:${tS.color}"></i></div>
          </div>
        </div>
      </div>

    </div>
  </div>`;
}

function _OLD_DASH_REMOVED() { return; /* replaced */
  // old left column - deleted
  const _DASH_LEFT = `<div class="dash-left">
      <div class="card focus-block" id="focusBlock" style="border-color:${tS.br};box-shadow:0 0 60px ${tS.bg}">
        <div class="focus-glow" style="background:radial-gradient(ellipse 80% 60% at 50% 30%,${tS.bg},transparent 70%)"></div>
        <div class="focus-content">
          <div class="focus-icon">${tS.icon}</div>
          <div class="focus-subj" style="color:${tS.color}">${tS.name}</div>
          <div class="focus-exam">${esc(tS.examLabel)}</div>
          <div class="focus-days" style="color:${tS.color}">${daysTo(tS.examDate)}</div>
          <div class="focus-days-label">days to exam</div>
          <div style="width:100%;margin:10px 0 4px">
            <div class="pb" style="height:4px"><i style="width:${getProg(tS)}%;background:${tS.color}"></i></div>
            <div style="font-size:10px;color:${tS.color};text-align:right;margin-top:3px">${getProg(tS)}% syllabus</div>
          </div>
          <button class="focus-btn" style="background:${tS.color}" onclick="enterFocus()">⚡ Enter Focus Mode</button>
        </div>
      </div>

      <div class="card dash-goals-slim">
        <div class="ct" style="margin-bottom:8px">🎯 Today's Progress</div>
        <div style="margin-bottom:8px">
          <div class="gt"><span>Today</span><b onclick="editGoal()" title="Click to edit" style="cursor:pointer">${fmt(todayS)} / ${(S.dailyGoalSec/3600).toFixed(0)}h</b></div>
          <div class="pb" style="height:6px"><i style="width:${gPct}%;background:linear-gradient(90deg,var(--eng),var(--math))"></i></div>
        </div>
        <div style="margin-bottom:8px">
          <div class="gt"><span>This week</span><b>${(wSec/3600).toFixed(1)}h / ${(S.dailyGoalSec*7/3600).toFixed(0)}h</b></div>
          <div class="pb" style="height:6px"><i style="width:${wPct}%;background:linear-gradient(90deg,var(--bio),var(--math))"></i></div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12.5px;padding-top:6px;border-top:1px solid var(--bd)">
          <span>🔥</span>
          <b style="font-family:'Bricolage Grotesque',sans-serif;font-size:16px">${streak}</b>
          <span style="color:var(--mu)">day streak</span>
          <span style="margin-left:auto;font-size:10.5px;color:${gPct>=100?'var(--bio)':'var(--mu)'}">${gPct>=100?'✅ Done!':gPct+'%'}</span>
        </div>
      </div>
    </div>

    <!-- CENTER: Subjects -->
    <div class="card dash-center">
      <div class="ct" style="flex-shrink:0">📚 Your Subjects <span style="margin-left:auto;font-size:11px;color:var(--mu);font-weight:400">Click to open</span></div>
      <div class="dash-subjects-grid">
        ${SUBJECTS.map(s=>{const p=getProg(s);return`
          <div style="background:var(--sf2);border:1px solid ${ts.subject===s.id?s.color:s.br};border-radius:var(--rs);padding:9px 10px;cursor:pointer;transition:transform .15s,border-color .15s;display:flex;flex-direction:column;gap:5px" onclick="go('${s.id}')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
            <div style="display:flex;align-items:center;gap:7px">
              <div style="width:26px;height:26px;border-radius:7px;background:${s.bg};border:1px solid ${s.br};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">${s.icon}</div>
              <div style="min-width:0;flex:1">
                <div style="font-size:11.5px;font-weight:700;font-family:'Bricolage Grotesque',sans-serif;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
                <div style="font-size:9.5px;color:${s.color};font-weight:600">${p}% · ${daysTo(s.examDate)}d</div>
              </div>
            </div>
            <div class="pb" style="height:3px"><i style="width:${p}%;background:${s.color}"></i></div>
          </div>`;}).join('')}
      </div>
    </div>

    <!-- RIGHT: Detailed Timer -->
    <div class="card dash-right">
      <div class="dash-timer-card">
        <div class="ct" style="flex-shrink:0;margin-bottom:8px">⏱ Study Timer</div>

        <!-- Subject selector -->
        <div class="ts-row" style="flex-shrink:0">
          ${SUBJECTS.map(s=>`<button class="tsb${ts.subject===s.id?' on':''}" style="${ts.subject===s.id?`background:${s.color};border-color:${s.br}`:''}" onclick="setTimerSubj('${s.id}')">${s.short}</button>`).join('')}
        </div>

        <!-- Mode toggle -->
        <div style="display:flex;gap:4px;margin-bottom:10px;flex-shrink:0">
          <button class="tsb${mode==='stopwatch'?' on':''}" style="${mode==='stopwatch'?'background:var(--eng);border-color:var(--engbr);':''}width:50%;justify-content:center;text-align:center" onclick="setStudyMode('stopwatch')">⏱ Stopwatch</button>
          <button class="tsb${mode==='countdown'?' on':''}" style="${mode==='countdown'?'background:var(--eng);border-color:var(--engbr);':''}width:50%;justify-content:center;text-align:center" onclick="setStudyMode('countdown')">⏳ Timer</button>
        </div>

        <!-- Allocated time (countdown only) -->
        ${mode==='countdown'?`
        <div class="alloc-row" style="flex-shrink:0">
          <span>Set duration:</span>
          <input type="number" min="1" max="480" value="${S.allocatedMin||60}" onchange="S.allocatedMin=Math.max(1,+this.value||60);save();renderView()"/>
          <span>min</span>
          <span style="margin-left:auto;font-size:10.5px;color:${sec>0&&mode==='countdown'?tS.color:'var(--mu2)'}">${fmt(allocSec)} total</span>
        </div>`:'<div style="height:8px;flex-shrink:0"></div>'}

        <!-- Time display -->
        <div class="tdisp" id="tDisp" style="color:${tS.color};flex-shrink:0">${fmt(dispSec)}</div>

        <!-- Progress bar -->
        <div class="pb" style="height:5px;flex-shrink:0">
          <i id="tGoalBar" style="width:${mode==='countdown'?Math.min(100,Math.round(sec/allocSec*100)):gPct}%;background:${tS.color}"></i>
        </div>
        <div style="font-size:10px;color:var(--mu);text-align:right;margin-top:3px;flex-shrink:0" id="tGoalLbl">
          ${mode==='countdown'?(sec>0?`${fmt(sec)} elapsed · ${fmt(Math.max(0,allocSec-sec))} left`:'Set a duration, then start'):`${fmt(todayS)} studied today`}
        </div>

        <!-- Controls -->
        <div class="tbtns" style="margin-top:10px;flex-shrink:0">
          <button class="tbtn ${ts.running?'pause':'start'}" id="tStartBtn" onclick="${ts.running?'timerPause()':'timerStart()'}">
            ${ts.running?(mode==='countdown'?'⏸ Pause':'⏸ Pause'):'▶ Start'}
          </button>
          <button class="tbtn stop" id="tStopBtn" style="display:${ts.running||ts.elapsed>0?'inline-block':'none'}" onclick="timerStop()">⏹ Save</button>
        </div>

        <!-- Pomodoro toggle -->
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd);flex-shrink:0">
          <button class="tsb" style="width:100%;text-align:center" onclick="navTo('timer')">🍅 Pomodoro & full timer →</button>
        </div>

        <!-- Upcoming exams -->
        <div style="flex:1;min-height:0;overflow:hidden;margin-top:10px;padding-top:10px;border-top:1px solid var(--bd)">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--mu2);margin-bottom:6px">Upcoming exams</div>
          ${exams.filter(e=>daysTo(e.date)>0).slice(0,5).map(e=>`
            <div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px">
              <span style="width:5px;height:5px;border-radius:50%;background:${e.color};flex-shrink:0;display:block"></span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--mu)">${esc(e.label)}</span>
              <span style="font-weight:700;color:${e.color};flex-shrink:0">${daysTo(e.date)}d</span>
            </div>`).join('')}
        </div>
      </div>
    </div>

  </div>`;
}

function setStudyMode(m) { S.studyMode = m; save(); renderView(); }

/* ══════════════════════════════════════════
   TIMER VIEW (no-scroll bento)
══════════════════════════════════════════ */
function renderTimer() {
  const view = document.getElementById('view-timer');
  const ts = getTS(), sec = timerSec(), tS = sj(ts.subject) || SUBJECTS[0];
  const todayS = todayStudiedSec() + (ts.running ? sec : 0);
  const gPct = Math.min(100, Math.round(todayS / S.dailyGoalSec * 100));
  const mode = S.timerMode || 'timer';
  const sMode = S.studyMode || 'stopwatch';
  const allocSec = (S.allocatedMin || 60) * 60;
  const dispSec = sMode === 'countdown' ? Math.max(0, allocSec - sec) : sec;
  const pm = getPomo();
  const pmSec = pm.running && pm.startedAt ? Math.max(0, pm.remaining - Math.floor((Date.now()-pm.startedAt)/1000)) : pm.remaining;
  const wds = weekDays();
  const wByS = {};
  SUBJECTS.forEach(s=>{wByS[s.id]=S.sessions.filter(ss=>wds.includes(ss.date)&&ss.subject===s.id&&ss.duration>0).reduce((a,ss)=>a+(ss.duration||0),0);});
  const wSec = Object.values(wByS).reduce((a,v)=>a+v,0);
  const maxW = Math.max(...Object.values(wByS),1);
  const sess = S.sessions.filter(s=>s.duration>0).slice().reverse().slice(0,8);

  view.innerHTML = `<div class="timer-view-grid">

    <!-- LEFT: Timer controls -->
    <div class="card tv-timer">
      <!-- Mode row -->
      <div style="display:flex;gap:4px;margin-bottom:8px;flex-shrink:0">
        <button class="tsb${mode==='timer'?' on':''}" style="${mode==='timer'?'background:var(--eng);border-color:var(--engbr);':''}flex:1;text-align:center" onclick="setTimerMode('timer')">⏱ Timer</button>
        <button class="tsb${mode==='pomodoro'?' on':''}" style="${mode==='pomodoro'?'background:var(--eng);border-color:var(--engbr);':''}flex:1;text-align:center" onclick="setTimerMode('pomodoro')">🍅 Pomodoro</button>
      </div>

      <!-- Subject selector -->
      <div class="ts-row" style="flex-shrink:0">
        ${SUBJECTS.map(s=>`<button class="tsb${ts.subject===s.id?' on':''}" style="${ts.subject===s.id?`background:${s.color};border-color:${s.br}`:''}" onclick="setTimerSubj('${s.id}')">${s.short}</button>`).join('')}
      </div>

      ${mode==='timer' ? `
        <!-- Stopwatch / Countdown toggle -->
        <div style="display:flex;gap:4px;margin-bottom:8px;flex-shrink:0">
          <button class="tsb${sMode==='stopwatch'?' on':''}" style="${sMode==='stopwatch'?'background:var(--math);border-color:var(--mathbr);':''}flex:1;text-align:center" onclick="setStudyMode('stopwatch')">⏱ Stopwatch</button>
          <button class="tsb${sMode==='countdown'?' on':''}" style="${sMode==='countdown'?'background:var(--math);border-color:var(--mathbr);':''}flex:1;text-align:center" onclick="setStudyMode('countdown')">⏳ Countdown</button>
        </div>
        ${sMode==='countdown'?`
        <div class="alloc-row" style="flex-shrink:0">
          <span>Duration:</span>
          <input type="number" min="1" max="480" value="${S.allocatedMin||60}" onchange="S.allocatedMin=Math.max(1,+this.value||60);save();renderView()"/>
          <span>min</span>
          <span style="margin-left:auto;color:${tS.color};font-weight:600">${fmt(allocSec)}</span>
        </div>`:'<div style="height:4px;flex-shrink:0"></div>'}
        <div class="tdisp" id="tDisp" style="color:${tS.color};flex-shrink:0">${fmt(dispSec)}</div>
        <div class="pb" style="height:5px;flex-shrink:0">
          <i id="tGoalBar" style="width:${sMode==='countdown'?Math.min(100,Math.round(sec/allocSec*100)):gPct}%;background:${tS.color}"></i>
        </div>
        <div style="font-size:10px;color:var(--mu);text-align:right;margin-top:3px;flex-shrink:0" id="tGoalLbl">
          ${sMode==='countdown'?(sec>0?`${fmt(sec)} elapsed · ${fmt(Math.max(0,allocSec-sec))} left`:fmt(allocSec)+' to go'):`${fmt(todayS)} today · goal ${(S.dailyGoalSec/3600).toFixed(0)}h`}
        </div>
        <div class="tbtns" style="margin-top:8px;flex-shrink:0">
          <button class="tbtn ${ts.running?'pause':'start'}" id="tStartBtn" onclick="${ts.running?'timerPause()':'timerStart()'}">
            ${ts.running?'⏸ Pause':'▶ Start'}
          </button>
          <button class="tbtn stop" id="tStopBtn" style="display:${ts.running||ts.elapsed>0?'inline-block':'none'}" onclick="timerStop()">⏹ Stop & Save</button>
          <button class="tbtn focus-btn" onclick="enterFocus()">⚡ Focus</button>
        </div>
      ` : `
        <div style="text-align:center;flex-shrink:0">
          <div class="pomo-phase" style="background:${pm.phase==='work'?'rgba(239,68,68,.2)':'rgba(34,197,94,.2)'};color:${pm.phase==='work'?'#f87171':'#86efac'}" id="pomoPhase">${pm.phase==='work'?'🍅 Focus':'☕ Break'}</div>
          <div style="font-size:52px;font-weight:800;font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-.02em;color:${pm.phase==='work'?tS.color:'var(--bio)'}" id="pomoDisp">${fmt(pmSec)}</div>
          <div style="font-size:11px;color:var(--mu);margin-bottom:8px" id="pomoRounds">Round ${(pm.round||0)+1} · ${pm.phase==='work'?'25 min focus':'5 min break'}</div>
        </div>
        <div class="tbtns" style="flex-shrink:0">
          <button class="tbtn ${pm.running?'pause':'start'}" id="pomoStartBtn" onclick="pomoToggle()">${pm.running?'⏸ Pause':'▶ Start'}</button>
          <button class="tbtn stop" onclick="pomoReset()">↺ Reset</button>
          <button class="tbtn focus-btn" onclick="enterFocus()">⚡ Focus</button>
        </div>
      `}

      <!-- Today stats -->
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd);flex-shrink:0">
        <div style="display:flex;gap:12px;margin-bottom:8px">
          <div><div style="font-size:10px;color:var(--mu)">Today</div><div style="font-size:16px;font-weight:800;font-family:'Bricolage Grotesque',sans-serif;color:var(--tx)">${fmt(todayS)}</div></div>
          <div><div style="font-size:10px;color:var(--mu)">This week</div><div style="font-size:16px;font-weight:800;font-family:'Bricolage Grotesque',sans-serif;color:var(--tx)">${(wSec/3600).toFixed(1)}h</div></div>
          <div style="flex:1;display:flex;align-items:center;gap:4px;justify-content:flex-end">
            ${SUBJECTS.map(s=>{const w=wByS[s.id];return`<span title="${s.name}: ${(w/3600).toFixed(1)}h" style="display:flex;flex-direction:column;align-items:center;gap:2px"><span style="width:6px;height:${Math.max(4,Math.round(w/maxW*28))}px;border-radius:3px;background:${s.color};opacity:.9"></span></span>`;}).join('')}
          </div>
        </div>
      </div>

      <!-- Session log -->
      <div style="flex:1;min-height:0;overflow:hidden">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--mu2);margin-bottom:4px;display:flex;align-items:center">
          Recent sessions
          ${S.sessions.length?`<button style="margin-left:auto;background:none;border:none;color:var(--mu);font-size:10px;cursor:pointer;padding:0" onclick="clearHist()">clear</button>`:''}
        </div>
        <div class="slist" style="max-height:none;height:100%">
          ${sess.length?sess.map(s=>{const sb=sj(s.subject)||SUBJECTS[0];return`<div class="si" style="padding:5px 8px">
            <span class="sd" style="background:${sb.color}"></span>
            <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${sb.short}</b> · ${esc(s.section||'Session')}</span>
            <span style="font-weight:700;color:${sb.color};flex-shrink:0">${fmt(s.duration)}</span>
          </div>`;}).join(''):`<div class="empty" style="padding:12px">No sessions yet</div>`}
        </div>
      </div>
    </div>

    <!-- RIGHT TOP: 28-day line graph -->
    <div class="card tv-graph28">
      <div class="ct" style="flex-shrink:0">
        📈 Study Time — Last 28 Days
        <span style="margin-left:auto">${SUBJECTS.map(s=>`<span style="color:${s.color};font-size:10px;margin-left:5px">● ${s.short}</span>`).join('')}</span>
      </div>
      <canvas id="sg28" style="flex:1;width:100%;min-height:0;display:block"></canvas>
    </div>

    <!-- BOTTOM: All-time line graph -->
    <div class="card tv-graphall">
      <div class="ct" style="flex-shrink:0">
        📊 All-Time Study History
        <span style="margin-left:auto;font-size:10.5px;color:var(--mu)">
          ${S.sessions.filter(s=>s.duration>0).length} sessions · ${(S.sessions.filter(s=>s.duration>0).reduce((a,s)=>a+(s.duration||0),0)/3600).toFixed(1)}h total
        </span>
      </div>
      <canvas id="sgAll" style="flex:1;width:100%;min-height:0;display:block"></canvas>
    </div>

  </div>`;

  requestAnimationFrame(() => { drawLineGraph28d(); drawLineGraphAll(); });
}

/* ══════════════════════════════════════════
   SUBJECTS VIEW
══════════════════════════════════════════ */
function renderSubjects() {
  renderSubjTabs();
  renderSubjDetail();
  renderSubjGrid();
}

function renderSubjTabs() {
  const el = document.getElementById('subjTabs');
  if (!el) return;
  el.innerHTML = SUBJECTS.map(s=>`
    <button class="subj-tab${_activeSubj===s.id?' active':''}"
      style="${_activeSubj===s.id?`background:${s.color};border-color:${s.color};color:#fff`:''}"
      onclick="_activeSubj='${s.id}';renderSubjDetail();renderSubjTabs()">${s.icon} ${s.name}</button>`).join('');
}

function renderSubjDetail() {
  const el = document.getElementById('subjDetail');
  if (!el) return;
  const s = sj(_activeSubj);
  if (!s) return;
  const p = getProg(s);
  const sp = (S.papers||{})[s.id]||{};
  const yrs = PAPER_YEARS[s.id]||[];
  const done = yrs.filter(y=>sp[y]?.done).length;
  const scores = yrs.filter(y=>sp[y]?.done&&sp[y]?.score!=null).map(y=>sp[y].score);
  const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b)/scores.length) : null;
  const wds = weekDays();
  const wSec = S.sessions.filter(ss=>wds.includes(ss.date)&&ss.subject===s.id&&ss.duration>0).reduce((a,ss)=>a+(ss.duration||0),0);

  el.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:16px">
      <div style="width:48px;height:48px;border-radius:14px;background:${s.bg};border:1px solid ${s.br};display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">${s.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:17px;font-weight:800;font-family:'Bricolage Grotesque',sans-serif">${s.name}</div>
        <div style="font-size:11px;color:var(--mu);margin-top:2px">${esc(s.examLabel)}${s.examLabel2?` · ${esc(s.examLabel2)}`:''}</div>
        <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
          <div class="pb" style="flex:1;height:6px"><i style="width:${p}%;background:${s.color}"></i></div>
          <span style="font-size:11px;font-weight:700;color:${s.color}">${p}% done</span>
          <span style="font-size:11px;font-weight:700;color:${s.color}">${daysTo(s.examDate)}d left</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        <div style="font-size:11px;color:var(--mu)">This week</div>
        <div style="font-size:20px;font-weight:800;font-family:'Bricolage Grotesque',sans-serif;color:${s.color}">${(wSec/3600).toFixed(1)}h</div>
        <div style="font-size:11px;color:var(--mu)">Papers: <b style="color:${done===yrs.length?'var(--bio)':'var(--tx)'}">${done}/${yrs.length}${avg!=null?' · avg '+avg+'%':''}</b></div>
      </div>
    </div>
    <div style="display:flex;gap:16px;margin-top:14px">
      <div style="flex:1">
        <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--mu);margin-bottom:6px">Topics</div>
        <div class="subj-links">
          ${s.links.map(l=>`<div class="subj-link" onclick="goSec('${s.id}','${l.h}')"><span class="subj-link-dot" style="background:${s.color}"></span>${l.l}</div>`).join('')}
        </div>
        <button onclick="go('${s.id}')" style="margin-top:10px;width:100%;background:${s.color};color:#fff;border:none;border-radius:10px;padding:9px;font-size:13px;font-weight:700;font-family:inherit">Open ${s.short} →</button>
      </div>
      <div style="flex:1">
        <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--mu);margin-bottom:6px">Past Papers</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${yrs.map(y=>{const pp=sp[y]||{done:false,score:null};return`<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
            <button onclick="togglePaper('${s.id}',${y})" style="width:46px;padding:5px 0;border-radius:8px;border:1px solid ${pp.done?s.color:'var(--bd)'};background:${pp.done?s.bg:'var(--sf2)'};color:${pp.done?s.color:'var(--mu)'};font-size:10.5px;font-weight:700;cursor:pointer;transition:.15s">${y}</button>
            ${pp.done?`<input type="number" min="0" max="100" value="${pp.score!=null?pp.score:''}" placeholder="%" style="width:46px;background:var(--sf2);border:1px solid var(--bd);color:var(--tx);border-radius:6px;padding:2px 4px;font-size:10px;text-align:center;font-family:inherit;outline:none" onchange="setPaperScore('${s.id}',${y},this.value)"/>`:'<div style="height:20px"></div>'}
          </div>`;}).join('')}
        </div>
      </div>
    </div>`;
}

function renderSubjGrid() {
  const el = document.getElementById('subjects');
  if (!el) return;
  el.innerHTML = SUBJECTS.map(s=>{const p=getProg(s);return`
    <div class="subj-card anim" style="border-color:${s.br}" onclick="go('${s.id}')">
      <div class="subj-card-top">
        <div class="subj-ico" style="background:${s.bg};border:1px solid ${s.br}">${s.icon}</div>
        <div style="min-width:0">
          <div class="subj-name">${s.name}</div>
          <div class="subj-pct" style="color:${s.color}">${p}% complete</div>
        </div>
      </div>
      <div class="pb"><i style="width:${p}%;background:${s.color}"></i></div>
      <div class="subj-meta">
        <span>${esc(s.examLabel)}</span>
        <b style="color:${s.color}">${daysTo(s.examDate)}d</b>
      </div>
    </div>`;}).join('');
}

/* ══════════════════════════════════════════
   SCHEDULE VIEW
══════════════════════════════════════════ */
function renderSchedule() {
  renderScheduleCard();
  renderWeighting();
  renderDepth();
}

function renderScheduleCard() {
  const el = document.getElementById('schedule');
  if (!el) return;
  const exams = allExamsSorted();

  el.innerHTML = `<div class="ct">🗓️ Exam Schedule</div>
    ${exams.map(e=>`<div class="exam-row">
      <span class="exam-dot" style="background:${e.color}"></span>
      <span style="flex:1">${esc(e.label)}</span>
      <span style="color:${e.color};font-weight:700;flex-shrink:0">${daysTo(e.date)>0?daysTo(e.date)+'d':'Today!'}</span>
    </div>`).join('')}`;
}

function renderWeighting() {
  const el = document.getElementById('weighting');
  if (!el) return;
  const wds = weekDays();
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const dd = wds.map((ds,i)=>{const sec=S.sessions.filter(s=>s.date===ds&&s.duration>0).reduce((a,s)=>a+(s.duration||0),0);return{label:days[i],ds,sec,isToday:ds===today()};});
  const maxSec = Math.max(...dd.map(d=>d.sec),1800);
  const tot = dd.reduce((a,d)=>a+d.sec,0);

  el.innerHTML = `<div class="ct">📅 This Week<span style="margin-left:auto;font-size:11px;color:var(--mu)">${(tot/3600).toFixed(1)}h total</span></div>
    <div style="display:flex;align-items:flex-end;gap:5px;height:70px;margin-bottom:6px">
      ${dd.map(d=>{const pct=d.sec/maxSec*100;return`<div style="flex:1;height:100%;display:flex;align-items:flex-end"><div style="width:100%;height:${Math.max(2,pct)}%;background:${d.isToday?'var(--eng)':d.sec>0?'var(--bd2)':'var(--sf2)'};border-radius:4px 4px 0 0;border:1px solid ${d.isToday?'var(--engbr)':'var(--bd)'}"></div></div>`;}).join('')}
    </div>
    <div style="display:flex;gap:5px">
      ${dd.map(d=>`<div style="flex:1;text-align:center;font-size:10px;font-weight:${d.isToday?700:400};color:${d.isToday?'var(--eng)':'var(--mu)'}">${d.label}</div>`).join('')}
    </div>`;
}

function renderDepth() {
  const el = document.getElementById('depth');
  if (!el) return;
  const tgt = S.targets||{};
  const ts = getTS(), sec = timerSec();
  const todayByS = {};
  SUBJECTS.forEach(s=>{todayByS[s.id]=S.sessions.filter(ss=>ss.date===today()&&ss.subject===s.id&&ss.duration>0).reduce((a,ss)=>a+(ss.duration||0),0);if(ts.running&&ts.subject===s.id)todayByS[s.id]+=sec;});

  el.innerHTML = `<div class="ct">🎯 Daily Targets</div>
    ${SUBJECTS.map(s=>{const goal=tgt[s.id]||0,done=todayByS[s.id]||0;const pct=goal>0?Math.min(100,Math.round(done/(goal*3600)*100)):0;return`
      <div style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">
          <span>${s.icon}</span>
          <span style="font-size:12px;flex:1">${s.short}</span>
          <input type="number" min="0" max="12" step="0.5" value="${goal||''}" placeholder="h" title="Daily goal hours" style="width:38px;background:var(--sf2);border:1px solid var(--bd);color:var(--tx);border-radius:6px;padding:2px 4px;font-size:11px;text-align:center;font-family:inherit;outline:none" onchange="setTarget('${s.id}',+this.value||0);renderView()"/>
          <span style="font-size:11px;color:${pct>=100?'var(--bio)':'var(--mu)'};font-weight:600;min-width:30px;text-align:right">${goal>0?pct+'%':''}</span>
        </div>
        ${goal>0?`<div class="pb" style="height:3px"><i style="width:${pct}%;background:${s.color}"></i></div>`:''}
      </div>`;}).join('')}`;
}

/* ══════════════════════════════════════════
   GOALS VIEW
══════════════════════════════════════════ */
function renderGoals() {
  renderGoalsFull();
  renderGraphCard();
  renderSubjTime();
  renderAchievements();
  renderHeatmap();
}

function renderGoalsFull() {
  const el = document.getElementById('goalsFull');
  if (!el) return;
  const ts = getTS(), sec = timerSec();
  const todayS = todayStudiedSec() + (ts.running ? sec : 0);
  const gPct = Math.min(100, Math.round(todayS / S.dailyGoalSec * 100));
  const wds = weekDays();
  const wSec = S.sessions.filter(s=>wds.includes(s.date)&&s.duration>0).reduce((a,s)=>a+(s.duration||0),0);
  const wPct = Math.min(100, Math.round(wSec / S.dailyGoalSec / 7 * 100));
  const streak = getStreak();
  const allDays = S.sessions.filter(s=>s.duration>0).map(s=>s.date).filter((d,i,a)=>a.indexOf(d)===i).length;
  const totalH = (S.sessions.filter(s=>s.duration>0).reduce((a,s)=>a+(s.duration||0),0)/3600).toFixed(1);

  el.innerHTML = `<div class="ct">🎯 Goals & Stats</div>
    <div style="margin-bottom:10px">
      <div class="gt"><span>Today</span><b onclick="editGoal()" title="Click to edit" style="cursor:pointer">${fmt(todayS)} / ${(S.dailyGoalSec/3600).toFixed(0)}h</b></div>
      <div class="pb" style="height:7px"><i style="width:${gPct}%;background:linear-gradient(90deg,var(--eng),var(--math))"></i></div>
      <div style="font-size:10.5px;color:${gPct>=100?'var(--bio)':'var(--mu)'};text-align:right;margin-top:3px">${gPct>=100?'✅ Goal reached!':gPct+'%'}</div>
    </div>
    <div style="margin-bottom:12px">
      <div class="gt"><span>This week</span><b>${(wSec/3600).toFixed(1)}h / ${(S.dailyGoalSec*7/3600).toFixed(0)}h</b></div>
      <div class="pb" style="height:7px"><i style="width:${wPct}%;background:linear-gradient(90deg,var(--bio),var(--math))"></i></div>
    </div>
    <div class="div"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:center">
      <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:10px 8px">
        <div style="font-size:22px;font-weight:800;font-family:'Bricolage Grotesque',sans-serif">${streak}</div>
        <div style="font-size:10.5px;color:var(--mu);margin-top:2px">🔥 day streak</div>
      </div>
      <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:10px 8px">
        <div style="font-size:22px;font-weight:800;font-family:'Bricolage Grotesque',sans-serif">${totalH}h</div>
        <div style="font-size:10.5px;color:var(--mu);margin-top:2px">📚 total logged</div>
      </div>
      <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:10px 8px">
        <div style="font-size:22px;font-weight:800;font-family:'Bricolage Grotesque',sans-serif">${allDays}</div>
        <div style="font-size:10.5px;color:var(--mu);margin-top:2px">📅 days studied</div>
      </div>
      <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:10px 8px">
        <div style="font-size:22px;font-weight:800;font-family:'Bricolage Grotesque',sans-serif">${S.sessions.filter(s=>s.duration>0).length}</div>
        <div style="font-size:10.5px;color:var(--mu);margin-top:2px">⏱ sessions</div>
      </div>
    </div>`;
}

function renderGraphCard() {
  const el = document.getElementById('graph');
  if (!el) return;
  el.innerHTML = `<div class="ct">📊 Study Time — Last 14 Days
    <span style="margin-left:auto">${SUBJECTS.map(s=>`<span style="color:${s.color};font-size:10.5px;margin-left:6px">● ${s.short}</span>`).join('')}</span>
  </div>
  <canvas id="sg" height="200"></canvas>`;
  requestAnimationFrame(drawGraph);
}

function renderSubjTime() {
  const el = document.getElementById('subjTime');
  if (!el) return;
  const wds = weekDays();
  const total = S.sessions.filter(s=>wds.includes(s.date)&&s.duration>0).reduce((a,s)=>a+(s.duration||0),0);
  const cMap = {eng:'var(--eng)',bio:'var(--bio)',chem:'var(--chem)',math:'var(--math)',ger:'var(--ger)'};

  if (!total) {
    el.innerHTML = `<div class="ct">📈 Subject Balance</div><div class="empty">No sessions this week</div>`;
    return;
  }
  const data = SUBJECTS.map(s=>({...s,sec:S.sessions.filter(ss=>wds.includes(ss.date)&&ss.subject===s.id&&ss.duration>0).reduce((a,ss)=>a+(ss.duration||0),0)})).filter(d=>d.sec>0);

  el.innerHTML = `<div class="ct">📈 Subject Balance<span style="margin-left:auto;font-size:11px;color:var(--mu)">this week · ${(total/3600).toFixed(1)}h</span></div>
    <div style="display:flex;height:12px;border-radius:8px;overflow:hidden;gap:2px;margin-bottom:14px">
      ${data.map(d=>`<div style="flex:${d.sec};background:${cMap[d.id]||d.color};min-width:3px"></div>`).join('')}
    </div>
    ${data.map(d=>{const pct=Math.round(d.sec/total*100);return`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:7px;font-size:12.5px">
        <span style="width:10px;height:10px;border-radius:3px;background:${cMap[d.id]||d.color};flex-shrink:0;display:inline-block"></span>
        <span style="flex:1;color:var(--mu)">${d.icon} ${d.short}</span>
        <span style="color:var(--tx);font-weight:600">${(d.sec/3600).toFixed(1)}h</span>
        <span style="color:var(--mu2);min-width:30px;text-align:right">${pct}%</span>
      </div>`;}).join('')}`;
}

function renderAchievements() {
  const el = document.getElementById('achievements');
  if (!el) return;
  const totalH = S.sessions.filter(s=>s.duration>0).reduce((a,s)=>a+(s.duration||0),0)/3600;
  const streak = getStreak();
  const papers = SUBJECTS.reduce((a,s)=>{const sp=(S.papers||{})[s.id]||{};return a+(PAPER_YEARS[s.id]||[]).filter(y=>sp[y]?.done).length;},0);
  const days = S.sessions.filter(s=>s.duration>0).map(s=>s.date).filter((d,i,a)=>a.indexOf(d)===i).length;

  const milestones = [
    {icon:'⏱',label:'First hour',done:totalH>=1,val:`${totalH.toFixed(1)}h total`},
    {icon:'📚',label:'10 hours',done:totalH>=10,val:`${totalH.toFixed(1)}h total`},
    {icon:'🔥',label:'3-day streak',done:streak>=3,val:`${streak} day streak`},
    {icon:'🗓️',label:'7-day streak',done:streak>=7,val:`${streak} day streak`},
    {icon:'📝',label:'First paper',done:papers>=1,val:`${papers} papers done`},
    {icon:'🏆',label:'10 papers',done:papers>=10,val:`${papers} papers done`},
    {icon:'📅',label:'7 days studied',done:days>=7,val:`${days} days`},
    {icon:'💯',label:'30 days studied',done:days>=30,val:`${days} days`},
  ];

  el.innerHTML = `<div class="ct">🏆 Achievements</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${milestones.map(m=>`<div style="background:${m.done?'var(--sf2)':'transparent'};border:1px solid ${m.done?'var(--bd2)':'var(--bd)'};border-radius:10px;padding:10px;opacity:${m.done?1:.5}">
        <div style="font-size:20px">${m.icon}</div>
        <div style="font-size:12px;font-weight:700;margin-top:4px">${m.label}</div>
        <div style="font-size:10px;color:var(--mu);margin-top:1px">${m.val}</div>
        ${m.done?`<div style="font-size:10px;color:var(--bio);margin-top:2px;font-weight:600">✓ Unlocked</div>`:''}
      </div>`).join('')}
    </div>`;
}

function renderHeatmap() {
  const el = document.getElementById('heatmap');
  if (!el) return;
  el.innerHTML = `<div class="ct">📆 Study Heatmap — Last 28 Days</div>
    <div class="hmap">
      ${Array.from({length:28},(_,i)=>{
        const d=new Date();d.setDate(d.getDate()-(27-i));
        const ds=d.toISOString().slice(0,10);
        const daySess=S.sessions.filter(s=>s.date===ds&&s.duration>0);
        const s2=daySess.reduce((a,s)=>a+(s.duration||0),0);
        const t=Math.min(1,s2/S.dailyGoalSec);
        const sc={};daySess.forEach(s=>{sc[s.subject]=(sc[s.subject]||0)+(s.duration||0);});
        const dom=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];
        const col=dom?(SUBJECTS.find(s=>s.id===dom[0])||SUBJECTS[0]).color:'var(--sf2)';
        return`<div class="hc" title="${ds}: ${s2>0?Math.round(s2/60)+'min':'—'}" style="background:${s2>0?col:'var(--sf2)'};opacity:${s2>0?(.18+t*.82):.4};border:1px solid ${ds===today()?'var(--bd2)':'transparent'}"></div>`;
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--mu2)">
      <span>28 days ago</span><span>Today</span>
    </div>`;
}

/* ══════════════════════════════════════════
   LINE GRAPHS
══════════════════════════════════════════ */
function _resolveCSS(v) {
  const tmp = document.createElement('div');
  tmp.style.cssText = 'position:absolute;opacity:0;color:'+v;
  document.body.appendChild(tmp);
  const r = getComputedStyle(tmp).color;
  document.body.removeChild(tmp);
  return r;
}
const _cCache = {};
function rc(v) { return _cCache[v] || (_cCache[v] = _resolveCSS(v)); }

function _buildDayData(days) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0,10);
    const sess = S.sessions.filter(s=>s.date===ds&&s.duration>0);
    const hrs = sess.reduce((a,s)=>a+(s.duration||0),0)/3600;
    const sc = {}; sess.forEach(s=>{sc[s.subject]=(sc[s.subject]||0)+(s.duration||0);});
    const dom = Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];
    const col = dom ? (SUBJECTS.find(s=>s.id===dom[0])||SUBJECTS[0]).color : null;
    const label = i===0 ? 'Today' : (i%7===0||days<=28)?d.toLocaleDateString('en-AU',{month:'short',day:'numeric'}):null;
    result.push({ds, hrs, col, label});
  }
  return result;
}

function _drawLineGraph(canvasId, data, opts={}) {
  const c = document.getElementById(canvasId); if (!c) return;
  const W = c.offsetWidth, H = c.offsetHeight || 160;
  if (!W || !H) return;
  c.width = W * devicePixelRatio; c.height = H * devicePixelRatio;
  const ctx = c.getContext('2d'); ctx.scale(devicePixelRatio, devicePixelRatio);
  const dark = document.documentElement.getAttribute('data-theme') !== 'white';
  const mu = dark ? 'rgba(240,240,255,.28)' : 'rgba(15,15,26,.3)';
  const gr = dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)';
  const goalC = dark ? 'rgba(239,68,68,.45)' : 'rgba(220,38,38,.45)';
  const pL=40, pR=12, pT=14, pB=28, cW=W-pL-pR, cH=H-pT-pB;
  const vals = data.map(d=>d.hrs);
  const maxH = Math.max(opts.maxH || 0, ...vals, S.dailyGoalSec/3600 * 1.1, 1);

  // Grid lines
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = pT + cH - cH * i / steps;
    ctx.strokeStyle = gr; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pL,y); ctx.lineTo(pL+cW,y); ctx.stroke();
    ctx.fillStyle = mu; ctx.font = '9px Hanken Grotesk,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText((maxH*i/steps).toFixed(1)+'h', pL-4, y+3.5);
  }

  // Goal line
  if (opts.showGoal !== false) {
    const goalH = S.dailyGoalSec/3600;
    const gY = pT + cH - cH * goalH / maxH;
    ctx.strokeStyle = goalC; ctx.lineWidth = 1.5; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(pL,gY); ctx.lineTo(pL+cW,gY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = goalC; ctx.font = 'bold 9px Hanken Grotesk,sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(goalH+'h goal', pL+4, gY-4);
  }

  const n = data.length;
  const pts = data.map((d,i) => ({
    x: pL + (n<=1 ? cW/2 : cW * i / (n-1)),
    y: pT + cH - cH * d.hrs / maxH,
    hrs: d.hrs,
    col: d.col,
    label: d.label,
  }));

  // Shaded area under line
  if (pts.length > 1) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pT+cH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length-1].x, pT+cH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pT, 0, pT+cH);
    grad.addColorStop(0, dark?'rgba(168,85,247,.14)':'rgba(124,58,237,.10)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.fill();
  }

  // Line segments, coloured by dominant subject
  if (pts.length > 1) {
    for (let i = 1; i < pts.length; i++) {
      const col = pts[i].col || (dark?'rgba(255,255,255,.25)':'rgba(0,0,0,.18)');
      ctx.strokeStyle = rc(col); ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(pts[i-1].x, pts[i-1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
  }

  // Dots + labels
  pts.forEach((p, i) => {
    if (p.hrs > 0) {
      const col = p.col || (dark?'rgba(255,255,255,.4)':'rgba(0,0,0,.3)');
      ctx.fillStyle = rc(col);
      ctx.shadowColor = rc(col); ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      if (p.hrs > 0.05) {
        ctx.fillStyle = rc(col); ctx.font = 'bold 8px Hanken Grotesk,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(p.hrs.toFixed(1), p.x, p.y - 6);
      }
    }
    if (p.label) {
      ctx.fillStyle = mu; ctx.font = '8.5px Hanken Grotesk,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, H - pB + 12);
    }
  });
}

function drawLineGraph28d() {
  _drawLineGraph('sg28', _buildDayData(28));
}

function drawLineGraphAll() {
  const c = document.getElementById('sgAll'); if (!c) return;
  // Collect all unique dates with sessions
  const allDates = [...new Set(S.sessions.filter(s=>s.duration>0).map(s=>s.date))].sort();
  if (!allDates.length) {
    const W=c.offsetWidth, H=c.offsetHeight||100;
    c.width=W*devicePixelRatio; c.height=H*devicePixelRatio;
    const ctx=c.getContext('2d'); ctx.scale(devicePixelRatio,devicePixelRatio);
    ctx.fillStyle='rgba(200,200,200,.2)'; ctx.font='12px Hanken Grotesk,sans-serif';
    ctx.textAlign='center'; ctx.fillText('No sessions recorded yet', W/2, H/2);
    return;
  }
  // Build a continuous day range from first session to today
  const firstDate = new Date(allDates[0]);
  const todayDate = new Date(today());
  const totalDays = Math.round((todayDate - firstDate)/86400000) + 1;
  const data = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(firstDate); d.setDate(firstDate.getDate()+i);
    const ds = d.toISOString().slice(0,10);
    const sess = S.sessions.filter(s=>s.date===ds&&s.duration>0);
    const hrs = sess.reduce((a,s)=>a+(s.duration||0),0)/3600;
    const sc = {}; sess.forEach(s=>{sc[s.subject]=(sc[s.subject]||0)+(s.duration||0);});
    const dom = Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];
    const col = dom?(SUBJECTS.find(s=>s.id===dom[0])||SUBJECTS[0]).color:null;
    // Label every ~7th day or first/last
    const label = (i===0||i===totalDays-1||i%Math.max(1,Math.floor(totalDays/8))===0)
      ? d.toLocaleDateString('en-AU',{month:'short',day:'numeric'}) : null;
    data.push({ds, hrs, col, label});
  }
  _drawLineGraph('sgAll', data, {showGoal:true});
}

/* ══════════════════════════════════════════
   GRAPH (canvas, Goals view)
══════════════════════════════════════════ */
function drawGraph() {
  const c = document.getElementById('sg'); if (!c) return;
  const W = c.offsetWidth, H = c.offsetHeight || 200;
  c.width = W * devicePixelRatio; c.height = H * devicePixelRatio;
  const ctx = c.getContext('2d'); ctx.scale(devicePixelRatio, devicePixelRatio);
  const dark = document.documentElement.getAttribute('data-theme') !== 'white';
  const mu = dark ? 'rgba(240,240,255,.3)' : 'rgba(15,15,26,.35)';
  const gr = dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)';
  const goalC = dark ? 'rgba(239,68,68,.5)' : 'rgba(220,38,38,.5)';
  const cMap = {eng:'var(--eng)',bio:'var(--bio)',chem:'var(--chem)',math:'var(--math)',ger:'var(--ger)'};
  // resolve css vars
  const tmp = document.createElement('div'); tmp.style.display='none'; document.body.appendChild(tmp);
  const resolveColor = (v) => { if (!v.startsWith('var(')) return v; tmp.style.color=v; return getComputedStyle(tmp).color; };
  const days=14, pL=36, pR=10, pT=14, pB=26, cW=W-pL-pR, cH=H-pT-pB;
  const labels=[], data=[], colors=[];
  for (let i=days-1;i>=0;i--) {
    const d=new Date(); d.setDate(d.getDate()-i); const ds=d.toISOString().slice(0,10);
    labels.push(i===0?'Today':d.toLocaleDateString('en-AU',{weekday:'short'}));
    const sess=S.sessions.filter(s=>s.date===ds&&s.duration>0);
    data.push(sess.reduce((a,s)=>a+(s.duration||0),0)/3600);
    const sc={};sess.forEach(s=>{sc[s.subject]=(sc[s.subject]||0)+(s.duration||0);});
    const dom=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];
    colors.push(dom ? resolveColor(cMap[dom[0]]||'rgba(255,255,255,.2)') : (dark?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)'));
  }
  document.body.removeChild(tmp);
  const maxH = Math.max(4, Math.ceil(Math.max(...data,3)*1.3));
  ctx.clearRect(0,0,W,H);
  for(let i=0;i<=4;i++){const y=pT+cH-cH*i/4;ctx.strokeStyle=gr;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pL,y);ctx.lineTo(pL+cW,y);ctx.stroke();ctx.fillStyle=mu;ctx.font='10px Hanken Grotesk,sans-serif';ctx.textAlign='right';ctx.fillText((maxH*i/4).toFixed(1)+'h',pL-4,y+3.5);}
  const goalH=S.dailyGoalSec/3600;const gY=pT+cH-cH*goalH/maxH;
  ctx.strokeStyle=goalC;ctx.lineWidth=1.5;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(pL,gY);ctx.lineTo(pL+cW,gY);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle=goalC;ctx.font='bold 10px Hanken Grotesk,sans-serif';ctx.textAlign='left';ctx.fillText(goalH+'h goal',pL+4,gY-4);
  const bW=Math.floor(cW/days*0.55),gap=cW/days;
  data.forEach((val,i)=>{
    const x=pL+gap*i+(gap-bW)/2;
    ctx.fillStyle=mu;ctx.font='9px Hanken Grotesk,sans-serif';ctx.textAlign='center';ctx.fillText(labels[i],x+bW/2,H-pB+12);
    if(val<=0)return;
    const bH=Math.max(2,cH*val/maxH),y=pT+cH-bH;
    ctx.shadowColor=colors[i];ctx.shadowBlur=6;ctx.fillStyle=colors[i];
    const r=Math.min(3,bW/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+bW-r,y);ctx.quadraticCurveTo(x+bW,y,x+bW,y+r);ctx.lineTo(x+bW,y+bH);ctx.lineTo(x,y+bH);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.fill();ctx.shadowBlur=0;
    if(val>0.05){ctx.fillStyle=colors[i];ctx.font='bold 9px Hanken Grotesk,sans-serif';ctx.fillText(val.toFixed(1),x+bW/2,y-3);}
  });
}

/* ══════════════════════════════════════════
   TIMER ENGINE
══════════════════════════════════════════ */
let _tIv = null;
function startTick(){if(_tIv)return;_tIv=setInterval(tick,1000);}
function stopTick(){clearInterval(_tIv);_tIv=null;}

function tick() {
  const sec=timerSec(), ts=getTS();
  const tS=sj(ts.subject)||SUBJECTS[0];
  const todayS=todayStudiedSec()+sec;
  const pct=Math.min(100,Math.round(todayS/S.dailyGoalSec*100));
  const sMode=S.studyMode||'stopwatch';
  const allocSec=(S.allocatedMin||60)*60;
  const dispSec=sMode==='countdown'?Math.max(0,allocSec-sec):sec;

  // Countdown auto-stop
  if(sMode==='countdown'&&ts.running&&sec>=allocSec){timerStop();beep();toast('✅ Time up! '+fmt(allocSec)+' session saved.');return;}

  // Update all timer displays (dashboard widget, timer tab, banner)
  const tDisp=document.getElementById('tDisp');
  if(tDisp){tDisp.textContent=fmt(dispSec);tDisp.style.color=tS.color;}
  const mb=document.getElementById('tGoalBar');
  if(mb){mb.style.width=(sMode==='countdown'?Math.min(100,Math.round(sec/allocSec*100)):pct)+'%';mb.style.background=tS.color;}
  const ml=document.getElementById('tGoalLbl');
  if(ml)ml.textContent=sMode==='countdown'?(sec>0?`${fmt(sec)} elapsed · ${fmt(Math.max(0,allocSec-sec))} left`:fmt(allocSec)+' to go'):`${fmt(todayS)} today`;

  // Sidebar persistent timer
  const std=document.getElementById('sideTimerDisp');
  if(std){std.textContent=fmt(dispSec);std.style.color=tS.color;}
  const sideBar=document.getElementById('sideTimerBar');
  if(sideBar){sideBar.style.width=pct+'%';sideBar.style.background=tS.color;}
  const stw=document.getElementById('sideTimerWrap');
  if(stw){stw.className='side-timer'+(ts.running?' running':'');}

  // Banner time display
  const bt=document.getElementById('bannerTime');
  if(bt){bt.textContent=fmt(dispSec);bt.style.color=tS.color;}

  // Update start button
  const sb=document.getElementById('tStartBtn');
  if(sb){sb.textContent=ts.running?'⏸ Pause':'▶ Start';sb.className=ts.running?'tgc-btn pause':'tgc-btn start';sb.onclick=ts.running?timerPause:timerStart;}
  const stopBtn=document.getElementById('tStopBtn');
  if(stopBtn)stopBtn.style.display=(ts.running||ts.elapsed>0)?'block':'none';

  // Focus overlay
  const foTime=document.getElementById('foTime');
  if(foTime){
    const mode=S.timerMode||'timer';
    if(mode==='pomodoro'){
      const pm=getPomo();
      const pmSec=pm.running&&pm.startedAt?Math.max(0,pm.remaining-Math.floor((Date.now()-pm.startedAt)/1000)):pm.remaining;
      foTime.textContent=fmt(pmSec);
    } else {
      foTime.textContent=fmt(sec);
    }
  }
  const fg=document.getElementById('foGoal');if(fg)fg.textContent=fmt(todayS)+' / '+fmt(S.dailyGoalSec)+' today ('+pct+'%)';
  const fb=document.getElementById('foBar');if(fb){fb.style.width=pct+'%';fb.style.background=tS.color;}

  // Pomodoro display
  const pm2=getPomo();
  const pmSec2=pm2.running&&pm2.startedAt?Math.max(0,pm2.remaining-Math.floor((Date.now()-pm2.startedAt)/1000)):pm2.remaining;
  const pd=document.getElementById('pomoDisp');if(pd)pd.textContent=fmt(pmSec2);
  const pp=document.getElementById('pomoPhase');if(pp)pp.textContent=pm2.phase==='work'?'🍅 Focus':'☕ Break';
}

function timerStart(){const ts=getTS();if(ts.running)return;ts.running=true;ts.startedAt=Date.now();saveTS(ts);startTick();tick();markStreak();}
function timerPause(){
  const ts=getTS();
  if(ts.running){ts.elapsed=timerSec();ts.running=false;ts.startedAt=null;}
  else{ts.running=true;ts.startedAt=Date.now();}
  saveTS(ts);
  if(ts.running)startTick();else stopTick();
  tick();
  const fp=document.getElementById('foPause');if(fp)fp.textContent=ts.running?'⏸ Pause':'▶ Resume';
}
function timerStop(){
  const dur=timerSec(),ts=getTS();
  if(dur>5){
    S.sessions.push({date:today(),time:new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}),subject:ts.subject,section:'Focus Session',duration:dur});
    if(S.sessions.length>200)S.sessions=S.sessions.slice(-200);
    markStreak();save();toast('✅ '+fmt(dur)+' saved');
  }
  saveTS({running:false,elapsed:0,startedAt:null,subject:ts.subject});
  stopTick();exitFocus();renderView();
}
function setTimerSubj(id){const ts=getTS();ts.subject=id;saveTS(ts);renderView();}
function setTimerMode(m){S.timerMode=m;save();renderView();}

/* ── FOCUS OVERLAY ── */
function enterFocus(){
  const ts=getTS(),s=sj(ts.subject)||SUBJECTS[0];
  const mode=S.timerMode||'timer';
  const pm=getPomo();
  document.getElementById('foSubj').textContent=mode==='pomodoro'?(s.name+' · '+(pm.phase==='work'?'🍅 Focus':'☕ Break')):s.name;
  document.getElementById('foIcon').textContent=mode==='pomodoro'?(pm.phase==='work'?'🍅':'☕'):s.icon;
  document.getElementById('foBar').style.background=s.color;
  document.getElementById('fo').classList.add('show');
  if(mode==='pomodoro'){if(!pm.running)pomoToggle();}
  else{if(!ts.running)timerStart();}
  tick();
}
function exitFocus(){document.getElementById('fo').classList.remove('show');}
document.addEventListener('keydown',e=>{if(e.key==='Escape')exitFocus();});

/* ══════════════════════════════════════════
   POMODORO
══════════════════════════════════════════ */
let _pomoIv = null;
function pomoTick(){
  const p=getPomo();if(!p.running)return;
  const rem=Math.max(0,p.remaining-Math.floor((Date.now()-p.startedAt)/1000));
  if(rem===0){
    const nph=p.phase==='work'?'break':'work';
    savePomo({phase:nph,remaining:nph==='work'?1500:300,running:false,startedAt:null,round:p.phase==='work'?p.round:p.round+1});
    clearInterval(_pomoIv);_pomoIv=null;
    beep();toast(p.phase==='work'?'🍅 Break time! Take 5 min':'💪 Focus time! 25 min');
    renderView();
  }
}
function pomoToggle(){
  let p=getPomo();
  if(p.running){p.remaining=Math.max(0,p.remaining-Math.floor((Date.now()-p.startedAt)/1000));p.running=false;p.startedAt=null;clearInterval(_pomoIv);_pomoIv=null;}
  else{p.running=true;p.startedAt=Date.now();if(!_pomoIv)_pomoIv=setInterval(pomoTick,1000);}
  savePomo(p);renderView();
}
function pomoReset(){const p=getPomo();savePomo({...p,remaining:p.phase==='work'?1500:300,running:false,startedAt:null});clearInterval(_pomoIv);_pomoIv=null;renderView();}

/* ══════════════════════════════════════════
   THEME
══════════════════════════════════════════ */
function buildThemePicker() {
  const wrap = document.getElementById('themeWrap');
  if (!wrap) return;
  const EMOJI = {black:'⬛',white:'⬜',forest:'🌲',ocean:'🌊',ember:'🔥',galaxy:'🌌',sakura:'🌸'};
  wrap.innerHTML = `
    <button class="theme-btn" onclick="toggleTP()">🎨 Theme</button>
    <div class="tpick" id="tp">
      ${THEMES.map(t=>`<div class="topt" data-t="${t.id}" onclick="setTheme('${t.id}')">
        <span class="tdot" style="${t.grad?`background:linear-gradient(135deg,${t.grad});box-shadow:0 0 6px ${t.glow}88`:`background:${t.dot};border:1px solid ${t.border}`}"></span>
        ${EMOJI[t.id]||''} ${t.label}
      </div>`).join('')}
    </div>`;
  document.querySelectorAll('.topt').forEach(el=>el.classList.toggle('on',el.dataset.t===S.theme));
}

function toggleTP(){document.getElementById('tp')?.classList.toggle('open');}
function setTheme(t){
  document.documentElement.setAttribute('data-theme',t);S.theme=t;save();
  document.getElementById('tp')?.classList.remove('open');
  document.querySelectorAll('.topt').forEach(el=>el.classList.toggle('on',el.dataset.t===t));
  requestAnimationFrame(drawGraph);
}
document.addEventListener('click',e=>{
  const p=document.getElementById('tp');
  if(p&&p.classList.contains('open')&&!p.contains(e.target)&&!e.target.closest('.theme-btn'))p.classList.remove('open');
});

/* ══════════════════════════════════════════
   CUSTOMISE PANEL
══════════════════════════════════════════ */
const THEMES = [
  {id:'black',  label:'Black',       dot:'#000000', border:'rgba(255,255,255,.3)'},
  {id:'white',  label:'White',       dot:'#ffffff', border:'rgba(0,0,0,.2)'},
  {id:'forest', label:'Forest',      grad:'#14532d,#4ade80', glow:'#4ade80'},
  {id:'ocean',  label:'Ocean',       grad:'#00050f,#22d3ee', glow:'#22d3ee'},
  {id:'ember',  label:'Ember',       grad:'#060100,#fb923c', glow:'#fb923c'},
  {id:'galaxy', label:'Galaxy',      grad:'#02000e,#c084fc', glow:'#c084fc'},
  {id:'sakura', label:'Sakura',      grad:'#08010a,#f472b6', glow:'#f472b6'},
];

function openCustomise() {
  renderCustomisePanel();
  document.getElementById('custOverlay').classList.add('open');
}
function closeCustomise(e) {
  if (e && e.target !== document.getElementById('custOverlay')) return;
  document.getElementById('custOverlay').classList.remove('open');
}

function renderCustomisePanel() {
  const body = document.getElementById('custBody');
  if (!body) return;
  const p = S.prefs || {};
  const pomoWork = p.pomoWork || 25;
  const pomoBreak = p.pomoBreak || 5;

  body.innerHTML = `

    <!-- THEME -->
    <div class="cust-section">
      <div class="cust-section-title">🎨 Theme</div>
      <div class="cust-themes">
        ${THEMES.map(t=>`
          <div class="cust-theme${S.theme===t.id?' on':''}" onclick="setTheme('${t.id}');renderCustomisePanel()">
            <div class="cust-theme-dot" style="${t.grad
              ? `background:linear-gradient(135deg,${t.grad});box-shadow:0 0 8px ${t.glow}99`
              : `background:${t.dot};border:1px solid ${t.border}`}"></div>
            <span>${t.label}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- DASHBOARD PANELS -->
    <div class="cust-section">
      <div class="cust-section-title">🖥️ Dashboard Panels</div>
      ${[
        ['showFocus',    'Focus Block',     true],
        ['showGoals',    'Goals Panel',     true],
        ['showExams',    'Upcoming Exams',  true],
        ['showSessions', 'Recent Sessions', true],
      ].map(([key,label,def])=>`
        <label class="cust-toggle">
          <input type="checkbox" ${(p[key]??def)?'checked':''} onchange="setPref('${key}',this.checked)"/>
          <div class="cust-toggle-track"></div>
          <span class="cust-toggle-label">${label}</span>
        </label>`).join('')}
    </div>

    <!-- TIMER & GOALS -->
    <div class="cust-section">
      <div class="cust-section-title">⏱ Timer & Goals</div>
      <div class="cust-row">
        <span>Daily goal</span>
        <div style="display:flex;align-items:center;gap:6px">
          <input class="cust-num" type="number" min="0.5" max="16" step="0.5"
            value="${(S.dailyGoalSec/3600).toFixed(1)}"
            onchange="S.dailyGoalSec=Math.round(+this.value*3600);save();"/>
          <span style="font-size:12px;color:var(--mu)">hrs</span>
        </div>
      </div>
      <div class="cust-row">
        <span>Default mode</span>
        <div style="display:flex;gap:5px">
          <button class="tsb${(S.studyMode||'stopwatch')==='stopwatch'?' on':''}" style="${(S.studyMode||'stopwatch')==='stopwatch'?'background:var(--eng);border-color:var(--engbr)':''}" onclick="setStudyMode('stopwatch');renderCustomisePanel()">Stopwatch</button>
          <button class="tsb${S.studyMode==='countdown'?' on':''}" style="${S.studyMode==='countdown'?'background:var(--eng);border-color:var(--engbr)':''}" onclick="setStudyMode('countdown');renderCustomisePanel()">Countdown</button>
        </div>
      </div>
      <div class="cust-row">
        <span>Default duration</span>
        <div style="display:flex;align-items:center;gap:6px">
          <input class="cust-num" type="number" min="5" max="480" step="5"
            value="${S.allocatedMin||60}"
            onchange="S.allocatedMin=Math.max(5,+this.value||60);save();"/>
          <span style="font-size:12px;color:var(--mu)">min</span>
        </div>
      </div>
    </div>

    <!-- POMODORO -->
    <div class="cust-section">
      <div class="cust-section-title">🍅 Pomodoro</div>
      <div class="cust-row">
        <span>Work block</span>
        <div style="display:flex;align-items:center;gap:6px">
          <input class="cust-num" type="number" min="5" max="90" step="5" value="${pomoWork}"
            onchange="setPref('pomoWork',+this.value||25);updatePomoConfig()"/>
          <span style="font-size:12px;color:var(--mu)">min</span>
        </div>
      </div>
      <div class="cust-row">
        <span>Break block</span>
        <div style="display:flex;align-items:center;gap:6px">
          <input class="cust-num" type="number" min="1" max="30" step="1" value="${pomoBreak}"
            onchange="setPref('pomoBreak',+this.value||5);updatePomoConfig()"/>
          <span style="font-size:12px;color:var(--mu)">min</span>
        </div>
      </div>
    </div>

    <!-- PER-SUBJECT TARGETS -->
    <div class="cust-section">
      <div class="cust-section-title">🎯 Daily Subject Targets</div>
      ${SUBJECTS.map(s=>`
        <div class="cust-row">
          <span>${s.icon} ${s.short}</span>
          <div style="display:flex;align-items:center;gap:6px">
            <input class="cust-num" type="number" min="0" max="12" step="0.5"
              value="${(S.targets||{})[s.id]||''}" placeholder="—"
              onchange="setTarget('${s.id}',+this.value||0)"/>
            <span style="font-size:12px;color:var(--mu)">hrs</span>
          </div>
        </div>`).join('')}
    </div>

    <!-- SUBJECTS ORDER note -->
    <div class="cust-section">
      <div class="cust-section-title">📋 Subject Order</div>
      <div style="font-size:12px;color:var(--mu);line-height:1.6">
        Subjects are ordered by exam date (earliest first). This matches the default HSC schedule.
      </div>
    </div>

    <!-- DANGER ZONE -->
    <div class="cust-section">
      <div class="cust-section-title" style="color:var(--red)">⚠️ Data</div>
      <button onclick="if(confirm('Clear ALL session history?')){S.sessions=[];save();renderView();}" style="width:100%;background:var(--redb);border:1px solid rgba(239,68,68,.3);color:var(--red);border-radius:9px;padding:8px;font-size:12.5px;font-family:inherit;cursor:pointer">
        Clear session history
      </button>
      <button onclick="exportData()" style="width:100%;background:var(--sf2);border:1px solid var(--bd);color:var(--mu);border-radius:9px;padding:8px;font-size:12.5px;font-family:inherit;cursor:pointer;margin-top:4px">
        💾 Export backup (JSON)
      </button>
    </div>
  `;
}

function setPref(key, val) {
  if (!S.prefs) S.prefs = {};
  S.prefs[key] = val;
  save();
  renderView();
}
function getPref(key, def) {
  return (S.prefs && S.prefs[key] !== undefined) ? S.prefs[key] : def;
}
function updatePomoConfig() {
  const p = getPomo();
  const workSec = (getPref('pomoWork',25)) * 60;
  const breakSec = (getPref('pomoBreak',5)) * 60;
  if (!p.running) {
    savePomo({...p, remaining: p.phase==='work'?workSec:breakSec});
  }
}
function exportData() {
  const a = document.createElement('a');
  a.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(S));
  a.download = 'hsc-backup-' + today() + '.json';
  a.click();
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
// migrate old theme names
if(!['black','white','forest','ocean','ember','galaxy','sakura'].includes(S.theme))
  S.theme = S.theme==='light'?'white':S.theme==='midnight'?'ocean':'black';

document.documentElement.setAttribute('data-theme', S.theme || 'black');
updateDate();
markStreak();
buildThemePicker();

// Wire up nav buttons
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => navTo(btn.dataset.view));
});

// Initial render
navTo('dashboard');
renderSidebarTimer();

// Resume timer/pomo if running
const _ts = getTS(); if (_ts.running) startTick();
const _ps = getPomo(); if (_ps.running) _pomoIv = setInterval(pomoTick, 1000);
