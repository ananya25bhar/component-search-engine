import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog } from "@/components/ui/dialog"

interface SymbolItem {
  id: number | string
  symbol_name: string
  svg_url: string
  category?: string
  device_type?: string
  datasheet?: string
  package?: string
  pin_count?: string
  mount_type?: string
  voltage?: string
  current?: string
  power?: string
  description?: string
  base_name?: string
  license?: string
}

export default function App() {
  const [query, setQuery] = useState<string>("")
  const [debouncedQuery, setDebouncedQuery] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SymbolItem[]>([])
  const [selected, setSelected] = useState<SymbolItem | null>(null)
  const [recent, setRecent] = useState<SymbolItem[]>([])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Load recently viewed
  useEffect(() => {
    const saved = localStorage.getItem("recently-viewed")
    if (saved) setRecent(JSON.parse(saved))
  }, [])

  // Search API
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(res => res.json())
      .then((data: SymbolItem[]) => {
        if (Array.isArray(data)) setResults(data)
        else setResults([])
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  const saveRecent = (item: SymbolItem) => {
    const updated = [item, ...recent.filter(r => r.id !== item.id)].slice(0, 6)
    setRecent(updated)
    localStorage.setItem("recently-viewed", JSON.stringify(updated))
  }

  const renderValue = (value: string | number | undefined, unit = "") =>
    value ? `${value}${unit}` : "-"

  // Datasheet safe fallback
  const getDatasheetUrl = (item: SymbolItem) => {
    if (item.datasheet && item.datasheet.startsWith("http")) {
      return item.datasheet
    }
    return `https://www.alldatasheet.com/view.jsp?Searchword=${item.symbol_name}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-5 text-3xl font-extrabold shadow-lg rounded-b-3xl">
        Component Search Engine
      </div>

      {/* Search Input */}
      <div className="p-8 flex justify-center">
        <div className="relative w-full max-w-4xl">
          <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search ICs, resistors, voltage regulators..."
            className={`w-full border-2 border-gray-300 rounded-full pl-16 pr-14 py-7 shadow-lg bg-white focus:ring-2 focus:ring-purple-500 transition-all duration-300 ${query ? "text-2xl" : "text-xl placeholder:text-xl"}`}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black text-lg"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Recently Viewed */}
      <AnimatePresence>
        {recent.length > 0 && !debouncedQuery && (
          <motion.div className="px-10 pb-6 bg-gray-50 border border-gray-100 rounded-2xl mt-6 shadow-none">
            <h2 className="text-sm font-medium mb-3 text-gray-400 uppercase tracking-wide">Recently Viewed</h2>
            <div className="flex gap-6 overflow-x-auto py-2">
              {recent.map(item => (
                <motion.div key={item.id} whileHover={{ scale: 1.05 }} className="min-w-[220px]">
                  <Card
                    className="cursor-pointer rounded-2xl overflow-hidden border border-gray-100 bg-white hover:shadow-md transition-all"
                    onClick={() => {
                      setSelected(item)
                      saveRecent(item) // FIXED
                    }}
                  >
                    <CardContent className="p-4 flex flex-col items-start text-left h-full">
                      <div className="h-28 w-full bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center mb-3">
                        <img src={item.svg_url || "/placeholder.svg"} className="h-full object-contain scale-125" alt={item.symbol_name} />
                      </div>
                      <p className="font-bold text-gray-900 text-sm leading-snug">{item.symbol_name}</p>
                      {item.category && <p className="mt-1 text-xs text-gray-500">{item.category}</p>}
                      {item.license && <Badge className="mt-2 self-start">{item.license}</Badge>}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <div className="px-10 pb-20 bg-white/60 backdrop-blur-sm rounded-3xl mx-6 shadow-sm">
        {loading && <p className="text-center text-gray-500 py-6 animate-pulse">Searching components...</p>}
        {!loading && debouncedQuery && results.length === 0 && (
          <p className="text-center text-gray-500 py-6">
            No components found for "<b>{debouncedQuery}</b>"
          </p>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 items-stretch">
          <AnimatePresence>
            {results.map(item => (
              <motion.div key={item.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Card
                  className="cursor-pointer shadow-sm rounded-3xl overflow-hidden border border-gray-200 bg-white hover:shadow-xl hover:scale-[1.02] hover:border-indigo-400 transition-all duration-300"
                  onClick={() => {
                    setSelected(item)
                    saveRecent(item)
                  }}
                >
                  <CardContent className="p-4 flex flex-col items-start text-left h-full">
                    <div className="h-28 w-full bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center mb-3">
                      <img src={item.svg_url || "/placeholder.svg"} className="h-full object-contain scale-125" alt={item.symbol_name} />
                    </div>
                    <p className="font-bold text-gray-900 text-base leading-snug line-clamp-2">{item.symbol_name}</p>
                    {item.category && <p className="text-sm text-gray-500 mt-1">{item.category}</p>}
                    {item.package && <p className="text-sm text-gray-500 mt-0.5">Package: {item.package}</p>}
                    {item.pin_count && <p className="text-sm text-gray-500 mt-0.5">Pins: {item.pin_count}</p>}
                    {item.voltage && <p className="text-sm text-gray-500 mt-0.5">Voltage: {item.voltage}</p>}
                    {item.current && <p className="text-sm text-gray-500 mt-0.5">Current: {item.current}</p>}
                    <p className="text-sm text-gray-500 mt-0.5">Power: {item.power === "Yes" ? "Available" : "-"}</p>
                    {item.license && <Badge className="mt-2 self-start bg-indigo-100 text-indigo-700 border border-indigo-200">{item.license}</Badge>}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">{selected.symbol_name}</h2>
              <button onClick={() => setSelected(null)} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200">Close</button>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-12">
              <div className="w-full h-[50vh] bg-gray-50 rounded-xl flex items-center justify-center p-6">
                <img src={selected.svg_url || "/placeholder.svg"} className="h-full w-full object-contain" alt={selected.symbol_name} />
              </div>
              <div className="space-y-5 text-2xl leading-relaxed">
                <p><b>ID:</b> {renderValue(selected.id)}</p>
                <p><b>Symbol:</b> {renderValue(selected.symbol_name)}</p>
                <p><b>Category:</b> {renderValue(selected.category)}</p>
                <p><b>Device Type:</b> {renderValue(selected.device_type)}</p>
                <p><b>Package:</b> {renderValue(selected.package)}</p>
                <p><b>Pin Count:</b> {renderValue(selected.pin_count)}</p>
                <p><b>Mount Type:</b> {renderValue(selected.mount_type)}</p>
                <p><b>Voltage:</b> {renderValue(selected.voltage)}</p>
                <p><b>Current:</b> {renderValue(selected.current)}</p>
                <p><b>Power:</b> {selected.power === "Yes" ? "Available" : "-"}</p>
                <p><b>Description:</b> {renderValue(selected.description)}</p>
                <p><b>Base Name:</b> {renderValue(selected.base_name)}</p>
                <p>
                  <b>Datasheet:</b>{" "}
                  <a className="text-indigo-600 underline" href={getDatasheetUrl(selected)} target="_blank">
                    Open Datasheet
                  </a>
                </p>
                <p><b>License:</b> {selected.license || "Unknown"}</p>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}