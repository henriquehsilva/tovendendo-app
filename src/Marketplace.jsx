import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase";
import { demoMarketplaceStores, demoStore } from "./data";
import BrazilianCityPicker from "./BrazilianCityPicker";
import { googleMapsEnabled, reverseGeocodeBrazilianCity } from "./googleMaps";

const PAGE_SIZE = 8;
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const categoryNames = (store) => (store.categories || []).map((item) => item.name).filter(Boolean);
const categoryIcon = (name) => {
  const normalized = normalize(name);
  if (normalized.includes("moda") || normalized.includes("acessor")) return "fashion";
  if (normalized.includes("casa") || normalized.includes("decor")) return "home";
  if (normalized.includes("beleza")) return "beauty";
  if (normalized.includes("alimento") || normalized.includes("doce") || normalized.includes("cafe")) return "food";
  if (normalized.includes("infantil")) return "kids";
  if (normalized.includes("jardim")) return "garden";
  if (normalized.includes("papel")) return "paper";
  return "shop";
};

function CategoryIcon({ name }) {
  const type = categoryIcon(name);
  const drawings = {
    fashion: <><path d="M7.5 9 9 5.5l3-1.5 3 1.5L16.5 9l-2.3 1.1V20H9.8v-9.9Z"/><path d="M9 5.5c.6 1.3 1.6 2 3 2s2.4-.7 3-2"/></>,
    home: <><path d="m4 11 8-7 8 7"/><path d="M6.5 9.5V20h11V9.5M10 20v-5h4v5"/></>,
    beauty: <><path d="M9 3h6v4l2 2.5V20H7V9.5L9 7Z"/><path d="M9 7h6M10 13c1.5 1 2.5 1 4 0"/></>,
    food: <><path d="M5 4v6a3 3 0 0 0 3 3V4M5 8h3M8 13v7M15 4v16M15 4c3 1 4 3 4 6h-4"/></>,
    kids: <><path d="m12 3 2.2 4.5 4.8.7-3.5 3.5.8 5-4.3-2.4-4.3 2.4.8-5L5 8.2l4.8-.7Z"/><path d="M10 11.5h.1M14 11.5h.1"/></>,
    garden: <><path d="M12 20v-8"/><path d="M12 13C7 13 5 10 5 6c4 0 7 2 7 7ZM12 16c4 0 6-2.5 6-6-3.5 0-6 2-6 6Z"/></>,
    paper: <><path d="M6 3h9l3 3v15H6Z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></>,
    shop: <><path d="M4 9h16l-2-5H6Z"/><path d="M5.5 9v11h13V9M9 20v-6h6v6"/><path d="M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{drawings[type]}</svg>;
}

function Marketplace() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [location, setLocation] = useState("");
  const [locationStatus, setLocationStatus] = useState(googleMapsEnabled ? "Localizando você…" : "Escolha uma cidade");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = "Descubra lojas | Tô Vendendo";
    if (!firebaseEnabled) {
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem("tv-store") || "null");
      } catch {
        // Storage pode ser bloqueado em previews incorporados.
      }
      setStores([...(saved?.published ? [saved] : []), demoStore, ...demoMarketplaceStores]);
      setLoading(false);
      return () => { document.title = "Tô Vendendo"; };
    }
    getDocs(query(collection(db, "stores"), where("published", "==", true)))
      .then((snapshot) => setStores(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))))
      .catch(() => setError("Não foi possível carregar as lojas agora. Tente novamente em instantes."))
      .finally(() => setLoading(false));
    return () => { document.title = "Tô Vendendo"; };
  }, []);

  useEffect(() => {
    if (!googleMapsEnabled || !navigator.geolocation) {
      setLocationStatus("Digite uma cidade brasileira");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => reverseGeocodeBrazilianCity(coords.latitude, coords.longitude)
        .then((place) => {
          setLocation(place.label);
          setLocationStatus(`Usando sua localização: ${place.label}`);
        })
        .catch(() => setLocationStatus("Não identificamos sua cidade. Escolha manualmente.")),
      () => setLocationStatus("Localização não permitida. Escolha sua cidade."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  const categories = useMemo(() => ["Todas", ...new Set(stores.flatMap(categoryNames).sort())], [stores]);
  const filtered = useMemo(() => {
    const term = normalize(search);
    return stores.filter((store) => {
      const searchable = normalize([store.brand, store.tagline, store.description, store.address, ...categoryNames(store)].join(" "));
      const storeLocation = store.city && store.state ? `${store.city} · ${store.state}` : store.address;
      return (!term || searchable.includes(term)) && (category === "Todas" || categoryNames(store).includes(category)) && (!location || normalize(storeLocation) === normalize(location));
    }).sort((a, b) => sort === "location" ? String(a.address).localeCompare(String(b.address), "pt-BR") : String(a.brand).localeCompare(String(b.brand), "pt-BR"));
  }, [stores, search, category, location, sort]);

  useEffect(() => setPage(1), [search, category, location, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const featuredCategories = categories.filter((item) => item !== "Todas").slice(0, 8);
  const clear = () => { setSearch(""); setCategory("Todas"); setLocation(""); setLocationStatus("Mostrando lojas de todo o Brasil"); };

  return (
    <div className="market-page">
      <header className="market-nav">
        <Link className="product-logo" to="/"><i>●</i> tô<span>vendendo</span></Link>
        <nav><Link to="/doc">Recursos</Link><Link to="/admin/login">Entrar</Link><Link className="button primary small" to="/admin">Criar minha loja</Link></nav>
      </header>
      <main>
        <section className="market-hero">
          <div><p className="eyebrow">O MARKETPLACE DOS PEQUENOS NEGÓCIOS</p><h1>Encontre algo especial perto de você.</h1><p>Explore lojas independentes, descubra produtos únicos e compre diretamente de quem faz acontecer.</p></div>
          <form className="market-search" onSubmit={(event) => event.preventDefault()} role="search">
            <label className="market-search-term"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="O que você está procurando?" aria-label="Buscar lojas, produtos ou categorias" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Limpar busca">×</button>}</label>
            <BrazilianCityPicker compact label="Escolher cidade brasileira" value={location} onChange={(place) => { setLocation(place.label); setLocationStatus(place.pending ? "Selecione uma sugestão do Google Maps" : `Mostrando lojas em ${place.label}`); }} />
            <button className="market-search-submit" type="submit">Buscar</button>
          </form>
          <p className="market-location-status">⌖ {locationStatus} {location && <button type="button" onClick={() => { setLocation(""); setLocationStatus("Mostrando lojas de todo o Brasil"); }}>Ver todo o Brasil</button>}</p>
          <div className="market-suggestions"><span>Mais buscados:</span>{["Moda", "Casa", "Beleza", "Alimentos"].map((item) => <button key={item} onClick={() => setSearch(item)}>{item}</button>)}</div>
        </section>

        <section className="market-category-shelf" aria-label="Categorias em destaque">
          <div className="market-section-heading"><div><p className="eyebrow">NAVEGUE POR CATEGORIA</p><h2>O que você procura hoje?</h2></div><button onClick={() => setCategory("Todas")}>Ver todas</button></div>
          <div className="market-category-list">
            {featuredCategories.map((item, index) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}><i style={{ "--category-index": index }}><CategoryIcon name={item} /></i><span>{item}</span></button>)}
          </div>
        </section>

        <section className="market-confidence"><div><i>✓</i><span><b>Lojas reais</b><small>Negócios independentes em um só lugar</small></span></div><div><i>⌖</i><span><b>Compre perto</b><small>Encontre quem vende na sua região</small></span></div><div><i>↗</i><span><b>Contato direto</b><small>Fale com a loja sem intermediários</small></span></div></section>

        <section className="market-directory">
          <div className="market-toolbar">
            <div className="market-filters">
              <label><span>Categoria</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <label className="market-sort"><span>Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Nome da loja</option><option value="location">Localização</option></select></label>
          </div>
          <div className="market-result-head"><div><p className="eyebrow">EXPLORE O MARKETPLACE</p><h2>{loading ? "Buscando lojas…" : `${filtered.length} ${filtered.length === 1 ? "loja encontrada" : "lojas encontradas"}`}</h2></div>{(search || category !== "Todas" || location) && <button onClick={clear}>Limpar filtros ×</button>}</div>

          {error && <div className="market-empty"><b>Algo deu errado</b><p>{error}</p></div>}
          {!loading && !error && visible.length > 0 && <div className="market-grid">{visible.map((store, index) => (
            <Link className="market-card" to={`/loja/${store.slug}`} key={store.id || store.slug}>
              <div className="market-card-image" style={{ backgroundImage: `url("${store.heroImage}")` }}><span>{index % 3 === 0 ? "Destaque" : "Loja online"}</span></div>
              <div className="market-card-copy"><div className="market-card-title"><h3>{store.brand}</h3><span aria-label="Loja verificada">✓</span></div><p>{store.tagline || store.description || "Conheça os produtos desta loja."}</p><div className="market-tags">{categoryNames(store).slice(0, 2).map((item) => <b key={item}>{item}</b>)}</div><div className="market-card-meta"><span>⌖ {store.address || "Loja online"}</span><span>Retirada ou entrega a combinar</span></div><strong className="market-card-action">Ver loja <span>›</span></strong></div>
            </Link>
          ))}</div>}
          {!loading && !error && visible.length === 0 && <div className="market-empty"><span>⌕</span><b>Nenhuma loja encontrada</b><p>Tente outro termo ou remova os filtros para ampliar sua busca.</p><button className="button outline" onClick={clear}>Limpar busca</button></div>}

          {!loading && pages > 1 && <nav className="market-pagination" aria-label="Paginação"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>← Anterior</button><div>{Array.from({ length: pages }, (_, index) => index + 1).map((item) => <button className={page === item ? "active" : ""} aria-current={page === item ? "page" : undefined} onClick={() => setPage(item)} key={item}>{item}</button>)}</div><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>Próxima →</button></nav>}
        </section>
        <section className="market-cta"><div><p className="eyebrow">VENDA DO SEU JEITO</p><h2>Quer ver sua loja aqui?</h2><p>Crie sua vitrine, publique seus produtos e seja encontrado por novos clientes.</p></div><Link className="button light" to="/admin">Criar minha loja grátis →</Link></section>
      </main>
      <footer className="market-footer"><span>© 2026 Tô Vendendo</span><Link to="/doc">Conheça os recursos</Link><Link to="/">Página inicial</Link></footer>
    </div>
  );
}

export default Marketplace;
