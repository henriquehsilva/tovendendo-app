import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase";
import { demoMarketplaceStores, demoStore } from "./data";
import BrazilianCityPicker from "./BrazilianCityPicker";
import { categoryIconType } from "./categoryCatalog";

const PAGE_SIZE = 8;
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const categoryNames = (store) => (store.categories || []).map((item) => item.name).filter(Boolean);
function CategoryIcon({ name }) {
  const type = categoryIconType(name);
  const drawings = {
    fashion: <><path d="M7.5 9 9 5.5l3-1.5 3 1.5L16.5 9l-2.3 1.1V20H9.8v-9.9Z"/><path d="M9 5.5c.6 1.3 1.6 2 3 2s2.4-.7 3-2"/></>,
    home: <><path d="m4 11 8-7 8 7"/><path d="M6.5 9.5V20h11V9.5M10 20v-5h4v5"/></>,
    beauty: <><path d="M9 3h6v4l2 2.5V20H7V9.5L9 7Z"/><path d="M9 7h6M10 13c1.5 1 2.5 1 4 0"/></>,
    food: <><path d="M5 4v6a3 3 0 0 0 3 3V4M5 8h3M8 13v7M15 4v16M15 4c3 1 4 3 4 6h-4"/></>,
    kids: <><path d="m12 3 2.2 4.5 4.8.7-3.5 3.5.8 5-4.3-2.4-4.3 2.4.8-5L5 8.2l4.8-.7Z"/><path d="M10 11.5h.1M14 11.5h.1"/></>,
    garden: <><path d="M12 20v-8"/><path d="M12 13C7 13 5 10 5 6c4 0 7 2 7 7ZM12 16c4 0 6-2.5 6-6-3.5 0-6 2-6 6Z"/></>,
    paper: <><path d="M6 3h9l3 3v15H6Z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></>,
    tech: <><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M9 20h6M12 16v4M8 9h.01"/></>,
    sport: <><circle cx="12" cy="12" r="8"/><path d="m7 7 3 3-1 4-3 1M17 7l-3 3 1 4 3 1M9 19l3-3 3 3"/></>,
    pet: <><path d="M8.5 11.5c-2.5 1.8-3.5 4.8-1.5 6.3 1.4 1 3-.1 5-.1s3.6 1.1 5 .1c2-1.5 1-4.5-1.5-6.3-2-1.5-5-1.5-7 0Z"/><circle cx="6.5" cy="8" r="1.5"/><circle cx="17.5" cy="8" r="1.5"/><circle cx="10" cy="5.5" r="1.5"/><circle cx="14" cy="5.5" r="1.5"/></>,
    auto: <><path d="m5 16-1-3 2-5h12l2 5-1 3Z"/><path d="M6 16v3M18 16v3M4 13h16M7.5 13h.01M16.5 13h.01"/></>,
    service: <><circle cx="12" cy="8" r="3"/><path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6M18 4v4M16 6h4"/></>,
    leisure: <><path d="M5 4h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3Z"/><path d="M8 19a3 3 0 0 1 0-6h11M9 8h6"/></>,
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
  const [locationState, setLocationState] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const notificationSnapshotReady = useRef(false);

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
    if (!firebaseEnabled || notificationPermission !== "granted") return undefined;
    notificationSnapshotReady.current = false;
    return onSnapshot(query(collection(db, "stores"), where("published", "==", true)), async (snapshot) => {
      if (!notificationSnapshotReady.current) {
        notificationSnapshotReady.current = true;
        return;
      }
      const registration = await navigator.serviceWorker?.ready;
      snapshot.docChanges().filter((change) => change.type === "added").forEach((change) => {
        const store = change.doc.data();
        registration?.showNotification("Nova loja no Tô Vendendo", {
          body: `${store.brand} acabou de chegar${store.city ? ` em ${store.city}` : ""}. Confira!`,
          icon: store.logoUrl || "/icon-192.png",
          badge: "/favicon.png",
          tag: `new-store-${change.doc.id}`,
          data: { url: `/loja/${store.slug}` },
        });
      });
    });
  }, [notificationPermission]);

  const enableNotifications = async () => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      setNotificationPermission("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const categories = useMemo(() => ["Todas", ...new Set(stores.flatMap(categoryNames).sort())], [stores]);
  const filtered = useMemo(() => {
    const term = normalize(search);
    return stores.filter((store) => {
      const searchable = normalize([store.brand, store.tagline, store.description, store.address, ...categoryNames(store)].join(" "));
      const storeCity = store.city || String(store.address || "").split(" · ")[0];
      const storeState = store.state || String(store.address || "").split(" · ")[1];
      return (!term || searchable.includes(term)) && (category === "Todas" || categoryNames(store).includes(category)) && (!locationState || storeState === locationState) && (!locationCity || normalize(storeCity) === normalize(locationCity));
    }).sort((a, b) => sort === "location" ? String(a.address).localeCompare(String(b.address), "pt-BR") : String(a.brand).localeCompare(String(b.brand), "pt-BR"));
  }, [stores, search, category, locationState, locationCity, sort]);

  useEffect(() => setPage(1), [search, category, locationState, locationCity, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const featuredCategories = categories.filter((item) => item !== "Todas").slice(0, 8);
  const clear = () => { setSearch(""); setCategory("Todas"); setLocationState(""); setLocationCity(""); };

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
            <BrazilianCityPicker compact state={locationState} city={locationCity} onChange={(place) => { setLocationState(place.state); setLocationCity(place.city); }} />
            <button className="market-search-submit" type="submit">Buscar</button>
          </form>
          <p className="market-location-status">⌖ {locationCity ? `Mostrando lojas em ${locationCity} · ${locationState}` : locationState ? `Selecione uma cidade de ${locationState}` : "Mostrando lojas de todo o Brasil"}</p>
          <div className="market-suggestions"><span>Mais buscados:</span>{["Moda", "Casa", "Beleza", "Alimentos"].map((item) => <button key={item} onClick={() => setSearch(item)}>{item}</button>)}</div>
        </section>

        <section className="market-category-shelf" aria-label="Categorias em destaque">
          <div className="market-section-heading"><div><p className="eyebrow">NAVEGUE POR CATEGORIA</p><h2>O que você procura hoje?</h2></div><button onClick={() => setCategory("Todas")}>Ver todas</button></div>
          <div className="market-category-list">
            {featuredCategories.map((item, index) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}><i style={{ "--category-index": index }}><CategoryIcon name={item} /></i><span>{item}</span></button>)}
          </div>
        </section>

        <section className="market-confidence"><div><i>✓</i><span><b>Lojas reais</b><small>Negócios independentes em um só lugar</small></span></div><div><i>⌖</i><span><b>Compre perto</b><small>Encontre quem vende na sua região</small></span></div><div><i>↗</i><span><b>Contato direto</b><small>Fale com a loja sem intermediários</small></span></div></section>
        <section className="market-notifications" aria-live="polite"><div><i>♢</i><span><b>Novidades perto de você</b><small>Receba um aviso quando uma nova loja for publicada.</small></span></div>{notificationPermission === "granted" ? <strong>Notificações ativadas ✓</strong> : notificationPermission === "denied" ? <span className="notification-denied">Notificações bloqueadas no navegador</span> : notificationPermission === "unsupported" ? <span className="notification-denied">Indisponível neste navegador</span> : <button className="button primary small" onClick={enableNotifications}>Ativar notificações</button>}</section>

        <section className="market-directory">
          <div className="market-toolbar">
            <div className="market-filters">
              <label><span>Categoria</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <label className="market-sort"><span>Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Nome da loja</option><option value="location">Localização</option></select></label>
          </div>
          <div className="market-result-head"><div><p className="eyebrow">EXPLORE O MARKETPLACE</p><h2>{loading ? "Buscando lojas…" : `${filtered.length} ${filtered.length === 1 ? "loja encontrada" : "lojas encontradas"}`}</h2></div>{(search || category !== "Todas" || locationState) && <button onClick={clear}>Limpar filtros ×</button>}</div>

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
