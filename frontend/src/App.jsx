import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, Clock3, LogOut, Menu, Plus, Search, Settings2, SlidersHorizontal,
  Sparkles, X,
} from "lucide-react";
import toast from "react-hot-toast";
import AuthScreen from "./AuthScreen.jsx";
import { getCurrentUser } from "./services/authService.js";
import {
  createTask, deleteTask, getAllTasks, getDashboardStats, getWeeklyTasks, searchTasks,
  updateTask, updateTaskStatus,
} from "./services/taskService.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (value) => String(value).padStart(2, "0");
const localDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatDate = (date, options) => new Intl.DateTimeFormat("en-US", options).format(date);

function getWeekDates(referenceDate) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatTaskDate(task) {
  const date = new Date(`${String(task.scheduledDate).slice(0, 10)}T00:00:00`);
  return formatDate(date, { month: "short", day: "numeric" });
}

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ totalTasks: 0, openTasks: 0, completedTasks: 0, overdueTasks: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeDate, setActiveDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [sortBy, setSortBy] = useState("time");
  const [showCompleted, setShowCompleted] = useState(true);
  const [modalTask, setModalTask] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [activeView, setActiveView] = useState("tasks");
  const [weeklyReport, setWeeklyReport] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem("taskflow_token")) {
      setAuthLoading(false);
      return;
    }
    getCurrentUser()
      .then(setAuthUser)
      .catch(() => localStorage.removeItem("taskflow_token"))
      .finally(() => setAuthLoading(false));
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const [taskData, statsData, weeklyData] = await Promise.all([
        getAllTasks(),
        getDashboardStats(),
        getWeeklyTasks(),
      ]);
      setTasks(taskData.tasks || taskData);
      setStats(statsData);
      setWeeklyReport(weeklyData);
    } catch (error) {
      const message = error.response?.data?.message || "Could not connect to TaskFlow. Check that the API is running.";
      setLoadError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) refresh().catch(() => {});
  }, [refresh, authUser]);

  useEffect(() => {
    if (!authUser) return undefined;
    const query = search.trim();
    if (!query) {
      setIsSearching(false);
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    const timeout = window.setTimeout(async () => {
      try {
        const result = await searchTasks(query);
        setSearchResults(result.tasks || result);
      } catch {
        setSearchResults([]);
        toast.error("Search could not be completed.");
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, authUser]);

  const weekDates = useMemo(() => getWeekDates(activeDate), [activeDate]);
  const dayTasks = useMemo(() => {
    if (search.trim()) {
      return [...(searchResults || [])].sort((a, b) => sortBy === "priority"
        ? ["High", "Medium", "Low"].indexOf(a.priority) - ["High", "Medium", "Low"].indexOf(b.priority)
        : String(a.scheduledDate).localeCompare(String(b.scheduledDate)) || String(a.scheduledTime).localeCompare(String(b.scheduledTime)));
    }
    return tasks
      .filter((task) => showAllTasks || String(task.scheduledDate).slice(0, 10) === localDateKey(activeDate))
      .filter((task) => showCompleted || task.status !== "Completed")
      .sort((a, b) => sortBy === "priority"
        ? ["High", "Medium", "Low"].indexOf(a.priority) - ["High", "Medium", "Low"].indexOf(b.priority)
        : String(a.scheduledTime).localeCompare(String(b.scheduledTime)));
  }, [activeDate, tasks, showCompleted, sortBy, search, searchResults, showAllTasks]);

  const weekTasks = useMemo(
    () => tasks.filter((task) => weekDates.some((date) => localDateKey(date) === String(task.scheduledDate).slice(0, 10))),
    [tasks, weekDates],
  );
  const completedThisWeek = weekTasks.filter((task) => task.status === "Completed").length;
  const weeklyProgress = weekTasks.length ? Math.round((completedThisWeek / weekTasks.length) * 100) : 0;
  const isToday = localDateKey(activeDate) === localDateKey(new Date());

  async function handleSave(payload) {
    try {
      if (modalTask?._id) await updateTask(modalTask._id, payload);
      else await createTask(payload);
      toast.success(modalTask?._id ? "Task updated" : "Task added");
      setModalTask(null);
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Your task could not be saved.");
      throw error;
    }
  }

  async function handleToggle(task) {
    const status = task.status === "Completed" ? "In Progress" : "Completed";
    try {
      await updateTaskStatus(task._id, status);
      await refresh();
      toast.success(status === "Completed" ? "Nicely done!" : "Task moved back to your list");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update task.");
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    try {
      await deleteTask(task._id);
      await refresh();
      toast.success("Task deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete task.");
    }
  }

  function moveWeek(amount) {
    const next = new Date(activeDate);
    next.setDate(next.getDate() + amount * 7);
    setActiveDate(next);
  }

  function signOut() {
    localStorage.removeItem("taskflow_token");
    setAuthUser(null);
    setTasks([]);
    setStats({ totalTasks: 0, openTasks: 0, completedTasks: 0, overdueTasks: 0 });
    setSearch("");
    setSearchResults(null);
    setWeeklyReport([]);
    setActiveView("tasks");
  }

  function navigateTo(view) {
    setActiveView(view);
    setMenuOpen(false);
  }

  if (authLoading) {
    return <main className="auth-loading"><span className="spinner" /> Getting your space ready...</main>;
  }
  if (!authUser) {
    return <AuthScreen onAuthenticated={setAuthUser} />;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="/" aria-label="TaskFlow home">
          <span className="brand-mark"><Check size={19} strokeWidth={3} /></span>
          <span>taskflow<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button type="button" className={`nav-item ${activeView === "tasks" ? "active" : ""}`} onClick={() => navigateTo("tasks")}><ClipboardList size={18} /> My tasks <span className="nav-count">{stats.openTasks}</span></button>
          <button type="button" className={`nav-item ${activeView === "week" ? "active" : ""}`} onClick={() => navigateTo("week")}><CalendarDays size={18} /> My week</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon"><Sparkles size={16} /></div>
            <strong>Little by little</strong>
            <p>Big things get done one task at a time.</p>
            <button type="button" className="tip-link" onClick={() => setModalTask({})}>Plan your day <ChevronRight size={14} /></button>
          </div>
          <div className="profile-button">
            <span className="avatar">{authUser.name.charAt(0).toUpperCase()}</span>
            <span className="profile-copy"><strong>{authUser.name}</strong><small>{authUser.email}</small></span>
            <button type="button" className="sign-out-button" onClick={signOut} aria-label="Log out" title="Log out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {menuOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <main className="main-content" id="home">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <span className="mobile-profile-name">{authUser.name}&apos;s tasks</span>
          <div className="breadcrumb">Workspace <ChevronRight size={14} /> <span>{activeView === "week" ? "My week" : "My tasks"}</span></div>
          <div className="top-actions">
            <button className="avatar top-avatar" aria-label={`Profile: ${authUser.name}`}>{authUser.name.charAt(0).toUpperCase()}</button>
            <button className="icon-button mobile-logout" onClick={signOut} aria-label="Log out" title="Log out"><LogOut size={18} /></button>
          </div>
        </header>

        {activeView === "tasks" ? <>
        <label className="search-field main-search">
          <Search size={17} />
          <input aria-label="Search tasks" type="search" placeholder="Search for a task..." value={search} onChange={(event) => setSearch(event.target.value)} />
          {search && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setSearch("")}><X size={15} /></button>}
        </label>

        <section className="page-heading">
          <div>
            <div className="eyebrow">{isToday ? "YOUR PERSONAL SPACE" : formatDate(activeDate, { weekday: "long" }).toUpperCase()}</div>
            <h1>Make room for <span>what matters.</span></h1>
            <p className="heading-subtitle">{isToday ? "A clear mind starts with a clear plan." : `Here’s what’s on your plate for ${formatDate(activeDate, { weekday: "long" })}.`}</p>
          </div>
          <button className="primary-button add-task-button" onClick={() => setModalTask({})}><Plus size={18} /> Add a task</button>
        </section>

        {loadError && (
          <div className="error-banner" role="alert">
            <span>{loadError}</span>
            <button type="button" onClick={() => { setLoading(true); refresh().catch(() => {}); }}>Try again</button>
          </div>
        )}

        <section className="summary-grid" aria-label="Task summary">
          <SummaryCard label="Total tasks" mobileLabel="Total tasks" value={stats.totalTasks} icon={<ClipboardList size={17} />} detail="All time" color="blue" />
          <SummaryCard label="In progress" mobileLabel="Task pending" value={stats.openTasks} icon={<ArrowDownUp size={17} />} detail="Ready when you are" color="orange" />
          <SummaryCard label="Completed" mobileLabel="Task complete" value={stats.completedTasks} icon={<Check size={17} />} detail="Look at you go" color="green" />
          <SummaryCard label="Overdue" mobileLabel="Overdue" value={stats.overdueTasks} icon={<Clock3 size={17} />} detail="Needs a little love" color="pink" />
        </section>

        <div className="dashboard-grid">
          <section className="panel weekly-panel" id="week">
            <div className="panel-header">
              <div><h2>This week</h2><p>{formatDate(weekDates[0], { month: "short", day: "numeric" })} – {formatDate(weekDates[6], { month: "short", day: "numeric", year: "numeric" })}</p></div>
              <div className="week-controls">
                <button className="icon-button small-icon" onClick={() => moveWeek(-1)} aria-label="Previous week"><ChevronLeft size={17} /></button>
                <button className="icon-button small-icon" onClick={() => moveWeek(1)} aria-label="Next week"><ChevronRight size={17} /></button>
              </div>
            </div>
            <div className="week-strip" aria-label="Choose a day">
              {weekDates.map((date) => {
                const active = localDateKey(date) === localDateKey(activeDate);
                const today = localDateKey(date) === localDateKey(new Date());
                const count = tasks.filter((task) => String(task.scheduledDate).slice(0, 10) === localDateKey(date)).length;
                return (
                  <button type="button" key={localDateKey(date)} className={`day-cell ${active ? "selected" : ""} ${today && !active ? "today" : ""}`} onClick={() => setActiveDate(date)}>
                    <span className="day-name">{WEEKDAYS[date.getDay()]}</span>
                    <span className="day-number">{date.getDate()}</span>
                    <span className={`day-dot ${count ? "has-tasks" : ""}`} />
                  </button>
                );
              })}
            </div>
            <div className="progress-card">
              <div className="progress-topline">
                <div><span className="progress-title">Weekly progress</span><span className="progress-meta">{completedThisWeek} of {weekTasks.length} tasks complete</span></div>
                <span className="progress-percent">{weeklyProgress}%</span>
              </div>
              <div className="progress-track"><span style={{ width: `${weeklyProgress}%` }} /></div>
              <div className="progress-foot"><Sparkles size={14} /> Every small step counts.</div>
            </div>
          </section>

          <section className="panel tasks-panel">
            <div className="panel-header task-panel-heading">
              <div><div className="section-title-row"><h2>{showAllTasks ? "All tasks" : isToday ? "Tasks today" : `${formatDate(activeDate, { weekday: "long" })}’s tasks`}</h2><span className="task-count">{dayTasks.length}</span></div><p>{isToday ? "One thing at a time. You’ve got this." : formatDate(activeDate, { month: "long", day: "numeric" })}</p></div>
              <div className="task-toolbar">
                <button type="button" className="view-all-button" onClick={() => setShowAllTasks((value) => !value)}>{showAllTasks ? "Today" : "View all"}</button>
                <button className="icon-button small-icon" aria-label="Sort tasks" title="Toggle task sorting" onClick={() => setSortBy((value) => value === "time" ? "priority" : "time")}><SlidersHorizontal size={17} /></button>
                <button className="icon-button small-icon" aria-label="Toggle completed tasks" title="Toggle completed tasks" onClick={() => setShowCompleted((value) => !value)}><ChevronDown size={17} className={showCompleted ? "" : "rotate-icon"} /></button>
              </div>
            </div>
            <div className="task-list" aria-live="polite">
              {loading ? <div className="loading-state"><span className="spinner" /> Loading your tasks...</div> : null}
              {!loading && isSearching ? <div className="loading-state"><span className="spinner" /> Searching...</div> : null}
              {!loading && !isSearching && dayTasks.length === 0 && (
                <div className="empty-state">
                  <span className="empty-illustration"><CalendarDays size={22} /></span>
                  <strong>{search ? "No tasks found" : "A little breathing room"}</strong>
                  <p>{search ? "Try another search, or clear the search field." : "Nothing on the list yet. Enjoy the space or add a task."}</p>
                  {!search && <button type="button" className="text-button" onClick={() => setModalTask({})}><Plus size={15} /> Add your first task</button>}
                </div>
              )}
              {!loading && !isSearching && dayTasks.map((task) => (
                <TaskRow key={task._id} task={task} onToggle={() => handleToggle(task)} onEdit={() => setModalTask(task)} onDelete={() => handleDelete(task)} />
              ))}
            </div>
            <button type="button" className="add-inline-button" onClick={() => setModalTask({})}><Plus size={16} /> Add a task</button>
          </section>
        </div>
        <footer className="page-footer"><span>Made for your kind of productivity.</span><span>Take it one step at a time <span aria-hidden="true">✦</span></span></footer>
        </> : <WeeklyReport
          weeks={weeklyReport}
          loading={loading}
          error={loadError}
          onRetry={() => refresh().catch(() => {})}
          onAddTask={() => setModalTask({})}
          onToggle={handleToggle}
          onEdit={setModalTask}
          onDelete={handleDelete}
        />}
      </main>
      <button type="button" className="mobile-add-button" aria-label="Add a task" onClick={() => setModalTask({})}><Plus size={24} /></button>
      {modalTask && <TaskModal task={modalTask._id ? modalTask : null} onClose={() => setModalTask(null)} onSave={handleSave} defaultDate={localDateKey(activeDate)} />}
    </div>
  );
}

function WeeklyReport({ weeks, loading, error, onRetry, onAddTask, onToggle, onEdit, onDelete }) {
  const totals = weeks.reduce((result, week) => ({
    tasks: result.tasks + week.totalTasks,
    open: result.open + week.openTasks,
    completed: result.completed + week.completedTasks,
  }), { tasks: 0, open: 0, completed: 0 });

  return (
    <section className="weekly-report" aria-labelledby="weekly-report-title">
      <header className="weekly-report-heading">
        <div>
          <span className="eyebrow">YOUR PROGRESS, WEEK BY WEEK</span>
          <h1 id="weekly-report-title">My week<span>.</span></h1>
          <p>See what you’ve done and what’s coming up next.</p>
        </div>
        <button type="button" className="primary-button report-add-button" onClick={onAddTask}><Plus size={17} /> Add a task</button>
      </header>

      {error && <div className="error-banner" role="alert"><span>{error}</span><button type="button" onClick={onRetry}>Try again</button></div>}

      <div className="report-summary" aria-label="Weekly task totals">
        <div className="report-summary-card"><span className="report-summary-icon blue"><CalendarDays size={17} /></span><span><small>Tasks planned</small><strong>{totals.tasks}</strong></span></div>
        <div className="report-summary-card"><span className="report-summary-icon amber"><ArrowDownUp size={17} /></span><span><small>In progress</small><strong>{totals.open}</strong></span></div>
        <div className="report-summary-card"><span className="report-summary-icon green"><Check size={17} /></span><span><small>Completed</small><strong>{totals.completed}</strong></span></div>
      </div>

      {loading && <div className="report-loading"><span className="spinner" /> Loading your weekly report...</div>}
      {!loading && weeks.length === 0 && (
        <div className="report-empty">
          <span className="empty-illustration"><CalendarDays size={24} /></span>
          <h2>Your weeks start here</h2>
          <p>Add a task and it will appear in the report for its scheduled week.</p>
          <button type="button" className="primary-button" onClick={onAddTask}><Plus size={16} /> Add your first task</button>
        </div>
      )}
      {!loading && weeks.length > 0 && (
        <div className="week-report-list">
          {weeks.map((week) => {
            const startDate = new Date(week.weekStart);
            const endDate = new Date(week.weekEnd);
            const isCurrent = localDateKey(startDate) <= localDateKey(new Date()) && localDateKey(endDate) >= localDateKey(new Date());
            const weekTitle = isCurrent
              ? "This week"
              : `Week of ${formatDate(startDate, { month: "short", day: "numeric", timeZone: "UTC" })}`;
            return (
              <article className="week-report-card" key={week.weekStart}>
                <header className="week-report-card-header">
                  <div className="week-report-title">
                    <span className="report-week-icon"><CalendarDays size={17} /></span>
                    <div><h2>{weekTitle}</h2><p>{formatDate(startDate, { month: "short", day: "numeric", timeZone: "UTC" })} – {formatDate(endDate, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</p></div>
                  </div>
                  <span className="week-completion-badge">{week.progressPercentage}% complete</span>
                </header>
                <div className="week-report-stats">
                  <span><strong>{week.totalTasks}</strong> {week.totalTasks === 1 ? "task" : "tasks"}</span>
                  <span className="report-open"><i /> {week.openTasks} in progress</span>
                  <span className="report-completed"><i /> {week.completedTasks} completed</span>
                </div>
                <div className="progress-track report-progress-track" role="progressbar" aria-label={`${week.progressPercentage}% of tasks complete`} aria-valuenow={week.progressPercentage} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${week.progressPercentage}%` }} />
                </div>
                {week.tasks.length > 0 ? (
                  <div className="week-report-tasks">
                    {week.tasks.map((task) => (
                      <TaskRow
                        key={task._id}
                        task={task}
                        onToggle={() => onToggle(task)}
                        onEdit={() => onEdit(task)}
                        onDelete={() => onDelete(task)}
                      />
                    ))}
                  </div>
                ) : <p className="week-no-tasks">No tasks scheduled for this week.</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, mobileLabel, value, icon, detail, color }) {
  return (
    <article className="summary-card">
      <div className={`summary-icon ${color}`}>{icon}</div>
      <div className="summary-copy"><span className="summary-label-desktop">{label}</span><span className="summary-label-mobile">{mobileLabel}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete }) {
  const completed = task.status === "Completed";
  return (
    <article className={`task-row ${completed ? "task-completed" : ""}`}>
      <button className={`check-button ${completed ? "checked" : ""}`} aria-label={completed ? `Mark ${task.title} in progress` : `Complete ${task.title}`} onClick={onToggle}>{completed && <Check size={13} strokeWidth={3} />}</button>
      <div className="task-content">
        <div className="task-title-line"><h3>{task.title}</h3><span className={`priority-dot priority-${String(task.priority || "medium").toLowerCase()}`} title={`${task.priority || "Medium"} priority`} /></div>
        {task.description && <p className="task-description">{task.description}</p>}
        <div className="task-meta"><span><Clock3 size={13} /> {task.scheduledTime}</span><span><CalendarDays size={13} /> {formatTaskDate(task)}</span><span className={`priority-label ${String(task.priority || "medium").toLowerCase()}`}>{task.priority || "Medium"}</span></div>
      </div>
      <div className="task-actions">
        <button type="button" aria-label={`Edit ${task.title}`} onClick={onEdit} title="Edit task"><Settings2 size={16} /></button>
        <button type="button" aria-label={`Delete ${task.title}`} onClick={onDelete} title="Delete task"><X size={17} /></button>
      </div>
    </article>
  );
}

function TaskModal({ task, onClose, onSave, defaultDate }) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    scheduledDate: task ? String(task.scheduledDate).slice(0, 10) : defaultDate,
    scheduledTime: task?.scheduledTime || "",
    priority: task?.priority || "Medium",
    status: task?.status || "In Progress",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.scheduledDate || !form.scheduledTime) {
      setError("Add a title, date, and time before saving.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave({ ...form, title: form.title.trim(), description: form.description.trim() });
    } catch {
      setError("We couldn’t save that task. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div><span className="modal-kicker">{task ? "MAKE IT JUST RIGHT" : "A FRESH START"}</span><h2 id="modal-title">{task ? "Edit task" : "Add a new task"}</h2></div>
          <button type="button" className="icon-button close-modal" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
        </div>
        <form onSubmit={submit}>
          <label className="form-label">Task title <span>*</span>
            <input autoFocus name="title" value={form.title} onChange={updateField} placeholder="What needs to get done?" maxLength={120} required />
          </label>
          <label className="form-label">A little more detail <small>OPTIONAL</small>
            <textarea name="description" value={form.description} onChange={updateField} placeholder="Add a note or some context..." rows={3} maxLength={1000} />
          </label>
          <div className="form-row">
            <label className="form-label">Date <span>*</span><input type="date" name="scheduledDate" value={form.scheduledDate} onChange={updateField} required /></label>
            <label className="form-label">Time <span>*</span><input type="time" name="scheduledTime" value={form.scheduledTime} onChange={updateField} required /></label>
          </div>
          <div className="form-row">
            <label className="form-label">Priority
              <select name="priority" value={form.priority} onChange={updateField}><option>Low</option><option>Medium</option><option>High</option></select>
            </label>
            <label className="form-label">Status
              <select name="status" value={form.status} onChange={updateField}><option>In Progress</option><option>Completed</option></select>
            </label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button save-button" disabled={saving}>{saving ? "Saving..." : task ? "Save changes" : "Create task"} <ChevronRight size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}

export default App;
