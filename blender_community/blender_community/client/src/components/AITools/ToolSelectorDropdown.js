import React, { useState, useRef, useEffect } from "react";
import { Menu } from "lucide-react";
import "assets/styles/components/ToolSelectorDropdown.css";

const ToolSelectorDropdown = ({ tools, activeKey, onSelect }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeTool = tools.find((tool) => tool.key === activeKey)?.name || "Select Tool";

  // 🔻 Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={dropdownRef} className="tool-selector-dropdown">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="tool-selector-button"
      >
        <Menu className="w-5 h-5" />
        <span className="text-sm">{activeTool}</span>
      </button>

      {open && (
        <div className="tool-selector-menu">
          {tools.map((tool) => (
            <button
              key={tool.key}
              onClick={() => {
                onSelect(tool.key);
                setOpen(false);
              }}
              className={`${
                tool.key === activeKey ? "active" : ""
              }`}
            >
              {tool.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToolSelectorDropdown;
