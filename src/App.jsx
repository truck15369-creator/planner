import React, { useState, useEffect, useRef } from "react";

const THEMES = {
  light:{bg:"#FFFFFF",panel:"#F7F6F2",panelHi:"#EFEDE6",line:"#E3E0D7",text:"#1D1E18",textDim:"#6E6C61",faint:"#B7B4A8",a1:"#C2603F",a2:"#2E8C76",a3:"#B8862B",a4:"#6C5BA8"},
  dark:{bg:"#13140F",panel:"#1A1B15",panelHi:"#232419",line:"#33352A",text:"#ECEADE",textDim:"#98968A",faint:"#5A5B4E",a1:"#C97C5D",a2:"#4FB09A",a3:"#D9A441",a4:"#8E7CC3"},
};
const mkCats=(C)=>[{id:"c1",n:1,label:"재테크",color:C.a1},{id:"c2",n:2,label:"업무",color:C.a2},{id:"c3",n:3,label:"공부/여가",color:C.a3}];
const palette=(C)=>[C.a1,C.a2,C.a3,C.a4,"#6FA8DC","#E06C9F","#7FB069"];
const WD=["일","월","화","수","목","금","토"];
const WD_MON=["월","화","수","목","금","토","일"];
const MONTHS=["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const MONTHS_SHORT=["1","2","3","4","5","6","7","8","9","10","11","12"];
const HOURS=Array.from({length:24},(_,i)=>i);
const timeLabel=(h)=>`${String(h).padStart(2,"0")}:00~${String((h+1)%24).padStart(2,"0")}:00`;
const iso=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const startOfWeek=(d)=>{const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x;};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const TODAY=new Date("2026-07-11T00:00:00");
const THIS_YEAR=2026;
function isoWeek(date){const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));const dn=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-dn+3);const ft=new Date(Date.UTC(d.getUTCFullYear(),0,4));const fdn=(ft.getUTCDay()+6)%7;ft.setUTCDate(ft.getUTCDate()-fdn+3);return 1+Math.round((d-ft)/(7*24*3600*1000));}
function isoWeekYear(date){const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));const dn=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-dn+3);return d.getUTCFullYear();}
function monthWeekRows(year,m){
  // Each ISO week belongs to exactly one month: the month containing its Thursday.
  // So a week spanning two months shows only under the month its Thursday falls in (no duplicates).
  const dim=new Date(year,m+1,0).getDate();
  const rows=[];
  let cur=startOfWeek(new Date(year,m,1)); // Monday of week containing the 1st
  const monthEnd=new Date(year,m,dim);
  while(cur<=monthEnd){
    const thu=addDays(cur,3);          // Thursday decides ownership
    const weekEnd=addDays(cur,6);      // Sunday
    if(thu.getMonth()===m && thu.getFullYear()===year){
      const spanStart = cur.getMonth()===m ? cur.getDate() : 1;
      const spanEnd   = weekEnd.getMonth()===m ? weekEnd.getDate() : dim;
      rows.push({ s:spanStart, e:spanEnd, wk:isoWeek(thu), wkYear:isoWeekYear(thu) });
    }
    cur=addDays(cur,7);
  }
  return rows;
}
function weeksInYear(y){return isoWeek(new Date(y,11,28));}
function weekToMonth(year,wk){const jan4=new Date(year,0,4);const start=startOfWeek(jan4);return addDays(start,(wk-1)*7+3).getMonth();}
function calMatrix(year,m){const first=new Date(year,m,1);const startPad=first.getDay();const dim=new Date(year,m+1,0).getDate();const cells=[];for(let i=0;i<startPad;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);while(cells.length%7!==0)cells.push(null);const weeks=[];for(let i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));return weeks;}
let _id=200; const uid=()=>`x${++_id}`;

// ── Supabase sync config ──
const SB_URL="https://xnzrrcqsgvmvinnfmjhu.supabase.co";
const SB_KEY="sb_publishable_kv2zn8BhA1Ltvmyz4Wpk8w_U60r_B1l";
const SB_ROW="shared"; // single shared row id; change to make separate boards
const sbHeaders={ "apikey":SB_KEY, "Authorization":`Bearer ${SB_KEY}`, "Content-Type":"application/json" };
async function sbLoad(){
  const r=await fetch(`${SB_URL}/rest/v1/planner_data?id=eq.${SB_ROW}&select=data`,{headers:sbHeaders});
  if(!r.ok) throw new Error("load failed");
  const rows=await r.json();
  return rows[0]?.data||null;
}
async function sbSave(data){
  await fetch(`${SB_URL}/rest/v1/planner_data`,{
    method:"POST",
    headers:{...sbHeaders,"Prefer":"resolution=merge-duplicates"},
    body:JSON.stringify({id:SB_ROW,data,updated_at:new Date().toISOString()}),
  });
}

export default function App(){
  const [theme,setTheme]=useState("light");
  const C=THEMES[theme];
  const [cats,setCats]=useState(mkCats(THEMES.light));
  const [tasks,setTasks]=useState({});
  const [projects,setProjects]=useState([]);
  const [yearProjects,setYearProjects]=useState([]);
  const [shelf,setShelf]=useState([]);
  const [view,setView]=useState("달력");
  const [calMonth,setCalMonth]=useState(new Date("2026-07-01T00:00:00"));
  const [dayMonth,setDayMonth]=useState(new Date("2026-07-01T00:00:00"));
  const [selDay,setSelDay]=useState(iso(TODAY));
  const [reflect,setReflect]=useState(null);
  const [loaded,setLoaded]=useState(false);
  const [newCat,setNewCat]=useState(false);
  const [projModal,setProjModal]=useState(null);
  const [projYear,setProjYear]=useState(2026);
  const [sync,setSync]=useState("연결 중…");

  const applyState=(s)=>{ setTheme(s.theme||"light"); setCats(s.cats||mkCats(THEMES.light)); setTasks(s.tasks||{}); setProjects(s.projects||[]); setYearProjects(s.yearProjects||[]); setShelf(s.shelf||[]); };

  useEffect(()=>{(async()=>{
    // 1) show local cache instantly (offline-friendly)
    let hadLocal=false;
    try{ const raw=localStorage.getItem("planner7"); if(raw){ applyState(JSON.parse(raw)); hadLocal=true; } }catch{}
    // 2) then pull from server (source of truth across devices)
    try{
      const server=await sbLoad();
      if(server){ applyState(server); setSync("동기화됨"); }
      else if(hadLocal){ setSync("동기화됨"); }   // will push local up on first change
      else { seed(); setSync("동기화됨"); }
    }catch(e){ setSync("오프라인(이 기기에만 저장)"); if(!hadLocal) seed(); }
    setLoaded(true);
  })();},[]);

  // save: local cache immediately + debounce push to server
  useEffect(()=>{ if(!loaded)return;
    const payload={theme,cats,tasks,projects,yearProjects,shelf};
    try{ localStorage.setItem("planner7",JSON.stringify(payload)); }catch{}
    setSync("저장 중…");
    const h=setTimeout(async()=>{
      try{ await sbSave(payload); setSync("동기화됨"); }
      catch{ setSync("오프라인(이 기기에만 저장)"); }
    },600);
    return ()=>clearTimeout(h);
  },[theme,cats,tasks,projects,yearProjects,shelf,loaded]);

  const seed=()=>{
    setTasks({
      [iso(TODAY)]:[{id:uid(),text:"가계부 정리 (노션)",cat:"c1",hour:21,done:true,note:"매주 금요일 루틴으로 고정"},{id:uid(),text:"이란 종전 관련 기사 스크랩",cat:"c3",hour:22,done:false,note:""}],
      "2026-07-16":[{id:uid(),text:"평택회식",cat:"c2",hour:14,done:false,note:""}],
      "2026-07-20":[{id:uid(),text:"필라테스 상담",cat:"c3",hour:19,done:false,note:""}],
    });
    setShelf([{id:uid(),text:"반도체 공정 기초 (EUV/증착) 정리",cat:"c3"},{id:uid(),text:"동탄 근처 풋살팀원 구하기",cat:"c3"},{id:uid(),text:"SK 재테크 공부 시작하기",cat:"c1"}]);
    setProjects([
      {id:uid(),text:"해외 출장/교육",cat:"c2",year:2026,startWeek:25,endWeek:25,note:"6월 셋째 주. 여권/비자 확인"},
      {id:uid(),text:"집 매수 (인플레 헷지)",cat:"c1",year:2026,startWeek:36,endWeek:48,note:"동탄 인근 우선 검토"},
    ]);
    setYearProjects([
      {id:uid(),text:"둘째 자녀 계획",cat:"c3",year:2026,startWeek:32,endWeek:52,note:"연말까지 이어지는 장기 계획"},
      {id:uid(),text:"자산 증식 계획",cat:"c1",year:2027,startWeek:1,endWeek:52,note:"장기 자산 배분"},
    ]);
  };
  useEffect(()=>{ const acc=[C.a1,C.a2,C.a3,C.a4,"#6FA8DC","#E06C9F","#7FB069"]; setCats(cs=>cs.map((c,i)=>({...c,color:acc[i%acc.length]}))); },[theme]); // eslint-disable-line

  const catOf=(id)=>cats.find(c=>c.id===id)||cats[0];
  const toggle=(dIso,id)=>setTasks(p=>({...p,[dIso]:p[dIso].map(t=>{ if(t.id!==id)return t; const nd=!t.done; if(nd&&!t.note)setReflect({dIso,id,text:t.text}); return{...t,done:nd}; })}));
  const delTask=(dIso,id)=>setTasks(p=>({...p,[dIso]:(p[dIso]||[]).filter(t=>t.id!==id)}));
  const saveNote=(dIso,id,note)=>{ setTasks(p=>({...p,[dIso]:p[dIso].map(t=>t.id===id?{...t,note}:t)})); setReflect(null); };
  const addTaskToDay=(dIso,item)=>setTasks(p=>({...p,[dIso]:[...(p[dIso]||[]),item]}));
  const sendShelfToDay=(shelfId,dIso)=>{ const it=shelf.find(s=>s.id===shelfId); if(!it)return; setShelf(s=>s.filter(x=>x.id!==shelfId)); addTaskToDay(dIso,{...it,hour:null,done:false,note:""}); };
  const S=st(C);

  return (
    <div style={S.root}>
      <style>{`
        *{box-sizing:border-box;}
        button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid ${C.a2};outline-offset:2px;}
        ::selection{background:${C.a2};color:${C.bg};}
        .sc::-webkit-scrollbar{width:7px;height:7px;} .sc::-webkit-scrollbar-thumb{background:${C.line};border-radius:4px;}
        @media(prefers-reduced-motion:reduce){*{transition:none!important;}}
        @media(max-width:760px){
          .calsplit{flex-direction:column-reverse !important;}
          .agenda{width:100% !important;border-right:none !important;border-top:1px solid ${C.line} !important;max-height:42% !important;}
        }
      `}</style>

      <header style={S.head}>
        <div><div style={S.brandRow}><span style={{color:C.a2}}>◆</span><h1 style={S.brand}>계획 데스크</h1></div>
          <p style={S.tag}>빠르게 보고, 급하게 추가하기 · <span style={{color:sync==="동기화됨"?C.a2:C.textDim}}>{sync}</span></p></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button style={S.themeBtn} onClick={async()=>{ setSync("불러오는 중…"); try{ const s=await sbLoad(); if(s){applyState(s);} setSync("동기화됨"); }catch{ setSync("오프라인(이 기기에만 저장)"); } }} title="새로고침(다른 기기 변경 가져오기)">↻</button>
          <button style={S.themeBtn} onClick={()=>setTheme(t=>t==="light"?"dark":"light")} title="테마 전환">{theme==="light"?"🌙":"☀️"}</button>
          <div style={S.switch}>{["달력","일","월","년"].map(v=>(<button key={v} onClick={()=>setView(v)} style={{...S.swBtn,...(view===v?S.swOn:{})}}>{v}</button>))}</div>
        </div>
      </header>

      {view==="달력"&&(
        <CalendarView monthAnchor={calMonth} setMonthAnchor={setCalMonth} tasks={tasks} cats={cats} catOf={catOf} selDay={selDay} setSelDay={setSelDay} toggle={toggle} delTask={delTask} setTasks={setTasks} uid={uid} S={S} C={C}/>
      )}
      {view==="일"&&(
        <DayView month={dayMonth} setMonth={setDayMonth} tasks={tasks} shelf={shelf} cats={cats} catOf={catOf} toggle={toggle} delTask={delTask} setTasks={setTasks} setShelf={setShelf} sendShelfToDay={sendShelfToDay} uid={uid} S={S} C={C}/>
      )}
      {view==="월"&&(
        <><div style={S.nav}><button style={S.navBtn} onClick={()=>setProjYear(y=>y-1)}>‹</button><span style={S.range}>{projYear}년 · 주차별 프로젝트</span><button style={S.navBtn} onClick={()=>setProjYear(y=>y+1)}>›</button><div style={S.legend}>{cats.map(c=>(<span key={c.id} style={S.legendItem}><span style={{...S.legendDot,background:c.color}}/><b style={{color:c.color}}>{c.n}.</b>{c.label}</span>))}<button style={S.catEdit} onClick={()=>setNewCat(true)}>+ 카테고리</button></div></div>
        <MonthWeeks year={projYear} projects={projects} catOf={catOf} cats={cats} onOpen={(p)=>setProjModal({...p,_src:"month"})} setProjects={setProjects} S={S} C={C} uid={uid}/></>
      )}
      {view==="년"&&(
        <><div style={S.nav}><span style={S.range}>최근 10년 · 연도별 간트</span><div style={S.legend}>{cats.map(c=>(<span key={c.id} style={S.legendItem}><span style={{...S.legendDot,background:c.color}}/><b style={{color:c.color}}>{c.n}.</b>{c.label}</span>))}<button style={S.catEdit} onClick={()=>setNewCat(true)}>+ 카테고리</button></div></div>
        <YearStack projects={yearProjects} catOf={catOf} cats={cats} onOpen={(p)=>setProjModal({...p,_src:"year"})} setProjects={setYearProjects} uid={uid} S={S} C={C}/></>
      )}

      {reflect&&<Reflect C={C} S={S} text={reflect.text} onSave={n=>saveNote(reflect.dIso,reflect.id,n)} onSkip={()=>setReflect(null)}/>}
      {newCat&&<NewCat C={C} S={S} cats={cats} onSave={(label,color)=>{ setCats([...cats,{id:uid(),n:cats.length+1,label,color}]); setNewCat(false); }} onDelete={(id)=>setCats(cats.filter(c=>c.id!==id).map((c,i)=>({...c,n:i+1})))} onClose={()=>setNewCat(false)}/>}
      {projModal&&<ProjModal C={C} S={S} proj={projModal} cat={catOf(projModal.cat)} cats={cats}
        onSave={(up)=>{ const setter=projModal._src==="year"?setYearProjects:setProjects; setter(ps=>ps.map(p=>p.id===up.id?{...up,_src:undefined}:p)); setProjModal(null); }}
        onDelete={(id)=>{ const setter=projModal._src==="year"?setYearProjects:setProjects; setter(ps=>ps.filter(p=>p.id!==id)); setProjModal(null); }}
        onClose={()=>setProjModal(null)}/>}
    </div>
  );
}

function CalendarView({monthAnchor,setMonthAnchor,tasks,cats,catOf,selDay,setSelDay,toggle,delTask,setTasks,uid,S,C}){
  const y=monthAnchor.getFullYear(), m=monthAnchor.getMonth(); const weeks=calMatrix(y,m);
  const [adding,setAdding]=useState(false); const [t,setT]=useState(""); const [cat,setCat]=useState("c2"); const [hour,setHour]=useState(9); const inputRef=useRef(null);
  const quickAdd=()=>{ const v=t.trim(); if(!v)return; setTasks(p=>({...p,[selDay]:[...(p[selDay]||[]),{id:uid(),text:v,cat,hour,done:false,note:""}]})); setT(""); };
  const shiftMonth=(dir)=>{ const x=new Date(monthAnchor); x.setMonth(x.getMonth()+dir); setMonthAnchor(x); };
  const dayDots=(dn)=>{ if(!dn)return []; const arr=tasks[iso(new Date(y,m,dn))]||[]; const set=[]; arr.forEach(it=>{const c=catOf(it.cat); if(!set.includes(c.color))set.push(c.color);}); return set.slice(0,3); };
  const todayIso=iso(TODAY);

  // Agenda: all days that have events, sorted by date; from today onward (like Apple's left list)
  const agenda = Object.keys(tasks)
    .filter(k=>(tasks[k]||[]).length>0 && k>=todayIso)
    .sort()
    .map(k=>({ dateIso:k, date:new Date(k+"T00:00:00"), items:tasks[k].slice().sort((a,b)=>((a.hour==null?99:a.hour)-(b.hour==null?99:b.hour))) }));
  const fmtDate=(d)=>`${d.getMonth()+1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`;

  return (
    <div className="calsplit" style={S.calSplit}>
      {/* LEFT: agenda list (Apple-style) */}
      <aside className="agenda" style={S.agenda}>
        <div style={S.agendaHead}>다가오는 일정</div>
        <div className="sc" style={S.agendaScroll}>
          {agenda.length===0&&<div style={S.dayEmpty}>예정된 일정이 없어요.</div>}
          {agenda.map(group=>{
            const isSel=group.dateIso===selDay; const isToday=group.dateIso===todayIso;
            return (
              <div key={group.dateIso} style={S.agendaGroup}>
                <button onClick={()=>{setSelDay(group.dateIso); setMonthAnchor(new Date(group.date.getFullYear(),group.date.getMonth(),1));}}
                  style={{...S.agendaDate, ...(isSel?{color:C.a2}:{}), ...(isToday?{color:C.a1}:{})}}>
                  {fmtDate(group.date)}{isToday?" · 오늘":""}
                </button>
                {group.items.map(it=>{ const c=catOf(it.cat); return (
                  <div key={it.id} style={{...S.agendaItem,opacity:it.done?0.5:1}}>
                    <span style={{...S.agendaBar,background:c.color}}/>
                    <div style={S.rowBody}>
                      <span style={{...S.rowText,fontSize:14,textDecoration:it.done?"line-through":"none"}}>{it.text}</span>
                    </div>
                    {it.hour!=null&&<span style={S.agendaTime}>{it.hour<12?"오전":"오후"} {((it.hour%12)||12)}:00</span>}
                  </div>
                );})}
              </div>
            );
          })}
        </div>
      </aside>

      {/* RIGHT: calendar grid + selected day quick panel */}
      <div style={S.calWrap}>
        <div style={S.calTitleRow}><button style={S.navBtn} onClick={()=>shiftMonth(-1)}>‹</button><span style={S.calTitle}>{y}년 {MONTHS[m]}</span><button style={S.navBtn} onClick={()=>shiftMonth(1)}>›</button><button style={S.todayBtn} onClick={()=>{setMonthAnchor(new Date(TODAY.getFullYear(),TODAY.getMonth(),1));setSelDay(todayIso);}}>오늘</button></div>
        <div style={S.calGrid}>
          {WD.map((w,i)=>(<div key={w} style={{...S.calWD,color:i===0?C.a1:i===6?C.a4:C.textDim}}>{w}</div>))}
          {weeks.map((week,wi)=>week.map((dn,di)=>{ const k=dn?iso(new Date(y,m,dn)):null; const isSel=k===selDay; const isToday=k===todayIso; const dots=dayDots(dn);
            return (<button key={wi+"-"+di} disabled={!dn} onClick={()=>k&&setSelDay(k)} style={{...S.calCell,...(isSel?S.calCellSel:{}),...(dn?{}:{visibility:"hidden"})}}>
              <span style={{...S.calNum,...(isToday?S.calToday:{}),...(isSel&&!isToday?{fontWeight:800}:{}),color:di===0?C.a1:di===6?C.a4:(isToday?C.bg:C.text)}}>{dn}</span>
              <span style={S.calDots}>{dots.map((c,ci)=><span key={ci} style={{...S.calDot,background:c}}/>)}</span></button>);
          }))}
        </div>
        <SelectedDay selDay={selDay} tasks={tasks} cats={cats} catOf={catOf} toggle={toggle} delTask={delTask} adding={adding} setAdding={setAdding} t={t} setT={setT} cat={cat} setCat={setCat} hour={hour} setHour={setHour} inputRef={inputRef} quickAdd={quickAdd} S={S} C={C}/>
      </div>
    </div>
  );
}

function SelectedDay({selDay,tasks,cats,catOf,toggle,delTask,adding,setAdding,t,setT,cat,setCat,hour,setHour,inputRef,quickAdd,S,C}){
  const selDate=new Date(selDay+"T00:00:00");
  const selItems=(tasks[selDay]||[]).slice().sort((a,b)=>((a.hour==null?99:a.hour)-(b.hour==null?99:b.hour)));
  return (
    <div style={S.selPanel}>
      <div style={S.selHead}><span style={S.selDate}>{selDate.getMonth()+1}월 {selDate.getDate()}일 <span style={{color:C.textDim,fontWeight:500}}>{WD[selDate.getDay()]}요일</span></span><button style={S.addFab} onClick={()=>{setAdding(a=>!a);setTimeout(()=>inputRef.current&&inputRef.current.focus(),50);}}>+ 추가</button></div>
      {adding&&(<div style={S.quickRow}><select value={cat} onChange={e=>setCat(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select><select value={hour} onChange={e=>setHour(+e.target.value)} style={S.selTime}>{HOURS.map(h=><option key={h} value={h}>{timeLabel(h)}</option>)}</select><input ref={inputRef} value={t} onChange={e=>setT(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")quickAdd();}} placeholder="내용 입력 후 Enter" style={S.addInput}/><button style={S.saveBtn} onClick={quickAdd}>추가</button></div>)}
      <div className="sc" style={S.selList}>
        {selItems.length===0&&<div style={S.dayEmpty}>이 날 일정이 없어요. + 추가로 빠르게 넣으세요.</div>}
        {selItems.map(it=>{ const c=catOf(it.cat); return (<div key={it.id} style={{...S.row,opacity:it.done?0.5:1}}><button style={S.check} onClick={()=>toggle(selDay,it.id)}><span style={{...S.cbox,...(it.done?{background:c.color,borderColor:c.color}:{})}}>{it.done?"✓":""}</span></button><span style={{...S.catNum,color:c.color}}>{c.n}</span>{it.hour!=null&&<span style={S.timePill}>{String(it.hour).padStart(2,"0")}:00</span>}<div style={S.rowBody}><span style={{...S.rowText,textDecoration:it.done?"line-through":"none"}}>{it.text}</span>{it.note&&<span style={S.rowNote}>💭 {it.note}</span>}</div><button style={S.rowX} onClick={()=>delTask(selDay,it.id)}>×</button></div>);})}
      </div>
    </div>
  );
}

function DayView({month,setMonth,tasks,shelf,cats,catOf,toggle,delTask,setTasks,setShelf,sendShelfToDay,uid,S,C}){
  const y=month.getFullYear(), m=month.getMonth(); const dim=new Date(y,m+1,0).getDate();
  const days=Array.from({length:dim},(_,i)=>i+1);
  const shiftMonth=(dir)=>{ const x=new Date(month); x.setMonth(x.getMonth()+dir); setMonth(x); };
  const [addTo,setAddTo]=useState(null); const [t,setT]=useState(""); const [cat,setCat]=useState("c2"); const [hour,setHour]=useState(9);
  const commit=(dIso)=>{ const v=t.trim(); if(!v){setAddTo(null);return;} setTasks(p=>({...p,[dIso]:[...(p[dIso]||[]),{id:uid(),text:v,cat,hour,done:false,note:""}]})); setT(""); setAddTo(null); };
  const [newShelf,setNewShelf]=useState(""); const [shelfCat,setShelfCat]=useState("c1");
  const todayIso=iso(TODAY);
  const sortByHour=(arr)=>[...arr].sort((a,b)=>((a.hour==null?99:a.hour)-(b.hour==null?99:b.hour)));
  return (
    <div style={S.dayWrap}>
      <div style={S.calTitleRow}><button style={S.navBtn} onClick={()=>shiftMonth(-1)}>‹</button><span style={S.calTitle}>{y}년 {MONTHS[m]}</span><button style={S.navBtn} onClick={()=>shiftMonth(1)}>›</button><span style={{...S.shelfHint,marginLeft:8}}>아래로 스크롤 = 1일~말일 · 좌우 = 월 이동</span><button style={S.todayBtn} onClick={()=>setMonth(new Date(TODAY.getFullYear(),TODAY.getMonth(),1))}>오늘</button></div>
      <div className="sc" style={S.dayScroll}>
        {days.map(dn=>{ const d=new Date(y,m,dn); const key=iso(d); const items=sortByHour(tasks[key]||[]); const isToday=key===todayIso; const wd=WD[d.getDay()];
          return (
            <div key={key} style={{...S.dRow,...(isToday?S.dToday:{})}}>
              <div style={S.dDateCol}><span style={{...S.dNum,...(isToday?{color:C.a2}:{})}}>{dn}</span><span style={{...S.dWd,color:d.getDay()===0?C.a1:d.getDay()===6?C.a4:C.textDim}}>{wd}</span></div>
              <div style={S.dItems}>
                {items.map(it=>{ const c=catOf(it.cat); return (<div key={it.id} style={{...S.row,opacity:it.done?0.5:1,borderBottom:"none",padding:"3px 4px"}}><button style={S.check} onClick={()=>toggle(key,it.id)}><span style={{...S.cbox,...(it.done?{background:c.color,borderColor:c.color}:{})}}>{it.done?"✓":""}</span></button><span style={{...S.catNum,color:c.color}}>{c.n}</span>{it.hour!=null&&<span style={S.timePill}>{String(it.hour).padStart(2,"0")}:00</span>}<div style={S.rowBody}><span style={{...S.rowText,textDecoration:it.done?"line-through":"none"}}>{it.text}</span>{it.note&&<span style={S.rowNote}>💭 {it.note}</span>}</div><button style={S.rowX} onClick={()=>delTask(key,it.id)}>×</button></div>);})}
                {addTo===key?(
                  <div style={S.addRow}><select value={cat} onChange={e=>setCat(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select><select value={hour} onChange={e=>setHour(+e.target.value)} style={S.selTime}>{HOURS.map(h=><option key={h} value={h}>{timeLabel(h)}</option>)}</select><input autoFocus value={t} onChange={e=>setT(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")commit(key);if(e.key==="Escape")setAddTo(null);}} placeholder="내용 입력 후 Enter" style={S.addInput}/></div>
                ):(<button style={S.dAdd} onClick={()=>{setAddTo(key);setT("");}}>+ 추가</button>)}
              </div>
            </div>
          );
        })}
      </div>
      {/* 하단 아이디어 선반 */}
      <div style={S.shelf}>
        <div style={S.shelfHead}><h2 style={S.shelfTitle}><span style={{color:C.a3}}>▤</span> 아이디어 선반</h2><span style={S.shelfHint}>카드의 <b>▲</b>로 이 달 원하는 날짜에 넣으세요</span></div>
        <div style={S.shelfComposer}><select value={shelfCat} onChange={e=>setShelfCat(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select><input value={newShelf} onChange={e=>setNewShelf(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newShelf.trim()){setShelf(s=>[{id:uid(),text:newShelf.trim(),cat:shelfCat},...s]);setNewShelf("");}}} placeholder="새 아이디어 입력 후 Enter" style={S.shelfInput}/></div>
        <div className="sc" style={S.shelfList}>
          {shelf.map(it=>{ const c=catOf(it.cat); return (<div key={it.id} style={{...S.chip,borderColor:c.color}}><span style={{...S.chipNum,background:c.color}}>{c.n}</span><span style={S.chipText}>{it.text}</span><DayPicker y={y} m={m} dim={dim} onPick={(dIso)=>sendShelfToDay(it.id,dIso)} S={S} C={C}/><button style={S.rowX} onClick={()=>setShelf(s=>s.filter(x=>x.id!==it.id))}>×</button></div>);})}
          {shelf.length===0&&<div style={S.dayEmpty}>선반이 비었어요.</div>}
        </div>
      </div>
    </div>
  );
}

function DayPicker({y,m,dim,onPick,S,C}){
  const [open,setOpen]=useState(false); const [d,setD]=useState(1);
  return (<div style={{position:"relative"}}><button style={S.sendBtn} onClick={()=>setOpen(o=>!o)} aria-label="날짜로 보내기">▲</button>
    {open&&(<div style={S.sendPop}><select value={d} onChange={e=>setD(+e.target.value)} style={{...S.sel,width:"100%",marginBottom:6}}>{Array.from({length:dim},(_,i)=>i+1).map(dd=><option key={dd} value={dd}>{m+1}월 {dd}일</option>)}</select><button style={S.saveBtn} onClick={()=>{onPick(iso(new Date(y,m,d)));setOpen(false);}}>이 날로 보내기</button></div>)}
  </div>);
}

function MonthWeeks({year,projects,catOf,cats,onOpen,setProjects,S,C,uid}){
  const [adding,setAdding]=useState(false); const [nt,setNt]=useState(""); const [nn,setNn]=useState(""); const [nc,setNc]=useState(cats[0].id);
  const wiy=weeksInYear(year); const [nsw,setNsw]=useState(1); const [new_,setNew]=useState(1); const relevant=projects.filter(p=>p.year===year);
  return (
    <div style={S.monthWrap}>
      <div style={S.ganttInfo}><span style={S.shelfHint}>월을 ISO 주차로 나눴어요. 프로젝트가 걸친 주차 줄에 형광펜이 칠해지고, 누르면 내용이 보입니다.</span><button style={S.addProjBtn} onClick={()=>setAdding(!adding)}>+ 프로젝트</button></div>
      {adding&&(<div style={S.projForm}><input value={nt} onChange={e=>setNt(e.target.value)} placeholder="이름 (예: 일본 장기 출장)" style={{...S.shelfInput,minWidth:150}}/><input value={nn} onChange={e=>setNn(e.target.value)} placeholder="메모(선택)" style={{...S.shelfInput,minWidth:110}}/><select value={nc} onChange={e=>setNc(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select><select value={nsw} onChange={e=>setNsw(+e.target.value)} style={S.sel}>{Array.from({length:wiy},(_,i)=>i+1).map(w=><option key={w} value={w}>wk{w}</option>)}</select><span style={{color:C.textDim}}>~</span><select value={new_} onChange={e=>setNew(+e.target.value)} style={S.sel}>{Array.from({length:wiy},(_,i)=>i+1).map(w=><option key={w} value={w}>wk{w}</option>)}</select><button style={S.saveBtn} onClick={()=>{ if(nt.trim()){ setProjects(p=>[...p,{id:uid(),text:nt.trim(),note:nn.trim(),cat:nc,year,startWeek:nsw,endWeek:Math.max(nsw,new_)}]); setNt("");setNn(""); setAdding(false);} }}>추가</button></div>)}
      <div className="sc" style={S.monthGridScroll}><div style={S.monthGrid}>
        {MONTHS.map((mLabel,m)=>{ const rows=monthWeekRows(year,m); return (<div key={m} style={S.mCell}><div style={S.mCellHead}>{mLabel}</div>{rows.map((row,wi)=>{ const covering=relevant.filter(p=> row.wkYear===year && row.wk>=p.startWeek && row.wk<=p.endWeek); return (<div key={wi} style={S.weekRow}><span style={S.weekLabel}>{row.s}일~{row.e}일 <b style={{color:C.faint}}>(wk{row.wk})</b></span><div style={S.weekBars}>{covering.map(p=>{ const cat=catOf(p.cat); return (<button key={p.id} onClick={()=>onOpen(p)} title={p.text} style={{...S.hlWeek,background:`${cat.color}30`,borderBottom:`3px solid ${cat.color}`}}/>);})}</div></div>);})}</div>);})}
      </div></div>
    </div>
  );
}
function YearGantt({year,projects,catOf,onOpen,S,C,highlight}){ const yp=projects.filter(p=>p.year===year);
  return (<div style={{...S.yg,...(highlight?{borderColor:C.a2,boxShadow:`inset 0 0 0 1px ${C.a2}44`}:{})}}><div style={S.ygHead}><span style={{...S.ygYear,...(highlight?{color:C.a2}:{})}}>{year}</span><div style={S.ygMonths}>{MONTHS_SHORT.map((m,i)=><div key={i} style={S.ygMonthCell}>{m}</div>)}</div></div>{yp.length===0&&<div style={S.ygEmpty}>—</div>}{yp.map(p=>{ const cat=catOf(p.cat); const sm=weekToMonth(year,p.startWeek); const em=weekToMonth(year,p.endWeek); const left=(sm/12)*100; const width=((em-sm+1)/12)*100; return (<div key={p.id} style={S.ygRow}><div style={S.ygLabel}><span style={{...S.chipNum,background:cat.color}}>{cat.n}</span><span style={S.ganttName}>{p.text}</span></div><div style={S.ygTrack}>{MONTHS_SHORT.map((_,i)=><div key={i} style={S.ygGrid}/>)}<button onClick={()=>onOpen(p)} title={p.text} style={{...S.ygBar,left:`${left}%`,width:`${Math.max(width,4)}%`,background:cat.color}}/></div></div>);})}</div>);
}
function YearStack({projects,catOf,cats,onOpen,setProjects,uid,S,C}){
  const list=Array.from({length:10},(_,i)=>THIS_YEAR-3+i);
  const [adding,setAdding]=useState(false);
  const [nt,setNt]=useState(""); const [nn,setNn]=useState(""); const [nc,setNc]=useState(cats[0].id);
  const [nyr,setNyr]=useState(THIS_YEAR); const [nsw,setNsw]=useState(1); const [new_,setNew]=useState(1);
  const wiy=weeksInYear(nyr);
  return (
    <div style={S.yearStackWrap}>
      <div style={{...S.ganttInfo,padding:"0 4px"}}>
        <span style={S.shelfHint}>막대를 누르면 수정·삭제할 수 있어요. 연도를 골라 새 프로젝트를 추가하세요.</span>
        <button style={S.addProjBtn} onClick={()=>setAdding(!adding)}>+ 프로젝트</button>
      </div>
      {adding&&(
        <div style={S.projForm}>
          <input value={nt} onChange={e=>setNt(e.target.value)} placeholder="이름 (예: 이직 준비)" style={{...S.shelfInput,minWidth:140}}/>
          <input value={nn} onChange={e=>setNn(e.target.value)} placeholder="메모(선택)" style={{...S.shelfInput,minWidth:100}}/>
          <select value={nc} onChange={e=>setNc(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select>
          <select value={nyr} onChange={e=>{setNyr(+e.target.value);}} style={S.sel}>{list.map(y=><option key={y} value={y}>{y}년</option>)}</select>
          <select value={nsw} onChange={e=>setNsw(+e.target.value)} style={S.sel}>{Array.from({length:wiy},(_,i)=>i+1).map(w=><option key={w} value={w}>wk{w}</option>)}</select>
          <span style={{color:C.textDim}}>~</span>
          <select value={new_} onChange={e=>setNew(+e.target.value)} style={S.sel}>{Array.from({length:wiy},(_,i)=>i+1).map(w=><option key={w} value={w}>wk{w}</option>)}</select>
          <button style={S.saveBtn} onClick={()=>{ if(nt.trim()){ setProjects(p=>[...p,{id:uid(),text:nt.trim(),note:nn.trim(),cat:nc,year:nyr,startWeek:nsw,endWeek:Math.max(nsw,new_)}]); setNt("");setNn(""); setAdding(false);} }}>추가</button>
        </div>
      )}
      <div className="sc" style={S.yearStackScroll}>{list.map(y=>(<YearGantt key={y} year={y} projects={projects} catOf={catOf} onOpen={onOpen} S={S} C={C} highlight={y===THIS_YEAR}/>))}</div>
    </div>
  );
}
function ProjModal({C,S,proj,cat,cats,onSave,onDelete,onClose}){
  const wiy=weeksInYear(proj.year);
  const [text,setText]=useState(proj.text);
  const [note,setNote]=useState(proj.note||"");
  const [pc,setPc]=useState(proj.cat);
  const [sw,setSw]=useState(proj.startWeek);
  const [ew,setEw]=useState(proj.endWeek);
  return (<div style={S.overlay} onClick={onClose}><div style={S.modal} onClick={e=>e.stopPropagation()}>
    <div style={{...S.modalTag,color:(cats.find(c=>c.id===pc)||cat).color}}>프로젝트 수정 · {proj.year}년</div>
    <input value={text} onChange={e=>setText(e.target.value)} placeholder="프로젝트 이름" style={{...S.shelfInput,width:"100%",fontSize:16,fontWeight:700,marginTop:8,marginBottom:10}}/>
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
      <select value={pc} onChange={e=>setPc(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select>
      <select value={sw} onChange={e=>setSw(+e.target.value)} style={S.sel}>{Array.from({length:wiy},(_,i)=>i+1).map(w=><option key={w} value={w}>wk{w}</option>)}</select>
      <span style={{color:C.textDim}}>~</span>
      <select value={ew} onChange={e=>setEw(+e.target.value)} style={S.sel}>{Array.from({length:wiy},(_,i)=>i+1).map(w=><option key={w} value={w}>wk{w}</option>)}</select>
    </div>
    <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="메모(선택)" style={{...S.modalArea,marginBottom:4}} rows={2}/>
    <div style={{...S.modalBtns,justifyContent:"space-between"}}>
      <button style={{...S.skipBtn,color:C.a1,borderColor:C.a1}} onClick={()=>onDelete(proj.id)}>삭제</button>
      <div style={{display:"flex",gap:10}}>
        <button style={S.skipBtn} onClick={onClose}>취소</button>
        <button style={S.saveBtn} onClick={()=>{ if(text.trim()) onSave({...proj,text:text.trim(),note:note.trim(),cat:pc,startWeek:sw,endWeek:Math.max(sw,ew)}); }}>저장</button>
      </div>
    </div>
  </div></div>); }
function Reflect({C,S,text,onSave,onSkip}){ const [n,setN]=useState(""); const ref=useRef(null); useEffect(()=>{ref.current&&ref.current.focus();},[]); return (<div style={S.overlay} onClick={onSkip}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalTag}>완료 · 복기</div><h3 style={S.modalTitle}>{text}</h3><p style={S.modalHint}>그냥 끝내지 말고 — 무엇을 배웠는지, 다음엔 뭘 바꿀지 한 줄.</p><textarea ref={ref} value={n} onChange={e=>setN(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))onSave(n);}} placeholder="예: 앞마당 먼저 먹으니 자원 격차가 큼. 다음엔 정찰을 앞당기기." style={S.modalArea} rows={3}/><div style={S.modalBtns}><button style={S.skipBtn} onClick={onSkip}>그냥 완료</button><button style={S.saveBtn} onClick={()=>onSave(n)}>남기기</button></div></div></div>); }
function NewCat({C,S,cats,onSave,onDelete,onClose}){ const PAL=palette(C); const [label,setLabel]=useState(""); const [color,setColor]=useState(PAL[3]); return (<div style={S.overlay} onClick={onClose}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalTag}>카테고리 관리</div><div style={{margin:"12px 0"}}>{cats.map(c=>(<div key={c.id} style={S.catManageRow}><span style={{...S.chipNum,background:c.color}}>{c.n}</span><span style={{flex:1}}>{c.label}</span><button style={S.rowX} onClick={()=>onDelete(c.id)}>×</button></div>))}</div><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="새 카테고리 이름" style={{...S.shelfInput,width:"100%",marginBottom:10}}/><div style={{display:"flex",gap:8,marginBottom:14}}>{PAL.map(p=>(<button key={p} onClick={()=>setColor(p)} style={{width:26,height:26,borderRadius:7,background:p,border:color===p?`2px solid ${C.text}`:"2px solid transparent",cursor:"pointer"}}/>))}</div><div style={S.modalBtns}><button style={S.skipBtn} onClick={onClose}>닫기</button><button style={S.saveBtn} onClick={()=>label.trim()&&onSave(label.trim(),color)}>추가</button></div></div></div>); }

const st=(C)=>({
  root:{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter',-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif",display:"flex",flexDirection:"column"},
  head:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"18px 20px 12px",borderBottom:`1px solid ${C.line}`,flexWrap:"wrap",gap:10},
  brandRow:{display:"flex",alignItems:"center",gap:8}, brand:{margin:0,fontSize:19,fontWeight:700,letterSpacing:"-0.02em"}, tag:{margin:"4px 0 0 22px",color:C.textDim,fontSize:12},
  themeBtn:{width:34,height:34,borderRadius:9,border:`1px solid ${C.line}`,background:C.panel,cursor:"pointer",fontSize:15},
  switch:{display:"flex",gap:2,background:C.panel,padding:3,borderRadius:10,border:`1px solid ${C.line}`},
  swBtn:{border:"none",background:"transparent",color:C.textDim,padding:"7px 14px",borderRadius:7,cursor:"pointer",fontSize:13.5,fontWeight:600}, swOn:{background:C.panelHi,color:C.text},
  nav:{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",flexWrap:"wrap"},
  navBtn:{width:30,height:30,borderRadius:8,border:`1px solid ${C.line}`,background:C.panel,color:C.text,cursor:"pointer",fontSize:17,lineHeight:1},
  range:{fontSize:15,fontWeight:600}, legend:{display:"flex",gap:12,marginLeft:"auto",alignItems:"center",flexWrap:"wrap"},
  legendItem:{display:"flex",alignItems:"center",gap:5,fontSize:12.5,color:C.textDim}, legendDot:{width:8,height:8,borderRadius:"50%"},
  catEdit:{border:`1px solid ${C.line}`,background:"transparent",color:C.textDim,borderRadius:7,padding:"4px 9px",fontSize:12,cursor:"pointer"},
  calSplit:{flex:1,display:"flex",minHeight:0,gap:0},
  agenda:{width:290,flexShrink:0,borderRight:`1px solid ${C.line}`,display:"flex",flexDirection:"column",minHeight:0,background:C.panel},
  agendaHead:{fontSize:13,fontWeight:700,color:C.textDim,padding:"14px 16px 8px",letterSpacing:"0.02em"},
  agendaScroll:{flex:1,overflowY:"auto",padding:"0 8px 16px"},
  agendaGroup:{marginBottom:14},
  agendaDate:{display:"block",width:"100%",textAlign:"left",border:"none",background:"transparent",fontSize:13,fontWeight:700,color:C.text,padding:"6px 8px",cursor:"pointer",borderBottom:`1px solid ${C.line}`,marginBottom:4},
  agendaItem:{display:"flex",alignItems:"center",gap:8,padding:"5px 8px"},
  agendaBar:{width:3,alignSelf:"stretch",borderRadius:2,flexShrink:0,minHeight:20},
  agendaTime:{fontSize:12,color:C.textDim,flexShrink:0,fontVariantNumeric:"tabular-nums"},
  calWrap:{flex:1,display:"flex",flexDirection:"column",padding:"12px 16px 16px",minHeight:0},
  calTitleRow:{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"},
  calTitle:{fontSize:20,fontWeight:800,letterSpacing:"-0.02em"},
  todayBtn:{marginLeft:"auto",border:`1px solid ${C.line}`,background:C.panel,color:C.text,borderRadius:8,padding:"6px 14px",fontSize:13,fontWeight:600,cursor:"pointer"},
  calGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,borderBottom:`1px solid ${C.line}`,paddingBottom:6},
  calWD:{textAlign:"center",fontSize:12,fontWeight:600,padding:"4px 0"},
  calCell:{border:"none",background:"transparent",aspectRatio:"1/1.15",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",gap:3,padding:"6px 0 0",cursor:"pointer",borderRadius:10},
  calCellSel:{background:C.panelHi}, calNum:{fontSize:15,fontWeight:600,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%"},
  calToday:{background:C.a2,color:C.bg,fontWeight:800}, calDots:{display:"flex",gap:2,height:6}, calDot:{width:5,height:5,borderRadius:"50%"},
  selPanel:{flex:1,display:"flex",flexDirection:"column",minHeight:0,marginTop:10},
  selHead:{display:"flex",alignItems:"center",gap:10,marginBottom:8}, selDate:{fontSize:16,fontWeight:700},
  addFab:{marginLeft:"auto",border:"none",background:C.a2,color:C.bg,borderRadius:9,padding:"8px 16px",fontSize:14,fontWeight:700,cursor:"pointer"},
  quickRow:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:10,background:C.panel,padding:8,borderRadius:10,border:`1px solid ${C.line}`},
  selList:{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:3},
  row:{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 6px",borderBottom:`1px solid ${C.line}`},
  check:{border:"none",background:"transparent",padding:0,cursor:"pointer",marginTop:1},
  cbox:{width:18,height:18,borderRadius:"50%",border:`1.5px solid ${C.faint}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:C.bg,fontWeight:700},
  catNum:{fontSize:12,fontWeight:800,marginTop:2,width:10,textAlign:"center",flexShrink:0},
  timePill:{fontSize:11,color:C.textDim,background:C.panelHi,borderRadius:5,padding:"2px 6px",marginTop:1,flexShrink:0,fontVariantNumeric:"tabular-nums"},
  rowBody:{flex:1,display:"flex",flexDirection:"column",gap:2,minWidth:0}, rowText:{fontSize:15,lineHeight:1.35,wordBreak:"break-word"}, rowNote:{fontSize:12,color:C.textDim,fontStyle:"italic",lineHeight:1.35},
  rowX:{border:"none",background:"transparent",color:C.faint,cursor:"pointer",fontSize:17,lineHeight:1,padding:"0 3px"},
  sel:{background:C.panelHi,border:`1px solid ${C.line}`,color:C.text,borderRadius:6,padding:"6px 6px",fontSize:12.5,fontFamily:"inherit"},
  selTime:{background:C.panelHi,border:`1px solid ${C.line}`,color:C.text,borderRadius:6,padding:"6px 6px",fontSize:12.5,fontFamily:"inherit",fontVariantNumeric:"tabular-nums"},
  addInput:{flex:1,minWidth:120,background:C.bg,border:`1px solid ${C.line}`,color:C.text,fontSize:14,padding:"7px 9px",borderRadius:8,fontFamily:"inherit"},
  dayEmpty:{color:C.faint,fontSize:13,padding:"14px 6px",textAlign:"center"},
  // day view
  dayWrap:{flex:1,display:"flex",flexDirection:"column",padding:"12px 16px 16px",minHeight:0,gap:10},
  dayScroll:{flex:"1 1 55%",overflowY:"auto",display:"flex",flexDirection:"column"},
  dRow:{display:"flex",gap:10,padding:"8px 4px",borderBottom:`1px solid ${C.line}`},
  dToday:{background:`${C.a2}0E`,borderRadius:8},
  dDateCol:{width:38,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:2},
  dNum:{fontSize:17,fontWeight:700}, dWd:{fontSize:11,marginTop:1},
  dItems:{flex:1,display:"flex",flexDirection:"column",gap:2,minWidth:0},
  dAdd:{alignSelf:"flex-start",border:`1px dashed ${C.line}`,background:"transparent",color:C.textDim,borderRadius:7,padding:"4px 10px",fontSize:12.5,cursor:"pointer",marginTop:2},
  addRow:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",padding:"4px 0"},
  shelf:{flex:"0 0 auto",maxHeight:"38%",background:C.panel,border:`1px solid ${C.line}`,borderRadius:14,padding:14,display:"flex",flexDirection:"column",minHeight:0},
  shelfHead:{marginBottom:10}, shelfTitle:{margin:0,fontSize:15,fontWeight:700,display:"flex",alignItems:"center",gap:8}, shelfHint:{fontSize:12,color:C.textDim},
  shelfComposer:{display:"flex",gap:8,marginBottom:12},
  shelfInput:{flex:1,background:C.bg,border:`1px solid ${C.line}`,color:C.text,borderRadius:8,padding:"8px 10px",fontSize:13.5,fontFamily:"inherit"},
  shelfList:{flex:1,overflowY:"auto",display:"flex",flexWrap:"wrap",gap:8,alignContent:"flex-start"},
  chip:{display:"flex",alignItems:"center",gap:7,background:C.panelHi,border:"1.5px solid",borderRadius:10,padding:"8px 10px",maxWidth:"100%"},
  chipNum:{width:18,height:18,borderRadius:"50%",color:C.bg,fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  chipText:{fontSize:13,lineHeight:1.3},
  sendBtn:{border:`1px solid ${C.line}`,background:"transparent",color:C.a2,borderRadius:6,width:22,height:22,cursor:"pointer",fontSize:11,lineHeight:1,flexShrink:0},
  sendPop:{position:"absolute",bottom:"120%",right:0,background:C.bg,border:`1px solid ${C.line}`,borderRadius:10,padding:8,zIndex:20,minWidth:150,boxShadow:"0 6px 20px rgba(0,0,0,.25)"},
  monthWrap:{flex:1,display:"flex",flexDirection:"column",padding:"0 20px 20px",minHeight:0},
  ganttInfo:{display:"flex",alignItems:"center",gap:12,marginBottom:12,flexWrap:"wrap"},
  addProjBtn:{marginLeft:"auto",border:`1px solid ${C.a2}`,background:"transparent",color:C.a2,borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:600,cursor:"pointer"},
  projForm:{display:"flex",gap:8,alignItems:"center",marginBottom:14,flexWrap:"wrap",background:C.panel,padding:10,borderRadius:10,border:`1px solid ${C.line}`},
  monthGridScroll:{flex:1,overflow:"auto"}, monthGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12},
  mCell:{background:C.panel,border:`1px solid ${C.line}`,borderRadius:12,padding:"10px 12px 12px"}, mCellHead:{fontSize:14,fontWeight:700,marginBottom:8},
  weekRow:{display:"flex",alignItems:"center",gap:8,minHeight:20,marginBottom:4}, weekLabel:{fontSize:11,color:C.textDim,width:118,flexShrink:0,fontVariantNumeric:"tabular-nums"},
  weekBars:{flex:1,display:"flex",flexDirection:"column",gap:2}, hlWeek:{height:11,border:"none",borderRadius:3,cursor:"pointer",padding:0,width:"100%"},
  yearStackWrap:{flex:1,display:"flex",flexDirection:"column",padding:"0 20px 20px",minHeight:0}, yearStackScroll:{flex:1,overflow:"auto",display:"flex",flexDirection:"column",gap:14},
  yg:{background:C.panel,border:`1px solid ${C.line}`,borderRadius:12,padding:"10px 12px 12px",flexShrink:0},
  ygHead:{display:"flex",alignItems:"center",gap:10,marginBottom:6,borderBottom:`1px solid ${C.line}`,paddingBottom:6}, ygYear:{fontSize:16,fontWeight:800,width:52,flexShrink:0}, ygMonths:{flex:1,display:"flex",minWidth:360},
  ygMonthCell:{flex:1,textAlign:"center",fontSize:10.5,color:C.faint,minWidth:26}, ygRow:{display:"flex",alignItems:"center",minHeight:34}, ygLabel:{width:150,flexShrink:0,display:"flex",alignItems:"center",gap:7},
  ganttName:{fontSize:13,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}, ygTrack:{flex:1,position:"relative",display:"flex",minWidth:360,height:34,alignItems:"center"},
  ygGrid:{flex:1,borderRight:`1px solid ${C.line}44`,height:"100%",minWidth:26}, ygBar:{position:"absolute",height:16,borderRadius:6,border:"none",cursor:"pointer",boxShadow:"0 1px 2px rgba(0,0,0,.15)"}, ygEmpty:{color:C.faint,fontSize:12,padding:"8px 0 4px"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,zIndex:50},
  modal:{background:C.bg,border:`1px solid ${C.line}`,borderRadius:16,padding:24,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,.3)"},
  modalTag:{fontSize:11,letterSpacing:"0.08em",color:C.a2,fontWeight:700,textTransform:"uppercase"}, modalTitle:{margin:"8px 0 6px",fontSize:18,fontWeight:700,lineHeight:1.3},
  modalHint:{margin:"0 0 4px",color:C.textDim,fontSize:13,lineHeight:1.5}, modalArea:{width:"100%",background:C.panel,border:`1px solid ${C.line}`,borderRadius:10,color:C.text,fontSize:14,padding:11,resize:"none",fontFamily:"inherit",lineHeight:1.5},
  modalBtns:{display:"flex",gap:10,marginTop:14,justifyContent:"flex-end"},
  skipBtn:{background:"transparent",border:`1px solid ${C.line}`,color:C.textDim,borderRadius:8,padding:"9px 16px",cursor:"pointer",fontSize:14,fontWeight:600},
  saveBtn:{background:C.a2,border:"none",color:C.bg,borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:14,fontWeight:700},
  catManageRow:{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.line}`,fontSize:14},
});
