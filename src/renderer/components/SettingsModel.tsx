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

  return (
    <div>
      {/* Model Control Section */}
      <fieldset style={{ marginBottom: 15, padding: 10 }}>
        <legend>Model Control</legend>
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
          <strong>{isModelLoaded ? "Model loaded" : "Model not loaded"}</strong>
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
        Select the model you want to use for your chat. The larger the model,
        the more powerful the chat, but the slower it will be - and the more
        memory it will use. Clippy uses models in the GGUF format.{" "}
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
