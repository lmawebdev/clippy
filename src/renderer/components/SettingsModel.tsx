import { Column, TableView } from "./TableView";
import { Progress } from "./Progress";
import React, { useState } from "react";
import { useSharedState } from "../contexts/SharedStateContext";
import { clippyApi } from "../clippyApi";
import { prettyDownloadSpeed } from "../helpers/convert-download-speed";
import { ManagedModel } from "../../models";
import { isModelDownloading } from "../../helpers/model-helpers";
import { useChat } from "../contexts/ChatContext";

export const SettingsModel: React.FC = () => {
  const { models, settings } = useSharedState();
  const { isModelLoaded, loadModel, unloadModel } = useChat();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const columns: Array<Column> = [
    { key: "default", header: "Loaded", width: 50 },
    { key: "name", header: "Name" },
    {
      key: "size",
      header: "Size",
      render: (row) => `${row.size.toLocaleString()} MB`,
    },
    { key: "company", header: "Company" },
    { key: "downloaded", header: "Downloaded" },
  ];

  const modelKeys = Object.keys(models || {});
  const data = modelKeys.map((modelKey) => {
    const model = models?.[modelKey as keyof typeof models];

    return {
      default: model?.name === settings.selectedModel ? "ｘ" : "",
      name: model?.name,
      company: model?.company,
      size: model?.size,
      downloaded: model.downloaded ? "Yes" : "No",
    };
  });

  // Variables
  const selectedModel =
    models?.[modelKeys[selectedIndex] as keyof typeof models] || null;
  const isDownloading = isModelDownloading(selectedModel);
  const isDefaultModel = selectedModel?.name === settings.selectedModel;

  // Handlers
  // ---------------------------------------------------------------------------
  const handleRowSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleDownload = async () => {
    if (selectedModel) {
      await clippyApi.downloadModelByName(data[selectedIndex].name);
    }
  };

  const handleDeleteOrRemove = async () => {
    if (selectedModel?.imported) {
      await clippyApi.removeModelByName(selectedModel.name);
    } else if (selectedModel) {
      await clippyApi.deleteModelByName(selectedModel.name);
    }
  };

  const handleMakeDefault = async () => {
    if (selectedModel) {
      clippyApi.setState("settings.selectedModel", selectedModel.name);
    }
  };

  const handleAutoLoadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clippyApi.setState("settings.modelAutoLoad", e.target.checked);
  };

  const handleUseExternalApiChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    clippyApi.setState("settings.useExternalApi", e.target.checked);
    // If enabling external API, unload local model to save resources
    if (e.target.checked && isModelLoaded) {
      unloadModel();
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    clippyApi.setState("settings.externalApiProvider", provider);

    // Set default model ID based on provider
    let defaultModelId = "";
    switch (provider) {
      case "openai":
        defaultModelId = "gpt-4o";
        break;
      case "anthropic":
        defaultModelId = "claude-3-5-sonnet-20240620";
        break;
      case "gemini":
        defaultModelId = "gemini-1.5-pro";
        break;
      case "perplexity":
        defaultModelId = "llama-3.1-sonar-large-128k-online";
        break;
      case "openrouter":
        defaultModelId = "anthropic/claude-3-opus";
        break;
      case "grok":
        defaultModelId = "grok-beta";
        break;
    }
    if (defaultModelId) {
      clippyApi.setState("settings.externalModelId", defaultModelId);
    }
  };

  return (
    <div>
      {/* Mode Switch */}
      <div
        style={{
          marginBottom: 20,
          padding: 10,
          borderBottom: "1px solid #ccc",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <input
            type="checkbox"
            id="useExternalApi"
            checked={!!settings.useExternalApi}
            onChange={handleUseExternalApiChange}
          />
          <label htmlFor="useExternalApi">
            <strong>Use External API (Cloud)</strong>
          </label>
        </div>
        <p
          style={{
            fontSize: "0.9em",
            color: "#666",
            marginTop: 5,
            marginLeft: 20,
          }}>
          Switch between using a local GGUF model (offline, private, high RAM)
          and an external API (online, requires key).
        </p>
      </div>

      {/* External API Settings */}
      {settings.useExternalApi && (
        <fieldset style={{ marginBottom: 15, padding: 10 }}>
          <legend>External API Configuration</legend>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label htmlFor="apiProvider">Provider:</label>
              <select
                id="apiProvider"
                value={settings.externalApiProvider || "openai"}
                onChange={handleProviderChange}
                style={{ padding: 5 }}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="gemini">Google Gemini</option>
                <option value="perplexity">Perplexity</option>
                <option value="openrouter">OpenRouter</option>
                <option value="grok">Grok (xAI)</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label htmlFor="apiKey">API Key:</label>
              <input
                type="password"
                id="apiKey"
                value={settings.externalApiKey || ""}
                onChange={(e) =>
                  clippyApi.setState("settings.externalApiKey", e.target.value)
                }
                placeholder="sk-..."
                style={{ padding: 5 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label htmlFor="modelId">Model ID (URL or Name):</label>
              <input
                type="text"
                id="modelId"
                value={settings.externalModelId || ""}
                onChange={(e) =>
                  clippyApi.setState("settings.externalModelId", e.target.value)
                }
                placeholder="gpt-4o"
                style={{ padding: 5 }}
              />
              <small style={{ color: "#666" }}>
                The specific model identifier (e.g., gpt-4o,
                claude-3-opus-20240229).
              </small>
            </div>
          </div>
        </fieldset>
      )}

      {/* Local Model Settings - Only show if External API is disabled */}
      {!settings.useExternalApi && (
        <>
          <fieldset style={{ marginBottom: 15, padding: 10 }}>
            <legend>Local Model Control</legend>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 15,
                marginBottom: 10,
              }}>
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: isModelLoaded ? "#00aa00" : "#aa0000",
                  marginRight: 5,
                }}></span>
              <strong>
                {isModelLoaded ? "Model loaded" : "Model not loaded"}
              </strong>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <button
                onClick={() => loadModel()}
                disabled={isModelLoaded || !settings.selectedModel}>
                Load Model
              </button>
              <button onClick={() => unloadModel()} disabled={!isModelLoaded}>
                Unload Model
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input
                type="checkbox"
                id="autoLoadModel"
                checked={settings.modelAutoLoad}
                onChange={handleAutoLoadChange}
              />
              <label htmlFor="autoLoadModel">Auto-load model on startup</label>
            </div>
          </fieldset>

          <p>
            Select the model you want to use for your chat. The larger the
            model, the more powerful the chat, but the slower it will be - and
            the more memory it will use. Clippy uses models in the GGUF format.{" "}
            <a
              href="https://github.com/felixrieseberg/clippy?tab=readme-ov-file#downloading-more-models"
              target="_blank">
              More information.
            </a>
          </p>

          <button
            style={{ marginBottom: 10 }}
            onClick={() => clippyApi.addModelFromFile()}>
            Add model from file
          </button>
          <TableView
            columns={columns}
            data={data}
            onRowSelect={handleRowSelect}
            initialSelectedIndex={selectedIndex}
          />

          {selectedModel && (
            <div
              className="model-details sunken-panel"
              style={{ marginTop: "20px", padding: "15px" }}>
              <strong>{selectedModel.name}</strong>

              {selectedModel.description && <p>{selectedModel.description}</p>}

              {selectedModel.homepage && (
                <p>
                  <a
                    href={selectedModel.homepage}
                    target="_blank"
                    rel="noopener noreferrer">
                    Visit Homepage
                  </a>
                </p>
              )}

              <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                {!selectedModel.downloaded ? (
                  <button disabled={isDownloading} onClick={handleDownload}>
                    Download Model
                  </button>
                ) : (
                  <>
                    <button
                      disabled={isDownloading || isDefaultModel}
                      onClick={handleMakeDefault}>
                      {isDefaultModel
                        ? "Clippy uses this model"
                        : "Make Clippy use this model"}
                    </button>
                    <button onClick={handleDeleteOrRemove}>
                      {selectedModel?.imported ? "Remove" : "Delete"} Model
                    </button>
                  </>
                )}
              </div>
              <SettingsModelDownload model={selectedModel} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const SettingsModelDownload: React.FC<{
  model?: ManagedModel;
}> = ({ model }) => {
  if (!model || !isModelDownloading(model)) {
    return null;
  }

  const downloadSpeed = prettyDownloadSpeed(
    model?.downloadState?.currentBytesPerSecond || 0,
  );

  return (
    <div style={{ marginTop: "15px" }}>
      <p>
        Downloading {model.name}... ({downloadSpeed}/s)
      </p>
      <Progress progress={model.downloadState?.percentComplete || 0} />
    </div>
  );
};
