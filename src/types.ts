export interface GeocodeLocation {
  lat: number;
  lng: number;
}

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeocodeData {
  query: string;
  formattedAddress: string;
  location: GeocodeLocation;
  placeId?: string;
  locationType?: string;
  viewport?: ViewportBounds;
  types?: string[];
  city?: string;
  state?: string;
  cityState?: string;
}

export interface LocalInsights {
  cityState: string;
  html: string;
  timestamp: string;
}

export interface InsightsError {
  error: string;
  message: string;
  cityState: string;
  troubleshooting?: string;
}

export interface GeocodeError {
  error: string;
  message: string;
  troubleshooting?: string;
  endpoint?: string;
  raw?: any;
  timestamp: string;
}

export interface PresetLocation {
  id: string;
  name: string;
  query: string;
  subtitle: string;
  country: string;
  approxLat: number;
  approxLng: number;
  tagline: string;
}

export interface ExplorationHistoryItem {
  id: string;
  query: string;
  formattedAddress: string;
  location: GeocodeLocation;
  timestamp: string;
}
