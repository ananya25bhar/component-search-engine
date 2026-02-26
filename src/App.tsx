import { useEffect, useState } from "react";

interface SymbolItem {
  id: number;
  symbol_name: string;
  svg_url: string;

  name?: string;
  company?: string;
  category?: string;
  device_type?: string;
  voltage_rating?: number;
  current_rating?: number;
  power_rating?: number;
  package?: string;
  pin_count?: number;
  mount_type?: string;
  datasheet?: string;
  simulation_available?: boolean;
  simulation_parameters?: Record<string, any>;
  tags?: string[];
}

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolItem[]>([]);
  const [selected, setSelected] = useState<SymbolItem | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setResults(data) : setResults([]))
      .catch(err => {
        console.error("Fetch error:", err);
        setResults([]);
      });
  }, [query]);

  return (
    <div style={{ fontFamily: "Inter, Arial", background: "#0b0f1a", color: "#e5e7eb", minHeight: "100vh" }}>
      {/* HEADER */}
      <div style={{ background: "#0a0d16", padding: "16px 28px", fontSize: 22, fontWeight: 600, borderBottom: "1px solid #1e293b", color: "#f8fafc" }}>
        Component Search
      </div>

      {/* SEARCH */}
      <div style={{ padding: 30, textAlign: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search electronic components…"
          style={{
            width: "70%",
            padding: 14,
            fontSize: 15,
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#0a0d16",
            color: "#e5e7eb",
            outline: "none"
          }}
        />
      </div>

      {/* GRID: 5 thumbnails per row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 20,
        padding: "0 30px 40px"
      }}>
        {results.map(item => (
          <div
            key={item.id}
            onClick={() => setSelected(item)}
            style={{
              background: "#0a0d16",
              padding: 16,
              borderRadius: 12,
              border: "1px solid #1e293b",
              cursor: "pointer",
              transition: "0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <img
              src={item.svg_url}
              alt={item.symbol_name}
              onError={e => e.currentTarget.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>"}
              style={{
                width: "100%",
                height: 140,
                objectFit: "contain",
                background: "#0b1220",
                borderRadius: 6
              }}
            />
            <div style={{
              marginTop: 10,
              fontWeight: 600,
              fontSize: 14,
              textAlign: "center",
              color: "#f8fafc",
              wordBreak: "break-word"
            }}>
              {item.symbol_name}
            </div>
          </div>
        ))}
      </div>

      {/* POPUP */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.85)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0a0d16",
              width: "60%",
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: 14,
              padding: 28,
              border: "1px solid #1e293b",
              color: "#e5e7eb"
            }}
          >
            <h2 style={{ marginBottom: 20 }}>
              {selected.name || selected.symbol_name}
            </h2>

            <img
              src={selected.svg_url}
              alt={selected.symbol_name}
              style={{
                maxWidth: "40%",
                display: "block",
                margin: "0 auto 24px",
                background: "#ebedf3",
                borderRadius: 8
              }}
            />

            <p><b>Company:</b> {selected.company || "-"}</p>
            <p><b>Category:</b> {selected.category || "-"}</p>
            <p><b>Device Type:</b> {selected.device_type || "-"}</p>
            <p><b>Package:</b> {selected.package || "-"}</p>
            <p><b>Pin Count:</b> {selected.pin_count ?? 0}</p>
            <p><b>Mount Type:</b> {selected.mount_type || "-"}</p>
            <p><b>Voltage Rating:</b> {selected.voltage_rating ?? 0} V</p>
            <p><b>Current Rating:</b> {selected.current_rating ?? 0} A</p>
            <p><b>Power Rating:</b> {selected.power_rating ?? 0} W</p>

            {selected.tags && selected.tags.length > 0 && (
              <p><b>Tags:</b> {selected.tags.join(", ")}</p>
            )}

            {selected.datasheet && (
              <p>
                <b>Datasheet:</b>{" "}
                <a href={selected.datasheet} target="_blank" style={{ color: "#38bdf8" }}>
                  Open
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}