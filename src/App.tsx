import { useEffect, useState, useRef } from "react";

interface ComponentItem {
  name: string;
  reference: string;
  component_type: string;
  value_raw: string;
  value_normalized: number;
  svg_url: string;
}

const RECENT_KEY = "recent_components";

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ComponentItem[]>([]);
  const [recent, setRecent] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);

  /* Load recently used */
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_KEY);
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  /* Fetch components */
  const fetchComponents = async (q: string) => {
    setLoading(true);
    try {
      const url = q ? `/search?q=${encodeURIComponent(q)}` : `/search`;
      const res = await fetch(url);
      const data: ComponentItem[] = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents("");
  }, []);

  /* Debounced search */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      fetchComponents(query.trim());
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  /* Click handler */
  const handleClick = (item: ComponentItem) => {
    const updated = [
      item,
      ...recent.filter((r) => r.reference !== item.reference),
    ].slice(0, 5);

    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    setPreviewSvg(item.svg_url);
  };

  return (
    <div style={{ padding: 32, fontFamily: "Segoe UI, sans-serif" }}>
      {/* Search */}
      <input
        placeholder="Search components (resistor, +5v, ic...)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%",
          padding: 16,
          fontSize: 18,
          marginBottom: 24,
        }}
      />

      {/* 🔥 Recently Used (BOLD FIXED) */}
      <div
        style={{
          background: "#e0f2fe",
          padding: 16,
          borderRadius: 12,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 18,
            marginBottom: 10,
          }}
        >
          🕒 Recently Used
        </div>

        {recent.length === 0 && <p>No recent components</p>}

        {recent.map((item, idx) => (
          <div
            key={idx}
            onClick={() => handleClick(item)}
            style={{
              cursor: "pointer",
              padding: 6,
              fontWeight: 500,
            }}
          >
            {item.name} ({item.component_type} – {item.value_raw})
          </div>
        ))}
      </div>

      {/* Results */}
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
            marginBottom: 14,
            cursor: "pointer",
          }}
        >
          <img
            src={item.svg_url}
            alt={item.name}
            width={48}
            height={48}
            loading="lazy"
            onError={(e) =>
              ((e.currentTarget as HTMLImageElement).style.display = "none")
            }
            style={{
              border: "1px solid #ddd",
              borderRadius: 4,
              background: "#fff",
            }}
          />

          <div>
            <div style={{ fontWeight: 700 }}>{item.name}</div>
            <div style={{ fontSize: 12, color: "#555" }}>
              {item.component_type} – {item.value_raw}
            </div>
            <div style={{ fontSize: 10, color: "#999" }}>
              {item.reference}
            </div>
          </div>
        </div>
      ))}

      {/* Preview Modal */}
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
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
            }}
          >
            <img src={previewSvg} alt="Preview" style={{ width: 400 }} />
          </div>
        </div>
      )}
    </div>
  );
}
