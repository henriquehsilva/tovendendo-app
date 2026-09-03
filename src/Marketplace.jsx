import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase";
import { demoMarketplaceStores, demoStore } from "./data";

const PAGE_SIZE = 6;
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const categoryNames = (store) => (store.categories || []).map((item) => item.name).filter(Boolean);

function Marketplace() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [location, setLocation] = useState("Todos os lugares");
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

  const categories = useMemo(() => ["Todas", ...new Set(stores.flatMap(categoryNames).sort())], [stores]);
  const locations = useMemo(() => ["Todos os lugares", ...new Set(stores.map((store) => store.address).filter(Boolean).sort())], [stores]);
  const filtered = useMemo(() => {
    const term = normalize(search);
    return stores.filter((store) => {
      const searchable = normalize([store.brand, store.tagline, store.description, store.address, ...categoryNames(store)].join(" "));
      return (!term || searchable.includes(term)) && (category === "Todas" || categoryNames(store).includes(category)) && (location === "Todos os lugares" || store.address === location);
    }).sort((a, b) => sort === "location" ? String(a.address).localeCompare(String(b.address), "pt-BR") : String(a.brand).localeCompare(String(b.brand), "pt-BR"));
  }, [stores, search, category, location, sort]);

  useEffect(() => setPage(1), [search, category, location, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const clear = () => { setSearch(""); setCategory("Todas"); setLocation("Todos os lugares"); };

  return (
    <div className="market-page">
      <header className="market-nav">
        <Link className="product-logo" to="/"><i>●</i> tô<span>vendendo</span></Link>
        <nav><Link to="/doc">Recursos</Link><Link to="/admin/login">Entrar</Link><Link className="button primary small" to="/admin">Criar minha loja</Link></nav>
      </header>
      <main>
        <section className="market-hero">
          <div><p className="eyebrow">COMPRE DE QUEM FAZ ACONTECER</p><h1>Descubra lojas incríveis perto de você.</h1><p>Produtos únicos, marcas independentes e pequenos negócios reunidos em um só lugar.</p></div>
          <form className="market-search" onSubmit={(event) => event.preventDefault()} role="search">
            <span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busque por loja, produto, categoria ou cidade" aria-label="Buscar lojas" />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Limpar busca">×</button>}
          </form>
          <div className="market-suggestions"><span>Buscas populares:</span>{["Moda", "Casa", "Beleza", "Alimentos"].map((item) => <button key={item} onClick={() => setSearch(item)}>{item}</button>)}</div>
        </section>

        <section className="market-directory">
          <div className="market-toolbar">
            <div className="market-filters">
              <label><span>Categoria</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>Localização</span><select value={location} onChange={(event) => setLocation(event.target.value)}>{locations.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <label className="market-sort"><span>Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Nome da loja</option><option value="location">Localização</option></select></label>
          </div>
          <div className="market-result-head"><div><p className="eyebrow">EXPLORE O MARKETPLACE</p><h2>{loading ? "Buscando lojas…" : `${filtered.length} ${filtered.length === 1 ? "loja encontrada" : "lojas encontradas"}`}</h2></div>{(search || category !== "Todas" || location !== "Todos os lugares") && <button onClick={clear}>Limpar filtros ×</button>}</div>

          {error && <div className="market-empty"><b>Algo deu errado</b><p>{error}</p></div>}
          {!loading && !error && visible.length > 0 && <div className="market-grid">{visible.map((store, index) => (
            <Link className="market-card" to={`/loja/${store.slug}`} key={store.id || store.slug}>
              <div className="market-card-image" style={{ backgroundImage: `linear-gradient(180deg, transparent 35%, rgba(8,25,35,.55)), url("${store.heroImage}")` }}><span>{index % 3 === 0 ? "Em destaque" : "Loja online"}</span><i>↗</i></div>
              <div className="market-card-copy"><div className="market-avatar">{String(store.brand || "L").charAt(0)}</div><div className="market-card-title"><h3>{store.brand}</h3><span>Loja verificada ✓</span></div><p>{store.tagline || store.description || "Conheça os produtos desta loja."}</p><div className="market-tags">{categoryNames(store).slice(0, 2).map((item) => <b key={item}>{item}</b>)}{store.address && <small>⌖ {store.address}</small>}</div></div>
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
