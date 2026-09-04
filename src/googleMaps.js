let mapsPromise;

export const googleMapsEnabled = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!googleMapsEnabled) return Promise.reject(new Error("Google Maps não configurado."));
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise((resolve, reject) => {
    const callback = `initTvMaps${Date.now()}`;
    window[callback] = () => {
      delete window[callback];
      resolve(window.google.maps);
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)}&v=weekly&libraries=places&language=pt-BR&region=BR&callback=${callback}`;
    script.async = true;
    script.onerror = () => {
      delete window[callback];
      mapsPromise = undefined;
      reject(new Error("Não foi possível carregar o Google Maps."));
    };
    document.head.appendChild(script);
  });
  return mapsPromise;
}

const component = (components, type) =>
  components?.find((item) => item.types.includes(type));

export function cityFromAddressComponents(components = []) {
  const city = component(components, "administrative_area_level_2")?.long_name
    || component(components, "locality")?.long_name;
  const state = component(components, "administrative_area_level_1")?.short_name;
  const country = component(components, "country")?.short_name;
  if (!city || !state || String(country).toUpperCase() !== "BR") return null;
  return { city, state: state.toUpperCase(), label: `${city} · ${state.toUpperCase()}` };
}

export async function reverseGeocodeBrazilianCity(latitude, longitude) {
  const maps = await loadGoogleMaps();
  const { results } = await new maps.Geocoder().geocode({
    location: { lat: latitude, lng: longitude },
    region: "BR",
  });
  for (const result of results) {
    const city = cityFromAddressComponents(result.address_components);
    if (city) return { ...city, latitude, longitude };
  }
  throw new Error("Não foi possível identificar uma cidade brasileira.");
}
