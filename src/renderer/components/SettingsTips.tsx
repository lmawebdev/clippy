/**
 * SettingsTips - Settings panel for configuring tip bubble behavior
 */

import {
  DEFAULT_SETTINGS,
  SettingsState,
  TipInterval,
} from "../../sharedState";
import { clippyApi } from "../clippyApi";
import { useSharedState } from "../contexts/SharedStateContext";
import { Checkbox } from "./Checkbox";

const INTERVAL_OPTIONS: { value: TipInterval; label: string }[] = [
  { value: "1m", label: "Cada 1 minuto" },
  { value: "5m", label: "Cada 5 minutos" },
  { value: "10m", label: "Cada 10 minutos" },
  { value: "30m", label: "Cada 30 minutos" },
  { value: "1h", label: "Cada hora" },
  { value: "silent", label: "Silenciado" },
];

const TIME_FORMAT_OPTIONS: { value: "12h" | "24h"; label: string }[] = [
  { value: "12h", label: "12 horas (AM/PM)" },
  { value: "24h", label: "24 horas" },
];

export const SettingsTips: React.FC = () => {
  const { settings } = useSharedState();

  const onReset = () => {
    const defaultTipSettings: Partial<SettingsState> = {
      tipBubbleEnabled: DEFAULT_SETTINGS.tipBubbleEnabled,
      tipBubbleInterval: DEFAULT_SETTINGS.tipBubbleInterval,
      tipBubbleShowTime: DEFAULT_SETTINGS.tipBubbleShowTime,
      tipBubbleShowSystem: DEFAULT_SETTINGS.tipBubbleShowSystem,
      tipBubbleShowShortcuts: DEFAULT_SETTINGS.tipBubbleShowShortcuts,
      tipBubbleShowGreeting: DEFAULT_SETTINGS.tipBubbleShowGreeting,
      tipBubbleShowProductivity: DEFAULT_SETTINGS.tipBubbleShowProductivity,
      tipBubbleTimeFormat: DEFAULT_SETTINGS.tipBubbleTimeFormat,
    };

    for (const key in defaultTipSettings) {
      clippyApi.setState(
        `settings.${key}`,
        defaultTipSettings[key as keyof typeof defaultTipSettings],
      );
    }
  };

  return (
    <div>
      <fieldset>
        <legend>Burbuja de Tips</legend>
        <Checkbox
          id="tipBubbleEnabled"
          label="Mostrar tips del asistente"
          checked={settings.tipBubbleEnabled}
          onChange={(checked) => {
            clippyApi.setState("settings.tipBubbleEnabled", checked);
          }}
        />
        <div className="field-row" style={{ width: 300, marginTop: 10 }}>
          <label htmlFor="tipBubbleInterval" style={{ width: 120 }}>
            Frecuencia:
          </label>
          <select
            id="tipBubbleInterval"
            value={settings.tipBubbleInterval}
            disabled={!settings.tipBubbleEnabled}
            onChange={(event) => {
              clippyApi.setState(
                "settings.tipBubbleInterval",
                event.target.value,
              );
            }}>
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend>Tipos de Tips</legend>
        <Checkbox
          id="tipBubbleShowGreeting"
          label="🌤️ Saludos según la hora del día"
          checked={settings.tipBubbleShowGreeting}
          disabled={!settings.tipBubbleEnabled}
          onChange={(checked) => {
            clippyApi.setState("settings.tipBubbleShowGreeting", checked);
          }}
        />
        <Checkbox
          id="tipBubbleShowTime"
          label="🕐 Hora y fecha actual"
          checked={settings.tipBubbleShowTime}
          disabled={!settings.tipBubbleEnabled}
          onChange={(checked) => {
            clippyApi.setState("settings.tipBubbleShowTime", checked);
          }}
        />
        <Checkbox
          id="tipBubbleShowSystem"
          label="💻 Información del sistema (CPU, RAM, Disco)"
          checked={settings.tipBubbleShowSystem}
          disabled={!settings.tipBubbleEnabled}
          onChange={(checked) => {
            clippyApi.setState("settings.tipBubbleShowSystem", checked);
          }}
        />
        <Checkbox
          id="tipBubbleShowShortcuts"
          label="⌨️ Atajos de teclado"
          checked={settings.tipBubbleShowShortcuts}
          disabled={!settings.tipBubbleEnabled}
          onChange={(checked) => {
            clippyApi.setState("settings.tipBubbleShowShortcuts", checked);
          }}
        />
        <Checkbox
          id="tipBubbleShowProductivity"
          label="💡 Consejos de productividad"
          checked={settings.tipBubbleShowProductivity}
          disabled={!settings.tipBubbleEnabled}
          onChange={(checked) => {
            clippyApi.setState("settings.tipBubbleShowProductivity", checked);
          }}
        />
      </fieldset>

      <fieldset>
        <legend>Formato de Hora</legend>
        <div className="field-row" style={{ width: 300 }}>
          <label htmlFor="tipBubbleTimeFormat" style={{ width: 100 }}>
            Formato:
          </label>
          <select
            id="tipBubbleTimeFormat"
            value={settings.tipBubbleTimeFormat}
            disabled={!settings.tipBubbleEnabled}
            onChange={(event) => {
              clippyApi.setState(
                "settings.tipBubbleTimeFormat",
                event.target.value,
              );
            }}>
            {TIME_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <button style={{ marginTop: 10 }} onClick={onReset}>
        Restaurar valores por defecto
      </button>
    </div>
  );
};
