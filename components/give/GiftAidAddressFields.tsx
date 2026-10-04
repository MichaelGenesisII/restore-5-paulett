"use client";

import { useEffect, useId, useRef, useState } from "react";

export type GiftAidAddressValue = {
  line1: string;
  city: string;
  postcode: string;
};

type Suggestion = { placeId: string; label: string };

type Props = {
  value: GiftAidAddressValue;
  onChange: (next: GiftAidAddressValue) => void;
  fieldClass: string;
  labelClass: string;
};

function newSessionToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Gift Aid address: Google Places lookup (UK) with a manual entry fallback.
 * If Places is not configured, only manual fields are shown.
 */
export function GiftAidAddressFields({
  value,
  onChange,
  fieldClass,
  labelClass,
}: Props) {
  const listId = useId();
  const [manual, setManual] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef(newSessionToken());
  const debounceRef = useRef<number | null>(null);

  const placesMode = configured === true && !manual;

  useEffect(() => {
    // Probe once — empty input returns configured flag without calling Google.
    void fetch("/api/places/autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: "" }),
    })
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        setConfigured(data.configured === true);
        if (data.configured !== true) setManual(true);
      })
      .catch(() => {
        setConfigured(false);
        setManual(true);
      });
  }, []);

  useEffect(() => {
    if (!placesMode) return;
    const q = query.trim();
    // Short queries are hidden at render time (see visibleSuggestions).
    if (q.length < 3) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void (async () => {
        setLookingUp(true);
        setError(null);
        try {
          const response = await fetch("/api/places/autocomplete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: q,
              sessionToken: sessionRef.current,
            }),
          });
          const data = (await response.json()) as {
            suggestions?: Suggestion[];
            error?: string;
            configured?: boolean;
          };
          if (data.configured === false) {
            setConfigured(false);
            setManual(true);
            return;
          }
          if (!response.ok) {
            setError(
              data.error ??
                "Address lookup failed. Switch to manual entry below.",
            );
            setSuggestions([]);
            return;
          }
          setSuggestions(data.suggestions ?? []);
          setActiveIndex(-1);
        } catch {
          setError("Address lookup failed. Switch to manual entry below.");
          setSuggestions([]);
        } finally {
          setLookingUp(false);
        }
      })();
    }, 280);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, placesMode]);

  async function chooseSuggestion(suggestion: Suggestion) {
    setLookingUp(true);
    setError(null);
    try {
      const response = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: suggestion.placeId,
          sessionToken: sessionRef.current,
        }),
      });
      const data = (await response.json()) as {
        line1?: string;
        city?: string;
        postcode?: string;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Could not load that address.");
        setManual(true);
        return;
      }
      onChange({
        line1: data.line1?.trim() ?? "",
        city: data.city?.trim() ?? "",
        postcode: data.postcode?.trim() ?? "",
      });
      setQuery(suggestion.label);
      setSuggestions([]);
      sessionRef.current = newSessionToken();
    } catch {
      setError("Could not load that address. Enter it manually.");
      setManual(true);
    } finally {
      setLookingUp(false);
    }
  }

  const showFields = manual || configured === false || Boolean(value.line1);
  const visibleSuggestions = query.trim().length >= 3 ? suggestions : [];
  const listOpen = visibleSuggestions.length > 0;
  const optionId = (index: number) => `${listId}-option-${index}`;

  function onLookupKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!listOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % visibleSuggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) =>
        i <= 0 ? visibleSuggestions.length - 1 : i - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void chooseSuggestion(visibleSuggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="grid gap-4 pt-1 sm:grid-cols-2">
      {configured === true ? (
        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
          <p className="text-xs text-pvn-navy/60">
            {manual
              ? "Entering your address by hand."
              : "Start typing your UK home address — or enter it manually."}
          </p>
          <button
            type="button"
            onClick={() => {
              setManual((prev) => !prev);
              setSuggestions([]);
              setError(null);
              if (!manual) sessionRef.current = newSessionToken();
            }}
            className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/70 uppercase underline decoration-pvn-gold/50 underline-offset-4 transition hover:text-pvn-navy"
          >
            {manual ? "Use address lookup" : "Enter address manually"}
          </button>
        </div>
      ) : null}

      {placesMode ? (
        <div className="relative flex flex-col gap-2 sm:col-span-2">
          <label htmlFor="give-address-lookup" className={labelClass}>
            Find your home address
          </label>
          <input
            id="give-address-lookup"
            role="combobox"
            className={fieldClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onLookupKeyDown}
            autoComplete="off"
            placeholder="Start typing street and town…"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={listOpen}
            aria-activedescendant={
              listOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined
            }
          />
          {lookingUp ? (
            <p className="text-xs text-pvn-navy/55">Looking up…</p>
          ) : null}
          {listOpen ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Address suggestions"
              className="absolute top-full z-10 mt-1 max-h-56 w-full overflow-auto rounded-sm border border-pvn-navy/15 bg-white shadow-[0_16px_40px_-24px_rgba(12,27,51,0.45)]"
            >
              {visibleSuggestions.map((item, index) => (
                <li
                  key={item.placeId}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  // Keep focus in the input so typing can continue.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void chooseSuggestion(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`cursor-pointer px-3.5 py-2.5 text-left text-sm text-pvn-navy transition ${
                    index === activeIndex ? "bg-pvn-gold/15" : ""
                  }`}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-800 sm:col-span-2" role="alert">
          {error}
        </p>
      ) : null}

      {showFields ? (
        <>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label htmlFor="give-address" className={labelClass}>
              Home address
            </label>
            <input
              id="give-address"
              className={fieldClass}
              value={value.line1}
              onChange={(event) =>
                onChange({ ...value, line1: event.target.value })
              }
              autoComplete="address-line1"
              placeholder="5 Paulett Avenue"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="give-city" className={labelClass}>
              Town or city
            </label>
            <input
              id="give-city"
              className={fieldClass}
              value={value.city}
              onChange={(event) =>
                onChange({ ...value, city: event.target.value })
              }
              autoComplete="address-level2"
              placeholder="Belfast"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="give-postcode" className={labelClass}>
              Postcode
            </label>
            <input
              id="give-postcode"
              className={`${fieldClass} uppercase`}
              value={value.postcode}
              onChange={(event) =>
                onChange({ ...value, postcode: event.target.value })
              }
              autoComplete="postal-code"
              placeholder="BT4 1AA"
              required
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
