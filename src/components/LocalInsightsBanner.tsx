import React, { useState } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
} from "lucide-react";
import { LocalInsights, InsightsError } from "../types.ts";

interface LocalInsightsBannerProps {
  insights: LocalInsights | null;
  isLoading: boolean;
  error: InsightsError | null;
  cityState: string;
  onRetry: () => void;
  onDismiss?: () => void;
}

export const LocalInsightsBanner: React.FC<LocalInsightsBannerProps> = ({
  insights,
  isLoading,
  error,
  cityState,
  onRetry,
  onDismiss,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  // If closed or if no active activity and no error, don't show unless loading or has data
  if (isClosed && !isLoading && !error) {
    return (
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsClosed(false)}
          className="inline-flex items-center gap-2 rounded-full bg-stone-900/90 text-white px-3.5 py-1.5 text-xs font-medium shadow-lg backdrop-blur-md hover:bg-stone-800 transition-all border border-stone-700 cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Show Local Insights ({cityState || "Location"})</span>
        </button>
      </div>
    );
  }

  // If there's no insights, not loading, and no error, we do not render anything
  if (!isLoading && !error && !insights) {
    return null;
  }

  return (
    <div
      id="local-insights-banner"
      className="absolute bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-8 lg:right-8 z-20 pointer-events-none transition-all duration-300"
    >
      <div className="mx-auto max-w-2xl pointer-events-auto">
        <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-stone-200/90 transition-all">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-indigo-600 to-purple-600 text-white shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-200 animate-pulse" />
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-xs font-bold text-stone-900 tracking-tight truncate">
                  Local Insights: <span className="text-indigo-600">{cityState || "Exploring"}</span>
                </h3>
                <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-100/80">
                  Gemini 2.5 Flash
                </span>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1 shrink-0">
              {isLoading && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-full border border-indigo-100 mr-1">
                  <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                  <span>Curating facts...</span>
                </div>
              )}

              {!isLoading && insights && (
                <button
                  type="button"
                  id="btn-refresh-insights"
                  onClick={onRetry}
                  title="Generate new fun facts"
                  className="rounded-lg p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                id="btn-minimize-insights"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand insights" : "Minimize insights"}
                className="rounded-lg p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
              >
                {isMinimized ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              <button
                type="button"
                id="btn-close-insights"
                onClick={() => {
                  setIsClosed(true);
                  if (onDismiss) onDismiss();
                }}
                title="Dismiss banner"
                className="rounded-lg p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Banner Body (Collapsible) */}
          {!isMinimized && (
            <div className="p-4">
              {/* 1. Loading State */}
              {isLoading && (
                <div className="flex items-center gap-3 py-3 text-xs text-stone-600">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-stone-900">
                      Asking local tour guide for {cityState}...
                    </p>
                    <p className="text-stone-500 text-[11px]">
                      Gemini 2.5 Flash is discovering 3 unusual and surprising local facts.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Error State */}
              {!isLoading && error && (
                <div
                  id="insights-error-container"
                  role="alert"
                  className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-900 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-950">
                        Could not retrieve local insights
                      </p>
                      <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                        {error.message}
                      </p>
                      {error.troubleshooting && (
                        <p className="text-amber-700 text-[10px] mt-1 font-mono">
                          {error.troubleshooting}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-retry-insights-error"
                    onClick={onRetry}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-900 text-white px-2.5 py-1 text-[11px] font-medium hover:bg-amber-800 transition-colors shadow-2xs"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {/* 3. Successful Content State */}
              {!isLoading && !error && insights && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    <Compass className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Tour Guide Fun Facts</span>
                  </div>

                  {/* Inject the clean HTML unordered list (<ul>) directly as requested */}
                  <div
                    id="insights-html-content"
                    className="text-xs text-stone-700 leading-relaxed 
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5
                      [&_li]:marker:text-indigo-500 [&_li]:leading-normal
                      [&_strong]:font-semibold [&_strong]:text-stone-900"
                    dangerouslySetInnerHTML={{ __html: insights.html }}
                  />

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[10px] text-stone-400 font-mono">
                    <span>Target: {insights.cityState}</span>
                    <span>Updated at {insights.timestamp}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
