import { useEffect, useState } from "react";

const API = "https://servicodados.ibge.gov.br/api/v1/localidades";
let statesCache;
const citiesCache = new Map();

const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Falha ao carregar localidades.");
  return response.json();
};

export default function BrazilianCityPicker({ state = "", city = "", onChange, compact = false, label = "Localização" }) {
  const [states, setStates] = useState(statesCache || []);
  const [cities, setCities] = useState(citiesCache.get(state) || []);
  const [loading, setLoading] = useState(!statesCache);
  const [error, setError] = useState("");

  useEffect(() => {
    if (statesCache) return;
    let active = true;
    getJson(`${API}/estados?orderBy=nome`).then((items) => {
      statesCache = items.map(({ id, nome, sigla }) => ({ id, name: nome, code: sigla }));
      if (active) setStates(statesCache);
    }).catch(() => active && setError("Não foi possível carregar os estados."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!state) { setCities([]); return undefined; }
    if (citiesCache.has(state)) { setCities(citiesCache.get(state)); return undefined; }
    let active = true;
    setLoading(true);
    getJson(`${API}/estados/${state}/municipios?orderBy=nome`).then((items) => {
      const normalized = items.map(({ id, nome }) => ({ id, name: nome }));
      citiesCache.set(state, normalized);
      if (active) setCities(normalized);
    }).catch(() => active && setError("Não foi possível carregar as cidades."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [state]);

  const fields = <div className="brazil-location-fields">
    <select value={state} onChange={(event) => onChange({ state: event.target.value, city: "", label: "" })} aria-label="Estado" disabled={!states.length}>
      <option value="">Estado</option>
      {states.map((item) => <option key={item.id} value={item.code}>{item.code} — {item.name}</option>)}
    </select>
    <select value={city} onChange={(event) => onChange({ state, city: event.target.value, label: `${event.target.value} · ${state}` })} aria-label="Cidade" disabled={!state || loading}>
      <option value="">{loading && state ? "Carregando…" : "Cidade"}</option>
      {cities.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
    </select>
  </div>;

  if (compact) return <div className="market-city-picker">{fields}</div>;
  return <div className="field city-picker"><span>{label}</span>{fields}<small>{error || "Selecione primeiro o estado e depois a cidade."}</small></div>;
}
