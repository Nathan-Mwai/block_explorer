/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { EditorialPanel } from "./components/EditorialPanel.tsx";
import { MapContainer } from "./components/MapContainer.tsx";
import { LocalInsightsBanner } from "./components/LocalInsightsBanner.tsx";
import {
  GeocodeData,
  GeocodeError,
  ExplorationHistoryItem,
  LocalInsights,
  InsightsError,
} from "./types.ts";
import { PRESET_LOCATIONS } from "./data/presets.ts";

export default function App() {
  const [apiKey, setApiKey] = useState<string>(
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || ""
  );
  const [hasApiKey, setHasApiKey] = useState<boolean>(
    Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
  );
  const [selectedData, setSelectedData] = useState<GeocodeData | null>({
    query: "Buenos Aires",
    formattedAddress: "Buenos Aires, Argentina",
    location: { lat: -34.6037, lng: -58.3816 },
    locationType: "APPROXIMATE",
    types: ["locality", "political"],
    city: "Buenos Aires",
    state: "Buenos Aires",
    cityState: "Buenos Aires, Argentina",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<GeocodeError | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("Buenos Aires");
  const [history, setHistory] = useState<ExplorationHistoryItem[]>([
    {
      id: "initial-ba",
      query: "Buenos Aires",
      formattedAddress: "Buenos Aires, Argentina",
      location: { lat: -34.6037, lng: -58.3816 },
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // AI Local Insights state powered by Gemini 2.5 Flash
  const [insights, setInsights] = useState<LocalInsights | null>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<InsightsError | null>(null);
  const [currentCityState, setCurrentCityState] = useState<string>("Buenos Aires, Argentina");

  // Load configuration from server
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const config = await res.json();
          if (config.apiKey) {
            setApiKey(config.apiKey);
            setHasApiKey(true);
          }
        }
      } catch (err) {
        console.warn("Could not check /api/config:", err);
      }
    }
    loadConfig();
  }, []);

  // Fetch Local Insights from Gemini API
  const fetchInsights = useCallback(async (targetLocation: string) => {
    if (!targetLocation || !targetLocation.trim()) return;

    const trimmedLocation = targetLocation.trim();
    setIsInsightsLoading(true);
    setInsightsError(null);
    setCurrentCityState(trimmedLocation);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cityState: trimmedLocation }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.html) {
        setInsights({
          cityState: data.cityState || trimmedLocation,
          html: data.html,
          timestamp:
            data.timestamp ||
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      } else {
        setInsightsError({
          error: data.error || `STATUS_${res.status}`,
          message: data.message || "Failed to generate local insights from Gemini.",
          cityState: trimmedLocation,
          troubleshooting: data.troubleshooting,
        });
      }
    } catch (err: any) {
      console.error("Local insights request failed:", err);
      setInsightsError({
        error: "NETWORK_ERROR",
        message: err.message || "Unable to reach the Gemini local insights service.",
        cityState: trimmedLocation,
        troubleshooting: "Please check your network connection and server status.",
      });
    } finally {
      setIsInsightsLoading(false);
    }
  }, []);

  // Trigger initial insights for the default location on initial mount
  useEffect(() => {
    fetchInsights("Buenos Aires, Argentina");
  }, [fetchInsights]);

  // Primary Geocoding handler
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      setIsLoading(true);
      setError(null);
      setLastQuery(query);

      try {
        const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(query)}${keyParam}`);
        const data = await res.json();

        if (res.ok && data.success && data.data) {
          const geocoded: GeocodeData = data.data;
          setSelectedData(geocoded);

          // Add to exploration history
          setHistory((prev) => [
            {
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              query,
              formattedAddress: geocoded.formattedAddress,
              location: geocoded.location,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
            ...prev.filter((item) => item.query.toLowerCase() !== query.toLowerCase()),
          ]);

          // Requirement 1: Once geocoding successfully identifies the City and State (e.g. "Miami, Florida"), trigger a call to the Gemini API
          const identifiedCityState =
            geocoded.cityState ||
            (geocoded.city && geocoded.state ? `${geocoded.city}, ${geocoded.state}` : "") ||
            geocoded.formattedAddress ||
            query;

          if (identifiedCityState) {
            fetchInsights(identifiedCityState);
          }
        } else {
          // Structured error handling
          const geocodeError: GeocodeError = {
            error: data.error || `STATUS_${res.status}`,
            message: data.message || "Failed to geocode the specified address.",
            troubleshooting:
              data.troubleshooting ||
              "Ensure the search query is spelled correctly and that the Geocoding API is enabled on your API key.",
            endpoint: data.endpoint || "https://geocode.googleapis.com/v4/geocode/address/",
            raw: data.raw || data,
            timestamp: new Date().toLocaleTimeString(),
          };
          setError(geocodeError);
        }
      } catch (err: any) {
        console.error("Geocoding request exception:", err);
        setError({
          error: "NETWORK_ERROR",
          message: err.message || "Unable to reach the geocoding service.",
          troubleshooting:
            "Please check your internet connection and verify that the application server is running.",
          endpoint: "https://geocode.googleapis.com/v4/geocode/address/",
          timestamp: new Date().toLocaleTimeString(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, fetchInsights]
  );

  const handleDismissError = () => {
    setError(null);
  };

  const handleRetry = () => {
    if (lastQuery) {
      handleSearch(lastQuery);
    }
  };

  const handleUpdateKey = (newKey: string) => {
    setApiKey(newKey);
    setHasApiKey(Boolean(newKey && newKey.trim().length > 0));
    // Immediately retry with new key
    if (lastQuery) {
      setTimeout(() => {
        handleSearch(lastQuery);
      }, 100);
    }
  };

  const handleSelectHistory = (item: ExplorationHistoryItem) => {
    setSelectedData({
      query: item.query,
      formattedAddress: item.formattedAddress,
      location: item.location,
    });
    fetchInsights(item.query);
  };

  return (
    <main
      id="block-explorer-app"
      className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-stone-100 font-sans"
    >
      {/* 1/3-width Left Editorial Control Panel on Desktop */}
      <EditorialPanel
        onSearch={handleSearch}
        selectedData={selectedData}
        isLoading={isLoading}
        error={error}
        onDismissError={handleDismissError}
        onRetry={handleRetry}
        onUpdateKey={handleUpdateKey}
        hasApiKey={hasApiKey}
        history={history}
        onSelectHistory={handleSelectHistory}
      />

      {/* 2/3-width Right Full-Height Map on Desktop with Local Insights Banner */}
      <div className="w-full lg:w-2/3 xl:w-[68%] h-[55vh] lg:h-full relative overflow-hidden">
        <MapContainer
          apiKey={apiKey}
          selectedData={selectedData}
          onUpdateKey={handleUpdateKey}
        />

        {/* Local Insights Banner at the bottom portion of the map screen */}
        <LocalInsightsBanner
          insights={insights}
          isLoading={isInsightsLoading}
          error={insightsError}
          cityState={currentCityState}
          onRetry={() => fetchInsights(currentCityState)}
          onDismiss={() => {
            setInsightsError(null);
          }}
        />
      </div>
    </main>
  );
}
