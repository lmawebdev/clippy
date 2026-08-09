import { useState, useId, useEffect } from "react";
import { useSharedState } from "../contexts/SharedStateContext";
import { clippyApi } from "../clippyApi";
import { Reminder, ReminderRepeat } from "../../sharedState";

const DAYS_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const REPEAT_LABELS: Record<ReminderRepeat, string> = {
  none: "Once",
  daily: "Daily",
  weekly: "Weekly",
};

interface RemindersProps {
  onClose: () => void;
}

const EMPTY_FORM = {
  text: "",
  time: "09:00",
  repeat: "daily" as ReminderRepeat,
  days: [1, 2, 3, 4, 5], // Mon-Fri by default
};

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatRepeat(reminder: Reminder): string {
  if (reminder.repeat === "none") return "Once";
  if (reminder.repeat === "daily") return "Daily";
  const days = (reminder.days ?? [])
    .map((d) => DAYS_LABELS[d])
    .join("");
  return days ? `Weekly (${days})` : "Weekly";
}

export function Reminders({ onClose }: RemindersProps) {
  const { settings } = useSharedState();
  const reminders: Reminder[] = settings.reminders ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [now, setNow] = useState(new Date());

  const textId = useId();
  const timeId = useId();
  const repeatId = useId();

  // Live clock for "next fire" display
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const saveReminders = (list: Reminder[]) => {
    clippyApi.setState("settings.reminders", list);
  };

  const handleAddOrEdit = () => {
    if (!form.text.trim()) return;

    if (editId) {
      const updated = reminders.map((r) =>
        r.id === editId
          ? {
              ...r,
              text: form.text,
              time: form.time,
              repeat: form.repeat,
              days: form.repeat === "weekly" ? form.days : [],
              // Reset the fire key so the reminder can fire again after editing
              lastFiredKey: undefined,
            }
          : r
      );
      saveReminders(updated);
      setEditId(null);
    } else {
      const newReminder: Reminder = {
        id: crypto.randomUUID(),
        text: form.text,
        time: form.time,
        repeat: form.repeat,
        days: form.repeat === "weekly" ? form.days : [],
        enabled: true,
        createdAt: Date.now(),
      };
      saveReminders([...reminders, newReminder]);
    }

    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleEdit = (reminder: Reminder) => {
    setForm({
      text: reminder.text,
      time: reminder.time,
      repeat: reminder.repeat,
      days: reminder.days?.length ? reminder.days : [1, 2, 3, 4, 5],
    });
    setEditId(reminder.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    saveReminders(reminders.filter((r) => r.id !== id));
  };

  const handleToggle = (reminder: Reminder) => {
    saveReminders(
      reminders.map((r) =>
        r.id === reminder.id ? { ...r, enabled: !r.enabled } : r
      )
    );
  };

  const toggleDay = (day: number) => {
    setForm((prev) => {
      const days = prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day];
      return { ...prev, days };
    });
  };

  const cancelForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  };

  // Inactivity status
  const inactivityEnabled = settings.inactivityEnabled ?? true;
  const threshold = settings.inactivityThresholdMinutes ?? 30;
  const lastActive = settings.inactivityLastActiveTimestamp ?? Date.now();
  const idleMinutes = Math.max(
    0,
    Math.floor((Date.now() - lastActive) / 60000),
  );

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8, height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <fieldset>
        <legend>⏰ Reminders</legend>
        <p style={{ margin: "4px 0 8px", fontSize: 11 }}>
          Clippy will remind you at the set times with a bubble and an
          animation. Perfect for breaks, meetings or habits.
        </p>
        <div className="field-row" style={{ alignItems: "center" }}>
          <label style={{ width: "auto", marginRight: 8 }}>Enabled:</label>
          <input
            type="checkbox"
            checked={settings.remindersEnabled ?? true}
            onChange={(e) =>
              clippyApi.setState("settings.remindersEnabled", e.target.checked)
            }
          />
          <button
            style={{ marginLeft: "auto" }}
            onClick={() => {
              cancelForm();
              setShowForm(true);
            }}>
            ➕ Add reminder
          </button>
        </div>
      </fieldset>

      {/* Form */}
      {showForm && (
        <fieldset style={{ marginTop: 4 }}>
          <legend>{editId ? "Edit reminder" : "New reminder"}</legend>

          <div className="field-row" style={{ marginBottom: 4 }}>
            <label htmlFor={textId} style={{ width: 90 }}>
              Text:
            </label>
            <input
              id={textId}
              type="text"
              value={form.text}
              maxLength={80}
              placeholder="e.g. Drink water 💧"
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>

          <div className="field-row" style={{ marginBottom: 4 }}>
            <label htmlFor={timeId} style={{ width: 90 }}>
              Time:
            </label>
            <input
              id={timeId}
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>

          <div className="field-row" style={{ marginBottom: 4 }}>
            <label htmlFor={repeatId} style={{ width: 90 }}>
              Repeat:
            </label>
            <select
              id={repeatId}
              value={form.repeat}
              onChange={(e) =>
                setForm({ ...form, repeat: e.target.value as ReminderRepeat })
              }
              style={{ flex: 1 }}>
              <option value="none">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          {form.repeat === "weekly" && (
            <div className="field-row" style={{ marginBottom: 4 }}>
              <label style={{ width: 90 }}>Days:</label>
              <div style={{ display: "flex", gap: 4 }}>
                {DAYS_FULL.map((day, i) => (
                  <button
                    key={day}
                    title={day}
                    onClick={() => toggleDay(i)}
                    style={{
                      width: 26,
                      height: 26,
                      padding: 0,
                      fontWeight: form.days.includes(i) ? "bold" : "normal",
                      background: form.days.includes(i) ? "#000080" : undefined,
                      color: form.days.includes(i) ? "#fff" : undefined,
                    }}>
                    {DAYS_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field-row" style={{ marginTop: 6 }}>
            <button onClick={handleAddOrEdit}>
              {editId ? "Save" : "Add"}
            </button>
            <button onClick={cancelForm}>Cancel</button>
          </div>
        </fieldset>
      )}

      {/* List */}
      {reminders.length === 0 && !showForm ? (
        <div
          style={{
            textAlign: "center",
            color: "#666",
            padding: "20px 0",
            fontSize: 12,
          }}>
          No reminders yet. Add one to let Clippy help you stay on track! 📌
        </div>
      ) : (
        reminders.map((reminder) => (
          <div
            key={reminder.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              border: "1px solid #999",
              background: reminder.enabled ? "#fff" : "#e0e0e0",
              opacity: reminder.enabled ? 1 : 0.6,
            }}>
            <input
              type="checkbox"
              checked={reminder.enabled}
              onChange={() => handleToggle(reminder)}
              title={reminder.enabled ? "Disable" : "Enable"}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: 12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                {reminder.text}
              </div>
              <div style={{ fontSize: 10, color: "#555" }}>
                🕐 {formatTime(reminder.time)} · {formatRepeat(reminder)}
              </div>
            </div>
            <button
              onClick={() => handleEdit(reminder)}
              title="Edit"
              style={{ padding: "2px 6px" }}>
              ✏️
            </button>
            <button
              onClick={() => handleDelete(reminder.id)}
              title="Delete"
              style={{ padding: "2px 6px" }}>
              🗑️
            </button>
          </div>
        ))
      )}

      {/* Inactivity section */}
      <fieldset style={{ marginTop: 4 }}>
        <legend>💤 Inactivity alert</legend>
        <p style={{ margin: "4px 0 8px", fontSize: 11 }}>
          Clippy notices when you've been idle for a while and reminds you to
          take a break or come back.
        </p>
        <div className="field-row" style={{ alignItems: "center" }}>
          <label style={{ width: "auto", marginRight: 8 }}>Enabled:</label>
          <input
            type="checkbox"
            checked={inactivityEnabled}
            onChange={(e) =>
              clippyApi.setState("settings.inactivityEnabled", e.target.checked)
            }
          />
        </div>
        <div className="field-row" style={{ marginTop: 4 }}>
          <label style={{ width: 90 }}>Idle after:</label>
          <select
            value={threshold}
            onChange={(e) =>
              clippyApi.setState(
                "settings.inactivityThresholdMinutes",
                Number(e.target.value),
              )
            }
            style={{ flex: 1 }}>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "#555" }}>
          {idleMinutes >= threshold ? (
            <span style={{ color: "#cc0000", fontWeight: "bold" }}>
              ⚠️ You've been idle for {idleMinutes} min
            </span>
          ) : (
            <span>
              ✅ Active · last activity {idleMinutes} min ago
            </span>
          )}
        </div>
      </fieldset>

      <div style={{ marginTop: "auto", paddingTop: 8 }}>
        <button onClick={onClose} style={{ width: "100%" }}>
          Back to Chat
        </button>
      </div>
    </div>
  );
}