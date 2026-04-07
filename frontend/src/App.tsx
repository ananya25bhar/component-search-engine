import { useEffect, useState } from "react";

interface SymbolItem {
  id: number | string;
  symbol_name: string;
  svg_url: string;
  png_url?: string;
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
  tags?: string[];
  license?: string;
  _uid?: string;
  _time?: number;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolItem[]>([]);
  const [selected, setSelected] = useState<SymbolItem | null>(null);
  const [recent, setRecent] = useState<SymbolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const isHome = !hasSearched;

  const getUniqueId = (item: SymbolItem) =>
    (item.id ?? "") + "_" + item.symbol_name + "_" + item.svg_url;

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark";
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem("recently-viewed");
    if (saved) {
      try {
        setRecent(JSON.parse(saved));
      } catch {
        setRecent([]);
      }
    }
  }, []);

  const fetchResults = () => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    setHasSearched(true);
    setLoading(true);

    fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(trimmed)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setResults(data);
        else setResults([]);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  const saveRecent = (item: SymbolItem) => {
    const uid = getUniqueId(item);
    const newItem = { ...item, _uid: uid, _time: Date.now() };

    setRecent((prev) => {
      const filtered = prev.filter((r) => r._uid !== uid);
      const updated = [newItem, ...filtered].slice(0, 6);
      localStorage.setItem("recently-viewed", JSON.stringify(updated));
      return updated;
    });
  };

  const removeRecent = (uid: string) => {
    setRecent((prev) => {
      const updated = prev.filter((item) => item._uid !== uid);
      localStorage.setItem("recently-viewed", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === "light" ? "bg-gray-200 text-black" : "bg-[#0f172a] text-white"
      }`}
    >
      {/* HOME */}
      {isHome ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <h1 className="text-4xl font-bold mb-6">
            <span>Component</span>
            <span className="text-yellow-400">Search</span>
          </h1>

          <div className="w-full max-w-2xl">
            <div className="flex border-2 border-yellow-400 rounded-full overflow-hidden bg-white">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchResults()}
                placeholder="Search components..."
                className="flex-1 px-5 py-3 outline-none"
              />
             <span
                  onClick={fetchResults}
                  className="px-5 text-gray-700 hover:text-black text-lg flex items-center cursor-pointer "
                >
                  🔍
                </span>
                
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* NAVBAR */}
          <div className="bg-[#131921] text-white px-4 py-2 flex items-center gap-4">
            <h1 className="text-lg font-bold">
              Component<span className="text-yellow-400">Search</span>
            </h1>

            {/* SEARCH SECTION */}
            <div className="relative flex flex-1 max-w-3xl">
              <div className="flex w-full border-2 border-yellow-400 rounded-md bg-white">
                {/* INPUT  */}
                <div className="relative flex-1">
                  <input
                    value={query}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchResults()}
                    placeholder="Search components..."
                    className="w-full px-3 py-2 pr-12 text-black outline-none"
                  />

                  {query && (
                    <span
                      onClick={() => {
                        setQuery("");
                        setResults([]);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 
             text-black text-2xl font-bold cursor-pointer
             opacity-100 z-10
             hover:text-black-600"
                    >
                      ×
                    </span>
                  )}
                </div>

                {/* SEARCH ICON  */}
                <span
                  onClick={fetchResults}
                  className="px-2 text-gray-700 hover:text-black text-lg flex items-center"
                >
                  🔍
                </span>
              </div>

              {/* DROPDOWN  */}
              {showDropdown && recent.length > 0 && !query && (
                <div className="absolute top-full left-0 w-full bg-white shadow-lg rounded-md mt-1 z-50 border max-h-72 overflow-y-auto">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 border-b">
                    Recently Viewed
                  </div>

                  {recent.map((item) => (
                    <div
                      key={item._uid}
                      className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div
                        className="flex items-center gap-2 flex-1"
                        onClick={() => {
                          saveRecent(item);
                          setSelected(item);
                          setShowDropdown(false);
                        }}
                      >
                        <img
                          src={item.png_url || item.svg_url}
                          className="w-9 h-9 object-contain bg-gray-50 rounded p-1"
                        />
                        <span className="text-sm text-black">
                          {item.symbol_name}
                        </span>
                      </div>

                      <button
                        onMouseDown={(e) => e.preventDefault()} //prevents dropdown closing
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecent(item._uid!);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "black",
                          fontSize: "18px",
                          fontWeight: "bold",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT SIDE */}
            <div className="ml-auto flex items-center gap-3">
              {/* VIEW TOGGLE */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded ${
                    viewMode === "grid"
                      ? "text-yellow-400"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <div className="grid grid-cols-2 gap-[2px]">
                    <span className="w-2 h-2 bg-current"></span>
                    <span className="w-2 h-2 bg-current"></span>
                    <span className="w-2 h-2 bg-current"></span>
                    <span className="w-2 h-2 bg-current"></span>
                  </div>
                </button>

                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded ${
                    viewMode === "list"
                      ? "text-yellow-400"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <div className="flex flex-col gap-[3px]">
                    <span className="w-4 h-[2px] bg-current"></span>
                    <span className="w-4 h-[2px] bg-current"></span>
                    <span className="w-4 h-[2px] bg-current"></span>
                  </div>
                </button>
              </div>

              {/* THEME BUTTON */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="px-3 py-1 rounded bg-black text-white"
              >
                {theme === "dark" ? "🌞 Light" : "🌙 Dark"}
              </button>
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="text-center py-4 font-bold">Loading...</div>
          )}

          {/* RESULTS  */}
          {results.length > 0 && (
            <div className="px-4 py-4">
              <h2 className="font-bold mb-2">Search Results</h2>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {results.map((item) => (
                    <div
                      key={getUniqueId(item)}
                      onClick={() => {
                        saveRecent(item);
                        setSelected(item);
                      }}
                      className={`border p-2 cursor-pointer hover:shadow-md rounded ${
                        theme === "light" ? "bg-white" : "bg-[#1e293b]"
                      }`}
                    >
                      <div className="h-28 flex items-center justify-center bg-gray-200 rounded mb-1">
                        <img
                          src={item.png_url || item.svg_url}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <p className="text-xs text-center font-semibold truncate">
                        {item.symbol_name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {results.map((item) => (
                    <div
                      key={getUniqueId(item)}
                      className="flex gap-4 bg-white p-3 rounded"
                    >
                      <img src={item.png_url || item.svg_url} className="w-12" />
                      <div>
                        <p>{item.symbol_name}</p>
                        <p className="text-xs text-gray-500">{item.company}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL  */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-[80%] max-h-[90vh] overflow-y-auto rounded-lg p-6 flex gap-6 ${
              theme === "light"
                ? "bg-white text-black"
                : "bg-[#1e293b] text-white"
            }`}
          >
            <img
               src={selected.png_url || selected.svg_url}
              className="w-1/3 object-contain bg-gray-100"
            />
            <div className="text-sm space-y-4 font-bold">
              <p>ID: {selected.id}</p>
              <p>Symbol: {selected.symbol_name}</p>
              <p>Company: {selected.company || "-"}</p>
              <p>Category: {selected.category || "-"}</p>
              <p>Device: {selected.device_type || "-"}</p>
              <p>Package: {selected.package || "-"}</p>
              <p>Pins: {selected.pin_count || "-"}</p>
              <p>Voltage: {selected.voltage_rating || "-"} V</p>
              <p>Current: {selected.current_rating || "-"} A</p>
              <p>Power: {selected.power_rating || "-"} W</p>
              <p>
                Datasheet:{" "}
                <a
                  href={selected.datasheet}
                  target="_blank"
                  className="text-blue-500 underline"
                >
                  Open Datasheet
                </a>
              </p>
              <p>License: {selected.license}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}