"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { loadGoogleMaps } from "../lib/googleMaps";
import { Input } from "./ui/input";

type Result = {
  longitude: number;
  latitude: number;
  formattedAddress: string;
};

export default function SearchBar({
  onResult,
  loading: externalLoading,
  error: externalError,
  resetSignal,
}: {
  onResult: (r: Result) => void;
  loading?: boolean;
  error?: string | null;
  resetSignal?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !inputRef.current) return;
        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ["geometry", "formatted_address", "name"],
          types: ["address"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          setInputError(null);
          onResult({
            longitude: loc.lng(),
            latitude: loc.lat(),
            formattedAddress: place.formatted_address ?? place.name ?? "",
          });
        });
        autocompleteRef.current = ac;
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Failed to load Google Maps");
      });

    return () => {
      cancelled = true;
    };
  }, [onResult]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.value = "";
  }, [resetSignal]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const value = inputRef.current?.value?.trim();
    if (!value) return;
    const place = autocompleteRef.current?.getPlace();
    if (place?.geometry?.location) return;
    setInputError("Select an address suggestion to search.");
  };

  return (
    <div className="absolute left-3 top-3 z-20 w-[min(440px,calc(100%-24px))]">
      <div className="flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={ready ? "Search New York City address…" : "Loading search…"}
          disabled={!ready}
          onKeyDown={handleKeyDown}
          className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
        {externalLoading && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>
      {(loadError || inputError || externalError) && (
        <div className="mt-2 rounded-md border border-destructive/30 bg-background px-3 py-2 text-xs text-destructive shadow-md">
          {loadError || inputError || externalError}
        </div>
      )}
    </div>
  );
}
