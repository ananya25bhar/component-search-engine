import { useEffect, useState } from "react";

export default function ComponentSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    fetch(`http://localhost:3000/search?q=${query}`)
      .then((res) => res.json())
      .then((data) => setResults(data));
  }, [query]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Component Search</h2>

      <input
        type="text"
        placeholder="Search resistor, capacitor, ic..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: 8, width: 300 }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          gap: 12,
          marginTop: 20,
        }}
      >
        {results.map((c) => (
          <div
            key={c.reference}
            style={{
              border: "1px solid #ddd",
              padding: 10,
              textAlign: "center",
            }}
          >
            <img
              src={`http://localhost:3000${c.svg_url}`}
              alt={c.reference}
              width={60}
              height={60}
            />
            <div>{c.reference}</div>
            <small>{c.component_type}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
