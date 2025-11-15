// src/components/AIToolsLayout.js
import React, { useState } from "react";
import ToolSelectorDropdown from "./ToolSelectorDropdown";
import TextureTool from "./tools/TextureTool";
import VoiceTool from "./tools/VoiceTool";
import ActionTool from "./tools/ActionTool";
import ChatTool from "./tools/ChatTool";
import LightingTool from "./tools/LightingTool";
import AssetLibraryTool from "./tools/AssetLibraryTool";
import MaskingTool from "./tools/MaskingTool";
import CompositingTool from "./tools/CompositingTool";
import MotionTrackingTool from "./tools/MotionTrackingTool";
import ImageGenerator from "./tools/ImageGenerator";
import "assets/styles/components/AIToolsLayout.css";

const toolsMap = {
  texture: { name: "Texture Generation", component: TextureTool },
  voice: { name: "AI Voice", component: VoiceTool },
  action: { name: "Action Generation", component: ActionTool },
  chat: { name: "AI Chat", component: ChatTool },
  lighting: { name: "Lighting & Environment", component: LightingTool },
  assets: { name: "Asset Library", component: AssetLibraryTool },
  masking: { name: "Masking", component: MaskingTool },
  compositing: { name: "Compositing", component: CompositingTool },
  motion: { name: "Motion Tracking", component: MotionTrackingTool },
  ImageGenerator: { name: "ImageGenerator", component: ImageGenerator },
};

const AIToolsLayout = () => {
  const [activeToolKey, setActiveToolKey] = useState("ImageGenerator");
  const [gapMode, setGapMode] = useState(true);

  const ActiveComponent = toolsMap[activeToolKey].component;

  return (
    <div className="layout-container">
      {/* Top Navbar */}
      <div className="top-navbar">
        <ToolSelectorDropdown
          tools={Object.entries(toolsMap).map(([key, value]) => ({
            key,
            name: value.name,
          }))}
          activeKey={activeToolKey}
          onSelect={setActiveToolKey}
        />

        <div className="button-group">
          <button className="blue-button">Downloaded</button>
          <button className="yellow-button">Linked / Work Later</button>
          <button className="gray-button" onClick={() => setGapMode((prev) => !prev)}>
            {gapMode ? "Compact View" : "Spaced View"}
          </button>
        </div>
      </div>

      {/* Working Area */}
      <div className={`workspace ${gapMode ? "gap-mode" : ""}`}>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default AIToolsLayout;
