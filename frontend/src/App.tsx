import { useEffect, useState } from "react";

/* ---------- Types ---------- */

interface ComponentValue {
  label: string;
  value: string;
}

interface LicenseAnalysis {
  license_name: string;
  license_type: string;
  category: string;
  commercial_use: boolean;
  private_use: boolean;
  redistribution: string;
  attribution_required: boolean;
}

interface LicenseInfo {
  title?: string;
  name?: string;
  license_type?: string;
  url?: string;
  source_file?: string;
  summary?: string;
  attribution_required?: boolean;
  attribution_requirements?: string;
  exception?: string;
  redistribution?: string;
  warranty?: string;
  full_text?: string;
  license_analysis?: LicenseAnalysis;
}

interface SymbolItem {
  id: number | string;
  kid_symbol?: number | string;
  symbol_name: string;
  svg_url?: string;
  png_url?: string;
  step_url?: string | null;
  description?: string;
  company?: string;
  category?: string;
  subcategory?: string;
  device_type?: string;
  voltage_rating?: number | string;
  current_rating?: number | string;
  power_rating?: number | string;
  voltage?: string | number;
  current?: string | number;
  power?: string | number;
  component_values?: ComponentValue[];
  keywords?: string;
  package?: string;
  pin_count?: number | string;
  mount_type?: string;
  datasheet?: string;
  simulation_available?: boolean;
  tags?: string[];
  license?: string;
  license_info?: LicenseInfo;
  license_analysis?: LicenseAnalysis;
  llm_generated?: boolean;
  llm_source?: string;
  llm_note?: string;
  _uid?: string;
  _time?: number;
}

interface Explanation {
  what_it_does: string;
  use_cases: string[];
  tip: string;
}

const componentSearchOptions = [
  { name: "Drone Parts", valueLabel: "Drone Components" },
  { name: "Amplifier", valueLabel: "Gain" },
  { name: "OpAmp", valueLabel: "Gain" },
  { name: "Inductor", valueLabel: "Inductance" },
  { name: "Oscillator", valueLabel: "Frequency" },
  { name: "ADC", valueLabel: "Resolution" },
  { name: "DAC", valueLabel: "Resolution" },
  { name: "Memory", valueLabel: "Memory" },
  { name: "Regulator", valueLabel: "Voltage / Current" },
  { name: "Diode", valueLabel: "Voltage / Current" },
  { name: "LED", valueLabel: "Voltage / Current" },
  { name: "Transistor", valueLabel: "Voltage / Current / Resistance" },
  { name: "Switch", valueLabel: "Voltage / Current / Resistance" },
  { name: "Relay", valueLabel: "Voltage / Current" },
  { name: "Connector", valueLabel: "Pins" },
  { name: "Register", valueLabel: "Bits" },
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/* ---------- Icons ---------- */

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* ---------- App ---------- */

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolItem[]>([]);
  const [selected, setSelected] = useState<SymbolItem | null>(null);
  const [recent, setRecent] = useState<SymbolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [suggestions, setSuggestions] = useState<SymbolItem[]>([]);

  const [useAI, setUseAI] = useState(false);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [aiSearchInfo, setAiSearchInfo] = useState<string | null>(null);

  const isHome = !hasSearched;

  const filteredComponentOptions = query.trim()
    ? componentSearchOptions.filter((item) =>
        item.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : [];

  /* ---------- Helpers ---------- */

  const getUniqueId = (item: SymbolItem) =>
    `${item.id ?? item.kid_symbol ?? ""}_${item.symbol_name}_${item.png_url || item.svg_url || ""}`;

  const getImageUrl = (item: SymbolItem) => item.png_url || item.svg_url || "";

  const showValue = (value: unknown) => {
    if (value === undefined || value === null || value === "" || value === 0) return "-";
    return String(value);
  };

  const showMeta = (value: unknown) => {
    if (value === undefined || value === null || value === "" || value === 0) return "Not specified";
    return String(value);
  };

  const showRating = (value: unknown, unit: string) => {
    if (value === undefined || value === null || value === "" || value === 0) return "Not specified";
    const text = String(value);
    return /[a-zA-Z]/.test(text) ? text : `${text} ${unit}`;
  };

  const formatComponentValues = (values?: ComponentValue[]) => {
    if (!values?.length) return "Not specified";
    return values.map((item) => `${item.label}: ${item.value}`).join(", ");
  };

  const hasComponentValues = (values?: ComponentValue[]) => Boolean(values?.length);

  const formatValueField = (item: SymbolItem, maxItems?: number) => {
    if (!item.component_values?.length) return "Not specified";
    const values = maxItems ? item.component_values.slice(0, maxItems) : item.component_values;
    const suffix =
      maxItems && item.component_values.length > maxItems
        ? ` +${item.component_values.length - maxItems} more`
        : "";
    return `${formatComponentValues(values)}${suffix}`;
  };

  const hasMissingInfo = (item: SymbolItem) => {
    const missing = (value: unknown) =>
      value === undefined ||
      value === null ||
      value === "" ||
      value === 0 ||
      value === "SVG" ||
      value === "SVG image from svgs folder" ||
      (Array.isArray(value) && value.length === 0);

    return (
      missing(item.description) ||
      missing(item.category) ||
      missing(item.device_type) ||
      missing(item.tags)
    );
  };

  /* ---------- Effects ---------- */

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem("recently-viewed");
    if (!saved) return;
    try {
      setRecent(JSON.parse(saved));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  // Live suggestions while typing
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setSuggestions(data.slice(0, 6));
          else setSuggestions([]);
        })
        .catch(() => setSuggestions([]));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  /* ---------- Actions ---------- */

  const saveRecent = (item: SymbolItem) => {
    const uid = getUniqueId(item);
    const newItem = { ...item, _uid: uid, _time: Date.now() };
    setRecent((prev) => {
      const updated = [newItem, ...prev.filter((r) => r._uid !== uid)].slice(0, 6);
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

  const closeModal = () => {
    setSelected(null);
    setExplanation(null);
  };

  const enrichWithLlm = (item: SymbolItem) => {
    if (aiLoading) return;
    setAiLoading(true);
    fetch(`${API_BASE_URL}/api/llm/svg-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || typeof data !== "object") return;
        const enriched = { ...item, ...data };
        setSelected((current) =>
          current && getUniqueId(current) === getUniqueId(item)
            ? { ...current, ...data }
            : current,
        );
        saveRecent(enriched);
      })
      .catch(() => undefined)
      .finally(() => setAiLoading(false));
  };

  const fetchExplanation = (item: SymbolItem) => {
    setExplanation(null);
    setLoadingExplain(true);
    fetch(`${API_BASE_URL}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol_name: item.symbol_name, category: item.category }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.what_it_does) setExplanation(data);
      })
      .catch(() => setExplanation(null))
      .finally(() => setLoadingExplain(false));
  };

  const openItem = (item: SymbolItem) => {
    saveRecent(item);
    setSelected(item);
    setExplanation(null);
    setShowDropdown(false);
    fetchExplanation(item);

    fetch(`${API_BASE_URL}/api/symbol/${encodeURIComponent(String(item.id))}`)
      .then((res) => (res.ok ? res.json() : item))
      .then((data) => {
        if (!data || typeof data !== "object") return;
        const fullItem = { ...item, ...data };
        setSelected(fullItem);
        saveRecent(fullItem);
        if (hasMissingInfo(fullItem)) enrichWithLlm(fullItem);
      })
      .catch(() => {
        setSelected(item);
        if (hasMissingInfo(item)) enrichWithLlm(item);
      });
  };

  const selectComponentOption = (name: string) => {
    setQuery(name);
    setShowDropdown(false);
    fetchResults(name);
  };

  const selectSuggestion = (item: SymbolItem) => {
    setQuery(item.symbol_name);
    openItem(item);
  };

  const fetchResults = (searchText = query) => {
    const trimmed = searchText.trim();
    setShowDropdown(false);

    if (!trimmed) {
      setResults([]);
      setAiSearchInfo(null);
      return;
    }

    setHasSearched(true);
    setLoading(true);
    setAiSearchInfo(null);

    const request = useAI
      ? fetch(`${API_BASE_URL}/api/smart-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        })
      : fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(trimmed)}`);

    request
      .then((res) => res.json())
      .then((data) => {
        if (useAI) {
          if (Array.isArray(data?.results)) {
            setResults(data.results);
            if (data.parsed?.sql_like) {
              const keyword = String(data.parsed.sql_like).replace(/%/g, "");
              setAiSearchInfo(
                `AI searched for "${keyword}"${
                  data.parsed.category ? ` in category "${data.parsed.category}"` : ""
                }`,
              );
            }
          } else {
            setResults([]);
          }
          return;
        }
        setResults(Array.isArray(data) ? data : []);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  /* ---------- Sub-components ---------- */

  function AiToggle({ small = false }: { small?: boolean }) {
    return (
      <div className="flex items-center gap-2">
        <span className={small ? "text-xs text-gray-400" : "text-sm text-gray-600"}>
          {small ? "AI" : "Normal search"}
        </span>
        <button
          type="button"
          onClick={() => setUseAI((enabled) => !enabled)}
          className={`relative rounded-full transition-colors duration-200 ${
            small ? "h-5 w-10" : "h-6 w-12"
          } ${useAI ? "bg-yellow-400" : small ? "bg-gray-600" : "bg-gray-400"}`}
          aria-label="Toggle AI search"
          aria-pressed={useAI}
        >
          <span
            className={`absolute rounded-full bg-white transition-transform duration-200 ${
              small
                ? `top-0.5 h-4 w-4 ${useAI ? "translate-x-5" : "translate-x-0.5"}`
                : `top-1 h-4 w-4 ${useAI ? "translate-x-7" : "translate-x-1"}`
            }`}
          />
        </button>
        <span className={small ? "text-xs text-yellow-400" : "text-sm text-gray-600"}>
          {small ? (useAI ? "ON" : "OFF") : "AI search"}
        </span>
      </div>
    );
  }

  // Shared dropdown content
  function DropdownContent() {
    return (
      <div className="absolute top-full left-0 w-full bg-white shadow-lg rounded-md mt-1 z-50 border max-h-72 overflow-y-auto">
        {suggestions.length > 0 && (
          <>
            <div className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 border-b">
              Matching Components
            </div>
            {suggestions.map((item) => (
              <div
                key={getUniqueId(item)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(item)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <img
                  src={getImageUrl(item)}
                  className="w-9 h-9 object-contain bg-gray-50 rounded p-1"
                  alt=""
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black truncate">{item.symbol_name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.category || "Component"}
                    {hasComponentValues(item.component_values)
                      ? ` • Values: ${formatValueField(item, 3)}`
                      : ""}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
        {filteredComponentOptions.length > 0 && (
          <>
            <div className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 border-y">
              Categories
            </div>
            {filteredComponentOptions.map((item) => (
              <div
                key={item.name}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectComponentOption(item.name)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <p className="text-sm font-semibold text-black">{item.name}</p>
                <p className="text-xs text-gray-500">Value column: {item.valueLabel}</p>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  /* ---------- Render ---------- */

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === "light" ? "bg-gray-200 text-black" : "bg-[#0f172a] text-white"
      }`}
    >
      {/* HOME */}
      {isHome ? (
        <div className="flex flex-col items-center justify-center flex-1 px-4">
          <h1 className="text-4xl font-bold mb-6">
            <span>Component</span>
            <span className="text-yellow-400">Search</span>
          </h1>

          <div className="relative w-full max-w-2xl">
            <div className="flex border-2 border-yellow-400 rounded-full overflow-hidden bg-white">
              <input
                value={query}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchResults()}
                placeholder="Search components, parameters, ID, or license..."
                className="flex-1 px-5 py-3 text-black outline-none"
              />
              <button
                type="button"
                onClick={() => fetchResults()}
                className="px-5 text-gray-700 hover:text-black text-lg flex items-center cursor-pointer"
                aria-label="Search"
              >
                <SearchIcon />
              </button>
            </div>

            {showDropdown &&
              query &&
              (suggestions.length > 0 || filteredComponentOptions.length > 0) && (
                <DropdownContent />
              )}

            <div className="mt-4 flex items-center justify-center">
              <AiToggle />
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

            {/* SEARCH */}
            <div className="relative flex flex-1 max-w-3xl">
              <div className="flex w-full border-2 border-yellow-400 rounded-md bg-white">
                <div className="relative flex-1">
                  <input
                    value={query}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchResults()}
                    placeholder="Search components, parameters, ID, or license..."
                    className="w-full px-3 py-2 pr-10 text-black outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setResults([]);
                        setAiSearchInfo(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black"
                      aria-label="Clear search"
                    >
                      <CloseIcon />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fetchResults()}
                  className="px-3 text-gray-700 hover:text-black flex items-center cursor-pointer"
                  aria-label="Search"
                >
                  <SearchIcon />
                </button>
              </div>

              {/* Dropdown: suggestions when typing */}
              {showDropdown &&
                query &&
                (suggestions.length > 0 || filteredComponentOptions.length > 0) && (
                  <DropdownContent />
                )}

              {/* Dropdown: recently viewed when input is empty */}
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
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-2 text-left"
                        onClick={() => {
                          openItem(item);
                          setShowDropdown(false);
                        }}
                      >
                        <img
                          src={getImageUrl(item)}
                          className="w-9 h-9 object-contain bg-gray-50 rounded p-1"
                          alt=""
                        />
                        <span className="text-sm text-black">{item.symbol_name}</span>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item._uid) removeRecent(item._uid);
                        }}
                        className="text-black"
                        aria-label="Remove recent item"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT SIDE */}
            <div className="ml-auto flex items-center gap-3">
              <AiToggle small />

              {/* VIEW TOGGLE */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded ${
                    viewMode === "grid" ? "text-yellow-400" : "text-gray-300 hover:text-white"
                  }`}
                  aria-label="Grid view"
                >
                  <div className="grid grid-cols-2 gap-[2px]">
                    <span className="w-2 h-2 bg-current" />
                    <span className="w-2 h-2 bg-current" />
                    <span className="w-2 h-2 bg-current" />
                    <span className="w-2 h-2 bg-current" />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded ${
                    viewMode === "list" ? "text-yellow-400" : "text-gray-300 hover:text-white"
                  }`}
                  aria-label="List view"
                >
                  <div className="flex flex-col gap-[3px]">
                    <span className="w-4 h-[2px] bg-current" />
                    <span className="w-4 h-[2px] bg-current" />
                    <span className="w-4 h-[2px] bg-current" />
                  </div>
                </button>
              </div>

              {/* THEME */}
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="px-3 py-1 rounded bg-black text-white text-sm"
              >
                {theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="text-center py-4 font-bold">
              {useAI ? "AI is searching..." : "Loading..."}
            </div>
          )}

          {/* AI SEARCH INFO BANNER */}
          {aiSearchInfo && !loading && (
            <div className="mx-4 mt-3 rounded border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
              {aiSearchInfo}
            </div>
          )}

          {/* RESULTS */}
          {results.length > 0 && (
            <div className="px-4 py-4">
              <h2 className="font-bold mb-2">
                Search Results{" "}
                <span className="text-sm font-normal text-gray-500">({results.length} found)</span>
              </h2>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {results.map((item) => (
                    <button
                      type="button"
                      key={getUniqueId(item)}
                      onClick={() => openItem(item)}
                      className={`border p-2 cursor-pointer hover:shadow-md rounded text-left ${
                        theme === "light" ? "bg-white" : "bg-[#1e293b]"
                      }`}
                    >
                      <div className="h-28 flex items-center justify-center bg-gray-200 rounded mb-1">
                        <img
                          src={getImageUrl(item)}
                          className="max-h-full max-w-full object-contain"
                          alt={item.symbol_name}
                        />
                      </div>
                      <p className="text-xs text-center font-semibold truncate">
                        {item.symbol_name}
                      </p>
                      {item.category && (
                        <p className="text-[11px] text-center text-gray-400 truncate">
                          {item.category}
                        </p>
                      )}
                      {hasComponentValues(item.component_values) && (
                        <p className="text-[11px] text-center text-gray-500 truncate">
                          Values: {formatValueField(item, 3)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {results.map((item) => (
                    <button
                      type="button"
                      key={getUniqueId(item)}
                      onClick={() => openItem(item)}
                      className={`flex gap-4 p-3 rounded cursor-pointer hover:shadow-md text-left ${
                        theme === "light" ? "bg-white" : "bg-[#1e293b]"
                      }`}
                    >
                      <img
                        src={getImageUrl(item)}
                        className="w-12 h-12 object-contain"
                        alt={item.symbol_name}
                      />
                      <div>
                        <p className="font-semibold">{item.symbol_name}</p>
                        <p className="text-xs text-gray-500">
                          {item.category || item.company || "-"}
                        </p>
                        {hasComponentValues(item.component_values) && (
                          <p className="text-xs text-gray-500">
                            Values: {formatValueField(item, 5)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NO RESULTS */}
          {!loading && hasSearched && results.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              No components found for "{query}"
              {useAI && (
                <p className="mt-1 text-sm">Try describing what the component does.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL */}
      {selected && (
        <div
          onClick={closeModal}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-[85%] max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg p-6 flex gap-6 ${
              theme === "light" ? "bg-white text-black" : "bg-[#1e293b] text-white"
            }`}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-3 right-4"
              aria-label="Close details"
            >
              <CloseIcon className="w-5 h-5" />
            </button>

            {/* IMAGE */}
            <div className="w-1/3 flex-shrink-0">
              <img
                src={getImageUrl(selected)}
                className="w-full rounded bg-gray-100 p-2 object-contain"
                alt={selected.symbol_name}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  if (hasMissingInfo(selected)) enrichWithLlm(selected);
                }}
              />
            </div>

            {/* DETAILS */}
            <div className="flex-1 text-sm space-y-2">
              {(aiLoading || selected.llm_generated) && (
                <p
                  className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                    theme === "light"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-yellow-400/20 text-yellow-200"
                  }`}
                >
                  {aiLoading
                    ? "Getting AI info..."
                    : `AI inferred${selected.llm_source ? ` (${selected.llm_source})` : ""}`}
                </p>
              )}

              <p className="text-lg font-bold">{selected.symbol_name}</p>
              <p><span className="font-semibold">ID:</span> {showValue(selected.id)}</p>
              <p><span className="font-semibold">Company:</span> {showMeta(selected.company)}</p>
              <p><span className="font-semibold">Category:</span> {showMeta(selected.category)}</p>
              <p><span className="font-semibold">Subcategory:</span> {showMeta(selected.subcategory)}</p>
              <p><span className="font-semibold">Device:</span> {showMeta(selected.device_type)}</p>
              <p><span className="font-semibold">Description:</span> {showMeta(selected.description)}</p>
              <p><span className="font-semibold">Keywords:</span> {showMeta(selected.keywords)}</p>
              <p><span className="font-semibold">Package:</span> {showMeta(selected.package)}</p>
              <p><span className="font-semibold">Pins:</span> {showValue(selected.pin_count)}</p>
              <p><span className="font-semibold">Mount:</span> {showMeta(selected.mount_type)}</p>

              <p><span className="font-semibold">Values:</span> {formatValueField(selected)}</p>

              <p>
                <span className="font-semibold">Voltage:</span>{" "}
                {showRating(selected.voltage_rating ?? selected.voltage, "V")}
              </p>
              <p>
                <span className="font-semibold">Current:</span>{" "}
                {showRating(selected.current_rating ?? selected.current, "A")}
              </p>
              <p>
                <span className="font-semibold">Power:</span>{" "}
                {showRating(selected.power_rating ?? selected.power, "W")}
              </p>
              <p>
                <span className="font-semibold">Simulation:</span>{" "}
                {selected.simulation_available ? "Available" : "Not specified"}
              </p>

              <p>
                <span className="font-semibold">Datasheet:</span>{" "}
                {selected.datasheet ? (
                  <a
                    href={selected.datasheet}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 underline"
                  >
                    Open Datasheet
                  </a>
                ) : (
                  "Not specified"
                )}
              </p>

              {selected.step_url && (
                <p>
                  <span className="font-semibold">STEP:</span>{" "}
                  <a
                    href={selected.step_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-500 underline"
                  >
                    Download STEP file
                  </a>
                </p>
              )}

              <p>
                <span className="font-semibold">Tags:</span>{" "}
                {selected.tags?.length ? selected.tags.join(", ") : "Not specified"}
              </p>

              <p><span className="font-semibold">License:</span> {showValue(selected.license)}</p>

              {selected.license_info && (
                <>
                  <p>
                    <span className="font-semibold">License Type:</span>{" "}
                    {showMeta(selected.license_info.license_type)}
                  </p>
                  <p>
                    <span className="font-semibold">Attribution:</span>{" "}
                    {selected.license_info.attribution_required
                      ? showMeta(selected.license_info.attribution_requirements)
                      : "No attribution required for normal use"}
                  </p>
                  <p>
                    <span className="font-semibold">License Summary:</span>{" "}
                    {showMeta(selected.license_info.summary)}
                  </p>
                </>
              )}

              {selected.license_analysis && (
                <>
                  <p>
                    <span className="font-semibold">License Category:</span>{" "}
                    {showMeta(selected.license_analysis.category)}
                  </p>
                  <p>
                    <span className="font-semibold">Commercial Use:</span>{" "}
                    {selected.license_analysis.commercial_use ? "Allowed" : "Not specified"}
                  </p>
                  <p>
                    <span className="font-semibold">Private Use:</span>{" "}
                    {selected.license_analysis.private_use ? "Allowed" : "Not specified"}
                  </p>
                  <p>
                    <span className="font-semibold">Redistribution:</span>{" "}
                    {showMeta(selected.license_analysis.redistribution)}
                  </p>
                </>
              )}

              {selected.llm_note && (
                <p className="text-xs opacity-70">{selected.llm_note}</p>
              )}

              {/* AI EXPLANATION PANEL */}
              <div className="mt-4 border-t border-gray-200 pt-4">
                <p className="mb-2 text-sm font-semibold">AI Explanation</p>

                {loadingExplain && (
                  <p className="animate-pulse text-sm text-gray-400">
                    Asking AI about this component...
                  </p>
                )}

                {!loadingExplain && explanation && (
                  <div className="space-y-3">
                    <div className="rounded border border-blue-200 bg-blue-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-blue-700">What it does</p>
                      <p className="text-sm text-blue-900">{explanation.what_it_does}</p>
                    </div>

                    {explanation.use_cases?.length > 0 && (
                      <div className="rounded border border-green-200 bg-green-50 p-3">
                        <p className="mb-1 text-xs font-semibold text-green-700">Use cases</p>
                        <ul className="list-disc space-y-1 pl-4">
                          {explanation.use_cases.map((useCase, index) => (
                            <li key={index} className="text-sm text-green-900">
                              {useCase}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {explanation.tip && (
                      <div className="rounded border border-yellow-200 bg-yellow-50 p-3">
                        <p className="mb-1 text-xs font-semibold text-yellow-700">Tip</p>
                        <p className="text-sm text-yellow-900">{explanation.tip}</p>
                      </div>
                    )}
                  </div>
                )}

                {!loadingExplain && !explanation && (
                  <p className="text-sm text-gray-400">No explanation available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}