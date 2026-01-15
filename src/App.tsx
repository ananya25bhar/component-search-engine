import { useEffect, useState } from "react";

interface ComponentItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

const COMPONENTS: ComponentItem[] = [
  { id: "1", name: "Resistor 10k", category: "Passive", description: "10k ohm resistor" },
  { id: "2", name: "Capacitor 100uF", category: "Passive", description: "Electrolytic capacitor" },
  { id: "3", name: "ESP32", category: "MCU", description: "WiFi microcontroller" },
  { id: "4", name: "Arduino Uno", category: "MCU", description: "Development board" },
];

const RECENT_KEY = "recent_components";

export default function App() {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<ComponentItem[]>([]);

  // Load Recently Used from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_KEY);
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  // Filter search results
  const results = COMPONENTS.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Handle click → update Recently Used
  const handleClick = (item: ComponentItem) => {
    const filtered = recent.filter(r => r.id !== item.id); // remove duplicate
    const updated = [item, ...filtered].slice(0, 5); // max 5 items
    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  // Styles
  const recentItemStyle = {
    background: "#ffffff",
    padding: "12px 16px",
    marginBottom: 10,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    border: "1px solid #93c5fd",
    boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
  };

  const resultItemStyle = {
    background: "#ffffff",
    padding: 20,
    marginBottom: 16,
    borderRadius: 14,
    cursor: "pointer",
    boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
    fontWeight: 700,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        fontFamily: "Segoe UI, sans-serif",
        padding: 32,
      }}
    >
      {/* SEARCH BOX + RECENTLY USED */}
      <div style={{ maxWidth: 600 }}>
        {/* Search Box */}
        <input
          placeholder="Search components..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: 16,
            fontSize: 20,
            fontWeight: 700,
            borderRadius: 12,
            border: "1px solid #bbb",
            outline: "none",
            marginBottom: 20,
          }}
        />

        {/* Recently Used */}
        <div
          style={{
            background: "#dbeafe",
            padding: 16,
            borderRadius: 12,
            marginBottom: 28,
          }}
        >
          <h4 style={{ marginBottom: 12, fontSize: 18, fontWeight: 700, color: "#1e3a8a" }}>
            🕒 Recently Used
          </h4>

          {recent.length === 0 && (
            <p style={{ fontSize: 15, color: "#1e3a8a", fontWeight: 600 }}>
              No recent components
            </p>
          )}

          {recent.map(item => (
            <div key={item.id} style={recentItemStyle}>
              {item.name}
            </div>
          ))}
        </div>
      </div>

      {/* SEARCH RESULTS */}
      <div style={{ maxWidth: 700 }}>
        <h3 style={{ marginBottom: 14, fontSize: 20, fontWeight: 700, color: "#1f2937" }}>
          Search Results
        </h3>

        {results.length === 0 && (
          <p style={{ color: "#374151", fontWeight: 600, fontSize: 16 }}>
            No components found
          </p>
        )}

        {results.map(item => (
          <div key={item.id} onClick={() => handleClick(item)} style={resultItemStyle}>
            <strong style={{ fontSize: 18 }}>{item.name}</strong>
            {/* Optional: category in subtle grey */}
            <div style={{ fontSize: 14, color: "#9ca3af", fontWeight: 500 }}>
              {item.category}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
