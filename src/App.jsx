import React, { useState, useEffect, useRef } from "react";

const THEMES = {
  light:{bg:"#FFFFFF",panel:"#F7F6F2",panelHi:"#EFEDE6",line:"#E3E0D7",text:"#1D1E18",textDim:"#6E6C61",faint:"#B7B4A8",a1:"#C2603F",a2:"#2E8C76",a3:"#B8862B",a4:"#6C5BA8"},
  dark:{bg:"#13140F",panel:"#1A1B15",panelHi:"#232419",line:"#33352A",text:"#ECEADE",textDim:"#98968A",faint:"#5A5B4E",a1:"#C97C5D",a2:"#4FB09A",a3:"#D9A441",a4:"#8E7CC3"},
};
const mkCats=(C)=>[{id:"c1",n:1,label:"재테크",color:C.a1},{id:"c2",n:2,label:"업무",color:C.a2},{id:"c3",n:3,label:"가족",color:C.a3}];
const palette=(C)=>[C.a1,C.a2,C.a3,C.a4,"#6FA8DC","#E06C9F","#7FB069","#D98E2B"];
const WD=["일","월","화","수","목","금","토"];
const MONTHS=["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const MONTHS_SHORT=["1","2","3","4","5","6","7","8","9","10","11","12"];
const HOURS=Array.from({length:24},(_,i)=>i);
const PRI={ high:{label:"높음",color:"#E5484D"}, mid:{label:"보통",color:"#9AA0A6"}, low:{label:"낮음",color:"#3E63DD"} };
const PRI_ORDER=["high","mid","low"];
const TERMS=[{id:"short",label:"단기"},{id:"mid",label:"중기"},{id:"long",label:"장기"}];
const SHELF_TERMS=[{id:"short",label:"단기"},{id:"long",label:"중장기"}];
// ── 로그인(둘만 쓰는 개인/공용 분리) ──
const PROFILES=[{id:"husband",label:"남편"},{id:"wife",label:"아내"}];
const PASSCODE="0000"; // 공용 접속 코드 — 원하는 값으로 바꾸세요
const REMINDERS=[{v:0,label:"알림 없음"},{v:60,label:"1시간 전"},{v:120,label:"2시간 전"},{v:180,label:"3시간 전"},{v:1440,label:"하루 전"}];
const timeLabel=(h)=>`${String(h).padStart(2,"0")}:00~${String((h+1)%24).padStart(2,"0")}:00`;
const iso=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const startOfWeek=(d)=>{const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x;};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const TODAY=new Date("2026-07-11T00:00:00");
const THIS_YEAR=2026;
const YEAR_START=2017, YEAR_END=2036; // 20년
function isoWeek(date){const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));const dn=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-dn+3);const ft=new Date(Date.UTC(d.getUTCFullYear(),0,4));const fdn=(ft.getUTCDay()+6)%7;ft.setUTCDate(ft.getUTCDate()-fdn+3);return 1+Math.round((d-ft)/(7*24*3600*1000));}
function isoWeekYear(date){const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));const dn=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-dn+3);return d.getUTCFullYear();}
function monthWeekRows(year,m){
  const dim=new Date(year,m+1,0).getDate();
  const rows=[];
  let cur=startOfWeek(new Date(year,m,1));
  const monthEnd=new Date(year,m,dim);
  while(cur<=monthEnd){
    const thu=addDays(cur,3);
    const weekEnd=addDays(cur,6);
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

// ── Supabase sync config (기존 그대로 재활용) ──
const SB_URL="https://xnzrrcqsgvmvinnfmjhu.supabase.co";
const SB_KEY="sb_publishable_kv2zn8BhA1Ltvmyz4Wpk8w_U60r_B1l";
const sbHeaders={ "apikey":SB_KEY, "Authorization":`Bearer ${SB_KEY}`, "Content-Type":"application/json" };
// 개인 데이터: planner8_<profile> / 공용 데이터: planner8_common
const rowPersonal=(profile)=>`planner8_${profile}`;
const ROW_COMMON="planner8_common";
async function sbLoad(rowId){
  const r=await fetch(`${SB_URL}/rest/v1/planner_data?id=eq.${rowId}&select=data`,{headers:sbHeaders});
  if(!r.ok) throw new Error("load failed");
  const rows=await r.json();
  return rows[0]?.data||null;
}
async function sbSave(rowId,data){
  await fetch(`${SB_URL}/rest/v1/planner_data`,{
    method:"POST",
    headers:{...sbHeaders,"Prefer":"resolution=merge-duplicates"},
    body:JSON.stringify({id:rowId,data,updated_at:new Date().toISOString()}),
  });
}

// 눌러서 수정하는 텍스트
function EditableText({value,onSave,style,C,placeholder}){
  const [editing,setEditing]=useState(false);
  const [v,setV]=useState(value);
  useEffect(()=>{ setV(value); },[value]);
  if(editing){
    return <input autoFocus value={v} onChange={e=>setV(e.target.value)}
      onBlur={()=>{ setEditing(false); const t=v.trim(); if(t&&t!==value)onSave(t); else setV(value); }}
      onKeyDown={e=>{ if(e.key==="Enter")e.target.blur(); if(e.key==="Escape"){ setV(value); setEditing(false);} }}
      placeholder={placeholder}
      style={{...(style||{}),textDecoration:"none",border:`1px solid ${C.a2}`,borderRadius:6,padding:"2px 6px",background:C.bg,color:C.text,fontFamily:"inherit",minWidth:80}}/>;
  }
  return <span onClick={()=>setEditing(true)} title="눌러서 수정" style={{...(style||{}),cursor:"text"}}>{value}</span>;
}

export default function App(){
  const [theme,setTheme]=useState("light");
  const C=THEMES[theme];
  const [cats,setCats]=useState(mkCats(THEMES.light));
  const [tasks,setTasks]=useState({});
  const [projects,setProjects]=useState([]);
  const [yearProjects,setYearProjects]=useState([]);
  const [shelf,setShelf]=useState([]);
  const [routines,setRoutines]=useState([]);
  const [buckets,setBuckets]=useState([]);
  const [purchases,setPurchases]=useState([]);
  const [view,setView]=useState("달력");
  const [calMonth,setCalMonth]=useState(new Date("2026-07-01T00:00:00"));
  const [dayMonth,setDayMonth]=useState(new Date("2026-07-01T00:00:00"));
  const [selDay,setSelDay]=useState(iso(TODAY));
  const [reflect,setReflect]=useState(null);
  const [loaded,setLoaded]=useState(false);
  const [newCat,setNewCat]=useState(false);
  const [projModal,setProjModal]=useState(null);
  const [projYear,setProjYear]=useState(2026);
  const [sync,setSync]=useState("대기");
  // 로그인 + 공용
  const [profile,setProfile]=useState(null);      // null = 로그인 전
  const [pick,setPick]=useState("husband");
  const [pass,setPass]=useState("");
  const [loginErr,setLoginErr]=useState("");
  const [sharedTasks,setSharedTasks]=useState({}); // 공용 달력
  const firedRef=useRef({});

  const applyPersonal=(s)=>{ setTheme(s.theme||"light"); setCats(s.cats||mkCats(THEMES.light)); setTasks(s.tasks||{}); setProjects(s.projects||[]); setYearProjects(s.yearProjects||[]); setShelf(s.shelf||[]); setBuckets(s.buckets||[]); setPurchases(s.purchases||[]); };
  const applyShared=(s)=>{ setSharedTasks(s.sharedTasks||{}); setRoutines(s.routines||[]); };

  // 로그인 시: 개인 + 공용 두 채널을 불러옴
  const doLogin=async()=>{
    if(pass!==PASSCODE){ setLoginErr("접속 코드가 달라요."); return; }
    setLoginErr(""); setProfile(pick); setSync("연결 중…");
    try{ if(typeof Notification!=="undefined"&&Notification.permission==="default") Notification.requestPermission(); }catch{}
    let okP=false, okS=false;
    try{ const raw=localStorage.getItem("planner8_"+pick); if(raw){ applyPersonal(JSON.parse(raw)); okP=true; } }catch{}
    try{ const rawS=localStorage.getItem("planner8_common"); if(rawS){ applyShared(JSON.parse(rawS)); okS=true; } }catch{}
    try{ const sp=await sbLoad(rowPersonal(pick)); if(sp){ applyPersonal(sp); okP=true; } }catch{}
    try{ const ss=await sbLoad(ROW_COMMON); if(ss){ applyShared(ss); okS=true; } }catch{}
    if(!okP) seedPersonal();
    if(!okS) seedShared();
    setLoaded(true); setSync("동기화됨");
  };
  const logout=()=>{ setProfile(null); setLoaded(false); setPass(""); setView("달력"); };

  // 개인 데이터 저장
  useEffect(()=>{ if(!loaded||!profile)return;
    const payload={theme,cats,tasks,projects,yearProjects,shelf,buckets,purchases};
    try{ localStorage.setItem("planner8_"+profile,JSON.stringify(payload)); }catch{}
    setSync("저장 중…");
    const h=setTimeout(async()=>{ try{ await sbSave(rowPersonal(profile),payload); setSync("동기화됨"); }catch{ setSync("오프라인(이 기기에만 저장)"); } },600);
    return ()=>clearTimeout(h);
  },[theme,cats,tasks,projects,yearProjects,shelf,buckets,purchases,loaded,profile]);

  // 공용 데이터 저장 (부부 공유)
  useEffect(()=>{ if(!loaded||!profile)return;
    const payload={sharedTasks,routines};
    try{ localStorage.setItem("planner8_common",JSON.stringify(payload)); }catch{}
    const h=setTimeout(async()=>{ try{ await sbSave(ROW_COMMON,payload); }catch{} },600);
    return ()=>clearTimeout(h);
  },[sharedTasks,routines,loaded,profile]);

  // 리마인더: 앱이 열려 있는 동안 개인+공용 일정의 알림 시간을 확인해서 알림 표시 (베스트 에포트)
  useEffect(()=>{ if(!profile)return;
    const tick=()=>{
      const now=Date.now();
      const scan=(map,tag)=>{ Object.keys(map||{}).forEach(dIso=>{ (map[dIso]||[]).forEach(it=>{
        if(!it.remind||it.hour==null||it.done)return;
        const evt=new Date(dIso+"T"+String(it.hour).padStart(2,"0")+":00:00").getTime();
        const fireAt=evt-it.remind*60000;
        const kkey=tag+it.id;
        if(now>=fireAt && now<fireAt+90000 && !firedRef.current[kkey]){
          firedRef.current[kkey]=true;
          try{ if(typeof Notification!=="undefined"&&Notification.permission==="granted") new Notification("⏰ "+it.text,{body:`${dIso} ${String(it.hour).padStart(2,"0")}:00 예정`}); }catch{}
        }
      }); }); };
      scan(tasks,"p"); scan(sharedTasks,"s");
    };
    const h=setInterval(tick,30000); tick();
    return ()=>clearInterval(h);
  },[tasks,sharedTasks,profile]);

  const seedPersonal=()=>{
    setTasks({
      [iso(TODAY)]:[{id:uid(),text:"가계부 정리 (노션)",cat:"c1",hour:21,pri:"mid",remind:0,done:true,note:"매주 금요일 루틴으로 고정"},{id:uid(),text:"이란 종전 관련 기사 스크랩",cat:"c3",hour:22,pri:"low",remind:0,done:false,note:""}],
      "2026-07-16":[{id:uid(),text:"평택회식",cat:"c2",hour:14,pri:"high",remind:60,done:false,note:""}],
      "2026-07-20":[{id:uid(),text:"필라테스 상담",cat:"c3",hour:19,pri:"mid",remind:0,done:false,note:""}],
    });
    setShelf([{id:uid(),text:"반도체 공정 기초 (EUV/증착) 정리",cat:"c3",term:"long"},{id:uid(),text:"동탄 근처 풋살팀원 구하기",cat:"c3",term:"short"},{id:uid(),text:"SK 재테크 공부 시작하기",cat:"c1",term:"long"}]);
    setProjects([
      {id:uid(),text:"해외 출장/교육",cat:"c2",year:2026,startWeek:25,endWeek:25,note:"6월 셋째 주. 여권/비자 확인"},
      {id:uid(),text:"집 매수 (인플레 헷지)",cat:"c1",year:2026,startWeek:36,endWeek:48,note:"동탄 인근 우선 검토"},
    ]);
    setYearProjects([
      {id:uid(),text:"둘째 자녀 계획",cat:"c3",year:2026,startMonth:7,endMonth:11,note:"연말까지 이어지는 장기 계획"},
      {id:uid(),text:"자산 증식 계획",cat:"c1",year:2027,startMonth:0,endMonth:11,note:"장기 자산 배분",color:"#6FA8DC"},
    ]);
    setBuckets([
      {id:uid(),category:"여행",text:"오로라 보러 아이슬란드",targetDate:"2027-12-01",done:false,doneDate:""},
      {id:uid(),category:"자기계발",text:"풀코스 마라톤 완주",targetDate:"2026-11-01",done:false,doneDate:""},
    ]);
    setPurchases([
      {id:uid(),term:"short",category:"생활",text:"유팡 소독기 필터",date:"2026-07-20",done:false},
      {id:uid(),term:"mid",category:"가전",text:"로봇청소기",date:"2026-09-01",done:false},
      {id:uid(),term:"long",category:"자동차",text:"전기차 교체",date:"2027-06-01",done:false},
    ]);
  };
  const seedShared=()=>{
    setSharedTasks({
      "2026-07-19":[{id:uid(),text:"가족 나들이 (공용)",cat:"c3",hour:11,pri:"mid",remind:1440,done:false,note:""}],
    });
    setRoutines([
      {id:uid(),title:"주말 집안일",items:[{id:uid(),text:"청소기 돌리기"},{id:uid(),text:"세탁 돌리기 + 널기"},{id:uid(),text:"일반쓰레기 모아서 배출"},{id:uid(),text:"유팡 소독기 돌리기"}]},
      {id:uid(),title:"재택근무 루틴",items:[{id:uid(),text:"완력기 3세트"},{id:uid(),text:"아이패드로 강의/뉴스 듣기"},{id:uid(),text:"스탠딩 데스크 1시간"}]},
    ]);
  };
  useEffect(()=>{ const acc=[C.a1,C.a2,C.a3,C.a4,"#6FA8DC","#E06C9F","#7FB069","#D98E2B"]; setCats(cs=>cs.map((c,i)=>({...c,color:acc[i%acc.length]}))); },[theme]); // eslint-disable-line

  const catOf=(id)=>cats.find(c=>c.id===id)||cats[0];
  const toggle=(dIso,id)=>setTasks(p=>({...p,[dIso]:p[dIso].map(t=>{ if(t.id!==id)return t; const nd=!t.done; if(nd&&!t.note)setReflect({dIso,id,text:t.text}); return{...t,done:nd}; })}));
  const delTask=(dIso,id)=>setTasks(p=>({...p,[dIso]:(p[dIso]||[]).filter(t=>t.id!==id)}));
  const editTask=(dIso,id,text)=>setTasks(p=>({...p,[dIso]:p[dIso].map(t=>t.id===id?{...t,text}:t)}));
  const saveNote=(dIso,id,note)=>{ setTasks(p=>({...p,[dIso]:p[dIso].map(t=>t.id===id?{...t,note}:t)})); setReflect(null); };
  const addTaskToDay=(dIso,item)=>setTasks(p=>({...p,[dIso]:[...(p[dIso]||[]),item]}));
  const sendShelfToDay=(shelfId,dIso)=>{ const it=shelf.find(s=>s.id===shelfId); if(!it)return; setShelf(s=>s.filter(x=>x.id!==shelfId)); addTaskToDay(dIso,{...it,hour:null,pri:"mid",done:false,note:""}); };
  // 공용 달력 핸들러 (복기 모달 없이 단순 토글)
  const toggleS=(dIso,id)=>setSharedTasks(p=>({...p,[dIso]:p[dIso].map(t=>t.id===id?{...t,done:!t.done}:t)}));
  const delTaskS=(dIso,id)=>setSharedTasks(p=>({...p,[dIso]:(p[dIso]||[]).filter(t=>t.id!==id)}));
  const editTaskS=(dIso,id,text)=>setSharedTasks(p=>({...p,[dIso]:p[dIso].map(t=>t.id===id?{...t,text}:t)}));
  const S=st(C);
  const TABS=["달력","일","월","년","루틴","버킷","구매","공용"];

  if(!profile){
    return (
      <div style={{...S.root,alignItems:"center",justifyContent:"center"}}>
        <div style={S.loginCard}>
          <div style={S.brandRow}><span style={{color:C.a2}}>◆</span><h1 style={S.brand}>계획 데스크</h1></div>
          <p style={{...S.tag,margin:"6px 0 18px 0"}}>부부 공용 플래너</p>
          <label style={S.loginLbl}>사용자를 선택해주세요</label>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {PROFILES.map(p=>(<button key={p.id} onClick={()=>setPick(p.id)} style={{...S.profileBtn,...(pick===p.id?{background:C.a2,color:C.bg,borderColor:C.a2}:{})}}>{p.label}</button>))}
          </div>
          <label style={S.loginLbl}>접속 코드</label>
          <input type="password" value={pass} onChange={e=>{setPass(e.target.value);setLoginErr("");}} onKeyDown={e=>{if(e.key==="Enter")doLogin();}} placeholder="공용 접속 코드" style={{...S.shelfInput,width:"100%",margin:"6px 0 10px 0"}}/>
          {loginErr&&<div style={{color:C.a1,fontSize:13,marginBottom:8}}>{loginErr}</div>}
          <button style={{...S.saveBtn,width:"100%",padding:"11px 0"}} onClick={doLogin}>들어가기</button>
          <p style={{...S.shelfHint,marginTop:12,lineHeight:1.5}}>개인 탭(일정)은 각자 따로 저장되고, <b>공용 탭·루틴</b>은 부부가 함께 보고 동기화돼요.</p>
        </div>
      </div>
    );
  }

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
          .shelfcols{flex-direction:column !important;}
        }
      `}</style>

      <header style={S.head}>
        <div><div style={S.brandRow}><span style={{color:C.a2}}>◆</span><h1 style={S.brand}>계획 데스크</h1></div>
          <p style={S.tag}>{PROFILES.find(p=>p.id===profile)?.label} · <span style={{color:sync==="동기화됨"?C.a2:C.textDim}}>{sync}</span></p></div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <button style={S.themeBtn} onClick={async()=>{ setSync("불러오는 중…"); try{ const sp=await sbLoad(rowPersonal(profile)); if(sp)applyPersonal(sp); const ss=await sbLoad(ROW_COMMON); if(ss)applyShared(ss); setSync("동기화됨"); }catch{ setSync("오프라인(이 기기에만 저장)"); } }} title="새로고침(다른 기기 변경 가져오기)">↻</button>
          <button style={S.themeBtn} onClick={()=>setTheme(t=>t==="light"?"dark":"light")} title="테마 전환">{theme==="light"?"🌙":"☀️"}</button>
          <button style={S.themeBtn} onClick={logout} title="로그아웃">⏻</button>
          <div style={S.switch}>{TABS.map(v=>(<button key={v} onClick={()=>setView(v)} style={{...S.swBtn,...(view===v?S.swOn:{})}}>{v}</button>))}</div>
        </div>
      </header>

      {view==="달력"&&(
        <CalendarView monthAnchor={calMonth} setMonthAnchor={setCalMonth} tasks={tasks} cats={cats} catOf={catOf} selDay={selDay} setSelDay={setSelDay} toggle={toggle} delTask={delTask} editTask={editTask} setTasks={setTasks} uid={uid} S={S} C={C}/>
      )}
      {view==="일"&&(
        <DayView month={dayMonth} setMonth={setDayMonth} tasks={tasks} shelf={shelf} cats={cats} catOf={catOf} toggle={toggle} delTask={delTask} editTask={editTask} setTasks={setTasks} setShelf={setShelf} sendShelfToDay={sendShelfToDay} uid={uid} S={S} C={C}/>
      )}
      {view==="월"&&(
        <><div style={S.nav}><button style={S.navBtn} onClick={()=>setProjYear(y=>y-1)}>‹</button><span style={S.range}>{projYear}년 · 주차별 프로젝트</span><button style={S.navBtn} onClick={()=>setProjYear(y=>y+1)}>›</button><div style={S.legend}>{cats.map(c=>(<span key={c.id} style={S.legendItem}><span style={{...S.legendDot,background:c.color}}/><b style={{color:c.color}}>{c.n}.</b>{c.label}</span>))}<button style={S.catEdit} onClick={()=>setNewCat(true)}>+ 카테고리</button></div></div>
        <MonthWeeks year={projYear} projects={projects} catOf={catOf} cats={cats} onOpen={(p)=>setProjModal({...p,_src:"month"})} setProjects={setProjects} S={S} C={C} uid={uid}/></>
      )}
      {view==="년"&&(
        <><div style={S.nav}><span style={S.range}>{YEAR_START}~{YEAR_END} · 연도별 간트</span><div style={S.legend}>{cats.map(c=>(<span key={c.id} style={S.legendItem}><span style={{...S.legendDot,background:c.color}}/><b style={{color:c.color}}>{c.n}.</b>{c.label}</span>))}<button style={S.catEdit} onClick={()=>setNewCat(true)}>+ 카테고리</button></div></div>
        <YearStack projects={yearProjects} catOf={catOf} cats={cats} onOpen={(p)=>setProjModal({...p,_src:"year"})} setProjects={setYearProjects} uid={uid} S={S} C={C}/></>
      )}
      {view==="루틴"&&(<RoutineView routines={routines} setRoutines={setRoutines} uid={uid} S={S} C={C}/>)}
      {view==="버킷"&&(<BucketView buckets={buckets} setBuckets={setBuckets} uid={uid} S={S} C={C}/>)}
      {view==="구매"&&(<PurchaseView purchases={purchases} setPurchases={setPurchases} uid={uid} S={S} C={C}/>)}
      {view==="공용"&&(
        <CalendarView shared monthAnchor={calMonth} setMonthAnchor={setCalMonth} tasks={sharedTasks} cats={cats} catOf={catOf} selDay={selDay} setSelDay={setSelDay} toggle={toggleS} delTask={delTaskS} editTask={editTaskS} setTasks={setSharedTasks} uid={uid} S={S} C={C}/>
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

function PriBar({pri,S}){ return <span style={{...S.priBar,background:PRI[pri||"mid"].color}} title={`중요도: ${PRI[pri||"mid"].label}`}/>; }
function PriSelect({pri,setPri,S,C}){ return <select value={pri} onChange={e=>setPri(e.target.value)} style={S.sel} title="중요도">{PRI_ORDER.map(k=><option key={k} value={k}>{PRI[k].label}</option>)}</select>; }

function CalendarView({shared,monthAnchor,setMonthAnchor,tasks,cats,catOf,selDay,setSelDay,toggle,delTask,editTask,setTasks,uid,S,C}){
  const y=monthAnchor.getFullYear(), m=monthAnchor.getMonth(); const weeks=calMatrix(y,m);
  const [adding,setAdding]=useState(false); const [t,setT]=useState(""); const [cat,setCat]=useState("c2"); const [hour,setHour]=useState(9); const [pri,setPri]=useState("mid"); const [remind,setRemind]=useState(0); const inputRef=useRef(null);
  const quickAdd=()=>{ const v=t.trim(); if(!v)return; setTasks(p=>({...p,[selDay]:[...(p[selDay]||[]),{id:uid(),text:v,cat,hour,pri,remind,done:false,note:""}]})); setT(""); };
  const shiftMonth=(dir)=>{ const x=new Date(monthAnchor); x.setMonth(x.getMonth()+dir); setMonthAnchor(x); };
  const dayDots=(dn)=>{ if(!dn)return []; const arr=tasks[iso(new Date(y,m,dn))]||[]; const set=[]; arr.forEach(it=>{const c=catOf(it.cat); if(!set.includes(c.color))set.push(c.color);}); return set.slice(0,3); };
  const todayIso=iso(TODAY);
  const agenda = Object.keys(tasks)
    .filter(k=>(tasks[k]||[]).length>0 && k>=todayIso)
    .sort()
    .map(k=>({ dateIso:k, date:new Date(k+"T00:00:00"), items:tasks[k].slice().sort((a,b)=>((a.hour==null?99:a.hour)-(b.hour==null?99:b.hour))) }));
  const fmtDate=(d)=>`${d.getMonth()+1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`;

  return (
    <div className="calsplit" style={S.calSplit}>
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

      <div style={S.calWrap}>
        <div style={S.calTitleRow}><button style={S.navBtn} onClick={()=>shiftMonth(-1)}>‹</button><span style={S.calTitle}>{y}년 {MONTHS[m]}</span>{shared&&<span style={S.sharedBadge}>공용 · 부부 공유</span>}<button style={S.navBtn} onClick={()=>shiftMonth(1)}>›</button><button style={S.todayBtn} onClick={()=>{setMonthAnchor(new Date(TODAY.getFullYear(),TODAY.getMonth(),1));setSelDay(todayIso);}}>오늘</button></div>
        <div style={S.calGrid}>
          {WD.map((w,i)=>(<div key={w} style={{...S.calWD,color:i===0?C.a1:i===6?C.a4:C.textDim}}>{w}</div>))}
          {weeks.map((week,wi)=>week.map((dn,di)=>{ const k=dn?iso(new Date(y,m,dn)):null; const isSel=k===selDay; const isToday=k===todayIso; const dots=dayDots(dn);
            return (<button key={wi+"-"+di} disabled={!dn} onClick={()=>k&&setSelDay(k)} style={{...S.calCell,...(isSel?S.calCellSel:{}),...(dn?{}:{visibility:"hidden"})}}>
              <span style={{...S.calNum,...(isToday?S.calToday:{}),...(isSel&&!isToday?{fontWeight:800}:{}),color:di===0?C.a1:di===6?C.a4:(isToday?C.bg:C.text)}}>{dn}</span>
              <span style={S.calDots}>{dots.map((c,ci)=><span key={ci} style={{...S.calDot,background:c}}/>)}</span></button>);
          }))}
        </div>
        <SelectedDay selDay={selDay} tasks={tasks} cats={cats} catOf={catOf} toggle={toggle} delTask={delTask} editTask={editTask} adding={adding} setAdding={setAdding} t={t} setT={setT} cat={cat} setCat={setCat} hour={hour} setHour={setHour} pri={pri} setPri={setPri} remind={remind} setRemind={setRemind} inputRef={inputRef} quickAdd={quickAdd} S={S} C={C}/>
      </div>
    </div>
  );
}

function SelectedDay({selDay,tasks,cats,catOf,toggle,delTask,editTask,adding,setAdding,t,setT,cat,setCat,hour,setHour,pri,setPri,remind,setRemind,inputRef,quickAdd,S,C}){
  const selDate=new Date(selDay+"T00:00:00");
  const selItems=(tasks[selDay]||[]).slice().sort((a,b)=>((a.hour==null?99:a.hour)-(b.hour==null?99:b.hour)));
  return (
    <div style={S.selPanel}>
      <div style={S.selHead}><span style={S.selDate}>{selDate.getMonth()+1}월 {selDate.getDate()}일 <span style={{color:C.textDim,fontWeight:500}}>{WD[selDate.getDay()]}요일</span></span><button style={S.addFab} onClick={()=>{setAdding(a=>!a);setTimeout(()=>inputRef.current&&inputRef.current.focus(),50);}}>+ 추가</button></div>
      {adding&&(<div style={S.quickRow}><select value={cat} onChange={e=>setCat(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select><PriSelect pri={pri} setPri={setPri} S={S} C={C}/><select value={hour} onChange={e=>setHour(+e.target.value)} style={S.selTime}>{HOURS.map(h=><option key={h} value={h}>{timeLabel(h)}</option>)}</select><select value={remind} onChange={e=>setRemind(+e.target.value)} style={S.sel} title="알림">{REMINDERS.map(r=><option key={r.v} value={r.v}>🔔 {r.label}</option>)}</select><input ref={inputRef} value={t} onChange={e=>setT(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")quickAdd();}} placeholder="내용 입력 후 Enter" style={S.addInput}/><button style={S.saveBtn} onClick={quickAdd}>추가</button></div>)}
      <div className="sc" style={S.selList}>
        {selItems.length===0&&<div style={S.dayEmpty}>이 날 일정이 없어요. + 추가로 빠르게 넣으세요.</div>}
        {selItems.map(it=>{ const c=catOf(it.cat); return (<div key={it.id} style={{...S.row,opacity:it.done?0.5:1}}><PriBar pri={it.pri} S={S}/><button style={S.check} onClick={()=>toggle(selDay,it.id)}><span style={{...S.cbox,...(it.done?{background:c.color,borderColor:c.color}:{})}}>{it.done?"✓":""}</span></button><span style={{...S.catNum,color:c.color}}>{c.n}</span>{it.hour!=null&&<span style={S.timePill}>{String(it.hour).padStart(2,"0")}:00</span>}<div style={S.rowBody}><EditableText value={it.text} onSave={v=>editTask(selDay,it.id,v)} style={{...S.rowText,textDecoration:it.done?"line-through":"none"}} C={C}/>{it.note&&<span style={S.rowNote}>💭 {it.note}</span>}</div>{it.remind>0&&<span style={S.bell} title={`알림: ${(REMINDERS.find(r=>r.v===it.remind)||{}).label||""}`}>🔔</span>}<button style={S.rowX} onClick={()=>delTask(selDay,it.id)}>×</button></div>);})}
      </div>
    </div>
  );
}

function DayView({month,setMonth,tasks,shelf,cats,catOf,toggle,delTask,editTask,setTasks,setShelf,sendShelfToDay,uid,S,C}){
  const y=month.getFullYear(), m=month.getMonth(); const dim=new Date(y,m+1,0).getDate();
  const days=Array.from({length:dim},(_,i)=>i+1);
  const shiftMonth=(dir)=>{ const x=new Date(month); x.setMonth(x.getMonth()+dir); setMonth(x); };
  const [addTo,setAddTo]=useState(null); const [t,setT]=useState(""); const [cat,setCat]=useState("c2"); const [hour,setHour]=useState(9); const [pri,setPri]=useState("mid");
  const commit=(dIso)=>{ const v=t.trim(); if(!v){setAddTo(null);return;} setTasks(p=>({...p,[dIso]:[...(p[dIso]||[]),{id:uid(),text:v,cat,hour,pri,done:false,note:""}]})); setT(""); setAddTo(null); };
  const [newShelf,setNewShelf]=useState(""); const [shelfCat,setShelfCat]=useState("c1"); const [shelfTerm,setShelfTerm]=useState("short");
  const todayIso=iso(TODAY);
  const sortByHour=(arr)=>[...arr].sort((a,b)=>((a.hour==null?99:a.hour)-(b.hour==null?99:b.hour)));
  const editShelf=(id,text)=>setShelf(s=>s.map(x=>x.id===id?{...x,text}:x));
  const moveShelf=(id,dir)=>setShelf(list=>{
    const item=list.find(x=>x.id===id); if(!item)return list;
    const term=item.term||"short";
    const same=list.map((x,i)=>({x,i})).filter(o=>(o.x.term||"short")===term);
    const pos=same.findIndex(o=>o.x.id===id); const to=pos+dir;
    if(to<0||to>=same.length)return list;
    const a=same[pos].i, b=same[to].i; const copy=[...list]; const tmp=copy[a]; copy[a]=copy[b]; copy[b]=tmp; return copy;
  });
  const addShelf=()=>{ const v=newShelf.trim(); if(!v)return; setShelf(s=>[{id:uid(),text:v,cat:shelfCat,term:shelfTerm},...s]); setNewShelf(""); };
  const cols=SHELF_TERMS.map(tm=>({tm, items:shelf.filter(s=>(s.term||"short")===tm.id)}));

  return (
    <div style={S.dayWrap}>
      <div style={S.calTitleRow}><button style={S.navBtn} onClick={()=>shiftMonth(-1)}>‹</button><span style={S.calTitle}>{y}년 {MONTHS[m]}</span><button style={S.navBtn} onClick={()=>shiftMonth(1)}>›</button><span style={{...S.shelfHint,marginLeft:8}}>아래로 스크롤 = 1일~말일 · 좌우 = 월 이동</span><button style={S.todayBtn} onClick={()=>setMonth(new Date(TODAY.getFullYear(),TODAY.getMonth(),1))}>오늘</button></div>
      <div className="sc" style={S.dayScroll}>
        {days.map(dn=>{ const d=new Date(y,m,dn); const key=iso(d); const items=sortByHour(tasks[key]||[]); const isToday=key===todayIso; const wd=WD[d.getDay()];
          return (
            <div key={key} style={{...S.dRow,...(isToday?S.dToday:{})}}>
              <div style={S.dDateCol}><span style={{...S.dNum,...(isToday?{color:C.a2}:{})}}>{dn}</span><span style={{...S.dWd,color:d.getDay()===0?C.a1:d.getDay()===6?C.a4:C.textDim}}>{wd}</span></div>
              <div style={S.dItems}>
                {items.map(it=>{ const c=catOf(it.cat); return (<div key={it.id} style={{...S.row,opacity:it.done?0.5:1,borderBottom:"none",padding:"3px 4px"}}><PriBar pri={it.pri} S={S}/><button style={S.check} onClick={()=>toggle(key,it.id)}><span style={{...S.cbox,...(it.done?{background:c.color,borderColor:c.color}:{})}}>{it.done?"✓":""}</span></button><span style={{...S.catNum,color:c.color}}>{c.n}</span>{it.hour!=null&&<span style={S.timePill}>{String(it.hour).padStart(2,"0")}:00</span>}<div style={S.rowBody}><EditableText value={it.text} onSave={v=>editTask(key,it.id,v)} style={{...S.rowText,textDecoration:it.done?"line-through":"none"}} C={C}/>{it.note&&<span style={S.rowNote}>💭 {it.note}</span>}</div><button style={S.rowX} onClick={()=>delTask(key,it.id)}>×</button></div>);})}
                {addTo===key?(
                  <div style={S.addRow}><select value={cat} onChange={e=>setCat(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select><PriSelect pri={pri} setPri={setPri} S={S} C={C}/><select value={hour} onChange={e=>setHour(+e.target.value)} style={S.selTime}>{HOURS.map(h=><option key={h} value={h}>{timeLabel(h)}</option>)}</select><input autoFocus value={t} onChange={e=>setT(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")commit(key);if(e.key==="Escape")setAddTo(null);}} placeholder="내용 입력 후 Enter" style={S.addInput}/></div>
                ):(<button style={S.dAdd} onClick={()=>{setAddTo(key);setT("");}}>+ 추가</button>)}
              </div>
            </div>
          );
        })}
      </div>
      {/* 하단 아이디어 선반: 단기 / 중장기 */}
      <div style={S.shelf}>
        <div style={S.shelfHead}><h2 style={S.shelfTitle}><span style={{color:C.a3}}>▤</span> 아이디어 선반</h2><span style={S.shelfHint}>↑↓로 순서 조정 · 📅로 이 달 원하는 날짜에 보내기</span></div>
        <div style={S.shelfComposer}><select value={shelfTerm} onChange={e=>setShelfTerm(e.target.value)} style={S.sel}>{SHELF_TERMS.map(tm=><option key={tm.id} value={tm.id}>{tm.label}</option>)}</select><select value={shelfCat} onChange={e=>setShelfCat(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select><input value={newShelf} onChange={e=>setNewShelf(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addShelf();}} placeholder="새 아이디어 입력 후 Enter" style={S.shelfInput}/></div>
        <div className="shelfcols" style={S.shelfCols}>
          {cols.map(({tm,items})=>(
            <div key={tm.id} style={S.shelfCol}>
              <div style={S.shelfColHead}>{tm.label} <span style={{color:C.faint,fontWeight:400}}>({items.length})</span></div>
              <div className="sc" style={S.shelfColList}>
                {items.map((it,idx)=>{ const c=catOf(it.cat); return (
                  <div key={it.id} style={{...S.chip,borderColor:c.color}}>
                    <span style={{...S.chipNum,background:c.color}}>{c.n}</span>
                    <EditableText value={it.text} onSave={v=>editShelf(it.id,v)} style={S.chipText} C={C}/>
                    <div style={S.chipTools}>
                      <button style={S.miniBtn} onClick={()=>moveShelf(it.id,-1)} disabled={idx===0} title="위로">↑</button>
                      <button style={S.miniBtn} onClick={()=>moveShelf(it.id,1)} disabled={idx===items.length-1} title="아래로">↓</button>
                      <DayPicker y={y} m={m} dim={dim} onPick={(dIso)=>sendShelfToDay(it.id,dIso)} S={S} C={C}/>
                      <button style={S.rowX} onClick={()=>setShelf(s=>s.filter(x=>x.id!==it.id))}>×</button>
                    </div>
                  </div>
                );})}
                {items.length===0&&<div style={S.dayEmpty}>비었어요.</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayPicker({y,m,dim,onPick,S,C}){
  const [open,setOpen]=useState(false); const [d,setD]=useState(1);
  return (<div style={{position:"relative"}}><button style={S.sendBtn} onClick={()=>setOpen(o=>!o)} aria-label="날짜로 보내기" title="날짜로 보내기">📅</button>
    {open&&(<div style={S.sendPop}><select value={d} onChange={e=>setD(+e.target.value)} style={{...S.sel,width:"100%",marginBottom:6}}>{Array.from({length:dim},(_,i)=>i+1).map(dd=><option key={dd} value={dd}>{m+1}월 {dd}일</option>)}</select><button style={S.saveBtn} onClick={()=>{onPick(iso(new Date(y,m,d)));setOpen(false);}}>이 날로 보내기</button></div>)}
  </div>);
}

function MonthWeeks({year,projects,catOf,cats,onOpen,setProjects,S,C,uid}){
  const [adding,setAdding]=useState(false); const [nt,setNt]=useState(""); const [nn,setNn]=useState(""); const [nc,setNc]=useState(cats[0].id); const [ncol,setNcol]=useState(null);
  const wiy=weeksInYear(year); const [nsw,setNsw]=useState(1); const [new_,setNew]=useState(1); const relevant=projects.filter(p=>p.year===year);
  return (
    <div style={S.monthWrap}>
      <div style={S.ganttInfo}><span style={S.shelfHint}>월을 ISO 주차로 나눴어요. 프로젝트가 걸친 주차 줄에 형광펜이 칠해지고, 누르면 내용이 보입니다.</span><button style={S.addProjBtn} onClick={()=>setAdding(!adding)}>+ 프로젝트</button></div>
      {adding&&(<div style={S.projForm}><input value={nt} onChange={e=>setNt(e.target.value)} placeholder="이름 (예: 일본 장기 출장)" style={{...S.shelfInput,minWidth:150}}/><input value={nn} onChange={e=>setNn(e.target.value)} placeholder="메모(선택)" style={{...S.shelfInput,minWidth:110}}/><select value={nc} onChange={e=>setNc(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select><ColorSwatches value={ncol} onChange={setNcol} C={C} S={S}/><select value={nsw} onChange={e=>setNsw(+e.target.value)} style={S.sel}>{Array.from({length:wiy},(_,i)=>i+1).map(w=><option key={w} value={w}>wk{w}</option>)}</select><span style={{color:C.textDim}}>~</span><select value={new_} onChange={e=>setNew(+e.target.value)} style={S.sel}>{Array.from({length:wiy},(_,i)=>i+1).map(w=><option key={w} value={w}>wk{w}</option>)}</select><button style={S.saveBtn} onClick={()=>{ if(nt.trim()){ setProjects(p=>[...p,{id:uid(),text:nt.trim(),note:nn.trim(),cat:nc,color:ncol||undefined,year,startWeek:nsw,endWeek:Math.max(nsw,new_)}]); setNt("");setNn("");setNcol(null); setAdding(false);} }}>추가</button></div>)}
      <div className="sc" style={S.monthGridScroll}><div style={S.monthGrid}>
        {MONTHS.map((mLabel,m)=>{ const rows=monthWeekRows(year,m); return (<div key={m} style={S.mCell}><div style={S.mCellHead}>{mLabel}</div>{rows.map((row,wi)=>{ const covering=relevant.filter(p=> row.wkYear===year && row.wk>=p.startWeek && row.wk<=p.endWeek); return (<div key={wi} style={S.weekRow}><span style={S.weekLabel}>{row.s}일~{row.e}일 <b style={{color:C.faint}}>(wk{row.wk})</b></span><div style={S.weekBars}>{covering.map(p=>{ const col=p.color||catOf(p.cat).color; return (<button key={p.id} onClick={()=>onOpen(p)} title={p.text} style={{...S.hlWeek,background:`${col}30`,borderBottom:`3px solid ${col}`}}/>);})}</div></div>);})}</div>);})}
      </div></div>
    </div>
  );
}

function YearGantt({year,projects,catOf,onOpen,S,C,highlight}){ const yp=projects.filter(p=>p.year===year);
  return (<div style={{...S.yg,...(highlight?{borderColor:C.a2,boxShadow:`inset 0 0 0 1px ${C.a2}44`}:{})}}>
    <div style={S.ygHead}><span style={{...S.ygYear,...(highlight?{color:C.a2}:{})}}>{year}</span><div style={S.ygMonths}>{MONTHS_SHORT.map((m,i)=><div key={i} style={S.ygMonthCell}>{m}</div>)}</div></div>
    {yp.length===0&&<div style={S.ygEmpty}>—</div>}
    {yp.map(p=>{ const cat=catOf(p.cat); const col=p.color||cat.color; const sm=p.startMonth!=null?p.startMonth:weekToMonth(year,p.startWeek); const em=p.endMonth!=null?p.endMonth:weekToMonth(year,p.endWeek); const left=(sm/12)*100; const width=((em-sm+1)/12)*100;
      return (<div key={p.id} style={S.ygRow}>
        <div style={S.ygTrackFull}>{MONTHS_SHORT.map((_,i)=><div key={i} style={S.ygGrid}/>)}</div>
        <span style={{...S.ygName,left:`${left}%`,color:C.text}}><span style={{...S.chipNum,background:col}}>{cat.n}</span>{p.text}</span>
        <button onClick={()=>onOpen(p)} title={p.text} style={{...S.ygBar,left:`${left}%`,width:`${Math.max(width,3)}%`,background:col}}/>
      </div>);
    })}
  </div>);
}
function YearStack({projects,catOf,cats,onOpen,setProjects,uid,S,C}){
  const list=Array.from({length:YEAR_END-YEAR_START+1},(_,i)=>YEAR_START+i);
  const [adding,setAdding]=useState(false);
  const [nt,setNt]=useState(""); const [nn,setNn]=useState(""); const [nc,setNc]=useState(cats[0].id); const [ncol,setNcol]=useState(null);
  const [nyr,setNyr]=useState(THIS_YEAR); const [nsm,setNsm]=useState(0); const [nem,setNem]=useState(0);
  return (
    <div style={S.yearStackWrap}>
      <div style={{...S.ganttInfo,padding:"0 4px"}}>
        <span style={S.shelfHint}>막대를 누르면 수정·삭제 · 이름은 막대 위에 표시 · 색은 카테고리와 무관하게 선택 가능</span>
        <button style={S.addProjBtn} onClick={()=>setAdding(!adding)}>+ 프로젝트</button>
      </div>
      {adding&&(
        <div style={S.projForm}>
          <input value={nt} onChange={e=>setNt(e.target.value)} placeholder="이름 (예: 출산 계획)" style={{...S.shelfInput,minWidth:140}}/>
          <input value={nn} onChange={e=>setNn(e.target.value)} placeholder="메모(선택)" style={{...S.shelfInput,minWidth:100}}/>
          <select value={nc} onChange={e=>setNc(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select>
          <ColorSwatches value={ncol} onChange={setNcol} C={C} S={S}/>
          <select value={nyr} onChange={e=>{setNyr(+e.target.value);}} style={S.sel}>{list.map(y=><option key={y} value={y}>{y}년</option>)}</select>
          <select value={nsm} onChange={e=>setNsm(+e.target.value)} style={S.sel}>{MONTHS.map((mm,i)=><option key={i} value={i}>{mm}</option>)}</select>
          <span style={{color:C.textDim}}>~</span>
          <select value={nem} onChange={e=>setNem(+e.target.value)} style={S.sel}>{MONTHS.map((mm,i)=><option key={i} value={i}>{mm}</option>)}</select>
          <button style={S.saveBtn} onClick={()=>{ if(nt.trim()){ setProjects(p=>[...p,{id:uid(),text:nt.trim(),note:nn.trim(),cat:nc,color:ncol||undefined,year:nyr,startMonth:nsm,endMonth:Math.max(nsm,nem)}]); setNt("");setNn("");setNcol(null); setAdding(false);} }}>추가</button>
        </div>
      )}
      <div className="sc" style={S.yearStackScroll}>{list.map(y=>(<YearGantt key={y} year={y} projects={projects} catOf={catOf} onOpen={onOpen} S={S} C={C} highlight={y===THIS_YEAR}/>))}</div>
    </div>
  );
}

function ColorSwatches({value,onChange,C,S}){
  const PAL=palette(C);
  return (<div style={{display:"flex",gap:5,alignItems:"center"}}>
    <button onClick={()=>onChange(null)} title="카테고리 색 사용" style={{...S.swatch,background:"transparent",border:`1px dashed ${C.line}`,color:C.textDim,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",...(value===null?{outline:`2px solid ${C.a2}`}:{})}}>자동</button>
    {PAL.map(p=>(<button key={p} onClick={()=>onChange(p)} title="색 선택" style={{...S.swatch,background:p,...(value===p?{outline:`2px solid ${C.text}`}:{})}}/>))}
  </div>);
}

function RoutineView({routines,setRoutines,uid,S,C}){
  const [nc,setNc]=useState("");
  const addCat=()=>{ const v=nc.trim(); if(!v)return; setRoutines(r=>[...r,{id:uid(),title:v,items:[]}]); setNc(""); };
  const delCat=(id)=>setRoutines(r=>r.filter(x=>x.id!==id));
  const editCat=(id,title)=>setRoutines(r=>r.map(x=>x.id===id?{...x,title}:x));
  const addItem=(cid,text)=>setRoutines(r=>r.map(x=>x.id===cid?{...x,items:[...x.items,{id:uid(),text}]}:x));
  const editItem=(cid,iid,text)=>setRoutines(r=>r.map(x=>x.id===cid?{...x,items:x.items.map(it=>it.id===iid?{...it,text}:it)}:x));
  const delItem=(cid,iid)=>setRoutines(r=>r.map(x=>x.id===cid?{...x,items:x.items.filter(it=>it.id!==iid)}:x));
  return (
    <div style={S.tabWrap}>
      <div style={S.ganttInfo}><span style={S.shelfHint}>계획을 세울 때 참고하는 루틴 목록이에요. 카테고리별로 자유롭게 쌓아두세요.</span></div>
      <div style={S.composerRow}><input value={nc} onChange={e=>setNc(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addCat();}} placeholder="새 루틴 카테고리 (예: 주말 집안일)" style={S.shelfInput}/><button style={S.saveBtn} onClick={addCat}>+ 카테고리</button></div>
      <div className="sc" style={S.routineGrid}>
        {routines.map(cat=><RoutineCard key={cat.id} cat={cat} editCat={editCat} delCat={delCat} addItem={addItem} editItem={editItem} delItem={delItem} S={S} C={C}/>)}
        {routines.length===0&&<div style={S.dayEmpty}>아직 루틴이 없어요. 위에서 카테고리를 추가하세요.</div>}
      </div>
    </div>
  );
}
function RoutineCard({cat,editCat,delCat,addItem,editItem,delItem,S,C}){
  const [ni,setNi]=useState("");
  return (<div style={S.routineCard}>
    <div style={S.routineCardHead}><EditableText value={cat.title} onSave={v=>editCat(cat.id,v)} style={S.routineTitle} C={C}/><button style={S.rowX} onClick={()=>delCat(cat.id)}>×</button></div>
    <ul style={S.routineList}>{cat.items.map(it=>(<li key={it.id} style={S.routineItem}><span style={{color:C.a3}}>•</span><EditableText value={it.text} onSave={v=>editItem(cat.id,it.id,v)} style={{...S.rowText,fontSize:14,flex:1}} C={C}/><button style={S.rowX} onClick={()=>delItem(cat.id,it.id)}>×</button></li>))}
      {cat.items.length===0&&<li style={{...S.dayEmpty,textAlign:"left",padding:"4px 2px"}}>항목을 추가하세요.</li>}</ul>
    <div style={S.addRow}><input value={ni} onChange={e=>setNi(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&ni.trim()){addItem(cat.id,ni.trim());setNi("");}}} placeholder="항목 추가 후 Enter" style={S.shelfInput}/></div>
  </div>);
}

function BucketView({buckets,setBuckets,uid,S,C}){
  const [cat,setCat]=useState(""); const [text,setText]=useState(""); const [td,setTd]=useState("");
  const [fCat,setFCat]=useState("전체"); const [sort,setSort]=useState("target");
  const add=()=>{ if(!text.trim())return; setBuckets(b=>[...b,{id:uid(),category:cat.trim()||"기타",text:text.trim(),targetDate:td,done:false,doneDate:""}]); setCat("");setText("");setTd(""); };
  const toggle=(id)=>setBuckets(b=>b.map(x=>x.id===id?{...x,done:!x.done,doneDate:!x.done?iso(new Date()):""}:x));
  const del=(id)=>setBuckets(b=>b.filter(x=>x.id!==id));
  const editText=(id,v)=>setBuckets(b=>b.map(x=>x.id===id?{...x,text:v}:x));
  const catList=["전체",...Array.from(new Set(buckets.map(b=>b.category)))];
  let list=buckets.filter(b=>fCat==="전체"||b.category===fCat);
  list=[...list].sort((a,b)=>{
    if(sort==="target")return (a.targetDate||"9999").localeCompare(b.targetDate||"9999");
    if(sort==="done")return (b.doneDate||"").localeCompare(a.doneDate||"");
    if(sort==="cat")return (a.category||"").localeCompare(b.category||"");
    return 0;
  });
  return (
    <div style={S.tabWrap}>
      <div style={S.composer}>
        <input value={cat} onChange={e=>setCat(e.target.value)} placeholder="카테고리 (예: 여행)" style={{...S.shelfInput,minWidth:110}}/>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();}} placeholder="이루고 싶은 것" style={{...S.shelfInput,minWidth:160}}/>
        <label style={S.dateLbl}>목표<input type="date" value={td} onChange={e=>setTd(e.target.value)} style={S.dateInput}/></label>
        <button style={S.saveBtn} onClick={add}>추가</button>
      </div>
      <div style={S.filterBar}>
        <span style={S.shelfHint}>필터:</span>
        <select value={fCat} onChange={e=>setFCat(e.target.value)} style={S.sel}>{catList.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={S.sel}><option value="target">목표날짜순</option><option value="done">실행날짜순</option><option value="cat">카테고리별</option></select>
      </div>
      <div className="sc" style={S.listScroll}>
        {list.length===0&&<div style={S.dayEmpty}>항목이 없어요.</div>}
        {list.map(it=>(
          <div key={it.id} style={{...S.listRow,opacity:it.done?0.55:1}}>
            <button style={S.check} onClick={()=>toggle(it.id)}><span style={{...S.cboxSq,...(it.done?{background:C.a2,borderColor:C.a2}:{})}}>{it.done?"✓":""}</span></button>
            <span style={S.catChip}>{it.category}</span>
            <div style={S.rowBody}><EditableText value={it.text} onSave={v=>editText(it.id,v)} style={{...S.rowText,textDecoration:it.done?"line-through":"none"}} C={C}/></div>
            {it.targetDate&&<span style={S.metaDate}>🎯 {it.targetDate}</span>}
            {it.done&&it.doneDate&&<span style={{...S.metaDate,color:C.a2}}>✓ {it.doneDate}</span>}
            <button style={S.rowX} onClick={()=>del(it.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PurchaseView({purchases,setPurchases,uid,S,C}){
  const [term,setTerm]=useState("short"); const [cat,setCat]=useState(""); const [text,setText]=useState(""); const [date,setDate]=useState("");
  const add=()=>{ if(!text.trim())return; setPurchases(p=>[...p,{id:uid(),term,category:cat.trim()||"기타",text:text.trim(),date,done:false}]); setCat("");setText("");setDate(""); };
  const toggle=(id)=>setPurchases(p=>p.map(x=>x.id===id?{...x,done:!x.done}:x));
  const del=(id)=>setPurchases(p=>p.filter(x=>x.id!==id));
  const editText=(id,v)=>setPurchases(p=>p.map(x=>x.id===id?{...x,text:v}:x));
  return (
    <div style={S.tabWrap}>
      <div style={S.composer}>
        <select value={term} onChange={e=>setTerm(e.target.value)} style={S.sel}>{TERMS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
        <input value={cat} onChange={e=>setCat(e.target.value)} placeholder="카테고리 (예: 가전)" style={{...S.shelfInput,minWidth:110}}/>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();}} placeholder="사고 싶은 것" style={{...S.shelfInput,minWidth:150}}/>
        <label style={S.dateLbl}>예정<input type="date" value={date} onChange={e=>setDate(e.target.value)} style={S.dateInput}/></label>
        <button style={S.saveBtn} onClick={add}>추가</button>
      </div>
      <div className="sc" style={S.listScroll}>
        {TERMS.map(t=>{ const items=purchases.filter(p=>p.term===t.id); return (
          <div key={t.id} style={S.termSection}>
            <div style={S.termHead}><span style={{...S.termDot,background:t.id==="short"?C.a2:t.id==="mid"?C.a3:C.a4}}/>{t.label} <span style={{color:C.faint,fontWeight:400,fontSize:12}}>({items.length})</span></div>
            {items.length===0&&<div style={{...S.dayEmpty,textAlign:"left",padding:"2px 4px"}}>없음</div>}
            {items.map(it=>(
              <div key={it.id} style={{...S.listRow,opacity:it.done?0.5:1}}>
                <button style={S.check} onClick={()=>toggle(it.id)}><span style={{...S.cboxSq,...(it.done?{background:C.a2,borderColor:C.a2}:{})}}>{it.done?"✓":""}</span></button>
                <span style={S.catChip}>{it.category}</span>
                <div style={S.rowBody}><EditableText value={it.text} onSave={v=>editText(it.id,v)} style={{...S.rowText,textDecoration:it.done?"line-through":"none"}} C={C}/></div>
                {it.date&&<span style={S.metaDate}>{it.date}</span>}
                <button style={S.rowX} onClick={()=>del(it.id)}>×</button>
              </div>
            ))}
          </div>
        );})}
      </div>
    </div>
  );
}

function ProjModal({C,S,proj,cat,cats,onSave,onDelete,onClose}){
  const isYear = proj._src==="year";
  const wiy=weeksInYear(proj.year);
  const [text,setText]=useState(proj.text);
  const [note,setNote]=useState(proj.note||"");
  const [pc,setPc]=useState(proj.cat);
  const [pcol,setPcol]=useState(proj.color||null);
  const [sw,setSw]=useState(proj.startWeek||1);
  const [ew,setEw]=useState(proj.endWeek||1);
  const [sm,setSm]=useState(proj.startMonth!=null?proj.startMonth:0);
  const [em,setEm]=useState(proj.endMonth!=null?proj.endMonth:0);
  const barCol=pcol||(cats.find(c=>c.id===pc)||cat).color;
  return (<div style={S.overlay} onClick={onClose}><div style={S.modal} onClick={e=>e.stopPropagation()}>
    <div style={{...S.modalTag,color:barCol}}>프로젝트 수정 · {proj.year}년</div>
    <input value={text} onChange={e=>setText(e.target.value)} placeholder="프로젝트 이름" style={{...S.shelfInput,width:"100%",fontSize:16,fontWeight:700,marginTop:8,marginBottom:10}}/>
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
      <select value={pc} onChange={e=>setPc(e.target.value)} style={S.sel}>{cats.map(c=><option key={c.id} value={c.id}>{c.n}.{c.label}</option>)}</select>
      {isYear?(<>
        <select value={sm} onChange={e=>setSm(+e.target.value)} style={S.sel}>{MONTHS.map((mm,i)=><option key={i} value={i}>{mm}</option>)}</select>
        <span style={{color:C.textDim}}>~</span>
        <select value={em} onChange={e=>setEm(+e.target.value)} style={S.sel}>{MONTHS.map((mm,i)=><option key={i} value={i}>{mm}</option>)}</select>
      </>):(<>
        <select value={sw} onChange={e=>setSw(+e.target.value)} style={S.sel}>{Array.from({length:wiy},(_,i)=>i+1).map(w=><option key={w} value={w}>wk{w}</option>)}</select>
        <span style={{color:C.textDim}}>~</span>
        <select value={ew} onChange={e=>setEw(+e.target.value)} style={S.sel}>{Array.from({length:wiy},(_,i)=>i+1).map(w=><option key={w} value={w}>wk{w}</option>)}</select>
      </>)}
    </div>
    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}><span style={S.shelfHint}>색:</span><ColorSwatches value={pcol} onChange={setPcol} C={C} S={S}/></div>
    <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="메모(선택)" style={{...S.modalArea,marginBottom:4}} rows={2}/>
    <div style={{...S.modalBtns,justifyContent:"space-between"}}>
      <button style={{...S.skipBtn,color:C.a1,borderColor:C.a1}} onClick={()=>onDelete(proj.id)}>삭제</button>
      <div style={{display:"flex",gap:10}}>
        <button style={S.skipBtn} onClick={onClose}>취소</button>
        <button style={S.saveBtn} onClick={()=>{ if(!text.trim())return; const base={...proj,text:text.trim(),note:note.trim(),cat:pc,color:pcol||undefined}; onSave(isYear?{...base,startMonth:sm,endMonth:Math.max(sm,em)}:{...base,startWeek:sw,endWeek:Math.max(sw,ew)}); }}>저장</button>
      </div>
    </div>
  </div></div>); }

function Reflect({C,S,text,onSave,onSkip}){ const [n,setN]=useState(""); const ref=useRef(null); useEffect(()=>{ref.current&&ref.current.focus();},[]); return (<div style={S.overlay} onClick={onSkip}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalTag}>완료 · 복기</div><h3 style={S.modalTitle}>{text}</h3><p style={S.modalHint}>그냥 끝내지 말고 — 무엇을 배웠는지, 다음엔 뭘 바꿀지 한 줄.</p><textarea ref={ref} value={n} onChange={e=>setN(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))onSave(n);}} placeholder="예: 앞마당 먼저 하니 시간이 빠듯. 다음엔 순서를 바꾸기." style={S.modalArea} rows={3}/><div style={S.modalBtns}><button style={S.skipBtn} onClick={onSkip}>그냥 완료</button><button style={S.saveBtn} onClick={()=>onSave(n)}>남기기</button></div></div></div>); }

function NewCat({C,S,cats,onSave,onDelete,onClose}){ const PAL=palette(C); const [label,setLabel]=useState(""); const [color,setColor]=useState(PAL[3]); return (<div style={S.overlay} onClick={onClose}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalTag}>카테고리 관리</div><div style={{margin:"12px 0"}}>{cats.map(c=>(<div key={c.id} style={S.catManageRow}><span style={{...S.chipNum,background:c.color}}>{c.n}</span><span style={{flex:1}}>{c.label}</span><button style={S.rowX} onClick={()=>onDelete(c.id)}>×</button></div>))}</div><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="새 카테고리 이름" style={{...S.shelfInput,width:"100%",marginBottom:10}}/><div style={{display:"flex",gap:8,marginBottom:14}}>{PAL.map(p=>(<button key={p} onClick={()=>setColor(p)} style={{width:26,height:26,borderRadius:7,background:p,border:color===p?`2px solid ${C.text}`:"2px solid transparent",cursor:"pointer"}}/>))}</div><div style={S.modalBtns}><button style={S.skipBtn} onClick={onClose}>닫기</button><button style={S.saveBtn} onClick={()=>label.trim()&&onSave(label.trim(),color)}>추가</button></div></div></div>); }

const st=(C)=>({
  root:{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter',-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif",display:"flex",flexDirection:"column"},
  head:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"18px 20px 12px",borderBottom:`1px solid ${C.line}`,flexWrap:"wrap",gap:10},
  brandRow:{display:"flex",alignItems:"center",gap:8}, brand:{margin:0,fontSize:19,fontWeight:700,letterSpacing:"-0.02em"}, tag:{margin:"4px 0 0 22px",color:C.textDim,fontSize:12},
  themeBtn:{width:34,height:34,borderRadius:9,border:`1px solid ${C.line}`,background:C.panel,cursor:"pointer",fontSize:15},
  switch:{display:"flex",gap:2,background:C.panel,padding:3,borderRadius:10,border:`1px solid ${C.line}`,flexWrap:"wrap"},
  swBtn:{border:"none",background:"transparent",color:C.textDim,padding:"7px 12px",borderRadius:7,cursor:"pointer",fontSize:13.5,fontWeight:600}, swOn:{background:C.panelHi,color:C.text},
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
  priBar:{width:4,alignSelf:"stretch",borderRadius:2,flexShrink:0,minHeight:18},
  check:{border:"none",background:"transparent",padding:0,cursor:"pointer",marginTop:1},
  cbox:{width:18,height:18,borderRadius:"50%",border:`1.5px solid ${C.faint}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:C.bg,fontWeight:700},
  cboxSq:{width:18,height:18,borderRadius:5,border:`1.5px solid ${C.faint}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:C.bg,fontWeight:700},
  catNum:{fontSize:12,fontWeight:800,marginTop:2,width:10,textAlign:"center",flexShrink:0},
  timePill:{fontSize:11,color:C.textDim,background:C.panelHi,borderRadius:5,padding:"2px 6px",marginTop:1,flexShrink:0,fontVariantNumeric:"tabular-nums"},
  rowBody:{flex:1,display:"flex",flexDirection:"column",gap:2,minWidth:0}, rowText:{fontSize:15,lineHeight:1.35,wordBreak:"break-word"}, rowNote:{fontSize:12,color:C.textDim,fontStyle:"italic",lineHeight:1.35},
  rowX:{border:"none",background:"transparent",color:C.faint,cursor:"pointer",fontSize:17,lineHeight:1,padding:"0 3px"},
  sel:{background:C.panelHi,border:`1px solid ${C.line}`,color:C.text,borderRadius:6,padding:"6px 6px",fontSize:12.5,fontFamily:"inherit"},
  selTime:{background:C.panelHi,border:`1px solid ${C.line}`,color:C.text,borderRadius:6,padding:"6px 6px",fontSize:12.5,fontFamily:"inherit",fontVariantNumeric:"tabular-nums"},
  addInput:{flex:1,minWidth:120,background:C.bg,border:`1px solid ${C.line}`,color:C.text,fontSize:14,padding:"7px 9px",borderRadius:8,fontFamily:"inherit"},
  dayEmpty:{color:C.faint,fontSize:13,padding:"14px 6px",textAlign:"center"},
  dayWrap:{flex:1,display:"flex",flexDirection:"column",padding:"12px 16px 16px",minHeight:0,gap:10},
  dayScroll:{flex:"1 1 55%",overflowY:"auto",display:"flex",flexDirection:"column"},
  dRow:{display:"flex",gap:10,padding:"8px 4px",borderBottom:`1px solid ${C.line}`},
  dToday:{background:`${C.a2}0E`,borderRadius:8},
  dDateCol:{width:38,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:2},
  dNum:{fontSize:17,fontWeight:700}, dWd:{fontSize:11,marginTop:1},
  dItems:{flex:1,display:"flex",flexDirection:"column",gap:2,minWidth:0},
  dAdd:{alignSelf:"flex-start",border:`1px dashed ${C.line}`,background:"transparent",color:C.textDim,borderRadius:7,padding:"4px 10px",fontSize:12.5,cursor:"pointer",marginTop:2},
  addRow:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",padding:"4px 0"},
  shelf:{flex:"0 0 auto",maxHeight:"42%",background:C.panel,border:`1px solid ${C.line}`,borderRadius:14,padding:14,display:"flex",flexDirection:"column",minHeight:0},
  shelfHead:{marginBottom:10}, shelfTitle:{margin:0,fontSize:15,fontWeight:700,display:"flex",alignItems:"center",gap:8}, shelfHint:{fontSize:12,color:C.textDim},
  shelfComposer:{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"},
  shelfInput:{flex:1,background:C.bg,border:`1px solid ${C.line}`,color:C.text,borderRadius:8,padding:"8px 10px",fontSize:13.5,fontFamily:"inherit",minWidth:120},
  shelfCols:{flex:1,display:"flex",gap:12,minHeight:0},
  shelfCol:{flex:1,display:"flex",flexDirection:"column",minHeight:0,background:C.bg,border:`1px solid ${C.line}`,borderRadius:10,padding:8},
  shelfColHead:{fontSize:12.5,fontWeight:700,color:C.textDim,marginBottom:6,paddingLeft:2},
  shelfColList:{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,alignContent:"flex-start"},
  chip:{display:"flex",alignItems:"center",gap:7,background:C.panelHi,border:"1.5px solid",borderRadius:10,padding:"7px 9px"},
  chipNum:{width:18,height:18,borderRadius:"50%",color:C.bg,fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  chipText:{fontSize:13,lineHeight:1.3,flex:1,minWidth:0,wordBreak:"break-word"},
  chipTools:{display:"flex",alignItems:"center",gap:2,flexShrink:0},
  miniBtn:{border:`1px solid ${C.line}`,background:"transparent",color:C.textDim,borderRadius:5,width:20,height:20,cursor:"pointer",fontSize:11,lineHeight:1,padding:0},
  sendBtn:{border:`1px solid ${C.line}`,background:"transparent",color:C.a2,borderRadius:6,width:24,height:22,cursor:"pointer",fontSize:12,lineHeight:1,flexShrink:0},
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
  ygMonthCell:{flex:1,textAlign:"center",fontSize:10.5,color:C.faint,minWidth:26},
  ygRow:{position:"relative",minHeight:40,marginBottom:2,minWidth:360},
  ygTrackFull:{position:"absolute",inset:0,display:"flex",top:18},
  ygGrid:{flex:1,borderRight:`1px solid ${C.line}44`,minWidth:26},
  ygName:{position:"absolute",top:0,fontSize:12,fontWeight:600,whiteSpace:"nowrap",display:"flex",gap:5,alignItems:"center",pointerEvents:"none",maxWidth:"100%"},
  ygBar:{position:"absolute",bottom:5,height:15,borderRadius:6,border:"none",cursor:"pointer",boxShadow:"0 1px 2px rgba(0,0,0,.15)"},
  ygEmpty:{color:C.faint,fontSize:12,padding:"8px 0 4px"},
  // shared tab wrappers
  tabWrap:{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 20px",minHeight:0,gap:12},
  composerRow:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"},
  composer:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",background:C.panel,padding:10,borderRadius:10,border:`1px solid ${C.line}`},
  filterBar:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"},
  listScroll:{flex:1,overflow:"auto",display:"flex",flexDirection:"column",gap:2},
  listRow:{display:"flex",alignItems:"center",gap:8,padding:"9px 6px",borderBottom:`1px solid ${C.line}`},
  catChip:{fontSize:11,fontWeight:700,color:C.bg,background:C.a4,borderRadius:6,padding:"2px 8px",flexShrink:0},
  metaDate:{fontSize:11,color:C.textDim,flexShrink:0,fontVariantNumeric:"tabular-nums"},
  dateLbl:{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.textDim},
  dateInput:{background:C.panelHi,border:`1px solid ${C.line}`,color:C.text,borderRadius:6,padding:"5px 6px",fontSize:12.5,fontFamily:"inherit"},
  termSection:{marginBottom:16}, termHead:{fontSize:14,fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",gap:7}, termDot:{width:9,height:9,borderRadius:"50%"},
  routineGrid:{flex:1,overflow:"auto",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12,alignContent:"flex-start"},
  routineCard:{background:C.panel,border:`1px solid ${C.line}`,borderRadius:12,padding:14,display:"flex",flexDirection:"column",gap:8,alignSelf:"flex-start"},
  routineCardHead:{display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${C.line}`,paddingBottom:8},
  routineTitle:{fontSize:15,fontWeight:700,flex:1},
  routineList:{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:6},
  routineItem:{display:"flex",alignItems:"center",gap:8},
  swatch:{width:22,height:22,borderRadius:6,cursor:"pointer",border:"none",padding:0},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,zIndex:50},
  modal:{background:C.bg,border:`1px solid ${C.line}`,borderRadius:16,padding:24,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,.3)"},
  modalTag:{fontSize:11,letterSpacing:"0.08em",color:C.a2,fontWeight:700,textTransform:"uppercase"}, modalTitle:{margin:"8px 0 6px",fontSize:18,fontWeight:700,lineHeight:1.3},
  modalHint:{margin:"0 0 4px",color:C.textDim,fontSize:13,lineHeight:1.5}, modalArea:{width:"100%",background:C.panel,border:`1px solid ${C.line}`,borderRadius:10,color:C.text,fontSize:14,padding:11,resize:"none",fontFamily:"inherit",lineHeight:1.5},
  modalBtns:{display:"flex",gap:10,marginTop:14,justifyContent:"flex-end"},
  skipBtn:{background:"transparent",border:`1px solid ${C.line}`,color:C.textDim,borderRadius:8,padding:"9px 16px",cursor:"pointer",fontSize:14,fontWeight:600},
  saveBtn:{background:C.a2,border:"none",color:C.bg,borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:14,fontWeight:700},
  catManageRow:{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.line}`,fontSize:14},
  loginCard:{background:C.panel,border:`1px solid ${C.line}`,borderRadius:18,padding:"28px 26px",width:"100%",maxWidth:360,boxShadow:"0 20px 60px rgba(0,0,0,.15)"},
  loginLbl:{fontSize:12.5,fontWeight:700,color:C.textDim,display:"block",marginBottom:2},
  profileBtn:{flex:1,border:`1px solid ${C.line}`,background:C.bg,color:C.text,borderRadius:10,padding:"11px 0",fontSize:15,fontWeight:700,cursor:"pointer"},
  sharedBadge:{fontSize:11,fontWeight:700,color:C.bg,background:C.a4,borderRadius:6,padding:"3px 9px"},
  bell:{fontSize:12,flexShrink:0},
});
