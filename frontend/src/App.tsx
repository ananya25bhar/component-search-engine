import { useEffect, useState } from "react";

interface SymbolItem {
  id: number | string;
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
  contents?: string;
  license?: string;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolItem[]>([]);
  const [selected, setSelected] = useState<SymbolItem | null>(null);
  const [recent, setRecent] = useState<SymbolItem[]>([]);

  const [license, setLicense] = useState("");
  const [showLicense, setShowLicense] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("recently-viewed");
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const withLicense = data.map(item => ({
            ...item,
            license: item.license || "Open / Generic",
          }));
          setResults(withLicense);
        } else setResults([]);
      })
      .catch(() => setResults([]));
  }, [query]);

  useEffect(() => {
    fetch("http://localhost:3000/api/license")
      .then(res => res.json())
      .then(data => setLicense(data.license || "License could not be loaded."))
      .catch(() => setLicense("License could not be loaded."));
  }, []);

  const saveRecent = (item: SymbolItem) => {
    const updated = [item, ...recent.filter(r => r.id !== item.id)].slice(0, 6);
    setRecent(updated);
    localStorage.setItem("recently-viewed", JSON.stringify(updated));
  };

  const renderValue = (value: any, unit = "") =>
    value === null || value === undefined || value === "" ? "-" : `${value}${unit}`;

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    transition: "all 0.25s ease",
    position: "relative",
    overflow: "hidden",
  };

  const headingStyle: React.CSSProperties = {
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: 20,
    fontWeight: 700,
    color: "#000",
    background: "#fff",
    border: "1px solid #e5e7eb",
    display: "inline-block",
  };

  const licenseBadgeStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 8,
    left: 8,
    background: "#232f3e",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  };

  return (
    <div style={{ fontFamily: "Inter, Arial", background: "#f7f8fa", minHeight: "100vh" }}>
      
      {/* Header */}
      <div
        style={{
          background: "#232f3e",
          padding: "16px 28px",
          fontSize: 22,
          fontWeight: 600,
          color: "#f4ebeb",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>Component Search Engine</div>

        
      </div>

      {/* Search */}
      <div style={{ padding: 30, textAlign: "center" }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search electronic components…"
          style={{
            width: "70%",
            padding: 14,
            fontSize: 15,
            borderRadius: 8,
            border: "1px solid #f0f2f6",
          }}
        />
      </div>

      {/* Recently Viewed */}
      {recent.length > 0 && (
        <div style={{ padding: "0 30px 30px" }}>
          <div style={headingStyle}>Recently Viewed</div>

          <div style={{ display: "flex", gap: 16, marginTop: 16, overflowX: "auto" }}>
            {recent.map(item => (
              <div key={item.id} style={cardStyle} onClick={() => setSelected(item)}>
                <img
                  src={item.svg_url}
                  alt={item.symbol_name}
                  style={{ width: "100%", height: 90, objectFit: "contain", background: "#edf0f4" }}
                />

                {item.license && <div style={licenseBadgeStyle}>{item.license}</div>}

                <div style={{ marginTop: 8, fontWeight: 600, textAlign: "center", color: "#000" }}>
                  {item.company || item.symbol_name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div style={{ padding: "0 30px 16px" }}>
          <div style={headingStyle}>Search Results</div>
        </div>
      )}

      <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 20,
    padding: "0 30px 40px",
    width: "100%",
  }}
>
        {results.map(item => (
          <div
            key={item.id}
            style={cardStyle}
            onClick={() => {
              setSelected(item);
              saveRecent(item);
            }}
          >
            <img
              src={item.svg_url}
              alt={item.symbol_name}
              style={{ width: "100%", height: 140, objectFit: "contain", background: "#f1f3f5" }}
            />

            {item.license && <div style={licenseBadgeStyle}>{item.license}</div>}

            <div style={{ marginTop: 10, fontWeight: 600, textAlign: "center", color: "#000" }}>
              {item.company || item.symbol_name}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Component FULL SCREEN */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "#f5f0f0",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            
            {/* Header with Close only */}
            <div
              style={{
                padding: "14px 24px",
                borderBottom: "1px solid #2f4676",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button onClick={() => setSelected(null)}>Close</button>
            </div>

            <div style={{ flex: 1, display: "flex", gap: 30, padding: 30, overflowY: "auto" }}>
              
              {/* Image */}
              <div style={{ flex: "0 0 35%", textAlign: "center" }}>
                <img
                  src={selected.svg_url}
                  alt={selected.symbol_name}
                  style={{
                    width: "100%",
                    maxHeight: "80vh",
                    objectFit: "contain",
                    background: "#e8ecef",
                  }}
                />
              </div>

              {/* Details */}
              <div style={{ flex: 1, color: "#000" }}>
                <p><b>ID:</b> {renderValue(selected.id)}</p>
                <p><b>Symbol Name:</b> {renderValue(selected.symbol_name)}</p>
                <p><b>Company:</b> {renderValue(selected.company)}</p>
                <p><b>Category:</b> {renderValue(selected.category)}</p>
                <p><b>Device Type:</b> {renderValue(selected.device_type)}</p>
                <p><b>Package:</b> {renderValue(selected.package)}</p>
                <p><b>Pin Count:</b> {renderValue(selected.pin_count)}</p>
                <p><b>Mount Type:</b> {renderValue(selected.mount_type)}</p>
                <p><b>Voltage Rating:</b> {renderValue(selected.voltage_rating, " V")}</p>
                <p><b>Current Rating:</b> {renderValue(selected.current_rating, " A")}</p>
                <p><b>Power Rating:</b> {renderValue(selected.power_rating, " W")}</p>
                <p><b>Simulation Available:</b> {selected.simulation_available ? "Yes" : "No"}</p>
                <p><b>Tags:</b> {selected.tags && selected.tags.length > 0 ? selected.tags.join(", ") : "-"}</p>

                <p>
                  <b>Datasheet:</b>{" "}
                  <a
                    href={
                      selected.datasheet && selected.datasheet.trim() !== ""
                        ? selected.datasheet
                        : `https://www.alldatasheet.com/view.jsp?Searchword=${selected.symbol_name}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Datasheet
                  </a>
                </p>

                <p><b>License:</b> {renderValue(selected.license)}</p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Global License Modal */}
      {showLicense && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#ffffff",
            zIndex: 300,
            padding: 40,
            overflowY: "auto",
          }}
        >
          <button onClick={() => setShowLicense(false)} style={{ marginBottom: 20 }}>
            Close
          </button>

          

          <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{license}</pre>
        </div>
      )}

    </div>
  );
}