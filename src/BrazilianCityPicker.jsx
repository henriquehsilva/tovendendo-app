import { useEffect, useRef, useState } from "react";
import { cityFromAddressComponents, googleMapsEnabled, loadGoogleMaps } from "./googleMaps";

export default function BrazilianCityPicker({ value, onChange, compact = false, label = "Localização" }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState(googleMapsEnabled ? "Carregando cidades…" : "Configure o Google Maps para buscar cidades.");

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!googleMapsEnabled) return undefined;
    let active = true;
    loadGoogleMaps().then((maps) => {
      if (!active || !inputRef.current) return;
      autocompleteRef.current = new maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "br" },
        fields: ["address_components", "geometry", "name"],
        types: ["(cities)"],
      });
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        const selected = cityFromAddressComponents(place.address_components);
        if (!selected) {
          setMessage("Selecione uma cidade brasileira exibida na lista.");
          return;
        }
        onChangeRef.current({
          ...selected,
          latitude: place.geometry?.location?.lat(),
          longitude: place.geometry?.location?.lng(),
        });
        setMessage("Cidade brasileira selecionada pelo Google Maps.");
      });
      setReady(true);
      setMessage("Digite e selecione uma cidade da lista.");
    }).catch(() => active && setMessage("Não foi possível carregar o Google Maps."));
    return () => { active = false; };
  }, []);

  return (
    <label className={`${compact ? "market-city-picker" : "field city-picker"}`}>
      {!compact && <span>{label}</span>}
      <div><span aria-hidden="true">⌖</span><input ref={inputRef} value={value || ""} onChange={(event) => onChangeRef.current({ label: event.target.value, pending: true })} placeholder="Busque sua cidade" aria-label={label} autoComplete="off" disabled={!googleMapsEnabled || !ready} /></div>
      {!compact && <small>{message}</small>}
    </label>
  );
}
