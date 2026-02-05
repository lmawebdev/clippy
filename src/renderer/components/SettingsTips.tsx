/**
 * SettingsTips - Settings panel for configuring tip bubble behavior
 */

import { useState, useEffect, useRef } from "react";
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

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

export const SettingsTips: React.FC = () => {
  const { settings } = useSharedState();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced city search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=es`,
        );
        const data = await response.json();
        if (data.results) {
          setSearchResults(data.results);
          setShowDropdown(true);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectLocation = (result: GeocodingResult) => {
    const locationName = result.admin1
      ? `${result.name}, ${result.admin1}, ${result.country}`
      : `${result.name}, ${result.country}`;

    clippyApi.setState("settings.weatherLocationName", locationName);
    clippyApi.setState("settings.weatherLatitude", result.latitude);
    clippyApi.setState("settings.weatherLongitude", result.longitude);

    setSearchQuery("");
    setShowDropdown(false);
    setSearchResults([]);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        clippyApi.setState("settings.weatherLatitude", latitude);
        clippyApi.setState("settings.weatherLongitude", longitude);

        // Reverse geocode to get location name
        try {
          const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${latitude.toFixed(2)},${longitude.toFixed(2)}&count=1`,
          );
          const data = await response.json();
          if (data.results?.[0]) {
            const r = data.results[0];
            const name = r.admin1
              ? `${r.name}, ${r.admin1}, ${r.country}`
              : `${r.name}, ${r.country}`;
            clippyApi.setState("settings.weatherLocationName", name);
          } else {
            clippyApi.setState(
              "settings.weatherLocationName",
              `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            );
          }
        } catch {
          clippyApi.setState(
            "settings.weatherLocationName",
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          );
        }
      },
      (error) => {
        alert("No se pudo obtener tu ubicación: " + error.message);
      },
    );
  };

  const onReset = () => {
    const defaultTipSettings: Partial<SettingsState> = {
      tipBubbleEnabled: DEFAULT_SETTINGS.tipBubbleEnabled,
      tipBubbleInterval: DEFAULT_SETTINGS.tipBubbleInterval,
      tipBubbleDuration: DEFAULT_SETTINGS.tipBubbleDuration,
      tipBubbleShowTime: DEFAULT_SETTINGS.tipBubbleShowTime,
      tipBubbleShowSystem: DEFAULT_SETTINGS.tipBubbleShowSystem,
      tipBubbleShowShortcuts: DEFAULT_SETTINGS.tipBubbleShowShortcuts,
      tipBubbleShowGreeting: DEFAULT_SETTINGS.tipBubbleShowGreeting,
      tipBubbleShowProductivity: DEFAULT_SETTINGS.tipBubbleShowProductivity,
      tipBubbleShowWeather: DEFAULT_SETTINGS.tipBubbleShowWeather,
      tipBubbleTimeFormat: DEFAULT_SETTINGS.tipBubbleTimeFormat,
      weatherLocationName: DEFAULT_SETTINGS.weatherLocationName,
      weatherLatitude: DEFAULT_SETTINGS.weatherLatitude,
      weatherLongitude: DEFAULT_SETTINGS.weatherLongitude,
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
        <div className="field-row" style={{ width: 300, marginTop: 10 }}>
          <label htmlFor="tipBubbleDuration" style={{ width: 120 }}>
            Duración: {settings.tipBubbleDuration || 8}s
          </label>
          <input
            type="range"
            id="tipBubbleDuration"
            min={5}
            max={38}
            step={1}
            value={settings.tipBubbleDuration || 8}
            disabled={!settings.tipBubbleEnabled}
            onChange={(event) => {
              clippyApi.setState(
                "settings.tipBubbleDuration",
                parseInt(event.target.value, 10),
              );
            }}
            style={{ flex: 1 }}
          />
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
        <Checkbox
          id="tipBubbleShowWeather"
          label="🌡️ Tiempo meteorológico actual"
          checked={settings.tipBubbleShowWeather}
          disabled={!settings.tipBubbleEnabled}
          onChange={(checked) => {
            clippyApi.setState("settings.tipBubbleShowWeather", checked);
          }}
        />
      </fieldset>

      <fieldset>
        <legend>📍 Ubicación para el Tiempo</legend>
        <div style={{ marginBottom: 8 }}>
          <strong>Actual:</strong> {settings.weatherLocationName}
        </div>
        <div ref={dropdownRef} style={{ position: "relative", width: 280 }}>
          <input
            type="text"
            placeholder="Buscar ciudad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={
              !settings.tipBubbleEnabled || !settings.tipBubbleShowWeather
            }
            style={{ width: "100%" }}
          />
          {isSearching && <span style={{ marginLeft: 8 }}>🔍</span>}
          {showDropdown && searchResults.length > 0 && (
            <ul
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid #000",
                listStyle: "none",
                margin: 0,
                padding: 0,
                maxHeight: 150,
                overflowY: "auto",
                zIndex: 100,
              }}>
              {searchResults.map((result) => (
                <li
                  key={result.id}
                  onClick={() => selectLocation(result)}
                  style={{
                    padding: "6px 8px",
                    cursor: "pointer",
                    borderBottom: "1px solid #ccc",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#e0e0e0")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#fff")
                  }>
                  {result.name}
                  {result.admin1 && `, ${result.admin1}`}, {result.country}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          style={{ marginTop: 8 }}
          onClick={useCurrentLocation}
          disabled={
            !settings.tipBubbleEnabled || !settings.tipBubbleShowWeather
          }>
          📍 Usar mi ubicación actual
        </button>
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
