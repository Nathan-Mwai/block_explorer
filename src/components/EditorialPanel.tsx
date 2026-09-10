import React, { useState } from "react";
import {
  Search,
  MapPin,
  Compass,
  Globe,
  Loader2,
  Copy,
  Check,
  Navigation2,
  Sparkles,
  Layers,
  History,
  Info,
} from "lucide-react";
import { PRESET_LOCATIONS } from "../data/presets.ts";
import { GeocodeData, GeocodeError, ExplorationHistoryItem } from "../types.ts";
import { ErrorAlert } from "./ErrorAlert.tsx";

interface EditorialPanelProps {
  onSearch: (query: string) => Promise<void>;
  selectedData: GeocodeData | null;
  isLoading: boolean;
  error: GeocodeError | null;
  onDismissError: () => void;
  onRetry: () => void;
  onUpdateKey?: (key: string) => void;
  hasApiKey: boolean;
  history: ExplorationHistoryItem[];
  onSelectHistory: (item: ExplorationHistoryItem) => void;
}

export const EditorialPanel: React.FC<EditorialPanelProps> = ({
  onSearch,
  selectedData,
  isLoading,
  error,
  onDismissError,
  onRetry,
  onUpdateKey,
  hasApiKey,
  history,
  onSelectHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;
    setActivePresetId(null);
    await onSearch(searchQuery.trim());
  };

  const handlePresetClick = async (preset: typeof PRESET_LOCATIONS[0]) => {
    if (isLoading) return;
    setActivePresetId(preset.id);
    setSearchQuery(preset.name);
    // Submit geocode request for preset as required by prompt
    await onSearch(preset.query);
  };

  const handleCopyCoords = () => {
    if (!selectedData) return;
    const text = `${selectedData.location.lat.toFixed(6)}, ${selectedData.location.lng.toFixed(6)}`;
    navigator.clipboard?.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  return (
    <aside
      id="editorial-control-panel"
      className="w-full lg:w-1/3 xl:w-[32%] h-full flex flex-col bg-stone-50 border-r border-stone-200 text-stone-900 overflow-y-auto"
    >
      {/* Editorial Header */}
      <header className="p-5 border-b border-stone-200/80 bg-white/70 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white shadow-xs">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-stone-900 leading-tight">
                Block Explorer
              </h1>
              <p className="text-[11px] text-stone-500 font-medium">
                Geospatial Exploration & Geocoding V4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              id="api-status-badge"
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                hasApiKey
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasApiKey ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span>{hasApiKey ? "Maps Active" : "Key Needed"}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="p-5 space-y-6 flex-1">
        {/* Error notification display if any error occurred */}
        {error && (
          <ErrorAlert
            error={error}
            onDismiss={onDismissError}
            onRetry={onRetry}
            onUpdateKey={onUpdateKey}
          />
        )}

        {/* Primary Search Bar */}
        <section aria-labelledby="heading-search">
          <h2 id="heading-search" className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Location Geocode Search
          </h2>
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-stone-400 pointer-events-none" />
              <input
                id="location-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a city, neighborhood, or block..."
                disabled={isLoading}
                className="w-full rounded-xl border border-stone-300 bg-white pl-10 pr-24 py-2.5 text-sm text-stone-900 placeholder-stone-400 shadow-2xs focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 disabled:opacity-60 transition-all"
              />
              <button
                id="btn-submit-geocode"
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="absolute right-1.5 inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-stone-800 disabled:opacity-40 disabled:hover:bg-stone-900 transition-colors cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Resolving</span>
                  </>
                ) : (
                  <span>Geocode</span>
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-stone-500 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-stone-400" />
              <span>Issues requests to Google Geocoding V4 REST API</span>
            </p>
          </form>
        </section>

        {/* Five Curated Presets */}
        <section aria-labelledby="heading-presets">
          <div className="flex items-center justify-between mb-2">
            <h2 id="heading-presets" className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Exploration Presets
            </h2>
            <span className="text-[11px] text-stone-400">5 curated cities</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {PRESET_LOCATIONS.map((preset) => {
              const isActive =
                activePresetId === preset.id ||
                (selectedData && selectedData.query.toLowerCase().includes(preset.name.toLowerCase()));

              return (
                <button
                  key={preset.id}
                  id={`btn-preset-${preset.id}`}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  disabled={isLoading}
                  className={`group relative flex items-center justify-between rounded-xl p-3 text-left transition-all border ${
                    isActive
                      ? "bg-white border-stone-900 ring-1 ring-stone-900 shadow-xs"
                      : "bg-white/80 hover:bg-white border-stone-200 hover:border-stone-300 hover:shadow-2xs"
                  } disabled:opacity-50 cursor-pointer`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive
                          ? "bg-stone-900 text-white"
                          : "bg-stone-100 text-stone-700 group-hover:bg-stone-200"
                      } transition-colors`}
                    >
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900 text-sm">
                          {preset.name}
                        </span>
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 border border-stone-200/60">
                          {preset.country}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                        {preset.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="text-stone-400 group-hover:text-stone-900 transition-colors pl-2">
                    <Navigation2 className="h-4 w-4 -rotate-45" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected Location Metadata Inspector */}
        {selectedData ? (
          <section
            id="selected-location-details"
            aria-labelledby="heading-location-details"
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                <Globe className="h-4 w-4 text-indigo-600" />
                <h2 id="heading-location-details">Geocoded Block Telemetry</h2>
              </div>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-100">
                Geocoding V4 Success
              </span>
            </div>

            <div>
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">
                Formatted Address
              </p>
              <p className="text-sm font-semibold text-stone-900 leading-snug mt-0.5">
                {selectedData.formattedAddress}
              </p>
            </div>

            <div className="rounded-xl bg-stone-50 p-3 border border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono uppercase">
                  Coordinates
                </span>
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="inline-flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900 font-medium transition-colors"
                >
                  {copiedCoords ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs text-stone-800">
                <div className="rounded bg-white p-1.5 border border-stone-200/60">
                  <span className="text-[10px] text-stone-400 block">Latitude</span>
                  <span className="font-semibold">{selectedData.location.lat.toFixed(6)}°</span>
                </div>
                <div className="rounded bg-white p-1.5 border border-stone-200/60">
                  <span className="text-[10px] text-stone-400 block">Longitude</span>
                  <span className="font-semibold">{selectedData.location.lng.toFixed(6)}°</span>
                </div>
              </div>
            </div>

            {selectedData.locationType && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-stone-500">Precision Type</span>
                <span className="font-mono text-stone-800 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                  {selectedData.locationType}
                </span>
              </div>
            )}

            {selectedData.placeId && (
              <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 truncate">
                <span className="text-stone-400">Place ID: </span>
                <span className="font-mono text-stone-700">{selectedData.placeId}</span>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-stone-400 text-xs">
            <Info className="h-6 w-6 mx-auto mb-2 text-stone-300" />
            <p className="font-medium text-stone-600">No Location Selected</p>
            <p className="text-stone-400 text-[11px] mt-1">
              Search an address above or choose one of the curated presets to geocode and inspect.
            </p>
          </section>
        )}

        {/* History List */}
        {history.length > 0 && (
          <section aria-labelledby="heading-history" className="pt-2">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              <History className="h-3.5 w-3.5" />
              <h2 id="heading-history">Session History</h2>
            </div>
            <div className="space-y-1.5">
              {history.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectHistory(item)}
                  className="w-full text-left rounded-lg bg-white/70 hover:bg-white p-2 text-xs border border-stone-200/70 hover:border-stone-300 transition-colors flex items-center justify-between group"
                >
                  <div className="truncate mr-2">
                    <span className="font-medium text-stone-800 block truncate">
                      {item.query}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {item.location.lat.toFixed(3)}, {item.location.lng.toFixed(3)}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 group-hover:text-stone-700">
                    Pan
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Editorial Footer */}
      <footer className="p-4 border-t border-stone-200 bg-stone-100/70 text-[11px] text-stone-500">
        <p className="leading-relaxed">
          Powered by Google Maps Platform & Google Geocoding V4 REST API.
        </p>
      </footer>
    </aside>
  );
};
