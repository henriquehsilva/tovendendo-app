import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db, firebaseEnabled, googleProvider } from "./firebase";
import { demoProducts, demoStore, emptyStore } from "./data";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value) || 0,
  );
const slugify = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const localStore = () => JSON.parse(localStorage.getItem("tv-store") || "null");
const localProducts = () =>
  JSON.parse(localStorage.getItem("tv-products") || "null");
const saveLocal = (store, products) => {
  localStorage.setItem("tv-store", JSON.stringify(store));
  localStorage.setItem("tv-products", JSON.stringify(products));
};
const googleAuthError = (error) =>
  ({
    "auth/unauthorized-domain": `Este domínio (${location.hostname}) não está autorizado no Firebase. Adicione-o em Authentication → Settings → Authorized domains.`,
    "auth/operation-not-allowed":
      "O login com Google está desativado. Ative Google em Firebase Authentication → Sign-in method.",
    "auth/configuration-not-found":
      "O Firebase Authentication ainda não foi configurado para este projeto.",
    "auth/popup-blocked":
      "O navegador bloqueou a janela do Google. Libere popups para este site e tente novamente.",
    "auth/cancelled-popup-request":
      "Outra tentativa de login já está aberta. Conclua ou feche a janela anterior.",
    "auth/network-request-failed":
      "Falha de conexão com o Google. Verifique sua internet e tente novamente.",
    "auth/account-exists-with-different-credential":
      "Este e-mail já usa outra forma de acesso. Entre com e-mail e senha primeiro.",
  })[error?.code] ||
  `Não foi possível entrar com o Google (${error?.code || "erro desconhecido"}).`;

function Logo() {
  return (
    <Link className="product-logo" to="/">
      <i>●</i> tô<span>vendendo</span>
    </Link>
  );
}

function Landing() {
  const [pro, setPro] = useState(false);
  return (
    <div>
      <header className="marketing-nav">
        <Logo />
        <nav>
          <Link to="/admin/login">Entrar</Link>
          <Link className="button primary small" to="/admin">
            Criar minha loja
          </Link>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div>
            <p className="eyebrow">SITE PARA QUEM VENDE</p>
            <h1>Sua loja online, bonita e pronta para vender.</h1>
            <p>
              Publique produtos variados, acompanhe o estoque e receba no cartão
              com parcelamento pelo Mercado Pago.
            </p>
            <Link className="button primary" to="/admin">
              Testar grátis por 30 dias
            </Link>
            <small>Acesso completo por 30 dias. Sem precisar programar.</small>
          </div>
          <Phone />
        </section>
        <section className="benefits">
          <span>◉ Link exclusivo para sua loja</span>
          <span>▣ Estoque sob controle</span>
          <span>↗ Pagamento parcelado</span>
        </section>
        <section className="how">
          <p className="eyebrow">SIMPLES DE VERDADE</p>
          <h2>Do produto ao pagamento.</h2>
          <div className="steps">
            <article>
              <b>01</b>
              <h3>Monte a vitrine</h3>
              <p>Cadastre sua marca, produtos, fotos e preços.</p>
            </article>
            <article>
              <b>02</b>
              <h3>Controle o estoque</h3>
              <p>Veja quantidades e bloqueie itens esgotados.</p>
            </article>
            <article>
              <b>03</b>
              <h3>Venda online</h3>
              <p>Seu cliente compra com Mercado Pago e escolhe as parcelas.</p>
            </article>
          </div>
        </section>
        <Plans onPro={() => setPro(true)} />
        <section className="cta">
          <h2>Tem algo para vender?</h2>
          <p>Dê à sua loja um endereço profissional hoje.</p>
          <Link className="button primary" to="/admin">
            Começar agora
          </Link>
        </section>
      </main>
      <footer>© 2026 Tô Vendendo · Feito para pequenos negócios.</footer>
      {pro && <ProModal onClose={() => setPro(false)} />}
    </div>
  );
}
function Plans({ onPro }) {
  return (
    <section className="plans">
      <div>
        <p className="eyebrow">PLANOS SIMPLES</p>
        <h2>Comece hoje, cresça no seu ritmo.</h2>
      </div>
      <div className="plan-grid">
        <article className="plan">
          <h3>Teste grátis</h3>
          <p>Acesso completo para conhecer a plataforma.</p>
          <strong>30 dias</strong>
          <ul>
            <li>✓ Loja e link exclusivos</li>
            <li>✓ Cadastro de produtos</li>
            <li>✓ Controle de estoque</li>
            <li>✓ Pedidos pelo WhatsApp</li>
          </ul>
          <p className="plan-note">
            Depois do teste, assine o Pro para continuar usando o painel.
          </p>
          <Link className="button outline" to="/admin">
            Começar teste grátis
          </Link>
        </article>
        <article className="plan featured">
          <span className="tag">MAIS ESCOLHIDO</span>
          <h3>Pro</h3>
          <p>Para vender online sem interrupções.</p>
          <strong>Valor configurado no Stripe</strong>
          <ul>
            <li>✓ Tudo do período de teste</li>
            <li>✓ Mercado Pago por lojista</li>
            <li>✓ Pagamento parcelado</li>
            <li>✓ Gestão contínua de estoque</li>
            <li>✓ Suporte de configuração</li>
          </ul>
          <p className="plan-note">
            Assinatura recorrente processada com segurança pelo Stripe.
          </p>
          <button className="button primary" onClick={onPro}>
            Quero o Pro
          </button>
        </article>
      </div>
    </section>
  );
}
function ProModal({ onClose }) {
  const [type, setType] = useState("pessoa");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const change = (key, value) => setData((d) => ({ ...d, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/.netlify/functions/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, customerType: type }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      location.href = result.checkoutUrl;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="pro-modal">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">PLANO PRO</p>
        <h2>Prepare seu acesso Pro.</h2>
        <p className="intro">
          Informe seus dados. O cartão será preenchido somente no checkout
          seguro do Stripe.
        </p>
        <form onSubmit={submit}>
          <div className="person-toggle">
            <button
              type="button"
              className={type === "pessoa" ? "selected" : ""}
              onClick={() => setType("pessoa")}
            >
              Pessoa física
            </button>
            <button
              type="button"
              className={type === "empresa" ? "selected" : ""}
              onClick={() => setType("empresa")}
            >
              Empresa
            </button>
          </div>
          <div className="modal-grid">
            <input
              required
              placeholder="Nome completo"
              value={data.name || ""}
              onChange={(e) => change("name", e.target.value)}
            />
            <input
              required
              type="email"
              placeholder="E-mail"
              value={data.email || ""}
              onChange={(e) => change("email", e.target.value)}
            />
            <input
              required
              placeholder="Telefone"
              value={data.phone || ""}
              onChange={(e) => change("phone", e.target.value)}
            />
            <input
              required
              placeholder={type === "empresa" ? "CNPJ" : "CPF"}
              value={data.document || ""}
              onChange={(e) => change("document", e.target.value)}
            />
            {type === "empresa" && (
              <input
                required
                placeholder="Razão social"
                value={data.companyName || ""}
                onChange={(e) => change("companyName", e.target.value)}
              />
            )}
            <input
              required
              placeholder="Endereço"
              value={data.address || ""}
              onChange={(e) => change("address", e.target.value)}
            />
            <input
              required
              placeholder="Cidade"
              value={data.city || ""}
              onChange={(e) => change("city", e.target.value)}
            />
            <input
              required
              maxLength="2"
              placeholder="UF"
              value={data.state || ""}
              onChange={(e) => change("state", e.target.value.toUpperCase())}
            />
            <input
              required
              placeholder="CEP"
              value={data.zip || ""}
              onChange={(e) => change("zip", e.target.value)}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="button primary full" disabled={loading}>
            {loading ? "Abrindo checkout…" : "Continuar para pagamento seguro"}
          </button>
          <small className="secure">
            🔒 Cobrança da assinatura processada pelo Stripe.
          </small>
        </form>
      </section>
    </div>
  );
}
function Phone() {
  return (
    <div className="phone">
      <div className="phone-bar" />
      <div className="phone-image" />
      <div className="phone-copy">
        <small>ACHADINHOS DA ANA</small>
        <h3>Coisas bonitas para o seu dia.</h3>
        <div className="mini-product">
          <span>Bolsa urbana</span>
          <b>R$ 129,90</b>
        </div>
        <button>Comprar agora</button>
      </div>
    </div>
  );
}

function Login({ user }) {
  const nav = useNavigate();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  if (user) return <Navigate to="/admin" />;
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (firebaseEnabled) {
        await (register
          ? createUserWithEmailAndPassword(auth, email, password)
          : signInWithEmailAndPassword(auth, email, password));
      } else localStorage.setItem("tv-demo-user", email);
      nav("/admin");
    } catch (err) {
      setError(err.message);
    }
  };
  const loginGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user")
        setError(googleAuthError(err));
      setGoogleLoading(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Logo />
        <p className="eyebrow">
          {register ? "CRIE SUA CONTA" : "BEM-VINDO DE VOLTA"}
        </p>
        <h1>{register ? "Comece sua loja." : "Entre no painel."}</h1>
        <form onSubmit={submit}>
          <label>
            E-mail
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              required
              minLength="6"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="button primary">
            {register ? "Criar conta" : "Entrar"}
          </button>
        </form>
        {firebaseEnabled && (
          <>
            <div className="auth-divider">
              <span>ou</span>
            </div>
            <button
              className="google-button"
              type="button"
              disabled={googleLoading}
              onClick={loginGoogle}
            >
              <img src="/google-g.svg" alt="" />
              <span>
                {googleLoading ? "Conectando…" : "Continuar com Google"}
              </span>
            </button>
          </>
        )}
        <button className="text-button" onClick={() => setRegister(!register)}>
          {register ? "Já tenho conta" : "Quero criar uma conta"}
        </button>
        <Link to="/">← Voltar ao início</Link>
      </section>
    </main>
  );
}

function StorePage() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!firebaseEnabled) {
      const saved = localStore();
      setStore(
        saved?.slug === slug
          ? saved
          : slug === demoStore.slug
            ? demoStore
            : null,
      );
      setProducts(
        saved?.slug === slug
          ? localProducts() || []
          : slug === demoStore.slug
            ? demoProducts
            : [],
      );
      setLoading(false);
      return;
    }
    let unsub = () => {};
    getDocs(
      query(
        collection(db, "stores"),
        where("slug", "==", slug),
        where("published", "==", true),
      ),
    ).then((s) => {
      const d = s.docs[0];
      if (!d) {
        setLoading(false);
        return;
      }
      setStore({ id: d.id, ...d.data() });
      unsub = onSnapshot(collection(db, "stores", d.id, "products"), (snap) => {
        setProducts(snap.docs.map((x) => ({ id: x.id, ...x.data() })));
        setLoading(false);
      });
    });
    return () => unsub();
  }, [slug]);
  const visible = products.filter((x) => x.active !== false);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = visible.reduce(
    (sum, p) => sum + (cart[p.id] || 0) * Number(p.price),
    0,
  );
  const change = (p, delta) =>
    setCart((c) => ({
      ...c,
      [p.id]: Math.max(
        0,
        Math.min(Number(p.stock) || 0, (c[p.id] || 0) + delta),
      ),
    }));
  const checkout = async () => {
    const items = visible
      .filter((p) => cart[p.id])
      .map((p) => ({ id: p.id, quantity: cart[p.id] }));
    if (!items.length) return;
    setPaying(true);
    setError("");
    try {
      const response = await fetch("/.netlify/functions/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          storeSlug: store.slug,
          items,
          preview: store.id === "demo",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      location.href = data.checkoutUrl;
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  };
  if (loading) return <main className="center">Carregando loja…</main>;
  if (!store?.published)
    return (
      <main className="empty">
        <h1>Loja não encontrada</h1>
        <Link to="/">Voltar</Link>
      </main>
    );
  return (
    <div className="store-page">
      <header className="store-nav">
        <a className="brand" href="#top">
          {store.logoUrl ? <img src={store.logoUrl} /> : <i>●</i>}
          <span>{store.brand}</span>
        </a>
        <div>
          <span>{store.hours}</span>
          <button className="cart-button" onClick={() => setCartOpen(true)}>
            Sacola <b>{count}</b>
          </button>
        </div>
      </header>
      <main id="top">
        <section
          className="store-hero"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(10,25,38,.76),rgba(10,25,38,.12)),url(${store.heroImage})`,
          }}
        >
          <div>
            <p className="eyebrow">COMPRE ONLINE</p>
            <h1>{store.tagline}</h1>
            <p>{store.description}</p>
            <a className="button light" href="#produtos">
              Ver produtos
            </a>
          </div>
        </section>
        <section className="products section" id="produtos">
          <div className="section-title">
            <div>
              <p className="eyebrow">ESCOLHA O SEU</p>
              <h2>Produtos em destaque</h2>
            </div>
            <span>{visible.length} itens</span>
          </div>
          <div className="product-grid">
            {visible.map((p) => (
              <article
                className={`product-card ${p.stock < 1 ? "sold-out" : ""}`}
                key={p.id}
              >
                <div className="product-photo">
                  <img
                    src={
                      p.imageUrl ||
                      "https://placehold.co/800x600/eaf6fc/247da9?text=Produto"
                    }
                    alt={p.name}
                  />
                  {p.stock < 1 && <span>Esgotado</span>}
                </div>
                <div className="product-copy">
                  <small>{p.category || "Produto"}</small>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <div className="product-bottom">
                    <b>{money(p.price)}</b>
                    {cart[p.id] ? (
                      <div className="quantity">
                        <button onClick={() => change(p, -1)}>−</button>
                        <span>{cart[p.id]}</span>
                        <button onClick={() => change(p, 1)}>+</button>
                      </div>
                    ) : (
                      <button
                        disabled={p.stock < 1}
                        onClick={() => change(p, 1)}
                      >
                        Adicionar
                      </button>
                    )}
                  </div>
                  <em>
                    {p.stock > 0 ? `${p.stock} em estoque` : "Indisponível"}
                  </em>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="about">
          <p className="eyebrow">SOBRE A LOJA</p>
          <h2>{store.brand}</h2>
          <p>{store.description}</p>
          <div>
            <span>⌖ {store.address}</span>
            <span>◷ {store.hours}</span>
            <a href={`https://wa.me/${store.whatsapp}`}>Falar no WhatsApp</a>
          </div>
        </section>
      </main>
      {count > 0 && (
        <button className="floating-cart" onClick={() => setCartOpen(true)}>
          Ver sacola · {money(total)}
        </button>
      )}
      {cartOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setCartOpen(false)
          }
        >
          <section className="cart">
            <button className="modal-close" onClick={() => setCartOpen(false)}>
              ×
            </button>
            <p className="eyebrow">SUA COMPRA</p>
            <h2>Revise sua sacola</h2>
            {visible
              .filter((p) => cart[p.id])
              .map((p) => (
                <div className="cart-row" key={p.id}>
                  <div>
                    <b>{p.name}</b>
                    <small>{money(p.price)} cada</small>
                  </div>
                  <div className="quantity">
                    <button onClick={() => change(p, -1)}>−</button>
                    <span>{cart[p.id]}</span>
                    <button onClick={() => change(p, 1)}>+</button>
                  </div>
                </div>
              ))}
            <div className="cart-total">
              <span>Total</span>
              <b>{money(total)}</b>
            </div>
            {store.payment?.enabled ? (
              <>
                <button
                  className="button primary full"
                  disabled={paying}
                  onClick={checkout}
                >
                  {paying ? "Abrindo Mercado Pago…" : "Pagar com Mercado Pago"}
                </button>
                <small className="secure">
                  Cartão, Pix e até {store.payment.maxInstallments || 12}x,
                  conforme condições do Mercado Pago.
                </small>
              </>
            ) : (
              <a
                className="button primary full"
                href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Olá! Quero comprar na ${store.brand}. Total: ${money(total)}`)}`}
              >
                Finalizar pelo WhatsApp
              </a>
            )}
            {error && <p className="error">{error}</p>}
          </section>
        </div>
      )}
    </div>
  );
}

function Admin({ user, onLogout }) {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState("store");
  const [saved, setSaved] = useState("");
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!user) return;
    if (!firebaseEnabled) {
      setStore(localStore() || emptyStore(user.uid));
      setProducts(localProducts() || demoProducts);
      return;
    }
    getDocs(query(collection(db, "stores"), where("ownerId", "==", user.uid)))
      .then(async (snap) => {
        if (snap.empty) setStore(emptyStore(user.uid));
        else {
          const d = snap.docs[0];
          setStore({ id: d.id, ...d.data() });
          const p = await getDocs(collection(db, "stores", d.id, "products"));
          setProducts(p.docs.map((x) => ({ id: x.id, ...x.data() })));
        }
      })
      .catch((error) => {
        console.error("Falha ao abrir painel:", error);
        setLoadError(
          error.code === "permission-denied"
            ? "O Firestore recusou o acesso. Publique o arquivo firestore.rules deste projeto no mesmo Firebase usado em produção."
            : `Não foi possível abrir o painel: ${error.message}`,
        );
      });
  }, [user]);
  if (!user) return <Navigate to="/admin/login" />;
  if (loadError)
    return (
      <main className="empty">
        <h1>Não foi possível abrir o painel</h1>
        <p>{loadError}</p>
        <button className="button outline" onClick={onLogout}>
          Sair e tentar novamente
        </button>
      </main>
    );
  if (!store) return <main className="center">Abrindo painel…</main>;
  const update = (key, value) => setStore((s) => ({ ...s, [key]: value }));
  const updatePayment = (key, value) =>
    setStore((s) => ({ ...s, payment: { ...s.payment, [key]: value } }));
  const save = async () => {
    const normalized = {
      ...store,
      slug: store.slug || slugify(store.brand),
      ownerId: user.uid,
      updatedAt: serverTimestamp(),
    };
    if (firebaseEnabled) {
      const ref = store.id
        ? doc(db, "stores", store.id)
        : doc(collection(db, "stores"));
      const { id: ignoredStoreId, ...storeData } = normalized;
      await setDoc(ref, storeData, { merge: true });
      for (const p of products) {
        const { id: ignoredProductId, ...productData } = p;
        await setDoc(
          doc(db, "stores", ref.id, "products", p.id || crypto.randomUUID()),
          productData,
          { merge: true },
        );
      }
      setStore({ ...normalized, id: ref.id });
    } else {
      saveLocal(
        { ...normalized, updatedAt: new Date().toISOString() },
        products,
      );
      setStore(normalized);
    }
    setSaved("Alterações salvas ✓");
    setTimeout(() => setSaved(""), 2500);
  };
  const connect = async () => {
    if (!firebaseEnabled || !store.id) {
      setSaved("Salve a loja com Firebase antes de conectar.");
      return;
    }
    try {
      const token = await user.getIdToken();
      const response = await fetch("/.netlify/functions/mercadopago-connect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storeId: store.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      location.href = data.authorizationUrl;
    } catch (err) {
      setSaved(err.message);
    }
  };
  const add = () => {
    setProducts((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
        name: "Novo produto",
        category: "",
        description: "",
        price: 0,
        stock: 0,
        active: true,
        imageUrl: "",
      },
    ]);
    setTab("products");
  };
  const changeProduct = (id, key, value) =>
    setProducts((ps) =>
      ps.map((p) => (p.id === id ? { ...p, [key]: value } : p)),
    );
  const remove = async (p) => {
    setProducts((ps) => ps.filter((x) => x.id !== p.id));
    if (firebaseEnabled && store.id)
      await deleteDoc(doc(db, "stores", store.id, "products", p.id));
  };
  return (
    <div className="admin">
      <header className="admin-top">
        <Logo />
        <div>
          {store.slug && (
            <Link to={`/loja/${store.slug}`} target="_blank">
              Ver loja ↗
            </Link>
          )}
          <button className="text-button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>
      <div className="editor">
        <aside>
          <p>PAINEL DA LOJA</p>
          {[
            ["store", "01 · Loja"],
            ["products", "02 · Produtos"],
            ["payment", "03 · Pagamentos"],
            ["publish", "04 · Publicar"],
          ].map((x) => (
            <button
              key={x[0]}
              className={tab === x[0] ? "active" : ""}
              onClick={() => setTab(x[0])}
            >
              {x[1]}
            </button>
          ))}
        </aside>
        <main className="editor-form">
          {tab === "store" && (
            <>
              <p className="eyebrow">IDENTIDADE</p>
              <h1>Conte sobre sua loja.</h1>
              <div className="form-grid">
                <Field
                  label="Nome da loja"
                  value={store.brand}
                  onChange={(v) => update("brand", v)}
                />
                <Field
                  label="Endereço do site"
                  value={store.slug}
                  onChange={(v) => update("slug", slugify(v))}
                  prefix="/loja/"
                />
                <Field
                  label="Frase principal"
                  value={store.tagline}
                  onChange={(v) => update("tagline", v)}
                />
                <Field
                  label="Imagem de capa (URL)"
                  value={store.heroImage}
                  onChange={(v) => update("heroImage", v)}
                />
                <Field
                  area
                  label="Descrição"
                  value={store.description}
                  onChange={(v) => update("description", v)}
                />
                <Field
                  label="WhatsApp com DDI"
                  value={store.whatsapp}
                  onChange={(v) => update("whatsapp", v)}
                />
                <Field
                  label="Localização"
                  value={store.address}
                  onChange={(v) => update("address", v)}
                />
                <Field
                  label="Horário"
                  value={store.hours}
                  onChange={(v) => update("hours", v)}
                />
              </div>
            </>
          )}
          {tab === "products" && (
            <>
              <div className="title-actions">
                <div>
                  <p className="eyebrow">CATÁLOGO E ESTOQUE</p>
                  <h1>Seus produtos.</h1>
                </div>
                <button className="button outline" onClick={add}>
                  + Novo produto
                </button>
              </div>
              <div className="product-editors">
                {products.map((p) => (
                  <article className="product-editor" key={p.id}>
                    <img
                      src={
                        p.imageUrl ||
                        "https://placehold.co/160/eaf6fc/247da9?text=Foto"
                      }
                    />
                    <div>
                      <Field
                        label="Nome"
                        value={p.name}
                        onChange={(v) => changeProduct(p.id, "name", v)}
                      />
                      <Field
                        label="Categoria"
                        value={p.category}
                        onChange={(v) => changeProduct(p.id, "category", v)}
                      />
                      <Field
                        area
                        label="Descrição"
                        value={p.description}
                        onChange={(v) => changeProduct(p.id, "description", v)}
                      />
                      <Field
                        label="URL da imagem"
                        value={p.imageUrl}
                        onChange={(v) => changeProduct(p.id, "imageUrl", v)}
                      />
                      <div className="inline-fields">
                        <Field
                          type="number"
                          label="Preço (R$)"
                          value={p.price}
                          onChange={(v) =>
                            changeProduct(p.id, "price", Number(v))
                          }
                        />
                        <Field
                          type="number"
                          label="Estoque"
                          value={p.stock}
                          onChange={(v) =>
                            changeProduct(p.id, "stock", Math.max(0, Number(v)))
                          }
                        />
                      </div>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={p.active}
                          onChange={(e) =>
                            changeProduct(p.id, "active", e.target.checked)
                          }
                        />{" "}
                        Exibir na loja
                      </label>
                      <button className="danger" onClick={() => remove(p)}>
                        Excluir produto
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === "payment" && (
            <>
              <p className="eyebrow">MERCADO PAGO</p>
              <h1>Receba na sua conta.</h1>
              <p className="intro">
                Cada lojista conecta a própria conta Mercado Pago. As vendas são
                processadas nessa conta e o token fica protegido no servidor.
              </p>
              <div className="connection">
                <span className={store.payment?.connected ? "connected" : ""}>
                  ●
                </span>
                <div>
                  <b>
                    {store.payment?.connected
                      ? "Conta conectada"
                      : "Conta ainda não conectada"}
                  </b>
                  <small>
                    {store.payment?.connected
                      ? "Checkout disponível para esta loja."
                      : "Autorize o Tô Vendendo no Mercado Pago."}
                  </small>
                </div>
                <button className="button outline" onClick={connect}>
                  {store.payment?.connected
                    ? "Reconectar"
                    : "Conectar Mercado Pago"}
                </button>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={store.payment?.enabled}
                  onChange={(e) => updatePayment("enabled", e.target.checked)}
                />
                <span>Oferecer pagamento online</span>
              </label>
              <Field
                type="number"
                label="Máximo de parcelas"
                value={store.payment?.maxInstallments || 12}
                onChange={(v) =>
                  updatePayment(
                    "maxInstallments",
                    Math.min(12, Math.max(1, Number(v))),
                  )
                }
              />
              <Field
                label="Nome na fatura (até 16 caracteres)"
                value={store.payment?.statementDescriptor || ""}
                onChange={(v) =>
                  updatePayment(
                    "statementDescriptor",
                    v.toUpperCase().slice(0, 16),
                  )
                }
              />
              <div className="notice">
                <b>Credenciais protegidas</b>
                <p>
                  O painel nunca solicita nem exibe o Access Token da conta do
                  lojista.
                </p>
              </div>
            </>
          )}
          {tab === "publish" && (
            <>
              <p className="eyebrow">ÚLTIMA ETAPA</p>
              <h1>Coloque sua loja no ar.</h1>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={store.published}
                  onChange={(e) => update("published", e.target.checked)}
                />
                <span>Loja publicada</span>
              </label>
              <div className="publish-box">
                <small>ENDEREÇO DA SUA LOJA</small>
                <strong>
                  {location.origin}/loja/
                  {store.slug || slugify(store.brand) || "sua-loja"}
                </strong>
              </div>
            </>
          )}
          <div className="editor-actions">
            <button className="button primary" onClick={save}>
              Salvar alterações
            </button>
            {saved && <span>{saved}</span>}
          </div>
        </main>
      </div>
    </div>
  );
}
function Field({ label, value, onChange, area, type = "text", prefix }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div>
        {prefix && <small>{prefix}</small>}
        {area ? (
          <textarea
            rows="3"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            type={type}
            min={type === "number" ? "0" : undefined}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </label>
  );
}

export default function App() {
  const [user, setUser] = useState(firebaseEnabled ? undefined : null);
  useEffect(() => {
    if (firebaseEnabled) return onAuthStateChanged(auth, setUser);
    const email = localStorage.getItem("tv-demo-user");
    setUser(email ? { uid: "demo-user", email } : null);
  }, []);
  const logout = async () => {
    if (firebaseEnabled) await signOut(auth);
    else {
      localStorage.removeItem("tv-demo-user");
      setUser(null);
    }
  };
  if (user === undefined) return <main className="center">Carregando…</main>;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/loja/:slug" element={<StorePage />} />
      <Route path="/admin/login" element={<Login user={user} />} />
      <Route path="/admin" element={<Admin user={user} onLogout={logout} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
