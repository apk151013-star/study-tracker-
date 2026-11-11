import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as pdfjsLib from 'pdfjs-dist'
import { Activity, AlarmClock, ArrowDown, ArrowRight, BarChart3, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, CloudUpload, Coffee, Download, Flame, GraduationCap, LayoutDashboard, ListTodo, Moon, MoreHorizontal, Pause, Play, Plus, RotateCcw, Settings, ShieldCheck, Sparkles, Sun, Target, Timer, Trash2, Trophy, Upload, X } from 'lucide-react'
import './style.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
const STORE = 'ias-journey-v1'
const todayKey = () => new Date().toLocaleDateString('en-CA')
const uid = () => Math.random().toString(36).slice(2, 10)
const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {} } catch { return {} } }
const initial = readStore()
const dateLabel = (date = new Date()) => date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmt = s => { const n = Math.max(0, Math.floor(s || 0)); return `${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}` }
const mins = s => `${Math.floor((s||0)/60)}m`
const dayKey = d => new Date(d).toLocaleDateString('en-CA')

function App() {
  const [data, setData] = useState(() => ({
    tasks: initial.tasks || [],
    sessions: initial.sessions || [],
    breaks: initial.breaks || [],
    syllabusName: initial.syllabusName || '',
    syllabusText: initial.syllabusText || '',
    theme: initial.theme || 'dark',
    quote: initial.quote || 'Small disciplined steps create extraordinary journeys.'
  }))
  const [view, setView] = useState('dashboard')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSubject, setTaskSubject] = useState('GS')
  const [taskEstimate, setTaskEstimate] = useState('60')
  const [timerTask, setTimerTask] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [breakMode, setBreakMode] = useState(false)
  const [breakStart, setBreakStart] = useState(null)
  const [notice, setNotice] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [syllabusOpen, setSyllabusOpen] = useState(false)
  const [reportPeriod, setReportPeriod] = useState('week')
  const [showAdd, setShowAdd] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const fileRef = useRef(null)
  const activeRef = useRef(null)

  useEffect(() => { localStorage.setItem(STORE, JSON.stringify(data)) }, [data])
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed(v => v + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  useEffect(() => {
    const onScroll = () => document.documentElement.style.setProperty('--scroll', `${Math.min(window.scrollY/900,1)}`)
    window.addEventListener('scroll', onScroll); onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    const quotes = ['Small disciplined steps create extraordinary journeys.','The secret of getting ahead is getting started.','Consistency is the bridge between goals and accomplishment.']
    const id = setInterval(() => setQuoteIndex(v => (v+1)%quotes.length), 7000)
    return () => clearInterval(id)
  }, [])

  const today = todayKey()
  const todaysTasks = data.tasks.filter(t => t.date === today)
  const completed = todaysTasks.filter(t => t.done).length
  const dailyPct = todaysTasks.length ? Math.round(completed/todaysTasks.length*100) : 0
  const todaySeconds = data.sessions.filter(s => s.date === today).reduce((a,s)=>a+s.seconds,0)
  const totalSeconds = data.sessions.reduce((a,s)=>a+s.seconds,0)
  const streak = useMemo(() => {
    let n=0, d=new Date()
    while (true) {
      const k=dayKey(d), has=data.sessions.some(s=>s.date===k) || data.tasks.some(t=>t.date===k&&t.done)
      if (!has) { if(n===0 && k===today) { d.setDate(d.getDate()-1); continue } break }
      n++; d.setDate(d.getDate()-1)
    }
    return n
  }, [data, today])

  const weekDays = useMemo(() => {
    const end = new Date(), start = new Date(end); start.setDate(end.getDate()-6)
    return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const k=dayKey(d);return {key:k,label:d.toLocaleDateString('en',{weekday:'short'}),seconds:data.sessions.filter(s=>s.date===k).reduce((a,s)=>a+s.seconds,0),done:data.tasks.filter(t=>t.date===k&&t.done).length,total:data.tasks.filter(t=>t.date===k).length}})
  }, [data])
  const monthStats = useMemo(() => {
    const now=new Date(), month=now.getMonth(), year=now.getFullYear()
    const tasks=data.tasks.filter(t=>{const d=new Date(t.date+'T00:00:00');return d.getMonth()===month&&d.getFullYear()===year})
    const sessions=data.sessions.filter(s=>{const d=new Date(s.date+'T00:00:00');return d.getMonth()===month&&d.getFullYear()===year})
    return {done:tasks.filter(t=>t.done).length,total:tasks.length,seconds:sessions.reduce((a,s)=>a+s.seconds,0),days:new Set(sessions.map(s=>s.date)).size}
  }, [data])
  const periodStats = reportPeriod==='week'
    ? {done:weekDays.reduce((a,d)=>a+d.done,0),total:weekDays.reduce((a,d)=>a+d.total,0),seconds:weekDays.reduce((a,d)=>a+d.seconds,0),days:weekDays.filter(d=>d.seconds>0).length}
    : {done:monthStats.done,total:monthStats.total,seconds:monthStats.seconds,days:monthStats.days}
  const progress = periodStats.total ? Math.round(periodStats.done/periodStats.total*100) : 0

  function update(patch) { setData(d=>({...d,...patch})) }
  function addTask(e) {
    e?.preventDefault()
    if (!taskTitle.trim()) return
    const task={id:uid(),title:taskTitle.trim(),subject:taskSubject,estimate:Number(taskEstimate)||60,date:today,done:false,createdAt:Date.now()}
    setData(d=>({...d,tasks:[...d.tasks,task]})); setTaskTitle('');setShowAdd(false);setNotice('Task added to today’s plan')
  }
  function toggleTask(task) {
    setData(d=>({...d,tasks:d.tasks.map(t=>t.id===task.id?{...t,done:!t.done,completedAt:!t.done?Date.now():null}:t)}))
  }
  function removeTask(id) { setData(d=>({...d,tasks:d.tasks.filter(t=>t.id!==id)})) }
  function startTask(task) {
    if (breakMode) finishBreak()
    if (timerTask && timerTask.id!==task.id) saveSession()
    setTimerTask(task);setElapsed(0);setRunning(true);setNotice(`Focus session started: ${task.title}`)
  }
  function saveSession() {
    if (timerTask && elapsed>0) setData(d=>({...d,sessions:[...d.sessions,{id:uid(),taskId:timerTask.id,title:timerTask.title,subject:timerTask.subject,date:today,seconds:elapsed,at:Date.now()}]}))
    setRunning(false);setElapsed(0);setTimerTask(null)
  }
  function pauseTimer() { setRunning(false) }
  function resumeTimer() { if(timerTask) setRunning(true) }
  function startBreak() {
    if (timerTask && elapsed>0) setData(d=>({...d,sessions:[...d.sessions,{id:uid(),taskId:timerTask.id,title:timerTask.title,subject:timerTask.subject,date:today,seconds:elapsed,at:Date.now()}]}))
    setRunning(false);setElapsed(0);setTimerTask(null);setBreakMode(true);setBreakStart(Date.now());setNotice('Break started — recharge well')
  }
  function finishBreak() {
    if(breakStart) setData(d=>({...d,breaks:[...d.breaks,{id:uid(),date:today,seconds:Math.round((Date.now()-breakStart)/1000),at:Date.now()}]}))
    setBreakMode(false);setBreakStart(null);setNotice('Break completed. Welcome back!')
  }
  async function uploadPDF(file) {
    if(!file) return
    if(file.type!=='application/pdf'){setNotice('Please choose a PDF file.');return}
    setPdfBusy(true);setNotice('Reading your syllabus PDF…')
    try {
      const bytes=await file.arrayBuffer()
      const pdf=await pdfjsLib.getDocument({data:bytes}).promise
      let text=''
      for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();text+=content.items.map(x=>x.str).join(' ')+'\\n'}
      update({syllabusName:file.name,syllabusText:text})
      setSyllabusOpen(true)
      setNotice(text.trim()?`Syllabus imported: ${pdf.numPages} pages analysed`:'PDF saved, but it appears to contain scanned pages. OCR is needed to read its text.')
    } catch(err) { setNotice('Could not read this PDF. Try another file.') }
    finally {setPdfBusy(false);if(fileRef.current)fileRef.current.value=''}
  }
  function exportBackup() {
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ias-journey-backup-${today}.json`;a.click();URL.revokeObjectURL(a.href)
  }
  function resetToday() {
    if(!confirm('Clear today’s plan? Your historical study sessions will remain saved.'))return
    if(timerTask)saveSession()
    setData(d=>({...d,tasks:d.tasks.filter(t=>t.date!==today)}))
  }
  const nav=[['dashboard','Dashboard',LayoutDashboard],['planner','My Plan',CalendarDays],['analytics','Analytics',BarChart3],['timer','Study Timer',Timer],['settings','Settings',Settings]]
  const pageTitle=nav.find(n=>n[0]===view)?.[1]||'Dashboard'

  return <div className={`app ${data.theme}`}>
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><GraduationCap size={27}/></div><div><b>IAS JOURNEY</b><small>PREPARE · PERSEVERE · SERVE</small></div></div>
      <div className="profile-mini"><div className="avatar">A</div><div><b>Future Officer</b><small>UPSC Aspirant</small></div><MoreHorizontal size={18}/></div>
      <div className="nav-label">YOUR WORKSPACE</div>
      <nav>{nav.map(([id,label,Icon])=><button key={id} className={view===id?'active':''} onClick={()=>setView(id)}><Icon size={18}/><span>{label}</span>{id==='analytics'&&<span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="quote-mark">“</div><p>{['Dream big. Prepare well. Serve the nation.','Discipline is choosing what you want most over what you want now.','Your future is built by what you do today.'][quoteIndex]}</p><span>— THE ASPIRANT’S CODE</span><div className="sidebar-mountain"/></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">LBSNAA · MUSSOORIE</span><h1>{pageTitle}<span className="gold-dot">.</span></h1></div><div className="top-actions"><div className="date-chip"><CalendarDays size={15}/>{dateLabel()}</div><button className="icon-btn" title="Toggle theme" onClick={()=>update({theme:data.theme==='dark'?'light':'dark'})}>{data.theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button><div className="avatar small">A</div></div></header>
      <section className="hero">
        <div className="hero-copy"><span className="pill"><Sparkles size={13}/> YOUR IAS JOURNEY STARTS HERE</span><h2>Every great officer<br/>begins as an <em>aspirant.</em></h2><p>One focused day at a time. Make today count.</p><div className="hero-quote">“{data.quote}”</div><button className="primary-btn" onClick={()=>setView('planner')}>Plan your day <ArrowRight size={16}/></button></div>
        <div className="hero-art"><div className="art-caption"><span>THE ACADEMY</span><b>Mussoorie, Uttarakhand</b></div></div>
        <div className="hero-bottom"><span><span className="live-dot"/> YOUR PREPARATION SPACE</span><span>01 / THE JOURNEY</span></div>
      </section>

      {view==='dashboard' && <>
        <section className="stats-grid">
          <Stat icon={<Target/>} label="TODAY’S PROGRESS" value={`${dailyPct}%`} detail={`${completed} of ${todaysTasks.length} tasks completed`} pct={dailyPct}/>
          <Stat icon={<Clock3/>} label="STUDY TIME TODAY" value={mins(todaySeconds)} detail="Focused time logged" pct={Math.min(100,todaySeconds/14400*100)}/>
          <Stat icon={<Flame/>} label="CURRENT STREAK" value={`${streak} days`} detail="Keep your momentum alive" pct={Math.min(100,streak/30*100)}/>
          <Stat icon={<Trophy/>} label="THIS MONTH" value={`${monthStats.done}`} detail={`Tasks completed · ${monthStats.days} active days`} pct={monthStats.total?monthStats.done/monthStats.total*100:0}/>
        </section>
        <div className="content-grid">
          <section className="panel plan-panel">
            <div className="section-head"><div><span className="eyebrow">STAY ON TRACK</span><h3>Today’s plan</h3></div><button className="subtle-btn" onClick={resetToday}><RotateCcw size={14}/> Reset day</button></div>
            <div className="progress-line"><div style={{width:`${dailyPct}%`}}/></div><div className="progress-meta"><span>{dailyPct}% completed</span><span>{completed}/{todaysTasks.length} tasks</span></div>
            {todaysTasks.length===0?<EmptyPlan onAdd={()=>setShowAdd(true)}/>:<div className="task-list">{(showAll?todaysTasks:todaysTasks.slice(0,5)).map(t=><TaskRow key={t.id} task={t} seconds={data.sessions.filter(s=>s.taskId===t.id).reduce((a,s)=>a+s.seconds,0)} onToggle={()=>toggleTask(t)} onStart={()=>startTask(t)} onDelete={()=>removeTask(t.id)}/>)}</div>}
            <button className="add-task-btn" onClick={()=>setShowAdd(v=>!v)}><Plus size={17}/> Add a task to today</button>
            {showAdd&&<TaskForm title={taskTitle} setTitle={setTaskTitle} subject={taskSubject} setSubject={setTaskSubject} estimate={taskEstimate} setEstimate={setTaskEstimate} onSubmit={addTask} onCancel={()=>setShowAdd(false)}/>}
            {todaysTasks.length>5&&<button className="text-btn" onClick={()=>setShowAll(v=>!v)}>{showAll?'Show less':'View all tasks'} <ArrowRight size={14}/></button>}
          </section>
          <div className="right-stack">
            <section className="panel timer-panel">
              <div className="section-head"><div><span className="eyebrow">DEEP WORK SESSION</span><h3><Timer size={19}/> Focus timer</h3></div><span className={`status ${running?'on':breakMode?'break':'idle'}`}>{running?'FOCUSING':breakMode?'ON BREAK':'READY'}</span></div>
              <div className="timer-display">{breakMode?fmt(breakStart?Math.floor((Date.now()-breakStart)/1000):0):fmt(elapsed)}</div>
              <div className="timer-task">{breakMode?'Rest is part of the process':timerTask?.title||'Choose a task to begin'}</div>
              <div className="timer-controls">{breakMode?<button className="primary-btn" onClick={finishBreak}><Check size={16}/> End break</button>:running?<><button className="round-control" onClick={pauseTimer}><Pause size={18}/></button><button className="primary-btn" onClick={saveSession}><Check size={16}/> Finish session</button><button className="round-control" onClick={startBreak}><Coffee size={18}/></button></>:timerTask?<><button className="primary-btn" onClick={resumeTimer}><Play size={16}/> Resume focus</button><button className="round-control" onClick={saveSession}><Check size={18}/></button><button className="round-control" onClick={startBreak}><Coffee size={18}/></button></>:<button className="primary-btn" onClick={()=>setView('planner')}><Play size={16}/> Select a task</button>}</div>
              <div className="timer-foot"><span><ShieldCheck size={13}/> Your sessions are saved locally</span><span>STAY PRESENT</span></div>
            </section>
            <section className="panel syllabus-panel">
              <div className="section-head"><div><span className="eyebrow">YOUR ROADMAP</span><h3><BookOpen size={19}/> Syllabus library</h3></div><button className="icon-btn" onClick={()=>fileRef.current?.click()}><Upload size={17}/></button></div>
              <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={e=>uploadPDF(e.target.files?.[0])}/>
              <div className="upload-zone" onClick={()=>fileRef.current?.click()}><div className="upload-icon"><CloudUpload size={22}/></div><div><b>{pdfBusy?'Reading PDF…':data.syllabusName||'Upload your syllabus PDF'}</b><small>{data.syllabusName?'Click to replace your syllabus':'PDF · Text extraction in your browser'}</small></div><ArrowRight size={17}/></div>
              {data.syllabusText&&<button className="text-btn" onClick={()=>setSyllabusOpen(v=>!v)}>{syllabusOpen?'Hide extracted text':'View extracted syllabus text'} <ChevronDown size={14}/></button>}
              {syllabusOpen&&data.syllabusText&&<div className="syllabus-extract">{data.syllabusText.slice(0,1800)}{data.syllabusText.length>1800?'…':''}</div>}
            </section>
          </div>
        </div>
        <section className="panel weekly-panel"><div className="section-head"><div><span className="eyebrow">YOUR CONSISTENCY</span><h3>Last 7 days</h3></div><button className="text-btn" onClick={()=>setView('analytics')}>Full analytics <ArrowRight size={14}/></button></div><WeekChart days={weekDays}/></section>
      </>}

      {view==='planner'&&<section className="panel page-panel"><div className="section-head"><div><span className="eyebrow">DAILY EXECUTION</span><h3>Your study plan</h3><p className="muted">{dateLabel()}</p></div><button className="primary-btn" onClick={()=>setShowAdd(true)}><Plus size={16}/> Add task</button></div><div className="planner-summary"><b>{completed}/{todaysTasks.length}</b><span>tasks completed today</span><div className="progress-line"><div style={{width:`${dailyPct}%`}}/></div></div>{todaysTasks.length?<div className="task-list">{todaysTasks.map(t=><TaskRow key={t.id} task={t} seconds={data.sessions.filter(s=>s.taskId===t.id).reduce((a,s)=>a+s.seconds,0)} onToggle={()=>toggleTask(t)} onStart={()=>startTask(t)} onDelete={()=>removeTask(t.id)}/>)}</div>:<EmptyPlan onAdd={()=>setShowAdd(true)}/ >}{showAdd&&<TaskForm title={taskTitle} setTitle={setTaskTitle} subject={taskSubject} setSubject={setTaskSubject} estimate={taskEstimate} setEstimate={setTaskEstimate} onSubmit={addTask} onCancel={()=>setShowAdd(false)}/>}</section>}

      {view==='timer'&&<section className="panel page-panel timer-page"><span className="eyebrow">TIME IS YOUR MOST VALUABLE RESOURCE</span><h3>Own your focus.</h3><div className="big-timer">{breakMode?'BREAK':fmt(elapsed)}</div><p className="muted">{breakMode?'Take a mindful pause.':timerTask?.title||'Choose a task from My Plan to start tracking.'}</p><div className="timer-controls">{breakMode?<button className="primary-btn" onClick={finishBreak}>End break</button>:running?<><button className="round-control" onClick={pauseTimer}><Pause/></button><button className="primary-btn" onClick={saveSession}>Finish & save</button><button className="round-control" onClick={startBreak}><Coffee/></button></>:timerTask?<><button className="primary-btn" onClick={resumeTimer}><Play/> Resume</button><button className="round-control" onClick={saveSession}><Check/></button><button className="round-control" onClick={startBreak}><Coffee/></button></>:<button className="primary-btn" onClick={()=>setView('planner')}>Choose a task</button>}</div><div className="timer-note"><Coffee size={18}/> Remember: breaks are logged separately and never counted as study time.</div><h4>Recent focus sessions</h4>{data.sessions.slice(-8).reverse().map(s=><div className="session-row" key={s.id}><span>{s.title}</span><b>{mins(s.seconds)}</b><small>{s.date}</small></div>)}</section>}

      {view==='analytics'&&<section className="analytics-page"><div className="panel page-panel"><div className="section-head"><div><span className="eyebrow">MEASURE WHAT MATTERS</span><h3>Your performance report</h3></div><div className="segmented"><button className={reportPeriod==='week'?'selected':''} onClick={()=>setReportPeriod('week')}>Weekly</button><button className={reportPeriod==='month'?'selected':''} onClick={()=>setReportPeriod('month')}>Monthly</button></div></div><div className="analytics-cards"><div><span>COMPLETION RATE</span><b>{progress}%</b><small>{periodStats.done} / {periodStats.total} tasks</small></div><div><span>FOCUSED STUDY TIME</span><b>{(periodStats.seconds/3600).toFixed(1)}h</b><small>Breaks excluded</small></div><div><span>ACTIVE DAYS</span><b>{periodStats.days}</b><small>{reportPeriod==='week'?'Out of 7 days':'This month'}</small></div></div><WeekChart days={weekDays}/><div className="insight-card"><Sparkles size={20}/><div><b>{progress>=75?'Excellent momentum.':progress>=40?'You are building consistency.':'A fresh start begins with one task.'}</b><p>{periodStats.total?`You completed ${periodStats.done} of ${periodStats.total} planned tasks and logged ${(periodStats.seconds/3600).toFixed(1)} focused hours in this ${reportPeriod}. ${periodStats.days} active days recorded.`:'Your report will become more meaningful as you add tasks and log study sessions.'}</p></div></div></div><div className="panel page-panel"><div className="section-head"><div><span className="eyebrow">TIME BREAKDOWN</span><h3>Recent study sessions</h3></div></div>{data.sessions.length?data.sessions.slice(-12).reverse().map(s=><div className="session-row" key={s.id}><span>{s.title}<small>{s.subject}</small></span><b>{mins(s.seconds)}</b><small>{s.date}</small></div>):<p className="muted">No sessions recorded yet. Start your first focus session.</p>}</div></section>}

      {view==='settings'&&<section className="panel page-panel"><span className="eyebrow">YOUR SPACE, YOUR RULES</span><h3>Settings & data</h3><div className="setting-row"><div><b>Appearance</b><small>Switch between dark and light mode</small></div><button className="subtle-btn" onClick={()=>update({theme:data.theme==='dark'?'light':'dark'})}>{data.theme==='dark'?<Sun size={15}/>:<Moon size={15}/>} {data.theme==='dark'?'Light mode':'Dark mode'}</button></div><div className="setting-row"><div><b>Export your backup</b><small>Download tasks, sessions, syllabus text and preferences as JSON</small></div><button className="subtle-btn" onClick={exportBackup}><Download size={15}/> Export backup</button></div><div className="setting-row"><div><b>Reset all app data</b><small>This permanently clears data stored in this browser.</small></div><button className="danger-btn" onClick={()=>{if(confirm('Delete all IAS Journey data from this browser?')){localStorage.removeItem(STORE);location.reload()}}}><Trash2 size={15}/> Clear data</button></div><div className="notice-box"><CircleHelp size={18}/><p><b>About your privacy</b><br/>Your data currently stays in this browser on this device. It is not synced to a cloud account. Use Export backup regularly, especially before clearing browser data.</p></div></section>}
      <footer><span>IAS JOURNEY <i>·</i> BUILT FOR THE LONG GAME</span><span>DISCIPLINE TODAY. SERVICE TOMORROW.</span></footer>
    </main>
    {notice&&<div className="toast" onClick={()=>setNotice('')}><CheckCircle2 size={17}/>{notice}<X size={15}/></div>}
  </div>
}

function Stat({icon,label,value,detail,pct}) {return <div className="stat-card"><div className="stat-top"><span className="stat-icon">{icon}</span><span>{label}</span></div><b className="stat-value">{value}</b><div className="stat-bottom"><span>{detail}</span><div className="mini-track"><i style={{width:`${pct}%`}}/></div></div></div>}
function EmptyPlan({onAdd}) {return <div className="empty-plan"><div className="empty-icon"><ListTodo size={25}/></div><b>Your page is waiting for a plan.</b><p>Add the first task and turn intention into action.</p><button className="text-btn" onClick={onAdd}>Create your first task <ArrowRight size={14}/></button></div>}
function TaskRow({task,seconds,onToggle,onStart,onDelete}) {return <div className={`task-row ${task.done?'done':''}`}><button className="check-task" onClick={onToggle}>{task.done?<Check size={15}/>:null}</button><div className="task-main"><b>{task.title}</b><small>{task.subject} <span>·</span> Target {task.estimate} min {seconds>0&&<><span>·</span> Tracked {mins(seconds)}</>}</small></div><span className="task-time">{task.done?'COMPLETED':`${task.estimate}m`}</span><button className="task-play" title="Start timer" onClick={onStart}><Play size={14}/></button><button className="task-delete" title="Delete task" onClick={onDelete}><Trash2 size={14}/></button></div>}
function TaskForm({title,setTitle,subject,setSubject,estimate,setEstimate,onSubmit,onCancel}) {return <form className="task-form" onSubmit={onSubmit}><input autoFocus placeholder="What will you study?" value={title} onChange={e=>setTitle(e.target.value)}/><div className="form-row"><select value={subject} onChange={e=>setSubject(e.target.value)}><option>GS</option><option>Polity</option><option>History</option><option>Geography</option><option>Economy</option><option>Environment</option><option>Science & Tech</option><option>Current Affairs</option><option>CSAT</option><option>Optional</option><option>Essay</option><option>Answer Writing</option><option>Revision</option></select><input type="number" min="5" max="600" value={estimate} onChange={e=>setEstimate(e.target.value)} aria-label="Estimated minutes"/><button className="primary-btn" type="submit">Save task</button><button className="subtle-btn" type="button" onClick={onCancel}>Cancel</button></div></form>}
function WeekChart({days}) {const max=Math.max(3600,...days.map(d=>d.seconds));return <div className="week-chart">{days.map(d=><div className="chart-day" key={d.key}><div className="bar-area"><div className="bar" style={{height:`${Math.max(5,d.seconds/max*100)}%`}} title={`${(d.seconds/3600).toFixed(1)} study hours`}/></div><b>{d.label}</b><small>{d.seconds?`${(d.seconds/3600).toFixed(1)}h`:'—'}</small></div>)}</div>}
createRoot(document.getElementById('root')).render(<App/>)
