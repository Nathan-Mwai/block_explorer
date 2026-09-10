import React, { useEffect, useState, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  ControlPosition,
  MapControl,
} from "@vis.gl/react-google-maps";
import {
  Compass,
  Layers,
  MapPin,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Navigation,
  Key,
} from "lucide-react";
import { GeocodeData, GeocodeLocation } from "../types.ts";

interface MapContainerProps {
  apiKey: string;
  selectedData: GeocodeData | null;
  onSelectCoordinates?: (coords: GeocodeLocation) => void;
  onUpdateKey?: (key: string) => void;
}

// Sub-component to manage programmatic camera panning & event tracking
const CameraController: React.FC<{
  selectedData: GeocodeData | null;
  onCameraChange?: (center: GeocodeLocation, zoom: number) => void;
}> = ({ selectedData, onCameraChange }) => {
  const map = useMap();

  // Smoothly pan to newly geocoded location
  useEffect(() => {
    if (!map || !selectedData) return;

    const { location, viewport } = selectedData;
    if (viewport && window.google?.maps?.LatLngBounds) {
      const bounds = new window.google.maps.LatLngBounds(
        { lat: viewport.south, lng: viewport.west },
        { lat: viewport.north, lng: viewport.east }
      );
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    } else {
      map.panTo({ lat: location.lat, lng: location.lng });
      // If zoomed out, zoom into comfortable neighborhood level
      if (map.getZoom() && (map.getZoom() as number) < 12) {
        map.setZoom(14);
      }
    }
  }, [map, selectedData]);

  // Track map camera movement for telemetry HUD
  useEffect(() => {
    if (!map || !onCameraChange) return;

    const listener = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (center && zoom !== undefined) {
        onCameraChange({ lat: center.lat(), lng: center.lng() }, zoom);
      }
    };

    const idleListener = map.addListener("idle", listener);
    return () => {
      if (idleListener && window.google?.maps?.event) {
        window.google.maps.event.removeListener(idleListener);
      }
    };
  }, [map, onCameraChange]);

  return null;
};

export const MapContainer: React.FC<MapContainerProps> = ({
  apiKey,
  selectedData,
  onUpdateKey,
}) => {
  const [infoOpen, setInfoOpen] = useState(true);
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");
  const [cameraCenter, setCameraCenter] = useState<GeocodeLocation>({
    lat: selectedData?.location.lat ?? -34.6037,
    lng: selectedData?.location.lng ?? -58.3816,
  });
  const [cameraZoom, setCameraZoom] = useState<number>(13);
  const [quickKeyInput, setQuickKeyInput] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);

  // When selectedData updates, ensure InfoWindow opens
  useEffect(() => {
    if (selectedData) {
      setInfoOpen(true);
      setCameraCenter(selectedData.location);
    }
  }, [selectedData]);

  const handleCameraChange = useCallback((center: GeocodeLocation, zoom: number) => {
    setCameraCenter(center);
    setCameraZoom(zoom);
  }, []);

  const defaultCenter = selectedData?.location || { lat: -34.6037, lng: -58.3816 }; // Buenos Aires default

  return (
    <div id="map-split-container" className="relative h-full w-full bg-stone-100 overflow-hidden flex flex-col">
      {apiKey ? (
        <APIProvider
          apiKey={apiKey}
          solutionChannel="GMP_aistudio"
        >
          <div className="relative h-full w-full">
            <Map
              id="block-explorer-map"
              defaultCenter={defaultCenter}
              defaultZoom={13}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              mapTypeId={mapType}
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
              mapTypeControl={false}
              streetViewControl={true}
              fullscreenControl={true}
              className="h-full w-full"
              style={{ width: "100%", height: "100%" }}
            >
              <CameraController
                selectedData={selectedData}
                onCameraChange={handleCameraChange}
              />

              {/* Customized Marker for the selected/geocoded location */}
              {selectedData && (
                <AdvancedMarker
                  id="selected-location-marker"
                  position={{ lat: selectedData.location.lat, lng: selectedData.location.lng }}
                  title={selectedData.formattedAddress}
                  onClick={() => setInfoOpen(true)}
                >
                  {/* Custom Pin Design */}
                  <div className="relative flex flex-col items-center group cursor-pointer">
                    {/* Animated Pulsing Halo */}
                    <div className="absolute -top-1 w-10 h-10 bg-indigo-500/25 rounded-full animate-ping pointer-events-none" />
                    
                    {/* Floating pill label */}
                    <div className="mb-1 rounded-full bg-stone-900/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-md border border-white/20 whitespace-nowrap transition-transform duration-200 group-hover:scale-105">
                      {selectedData.query}
                    </div>

                    {/* Stylized Marker Icon */}
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-b from-indigo-500 to-indigo-700 text-white shadow-xl ring-3 ring-white">
                      <MapPin className="h-5 w-5" />
                    </div>

                    {/* Pointed needle shadow */}
                    <div className="w-1.5 h-1.5 bg-stone-900/50 rounded-full blur-2xs mt-0.5" />
                  </div>
                </AdvancedMarker>
              )}

              {/* InfoWindow for the selected marker */}
              {selectedData && infoOpen && (
                <InfoWindow
                  position={{ lat: selectedData.location.lat, lng: selectedData.location.lng }}
                  onCloseClick={() => setInfoOpen(false)}
                  headerContent={
                    <div className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                      <Navigation className="h-3.5 w-3.5 text-indigo-600" />
                      <span>{selectedData.query}</span>
                    </div>
                  }
                >
                  <div className="p-1 text-xs text-stone-700 max-w-xs space-y-1.5">
                    <p className="font-medium text-stone-900 leading-snug">
                      {selectedData.formattedAddress}
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-stone-600 pt-1 border-t border-stone-200">
                      <div>
                        <span className="text-stone-400">Lat:</span> {selectedData.location.lat.toFixed(5)}
                      </div>
                      <div>
                        <span className="text-stone-400">Lng:</span> {selectedData.location.lng.toFixed(5)}
                      </div>
                    </div>
                    {selectedData.locationType && (
                      <div className="text-[10px] text-stone-500">
                        Type: <span className="font-medium text-stone-700">{selectedData.locationType}</span>
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}

              {/* Custom Top Map Controls */}
              <MapControl position={ControlPosition.TOP_RIGHT}>
                <div className="m-3 flex items-center rounded-xl bg-white/95 p-1 shadow-md backdrop-blur-xs border border-stone-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setMapType("roadmap")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      mapType === "roadmap"
                        ? "bg-stone-900 text-white shadow-2xs"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    Roadmap
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapType("terrain")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      mapType === "terrain"
                        ? "bg-stone-900 text-white shadow-2xs"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    Terrain
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapType("hybrid")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      mapType === "hybrid"
                        ? "bg-stone-900 text-white shadow-2xs"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    Satellite
                  </button>
                </div>
              </MapControl>
            </Map>
          </div>
        </APIProvider>
      ) : (
        /* Fallback View when API Key is missing */
        <div id="missing-key-container" className="relative flex flex-col items-center justify-center h-full w-full p-8 bg-stone-100 text-center">
          <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-md border border-stone-200 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900 text-base">Interactive Map Activation</h3>
                <p className="text-xs text-stone-500">Google Maps Platform requires an API Key</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              To pan, zoom, and render the interactive Google Map tiles, provide a Google Maps Platform API key or a free zero-cost <strong>Maps Demo Key</strong>.
            </p>

            <div className="space-y-3">
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-amber-400" />
                  <span>Generate Free Maps Demo Key</span>
                </div>
                <span className="text-[10px] text-stone-400">No card required</span>
              </a>

              {onUpdateKey && (
                <div className="pt-2 border-t border-stone-100">
                  <label htmlFor="quick-api-key" className="block text-[11px] font-medium text-stone-700 mb-1">
                    Or paste your key to activate immediately:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="quick-api-key"
                      type="text"
                      value={quickKeyInput}
                      onChange={(e) => setQuickKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (quickKeyInput.trim()) {
                          onUpdateKey(quickKeyInput.trim());
                        }
                      }}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedData && (
              <div className="mt-4 rounded-lg bg-stone-50 p-3 border border-stone-200 text-xs">
                <div className="font-semibold text-stone-900 mb-1">Current Geocoded Target:</div>
                <div className="text-stone-700 font-medium">{selectedData.formattedAddress}</div>
                <div className="text-stone-500 font-mono text-[11px] mt-0.5">
                  Lat: {selectedData.location.lat.toFixed(4)}, Lng: {selectedData.location.lng.toFixed(4)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating telemetry HUD at top left */}
      <div
        id="map-telemetry-hud"
        className="absolute top-4 left-4 z-10 flex items-center gap-3 rounded-xl bg-stone-900/85 px-3 py-2 text-white shadow-lg backdrop-blur-md border border-stone-700/50 text-[11px] font-mono pointer-events-auto"
      >
        <div className="flex items-center gap-1.5 text-stone-300">
          <Navigation className="h-3 w-3 text-indigo-400" />
          <span>
            {cameraCenter.lat.toFixed(4)}°, {cameraCenter.lng.toFixed(4)}°
          </span>
        </div>
        <div className="h-3 w-px bg-stone-700" />
        <div className="text-stone-300">
          <span>Zoom: {Math.round(cameraZoom)}</span>
        </div>
        {selectedData && (
          <>
            <div className="h-3 w-px bg-stone-700" />
            <div className="text-indigo-300 truncate max-w-40">
              {selectedData.query}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
