import { useEffect, useState } from "react";

interface ComponentItem {
  name: string;
  reference: string;
  component_type: string;
  value_raw: string;
  value_normalized: number;
  svg_path: string;
}

const RECENT_KEY = "recent_components";
const BACKEND_URL = "http://localhost:3000"; // must match backend

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ComponentItem[]>([]);
  const [recent, setRecent] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);

  // Load recently used
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_KEY);
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  // =========================
  // Build safe SVG URL
  // =========================
  const getSvgUrl = (filename: string) => {
    if (!filename) return "";
    // Encode the filename to handle +, spaces, etc.
    return `${BACKEND_URL}/svgs/${encodeURIComponent(filename)}`;
  };

  // =========================
  // Fetch components (all or filtered)
  // =========================
  const fetchComponents = async (q: string) => {
    setLoading(true);
    try {
      const url = `${BACKEND_URL}/search${q ? `?q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Failed to fetch components:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Load all components on page load
  useEffect(() => {
    fetchComponents("");
  }, []);

  // Search instantly as user types
  useEffect(() => {
    fetchComponents(query.trim());
  }, [query]);

  // Handle component click
  const handleClick = (item: ComponentItem) => {
    const updated = [item, ...recent.filter(r => r.name !== item.name)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    setPreviewSvg(getSvgUrl(item.svg_path));
  };

  return (
    <div style={{ padding: 32, fontFamily: "Segoe UI, sans-serif", minHeight: "100vh" }}>
      {/* Search input */}
      <input
        placeholder="Search components (+12v, +3.3va...)"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: "100%", padding: 16, fontSize: 18, marginBottom: 20 }}
      />

      {/* Recently Used */}
      <div style={{ background: "#dbeafe", padding: 16, borderRadius: 12, marginBottom: 28 }}>
        <h4>🕒 Recently Used</h4>
        {recent.length === 0 && <p>No recent components</p>}
        {recent.map((item, idx) => (
          <div key={idx} onClick={() => handleClick(item)} style={{ padding: 8, cursor: "pointer" }}>
            {item.name} ({item.component_type} – {item.value_raw})
          </div>
        ))}
      </div>

      {/* Search Results */}
      <div>
        <h3>Search Results</h3>
        {loading && <p>Loading…</p>}
        {!loading && results.length === 0 && <p>No components found</p>}
        {results.map((item, idx) => (
          <div
            key={idx}
            onClick={() => handleClick(item)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
              cursor: "pointer",
            }}
          >
            <img
              src={getSvgUrl(item.svg_path)}
              alt={item.name}
              style={{ width: 48, height: 48, border: "1px solid #ddd", borderRadius: 4, padding: 2 }}
            />
            <div>
              <div style={{ fontWeight: 700 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: "#555" }}>
                {item.component_type} – {item.value_raw}
              </div>
              <div style={{ fontSize: 10, color: "#999" }}>{item.reference}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SVG Preview */}
      {previewSvg && (
        <div
          onClick={() => setPreviewSvg(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", padding: 24, borderRadius: 12 }}
          >
            <img src={previewSvg} style={{ width: 400 }} />
          </div>
        </div>
      )}
    </div>
  );
}
