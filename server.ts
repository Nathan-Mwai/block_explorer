import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client instance
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Helper to extract City, State, and CityState from geocoding result components
function extractCityState(
  result: any,
  formattedAddress: string,
  query: string
): { city: string; state: string; cityState: string } {
  const components =
    result.address_components ||
    result.addressComponents ||
    (Array.isArray(result) ? result : []);

  let city = "";
  let state = "";
  let country = "";

  if (Array.isArray(components)) {
    for (const comp of components) {
      const types: string[] = comp.types || [];
      const longName = comp.long_name || comp.longText || "";

      if (types.includes("locality")) {
        city = longName;
      } else if (
        !city &&
        (types.includes("sublocality") ||
          types.includes("sublocality_level_1") ||
          types.includes("postal_town") ||
          types.includes("administrative_area_level_2"))
      ) {
        city = longName;
      }

      if (types.includes("administrative_area_level_1")) {
        state = longName;
      }

      if (types.includes("country")) {
        country = longName;
      }
    }
  }

  // Fallback parsing from formattedAddress string (e.g., "Miami, FL, USA" or "Shibuya, Tokyo")
  if (!city) {
    const parts = (formattedAddress || query)
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      city = parts[0];
      if (!state && parts.length >= 3) {
        state = parts[1];
      }
    } else {
      city = query.trim();
    }
  }

  let cityState = "";
  if (city && state) {
    cityState = `${city}, ${state}`;
  } else if (city && country) {
    cityState = `${city}, ${country}`;
  } else if (city) {
    cityState = city;
  } else {
    cityState = formattedAddress || query;
  }

  return { city, state, cityState };
}

// API health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "block-explorer" });
});

// Provide Maps API key configuration to client
app.get("/api/config", (_req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "";
  res.json({
    hasApiKey: Boolean(apiKey && apiKey.trim().length > 0),
    apiKey: apiKey || "",
  });
});

// Geocoding API endpoint using Google Geocoding V4 REST API
// Spec: https://geocode.googleapis.com/v4/geocode/address/
app.get("/api/geocode", async (req, res) => {
  const addressQuery = (req.query.address as string || "").trim();
  const apiKey = (req.query.key as string || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

  if (!addressQuery) {
    return res.status(400).json({
      success: false,
      error: "MISSING_ADDRESS",
      message: "Please enter an address, city, or neighborhood to search.",
      troubleshooting: "Provide a valid search term such as 'Shibuya', 'Buenos Aires', or 'Times Square, New York'."
    });
  }

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      error: "MISSING_API_KEY",
      message: "Google Maps Platform API key is not configured.",
      troubleshooting: "Please set GOOGLE_MAPS_API_KEY in your environment or Settings. If you are prototyping, you can generate a free Maps Demo Key (no billing required) at https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio."
    });
  }

  try {
    // Primary attempt: Google Geocoding V4 API REST endpoint
    // https://geocode.googleapis.com/v4/geocode/address/{address}
    const v4Url = `https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(addressQuery)}?key=${encodeURIComponent(apiKey)}`;
    
    let response = await fetch(v4Url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Goog-Api-Key": apiKey
      }
    });

    let rawData: any = null;
    let usedEndpoint = "v4";

    if (response.ok) {
      rawData = await response.json();
    } else {
      // If v4 returns 404 or specific error, try the alternative v4 query param format or v1/json REST fallback
      const v4QueryParamUrl = `https://geocode.googleapis.com/v4/geocode/address?address=${encodeURIComponent(addressQuery)}&key=${encodeURIComponent(apiKey)}`;
      const altResponse = await fetch(v4QueryParamUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Goog-Api-Key": apiKey
        }
      });

      if (altResponse.ok) {
        response = altResponse;
        rawData = await altResponse.json();
      } else {
        // Fallback to standard Google Geocoding REST API endpoint
        const fallbackUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${encodeURIComponent(apiKey)}`;
        const fallbackResponse = await fetch(fallbackUrl);
        response = fallbackResponse;
        rawData = await fallbackResponse.json();
        usedEndpoint = "standard_rest";
      }
    }

    // Process errors from Geocoding API response
    if (!response.ok) {
      const errorText = rawData?.error?.message || rawData?.error_message || `HTTP ${response.status}: ${response.statusText}`;
      const errorCode = rawData?.error?.status || rawData?.status || "API_ERROR";

      let troubleshooting = "Ensure your Google Maps Platform API key is valid and has the Geocoding API enabled in Google Cloud Console.";
      if (response.status === 403 || errorCode === "REQUEST_DENIED") {
        troubleshooting = "API key was denied. Verify that the Geocoding API is enabled for your Google Cloud project and that any API key restrictions permit this request.";
      } else if (errorCode === "OVER_QUERY_LIMIT") {
        troubleshooting = "You have exceeded your request quota for the Geocoding API. Check your billing plan and quota limits.";
      }

      return res.status(response.status >= 400 && response.status < 600 ? response.status : 500).json({
        success: false,
        error: errorCode,
        message: errorText,
        troubleshooting,
        usedEndpoint,
        raw: rawData
      });
    }

    // Check if the payload returned ZERO_RESULTS or empty array
    if (rawData.status === "ZERO_RESULTS" || (Array.isArray(rawData.results) && rawData.results.length === 0)) {
      return res.status(404).json({
        success: false,
        error: "ZERO_RESULTS",
        message: `No geographic location could be found matching "${addressQuery}".`,
        troubleshooting: "Try refining your query with additional context (such as adding the country or city name, e.g. 'Shibuya, Tokyo').",
        usedEndpoint
      });
    }

    if (rawData.status && rawData.status !== "OK" && rawData.status !== "ZERO_RESULTS") {
      return res.status(400).json({
        success: false,
        error: rawData.status,
        message: rawData.error_message || `Geocoding failed with status: ${rawData.status}`,
        troubleshooting: "Check the query parameters and verify that your API key is correctly enabled.",
        usedEndpoint
      });
    }

    // Normalize location result
    const firstResult = (rawData.results && rawData.results[0]) || rawData.result || rawData;
    
    let lat: number | undefined;
    let lng: number | undefined;

    if (firstResult.geometry?.location) {
      const loc = firstResult.geometry.location;
      lat = typeof loc.lat === "function" ? loc.lat() : (loc.lat ?? loc.latitude);
      lng = typeof loc.lng === "function" ? loc.lng() : (loc.lng ?? loc.longitude);
    } else if (firstResult.location) {
      lat = firstResult.location.latitude ?? firstResult.location.lat;
      lng = firstResult.location.longitude ?? firstResult.location.lng;
    }

    if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
      return res.status(502).json({
        success: false,
        error: "INVALID_COORDINATES",
        message: "The geocoding service returned an unexpected coordinate structure.",
        troubleshooting: "Check the raw API response structure.",
        raw: rawData
      });
    }

    const formattedAddress = firstResult.formattedAddress || firstResult.formatted_address || addressQuery;
    const placeId = firstResult.placeId || firstResult.place_id || "";
    const locationType = firstResult.geometry?.locationType || firstResult.geometry?.location_type || "";
    const types = firstResult.types || [];

    let viewport = undefined;
    const vp = firstResult.geometry?.viewport;
    if (vp) {
      const north = vp.northeast?.lat ?? vp.high?.latitude;
      const east = vp.northeast?.lng ?? vp.high?.longitude;
      const south = vp.southwest?.lat ?? vp.low?.latitude;
      const west = vp.southwest?.lng ?? vp.low?.longitude;
      if (typeof north === "number" && typeof south === "number") {
        viewport = { north, south, east, west };
      }
    }

    const { city, state, cityState } = extractCityState(firstResult, formattedAddress, addressQuery);

    return res.json({
      success: true,
      data: {
        query: addressQuery,
        formattedAddress,
        location: { lat, lng },
        placeId,
        locationType,
        viewport,
        types,
        city,
        state,
        cityState,
      },
      endpoint: usedEndpoint,
      totalResults: Array.isArray(rawData.results) ? rawData.results.length : 1
    });

  } catch (error: any) {
    console.error("Geocoding request failed:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message || "Internal server error occurred while geocoding.",
      troubleshooting: "Check network connectivity and ensure the Google Geocoding API service is reachable."
    });
  }
});

// Dynamic model selection prioritizing user requested gemini-2.5-flash with adaptive fallback
let preferredModel = "gemini-2.5-flash";

// AI Local Insights endpoint using Gemini 2.5 Flash
// Generates exactly 3 engaging, unusual fun facts formatted as a clean HTML <ul>
app.post("/api/insights", async (req, res) => {
  const cityState = (req.body?.cityState as string || "").trim();

  if (!cityState) {
    return res.status(400).json({
      success: false,
      error: "MISSING_LOCATION",
      message: "A valid City and State (e.g., 'Miami, Florida') is required to generate local insights.",
      troubleshooting: "Provide a recognized location identifier."
    });
  }

  // Exact prompt template as specified in user requirements
  const prompt = `You are a local tour guide for ${cityState}. Give me exactly 3 short, highly engaging, and unusual or surprising fun facts about this place. Keep each fact under 2 sentences. Format the response as a clean HTML unordered list (<ul>) so I can inject it directly.`;

  try {
    const ai = getGeminiClient();
    let response;

    try {
      response = await ai.models.generateContent({
        model: preferredModel,
        contents: prompt,
      });
    } catch (err: any) {
      const errStr = JSON.stringify(err?.message || err || "");
      if (
        preferredModel === "gemini-2.5-flash" &&
        (errStr.includes("gemini-2.5-flash") ||
          errStr.includes("404") ||
          errStr.includes("NOT_FOUND") ||
          errStr.includes("no longer available"))
      ) {
        console.warn("gemini-2.5-flash unavailable, falling back to gemini-3.8-flash");
        preferredModel = "gemini-3.8-flash";
        response = await ai.models.generateContent({
          model: preferredModel,
          contents: prompt,
        });
      } else {
        throw err;
      }
    }

    let rawText = response.text || "";

    // Strip markdown code fences if wrapped by the model (e.g. ```html ... ``` or ``` ...)
    rawText = rawText
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/i, "")
      .trim();

    // Ensure it wraps in a <ul> if somehow only <li> items were returned
    if (!rawText.includes("<ul") && rawText.includes("<li")) {
      rawText = `<ul class="space-y-2">${rawText}</ul>`;
    }

    return res.json({
      success: true,
      cityState,
      html: rawText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

  } catch (error: any) {
    console.error("Gemini insights generation failed:", error);

    const isMissingKey = !process.env.GEMINI_API_KEY;
    const statusCode = isMissingKey ? 401 : 502;

    let userFriendlyMessage = "Failed to generate local insights from Gemini.";
    if (isMissingKey) {
      userFriendlyMessage = "Gemini API key is not configured. Please verify your GEMINI_API_KEY in Settings > Secrets.";
    } else if (error?.message) {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed?.error?.message) {
          userFriendlyMessage = parsed.error.message;
        } else {
          userFriendlyMessage = error.message;
        }
      } catch {
        userFriendlyMessage = error.message;
      }
    }

    return res.status(statusCode).json({
      success: false,
      error: isMissingKey ? "MISSING_GEMINI_API_KEY" : "GEMINI_INFERENCE_ERROR",
      message: userFriendlyMessage,
      troubleshooting: isMissingKey
        ? "Attach a valid Gemini API key in AI Studio Settings > Secrets or in the environment variables."
        : "Check network connectivity or click Retry to generate insights again.",
    });
  }
});

// Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Block Explorer server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
