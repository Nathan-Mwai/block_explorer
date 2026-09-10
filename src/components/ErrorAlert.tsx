import React, { useState } from "react";
import { AlertTriangle, XCircle, Info, RefreshCw, ChevronDown, ChevronUp, Key, ExternalLink } from "lucide-react";
import { GeocodeError } from "../types.ts";

interface ErrorAlertProps {
  error: GeocodeError;
  onDismiss: () => void;
  onRetry?: () => void;
  onUpdateKey?: (newKey: string) => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onDismiss,
  onRetry,
  onUpdateKey,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [manualKey, setManualKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const isKeyError = error.error === "MISSING_API_KEY" || error.error === "REQUEST_DENIED";

  return (
    <div
      id="geocode-error-alert"
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50/90 p-4 shadow-sm backdrop-blur-sm transition-all text-stone-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-red-900 text-sm">
                Geocoding Notice
              </span>
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-mono font-medium text-red-800">
                {error.error}
              </span>
            </div>
            <p className="text-sm text-red-800 leading-relaxed font-normal">
              {error.message}
            </p>
          </div>
        </div>

        <button
          id="btn-dismiss-error"
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors"
          title="Dismiss notification"
          aria-label="Dismiss error"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      {error.troubleshooting && (
        <div className="mt-3 rounded-lg bg-white/80 p-3 text-xs text-stone-700 border border-red-100">
          <div className="flex items-center gap-1.5 font-semibold text-stone-900 mb-1">
            <Info className="h-3.5 w-3.5 text-red-600" />
            <span>Troubleshooting Guide</span>
          </div>
          <p className="leading-relaxed text-stone-600">{error.troubleshooting}</p>

          {isKeyError && (
            <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap items-center gap-3">
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
              >
                <span>Get free Maps Demo Key</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              {onUpdateKey && (
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="inline-flex items-center gap-1 text-stone-700 hover:text-stone-900 font-medium underline"
                >
                  <Key className="h-3 w-3" />
                  <span>{showKeyInput ? "Hide quick key entry" : "Enter API key in session"}</span>
                </button>
              )}
            </div>
          )}

          {showKeyInput && onUpdateKey && (
            <div className="mt-3 flex items-center gap-2">
              <input
                id="input-troubleshoot-api-key"
                type="text"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder="Paste AIZA... API Key here"
                className="flex-1 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-500 font-mono"
              />
              <button
                id="btn-apply-troubleshoot-key"
                type="button"
                onClick={() => {
                  if (manualKey.trim()) {
                    onUpdateKey(manualKey.trim());
                    setShowKeyInput(false);
                  }
                }}
                className="rounded-md bg-stone-900 px-3 py-1 text-xs font-medium text-white hover:bg-stone-800 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer with actions and collapsible debug details */}
      <div className="mt-3 flex items-center justify-between text-xs pt-1 border-t border-red-100/60">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900"
        >
          <span>Technical Info</span>
          {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {onRetry && (
          <button
            id="btn-retry-geocode"
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 font-medium text-stone-700 border border-stone-200 shadow-2xs hover:bg-stone-50 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry Request</span>
          </button>
        )}
      </div>

      {showDetails && (
        <div className="mt-2 rounded bg-stone-900 p-2 text-[11px] font-mono text-stone-200 overflow-x-auto max-h-36">
          <p className="text-stone-400 mb-1">Target Endpoint: {error.endpoint || "https://geocode.googleapis.com/v4/geocode/address/"}</p>
          <p className="text-stone-400 mb-1">Timestamp: {error.timestamp}</p>
          {error.raw && (
            <pre className="text-stone-300 whitespace-pre-wrap">{JSON.stringify(error.raw, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
};
