import { useState, useId } from "react";
import { useSharedState } from "../contexts/SharedStateContext";
import { clippyApi } from "../clippyApi";
import { Objective, ObjectiveCategory, ObjectiveFrequency } from "../../sharedState";

const DAYS_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const CATEGORY_LABELS: Record<ObjectiveCategory, string> = {
  code: "💻 Code",
  reading: "📖 Reading",
  entertainment: "🎮 Entertainment",
  other: "📌 Other",
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function lastActiveDayKeys(obj: Objective, count = 7): string[] {
  const keys: string[] = [];
  let offset = 0;
  const activeDays = obj.activeDays ?? [];
  const hasActiveDays = activeDays.length > 0;

  while (keys.length < count && offset > -30) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dayOfWeek = d.getDay();

    if (!hasActiveDays || activeDays.includes(dayOfWeek)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      keys.push(key);
    }
    offset--;
  }
  return keys.reverse();
}

function getWeekKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const tempDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tempDate.getUTCFullYear()}-W${weekNo}`;
}

function getMonthKey(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function DayDots({ obj }: { obj: Objective }) {
  const freq = obj.frequency ?? "daily";
  let keys: string[] = [];
  let currentPeriodKey = todayKey();

  const labelMap: Record<string, string> = {
    daily: "Today",
    weekly: "This week",
    monthly: "This month",
  };

  let dotsLabel = "Last 7:";
  if (freq === "weekly") {
    keys = Array.from({ length: 7 }, (_, i) => getWeekKey(i - 6));
    currentPeriodKey = getWeekKey(0);
    dotsLabel = "Last 7 wk.:";
  } else if (freq === "monthly") {
    keys = Array.from({ length: 7 }, (_, i) => getMonthKey(i - 6));
    currentPeriodKey = getMonthKey(0);
    dotsLabel = "Last 7 mo.:";
  } else {
    const count = obj.activeDays.length > 0 ? obj.activeDays.length : 7;
    keys = lastActiveDayKeys(obj, count);
    currentPeriodKey = todayKey();
    dotsLabel = `Last ${count} days:`;
  }

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <span style={{ fontSize: 9, whiteSpace: "nowrap" }}>{dotsLabel}</span>
      {keys.map((key) => {
        const isCurrent = key === currentPeriodKey;
        const status = obj.history[key];

        let bg = "#ccc";
        let border = "1px solid #999";

        if (status === "completed") {
          bg = "#00aa00";
          border = "1px solid #006600";
        } else if (status === "failed") {
          bg = "#cc0000";
          border = "1px solid #880000";
        } else if (isCurrent) {
          const pct = Math.min(100, (obj.progressTodayMinutes / obj.targetMinutes) * 100);
          bg = pct > 0 ? "#ffaa00" : "#ccc";
          border = "1px solid #999";
        }

        return (
          <span
            key={key}
            title={
              isCurrent
                ? `${labelMap[freq]}: ${obj.progressTodayMinutes.toFixed(1)} / ${obj.targetMinutes} min`
                : `${key}: ${status ?? "no data"}`
            }
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: bg,
              border,
              display: "inline-block",
              cursor: "default",
            }}
          />
        );
      })}
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div
      style={{
        width: "100%",
        height: 8,
        background: "#ccc",
        border: "1px inset #999",
        marginTop: 2,
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: pct >= 100 ? "#00aa00" : "#000080",
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}

const EMPTY_FORM = {
  title: "",
  category: "code" as ObjectiveCategory,
  frequency: "daily" as ObjectiveFrequency,
  targetMinutes: 30,
  notifyIntervalMinutes: 10,
  activeDays: [1, 2, 3, 4, 5], // L–V by default
};

export function SettingsObjectives() {
  const { settings } = useSharedState();
  const objectives: Objective[] = settings.objectives ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const titleId = useId();
  const catId = useId();
  const freqId = useId();
  const targetId = useId();
  const intervalId = useId();

  const saveObjectives = (list: Objective[]) => {
    clippyApi.setState("settings.objectives", list);
  };

  const handleAddOrEdit = () => {
    if (!form.title.trim()) return;

    if (editId) {
      const updated = objectives.map((o) =>
        o.id === editId
          ? {
              ...o,
              title: form.title,
              category: form.category,
              frequency: form.frequency,
              targetMinutes: form.targetMinutes,
              notifyIntervalMinutes: form.notifyIntervalMinutes,
              activeDays: form.activeDays,
            }
          : o
      );
      saveObjectives(updated);
      setEditId(null);
    } else {
      const newObj: Objective = {
        id: crypto.randomUUID(),
        title: form.title,
        category: form.category,
        frequency: form.frequency,
        targetMinutes: form.targetMinutes,
        notifyIntervalMinutes: form.notifyIntervalMinutes,
        activeDays: form.activeDays,
        createdAt: Date.now(),
        paused: false,
        progressTodayMinutes: 0,
        lastTrackedTimestamp: Date.now(),
        history: {},
        streak: 0,
      };
      saveObjectives([...objectives, newObj]);
    }

    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleEdit = (obj: Objective) => {
    setForm({
      title: obj.title,
      category: obj.category,
      frequency: obj.frequency ?? "daily",
      targetMinutes: obj.targetMinutes,
      notifyIntervalMinutes: obj.notifyIntervalMinutes,
      activeDays: obj.activeDays,
    });
    setEditId(obj.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    saveObjectives(objectives.filter((o) => o.id !== id));
  };

  const handleTogglePause = (obj: Objective) => {
    saveObjectives(
      objectives.map((o) =>
        o.id === obj.id ? { ...o, paused: !o.paused } : o
      )
    );
  };

  const handleReset = (obj: Objective) => {
    saveObjectives(
      objectives.map((o) =>
        o.id === obj.id
          ? { ...o, progressTodayMinutes: 0, history: {}, streak: 0 }
          : o
      )
    );
  };

  const toggleDay = (day: number) => {
    setForm((prev) => {
      const days = prev.activeDays.includes(day)
        ? prev.activeDays.filter((d) => d !== day)
        : [...prev.activeDays, day];
      return { ...prev, activeDays: days };
    });
  };

  const cancelForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  };

  return (
    <div>
      {/* Header */}
      <fieldset>
        <legend>Daily Objectives</legend>
        <p style={{ margin: "4px 0 8px" }}>
          Track daily challenges. Clippy automatically detects if you're using
          the right app and cheers you on as you progress.
        </p>
        <button onClick={() => { cancelForm(); setShowForm(true); }}>
          ➕ Add objective
        </button>
      </fieldset>

      {/* Form */}
      {showForm && (
        <fieldset style={{ marginTop: 8 }}>
          <legend>{editId ? "Edit objective" : "New objective"}</legend>

          <div className="field-row" style={{ marginBottom: 4 }}>
            <label htmlFor={titleId} style={{ width: 90 }}>Name:</label>
            <input
              id={titleId}
              type="text"
              value={form.title}
              maxLength={50}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>

          <div className="field-row" style={{ marginBottom: 4 }}>
            <label htmlFor={catId} style={{ width: 90 }}>Category:</label>
            <select
              id={catId}
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as ObjectiveCategory })
              }
            >
              {(Object.keys(CATEGORY_LABELS) as ObjectiveCategory[]).map((k) => (
                <option key={k} value={k}>
                  {CATEGORY_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="field-row" style={{ marginBottom: 4 }}>
            <label htmlFor={freqId} style={{ width: 90 }}>Frequency:</label>
            <select
              id={freqId}
              value={form.frequency}
              onChange={(e) =>
                setForm({ ...form, frequency: e.target.value as ObjectiveFrequency })
              }
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="field-row" style={{ marginBottom: 4 }}>
            <label htmlFor={targetId} style={{ width: 90 }}>Goal (min):</label>
            <input
              id={targetId}
              type="number"
              min={1}
              max={480}
              value={form.targetMinutes}
              onChange={(e) =>
                setForm({ ...form, targetMinutes: Math.max(1, parseInt(e.target.value) || 1) })
              }
              style={{ width: 60 }}
            />
          </div>

          <div className="field-row" style={{ marginBottom: 4 }}>
            <label htmlFor={intervalId} style={{ width: 90 }}>Notify every:</label>
            <input
              id={intervalId}
              type="number"
              min={0}
              max={120}
              value={form.notifyIntervalMinutes}
              onChange={(e) =>
                setForm({
                  ...form,
                  notifyIntervalMinutes: Math.max(0, parseInt(e.target.value) || 0),
                })
              }
              style={{ width: 60 }}
            />
            <label style={{ marginLeft: 4 }}>min (0 = milestones only)</label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            <label style={{ fontWeight: "bold" }}>Active days:</label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {DAYS_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  style={{
                    width: 22,
                    height: 22,
                    padding: 0,
                    fontWeight: form.activeDays.includes(i) ? "bold" : "normal",
                    background: form.activeDays.includes(i) ? "#000080" : undefined,
                    color: form.activeDays.includes(i) ? "#fff" : undefined,
                  }}
                  title={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAddOrEdit}>
              {editId ? "Save" : "Create"}
            </button>
            <button onClick={cancelForm}>Cancel</button>
          </div>
        </fieldset>
      )}

      {/* Objectives list */}
      {objectives.length === 0 && (
        <p style={{ color: "#666", fontSize: 11, marginTop: 8 }}>
          No objectives yet. Add one to get started!
        </p>
      )}

      {objectives.map((obj) => {
        const today = todayKey();
        const isCompleted = obj.history[today] === "completed";
        const progressPct = Math.min(100, (obj.progressTodayMinutes / obj.targetMinutes) * 100);

        return (
          <fieldset
            key={obj.id}
            style={{
              marginTop: 8,
              opacity: obj.paused ? 0.65 : 1,
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            <legend
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                maxWidth: "calc(100% - 20px)",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              <span
                style={{
                  textDecoration: isCompleted ? "line-through" : "none",
                  fontWeight: "bold",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={obj.title}
              >
                {isCompleted ? "✅ " : ""}{obj.title}
              </span>
              <span style={{ fontSize: 10, fontWeight: "normal", flexShrink: 0 }}>
                {CATEGORY_LABELS[obj.category]}
              </span>
            </legend>

            {/* Progress row */}
            <div style={{ fontSize: 10, marginBottom: 2, display: "flex", justifyContent: "space-between" }}>
              <span>
                {obj.progressTodayMinutes.toFixed(1)} / {obj.targetMinutes} min today
              </span>
              <span>🔥 Streak: {obj.streak} day{obj.streak !== 1 ? "s" : ""}</span>
            </div>
            <ProgressBar value={obj.progressTodayMinutes} max={obj.targetMinutes} />

            {/* History dots */}
            <div style={{ marginTop: 6, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <DayDots obj={obj} />
            </div>

            {obj.paused && (
              <div style={{ fontSize: 10, color: "#880000", marginBottom: 4 }}>
                ⏸ Paused
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {!isCompleted && (
                <button onClick={() => handleTogglePause(obj)} style={{ fontSize: 10 }}>
                  {obj.paused ? "▶ Resume" : "⏸ Pause"}
                </button>
              )}
              <button onClick={() => handleReset(obj)} style={{ fontSize: 10 }}>
                🔄 Reset
              </button>
              <button onClick={() => handleEdit(obj)} style={{ fontSize: 10 }}>
                ✏️ Edit
              </button>
              <button
                onClick={() => handleDelete(obj.id)}
                style={{ fontSize: 10, color: "#880000" }}
              >
                🗑 Delete
              </button>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
