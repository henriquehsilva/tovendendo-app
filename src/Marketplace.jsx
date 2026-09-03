import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase";
import { demoMarketplaceStores, demoStore } from "./data";

const PAGE_SIZE = 9;
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const categoryNames = (store) => (store.categories || []).map((item) => item.name).filter(Boolean);
const categoryIcon = (name) => {
  const normalized = normalize(name);
  if (normalized.includes("moda") || normalized.includes("acessor")) return "♢";
  if (normalized.includes("casa") || normalized.includes("decor")) return "⌂";
  if (normalized.includes("beleza")) return "✦";
  if (normalized.includes("alimento") || normalized.includes("doce")) return "◒";
  if (normalized.includes("infantil")) return "☆";
  if (normalized.includes("jardim")) return "❋";
  return "◉";
};

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
  const featuredCategories = categories.filter((item) => item !== "Todas").slice(0, 8);
  const clear = () => { setSearch(""); setCategory("Todas"); setLocation("Todos os lugares"); };

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
            <label className="market-search-location"><span aria-hidden="true">⌖</span><select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Escolher localização">{locations.map((item) => <option key={item}>{item}</option>)}</select></label>
            <button className="market-search-submit" type="submit">Buscar</button>
          </form>
          <div className="market-suggestions"><span>Mais buscados:</span>{["Moda", "Casa", "Beleza", "Alimentos"].map((item) => <button key={item} onClick={() => setSearch(item)}>{item}</button>)}</div>
        </section>

        <section className="market-category-shelf" aria-label="Categorias em destaque">
          <div className="market-section-heading"><div><p className="eyebrow">NAVEGUE POR CATEGORIA</p><h2>O que você procura hoje?</h2></div><button onClick={() => setCategory("Todas")}>Ver todas</button></div>
          <div className="market-category-list">
            {featuredCategories.map((item, index) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}><i style={{ "--category-index": index }}>{categoryIcon(item)}</i><span>{item}</span></button>)}
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
          <div className="market-result-head"><div><p className="eyebrow">EXPLORE O MARKETPLACE</p><h2>{loading ? "Buscando lojas…" : `${filtered.length} ${filtered.length === 1 ? "loja encontrada" : "lojas encontradas"}`}</h2></div>{(search || category !== "Todas" || location !== "Todos os lugares") && <button onClick={clear}>Limpar filtros ×</button>}</div>

          {error && <div className="market-empty"><b>Algo deu errado</b><p>{error}</p></div>}
          {!loading && !error && visible.length > 0 && <div className="market-grid">{visible.map((store, index) => (
            <Link className="market-card" to={`/loja/${store.slug}`} key={store.id || store.slug}>
              <div className="market-card-image" style={{ backgroundImage: `linear-gradient(180deg, transparent 42%, rgba(8,25,35,.62)), url("${store.heroImage}")` }}><span>{index % 3 === 0 ? "Destaque" : "Loja online"}</span><i>↗</i><small>⌖ {store.address || "Loja online"}</small></div>
              <div className="market-card-copy"><div className="market-avatar">{store.logoUrl ? <img src={store.logoUrl} alt="" /> : String(store.brand || "L").charAt(0)}</div><div className="market-card-title"><h3>{store.brand}</h3><span>✓ Verificada</span></div><p>{store.tagline || store.description || "Conheça os produtos desta loja."}</p><div className="market-tags">{categoryNames(store).slice(0, 3).map((item) => <b key={item}>{item}</b>)}</div><strong className="market-card-action">Visitar loja <span>→</span></strong></div>
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
