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
  browserLocalPersistence,
  inMemoryPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import QRCode from "qrcode";
import { auth, db, firebaseEnabled, googleProvider, storage } from "./firebase";
import { demoProducts, demoStore, emptyStore } from "./data";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value) || 0,
  );
const productImages = (product) =>
  product.imageUrls?.length
    ? product.imageUrls
    : product.imageUrl
      ? [product.imageUrl]
      : ["https://placehold.co/800x600/eaf6fc/247da9?text=Produto"];
const productUnavailable = (product) =>
  product.unavailable === true || product.active === false;
const instagramHandle = (value) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .replace(/[^a-zA-Z0-9._]/g, "");
const pixText = (value, max) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 .]/g, "")
    .toUpperCase()
    .slice(0, max);
const pixField = (id, value) =>
  `${id}${String(value.length).padStart(2, "0")}${value}`;
const pixCrc = (payload) => {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index++) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};
const createPixPayload = ({ key, name, city, amount }) => {
  const merchant =
    pixField("00", "br.gov.bcb.pix") + pixField("01", String(key).trim());
  const additional = pixField("05", "***");
  const base =
    pixField("00", "01") +
    pixField("01", "12") +
    pixField("26", merchant) +
    pixField("52", "0000") +
    pixField("53", "986") +
    pixField("54", Number(amount).toFixed(2)) +
    pixField("58", "BR") +
    pixField("59", pixText(name, 25) || "LOJA") +
    pixField("60", pixText(city, 15) || "BRASIL") +
    pixField("62", additional) +
    "6304";
  return base + pixCrc(base);
};
const slugify = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const storeCategories = (store, products = []) => {
  const categories = Array.isArray(store?.categories)
    ? store.categories
        .filter((category) => category?.id)
        .map((item) => ({ ...item }))
    : [];
  const names = new Set(
    categories
      .filter((category) => category.name?.trim())
      .map((category) => category.name.trim().toLowerCase()),
  );
  products.forEach((product) => {
    const name = String(product.category || "").trim();
    if (name && !names.has(name.toLowerCase())) {
      categories.push({
        id: `legacy-${slugify(name)}`,
        name,
      });
      names.add(name.toLowerCase());
    }
  });
  return categories;
};
const productCategoryId = (product, categories) =>
  (categories.some((category) => category.id === product.categoryId)
    ? product.categoryId
    : "") ||
  categories.find(
    (category) =>
      category.name.toLowerCase() ===
      String(product.category || "")
        .trim()
        .toLowerCase(),
  )?.id ||
  "";
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
              Publique produtos variados, controle a disponibilidade e receba
              direto na sua chave Pix.
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
          <span>▣ Disponibilidade sob controle</span>
          <span>↗ Pagamento por QR Code Pix</span>
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
              <h3>Controle a disponibilidade</h3>
              <p>Marque os itens que não estão disponíveis para compra.</p>
            </article>
            <article>
              <b>03</b>
              <h3>Venda online</h3>
              <p>
                Seu cliente escaneia o QR Code e paga direto para sua chave.
              </p>
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
            <li>✓ Controle de disponibilidade</li>
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
            <li>✓ QR Code Pix por loja</li>
            <li>✓ Código Pix copia e cola</li>
            <li>✓ Gestão de disponibilidade</li>
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
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        await setPersistence(auth, inMemoryPersistence);
      }
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user) throw new Error("O Google não retornou um usuário.");
      nav("/admin", { replace: true });
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
  const [pixPayment, setPixPayment] = useState(null);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
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
  const visible = products;
  const purchasable = visible.filter((product) => !productUnavailable(product));
  const allCategories = storeCategories(store, visible);
  const categories = allCategories.filter((category) =>
    visible.some(
      (product) => productCategoryId(product, allCategories) === category.id,
    ),
  );
  const displayed =
    activeCategory === "all"
      ? visible
      : visible.filter(
          (product) =>
            productCategoryId(product, allCategories) === activeCategory,
        );
  const count = purchasable.reduce(
    (sum, product) => sum + (cart[product.id] || 0),
    0,
  );
  const total = purchasable.reduce(
    (sum, p) => sum + (cart[p.id] || 0) * Number(p.price),
    0,
  );
  const change = (p, delta) =>
    setCart((c) => ({
      ...c,
      [p.id]: productUnavailable(p) ? 0 : Math.max(0, (c[p.id] || 0) + delta),
    }));
  const checkout = async () => {
    if (!count) return;
    if (!store.payment?.pixKey?.trim()) {
      setError("A loja ainda não configurou uma chave Pix.");
      return;
    }
    setPaying(true);
    setError("");
    try {
      const payload = createPixPayload({
        key: store.payment.pixKey,
        name: store.payment.pixReceiverName || store.brand,
        city: store.payment.pixCity || store.address,
        amount: total,
      });
      const qrCode = await QRCode.toDataURL(payload, {
        width: 360,
        margin: 2,
        color: { dark: "#12202d", light: "#ffffff" },
      });
      setPixPayment({ payload, qrCode });
      setCartOpen(false);
    } catch (err) {
      setError(
        "Não foi possível gerar o Pix. Confira os dados de pagamento da loja.",
      );
    } finally {
      setPaying(false);
    }
  };
  const digitalCheckout = async () => {
    const items = purchasable
      .filter((product) => cart[product.id])
      .map((product) => ({ id: product.id, quantity: cart[product.id] }));
    if (!items.length) return;
    setPaying(true);
    setError("");
    try {
      const response = await fetch(
        "/.netlify/functions/create-store-checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId: store.id, items }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Não foi possível abrir o pagamento.");
      location.href = data.checkoutUrl;
    } catch (error) {
      setError(error.message);
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
          {categories.length > 1 && (
            <div className="category-filter" aria-label="Categorias">
              <button
                className={activeCategory === "all" ? "active" : ""}
                onClick={() => setActiveCategory("all")}
              >
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={activeCategory === category.id ? "active" : ""}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
          <div className="product-grid">
            {displayed.map((product) => (
              <ProductCard
                key={product.id}
                store={store}
                product={product}
                quantity={cart[product.id] || 0}
                onChange={change}
              />
            ))}
          </div>
        </section>
        <section className="about">
          <p className="eyebrow">SOBRE A LOJA</p>
          <h2>{store.brand}</h2>
          <p>{store.description}</p>
          <div className="about-details">
            <span>⌖ {store.address}</span>
            <span>◷ {store.hours}</span>
          </div>
          <div className="social-actions">
            <a
              className="social-button whatsapp"
              href={`https://wa.me/${String(store.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Conheci a ${store.brand} pelo site e gostaria de mais informações.`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.5 3.5A11.8 11.8 0 0 0 1.9 17.7L.3 23.5l5.9-1.6A11.8 11.8 0 0 0 23.8 12c0-3.2-1.2-6.2-3.3-8.5Zm-8.4 18.4c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-3.5.9.9-3.4-.2-.4A9.8 9.8 0 1 1 12 21.9Zm5.4-7.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2l-.9 1.1c-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.7-.3-.5.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.9 5.2 2.2.9 3.1 1 4.2.8.7-.1 1.8-.7 2.1-1.5.3-.7.3-1.4.2-1.5-.2-.3-.5-.4-.8-.5Z" />
              </svg>
              <span>
                <small>ATENDIMENTO</small>Falar no WhatsApp
              </span>
            </a>
            {instagramHandle(store.instagram) && (
              <a
                className="social-button instagram"
                href={`https://instagram.com/${instagramHandle(store.instagram)}`}
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm9.25 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                </svg>
                <span>
                  <small>SIGA NO INSTAGRAM</small>@
                  {instagramHandle(store.instagram)}
                </span>
              </a>
            )}
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
            {purchasable
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
            <div className="checkout-methods">
              {store.payment?.enabled && (
                <>
                  <button
                    className="button pix-checkout-button full"
                    disabled={paying}
                    onClick={checkout}
                  >
                    <span className="payment-icon pix-payment-icon">PIX</span>
                    <span>
                      <b>{paying ? "Gerando Pix…" : "Pagar com Pix"}</b>
                      <small>QR Code e Pix copia e cola</small>
                    </span>
                  </button>
                </>
              )}
              {(store.payment?.stripeConnected ||
                store.payment?.stripeAccountId ||
                Object.keys(store.payment?.stripeAccountIds || {}).length >
                  0) && (
                <button
                  className="button card-checkout-button full"
                  disabled={paying}
                  onClick={digitalCheckout}
                >
                  <svg
                    className="payment-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20M6 15h4" />
                  </svg>
                  <span>
                    <b>{paying ? "Abrindo Stripe…" : "Débito ou crédito"}</b>
                    <small>Pagamento seguro pela Stripe</small>
                  </span>
                </button>
              )}
            </div>
            {!store.payment?.enabled &&
              !store.payment?.stripeConnected &&
              !store.payment?.stripeAccountId && (
                <a
                  className="button primary full"
                  href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Olá! Quero comprar na ${store.brand}. Total: ${money(total)}`)}`}
                >
                  Finalizar pelo WhatsApp
                </a>
              )}
            <small className="secure">
              Escolha como deseja concluir o pagamento.
            </small>
            {error && <p className="error">{error}</p>}
          </section>
        </div>
      )}
      {pixPayment && (
        <PixModal
          store={store}
          total={total}
          payment={pixPayment}
          onClose={() => setPixPayment(null)}
        />
      )}
    </div>
  );
}
function PixModal({ store, total, payment, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(payment.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div
      className="modal-backdrop pix-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="pix-modal">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="pix-mark">PIX</div>
        <p className="eyebrow">PAGAMENTO SEGURO</p>
        <h2>Escaneie para pagar</h2>
        <p>Abra o aplicativo do seu banco e leia o QR Code abaixo.</p>
        <img
          className="pix-qr"
          src={payment.qrCode}
          alt="QR Code Pix para pagamento"
        />
        <div className="pix-value">
          <span>Valor da compra</span>
          <strong>{money(total)}</strong>
        </div>
        <button className="button primary full" onClick={copy}>
          {copied ? "Código Pix copiado ✓" : "Copiar código Pix"}
        </button>
        <small>
          O pagamento será enviado diretamente para{" "}
          <b>{store.payment.pixReceiverName || store.brand}</b>. Envie o
          comprovante para a loja após pagar.
        </small>
        <a
          className="pix-whatsapp"
          href={`https://wa.me/${String(store.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Acabei de realizar o Pix de ${money(total)} referente ao meu pedido.`)}`}
          target="_blank"
          rel="noreferrer"
        >
          Enviar comprovante pelo WhatsApp
        </a>
      </section>
    </div>
  );
}

const drawWrappedText = (
  context,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines,
) => {
  const words = String(text || "").split(/\s+/);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y + lines * lineHeight);
      line = word;
      lines += 1;
      if (lines >= maxLines) return;
    } else line = candidate;
  }
  if (line && lines < maxLines)
    context.fillText(line, x, y + lines * lineHeight);
};

const createProductShareImage = async (store, product, imageUrl) => {
  const response = await fetch(imageUrl, { mode: "cors" });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.startsWith("image/"))
    throw new Error("A foto do produto não pôde ser carregada.");
  const image = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const photoHeight = 850;
  const scale = Math.max(
    canvas.width / image.width,
    photoHeight / image.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(
    image,
    (canvas.width - width) / 2,
    (photoHeight - height) / 2,
    width,
    height,
  );
  context.fillStyle = "#55b8e8";
  context.fillRect(0, photoHeight, 14, canvas.height - photoHeight);
  context.fillStyle = "#247da9";
  context.font = "700 28px Arial";
  context.fillText(String(store.brand || "Tô Vendendo").toUpperCase(), 70, 920);
  context.fillStyle = "#12202d";
  context.font = "700 58px Arial";
  drawWrappedText(context, product.name, 70, 995, 940, 66, 2);
  context.fillStyle = "#247da9";
  context.font = "700 45px Arial";
  context.fillText(money(product.price), 70, 1135);
  context.fillStyle = "#667784";
  context.font = "400 27px Arial";
  drawWrappedText(context, product.description, 70, 1190, 940, 36, 2);
  context.fillStyle = "#12202d";
  context.font = "600 23px Arial";
  context.fillText(`tovendendo.app/loja/${store.slug}`, 70, 1310);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(
              new File([blob], `${slugify(product.name)}.png`, {
                type: "image/png",
              }),
            )
          : reject(new Error("Não foi possível montar a imagem.")),
      "image/png",
    ),
  );
};

function ProductCard({ store, product, quantity, onChange }) {
  const images = productImages(product);
  const [current, setCurrent] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likesCount, setLikesCount] = useState(Number(product.likesCount) || 0);
  const [liked, setLiked] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [zoom, setZoom] = useState({
    visible: false,
    x: 50,
    y: 50,
    pixelX: 0,
    pixelY: 0,
    width: 0,
    height: 0,
  });
  const [zoomOpen, setZoomOpen] = useState(false);
  const move = (direction) =>
    setCurrent((index) => (index + direction + images.length) % images.length);
  const moveZoom = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setZoom({
      visible: true,
      x: Math.max(
        0,
        Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100),
      ),
      y: Math.max(
        0,
        Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100),
      ),
      pixelX: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
      pixelY: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
      width: bounds.width,
      height: bounds.height,
    });
  };
  useEffect(
    () => setLikesCount(Number(product.likesCount) || 0),
    [product.likesCount],
  );
  const like = async () => {
    if (liked) return;
    let visitorId;
    try {
      visitorId = localStorage.getItem("tv-visitor-id");
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem("tv-visitor-id", visitorId);
      }
    } catch {
      visitorId = crypto.randomUUID();
    }
    setLiked(true);
    setLikesCount((count) => count + 1);
    try {
      const response = await fetch("/.netlify/functions/product-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "like",
          storeId: store.id,
          productId: product.id,
          visitorId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setLikesCount(data.likesCount);
    } catch {
      setLiked(false);
      setLikesCount((count) => Math.max(0, count - 1));
    }
  };
  const share = async () => {
    if (sharing) return;
    setSharing(true);
    const imageVersion =
      new URL(images[0], location.origin).searchParams
        .get("token")
        ?.slice(0, 8) || product.id.slice(0, 8);
    const previewUrl = `${location.origin}/loja/${store.slug}/produto/${product.id}?foto=${imageVersion}`;
    const message = [
      `Olha este item da ${store.brand}:`,
      `*${product.name}*`,
      money(product.price),
      product.description,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      if (navigator.share && navigator.canShare) {
        const file = await createProductShareImage(store, product, images[0]);
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      }
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${message}\n${previewUrl}`)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (error) {
      if (error.name !== "AbortError")
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${message}\n${previewUrl}`)}`,
          "_blank",
          "noopener,noreferrer",
        );
    } finally {
      setSharing(false);
    }
  };
  return (
    <>
      <article
        id={`produto-${product.id}`}
        className={`product-card ${productUnavailable(product) ? "sold-out" : ""}`}
      >
        <div className="product-photo">
          <img
            src={images[Math.min(current, images.length - 1)]}
            alt={`${product.name} — foto ${current + 1}`}
            onClick={() => setZoomOpen(true)}
          />
          <button
            className="zoom-button"
            aria-label="Ampliar imagem"
            onClick={() => setZoomOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 5 5M8 11h6M11 8v6" />
            </svg>
          </button>
          {images.length > 1 && (
            <>
              <button
                className="carousel-prev"
                aria-label="Foto anterior"
                onClick={() => move(-1)}
              >
                ‹
              </button>
              <button
                className="carousel-next"
                aria-label="Próxima foto"
                onClick={() => move(1)}
              >
                ›
              </button>
              <div className="carousel-dots">
                {images.map((_, index) => (
                  <button
                    key={index}
                    aria-label={`Ver foto ${index + 1}`}
                    className={index === current ? "active" : ""}
                    onClick={() => setCurrent(index)}
                  />
                ))}
              </div>
            </>
          )}
          {productUnavailable(product) && (
            <span className="availability-badge">Indisponível</span>
          )}
        </div>
        <div className="product-copy">
          <small>{product.category || "Produto"}</small>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <div className="product-bottom">
            <b>{money(product.price)}</b>
            {productUnavailable(product) ? (
              <button disabled>Indisponível</button>
            ) : quantity ? (
              <div className="quantity">
                <button onClick={() => onChange(product, -1)}>−</button>
                <span>{quantity}</span>
                <button onClick={() => onChange(product, 1)}>+</button>
              </div>
            ) : (
              <button onClick={() => onChange(product, 1)}>Adicionar</button>
            )}
          </div>
          {productUnavailable(product) && <em>Indisponível para compra</em>}
          <div className="product-social">
            <button
              className={liked ? "liked" : ""}
              onClick={like}
              aria-label="Curtir produto"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
              </svg>
              {likesCount || "Curtir"}
            </button>
            <button
              onClick={() => setCommentsOpen(true)}
              aria-label="Ver comentários"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
              </svg>
              {product.commentsCount
                ? `${product.commentsCount} comentários`
                : "Comentar"}
            </button>
            <button
              onClick={share}
              disabled={sharing}
              aria-label="Compartilhar no WhatsApp"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
              </svg>
              {sharing ? "Preparando…" : "Compartilhar"}
            </button>
          </div>
        </div>
      </article>
      {commentsOpen && (
        <CommentsModal
          store={store}
          product={product}
          image={images[0]}
          onClose={() => setCommentsOpen(false)}
        />
      )}
      {zoomOpen && (
        <div
          className="modal-backdrop image-zoom-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setZoomOpen(false)
          }
        >
          <section className="image-zoom-modal">
            <button className="modal-close" onClick={() => setZoomOpen(false)}>
              ×
            </button>
            <div
              className="zoom-stage"
              onMouseMove={moveZoom}
              onMouseLeave={() =>
                setZoom((value) => ({ ...value, visible: false }))
              }
            >
              <img
                src={images[Math.min(current, images.length - 1)]}
                alt={`${product.name} ampliado`}
              />
              {zoom.visible && (
                <span
                  className="zoom-lens"
                  aria-hidden="true"
                  style={{
                    left: `${zoom.x}%`,
                    top: `${zoom.y}%`,
                  }}
                >
                  <img
                    src={images[Math.min(current, images.length - 1)]}
                    alt=""
                    style={{
                      width: `${zoom.width * 1.5}px`,
                      height: `${zoom.height * 1.5}px`,
                      left: `${90 - zoom.pixelX * 1.5}px`,
                      top: `${90 - zoom.pixelY * 1.5}px`,
                    }}
                  />
                </span>
              )}
            </div>
            <p>{product.name}</p>
          </section>
        </div>
      )}
    </>
  );
}

function CommentsModal({ store, product, image, onClose }) {
  const [comments, setComments] = useState([]);
  const [author, setAuthor] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("Carregando comentários…");
  useEffect(() => {
    const params = new URLSearchParams({
      storeId: store.id,
      productId: product.id,
    });
    fetch(`/.netlify/functions/product-social?${params}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setComments(data.comments || []);
        setStatus("");
      })
      .catch((error) => setStatus(error.message));
  }, [store.id, product.id]);
  const send = async (event) => {
    event.preventDefault();
    setStatus("Publicando…");
    try {
      const response = await fetch("/.netlify/functions/product-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          storeId: store.id,
          productId: product.id,
          author,
          text: comment,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setComments((current) => [data.comment, ...current]);
      setComment("");
      setStatus("");
    } catch (error) {
      setStatus(error.message);
    }
  };
  return (
    <div
      className="modal-backdrop comments-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="comments-modal">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="comments-product">
          <img src={image} alt="" />
          <div>
            <small>{product.category}</small>
            <b>{product.name}</b>
            <span>{money(product.price)}</span>
          </div>
        </div>
        <div className="comments-list">
          {comments.map((item) => (
            <article key={item.id}>
              <div className="comment-avatar">
                {item.author?.charAt(0).toUpperCase()}
              </div>
              <p>
                <b>{item.author}</b> {item.text}
                <small>
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString("pt-BR")
                    : "Agora"}
                </small>
              </p>
            </article>
          ))}
          {!comments.length && !status && (
            <p className="no-comments">Seja a primeira pessoa a comentar.</p>
          )}
          {status && <p className="comment-status">{status}</p>}
        </div>
        <form className="comment-form" onSubmit={send}>
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="Seu nome"
            maxLength="40"
            required
          />
          <div>
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Adicione um comentário…"
              maxLength="300"
              required
            />
            <button>Publicar</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Admin({ user, onLogout }) {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState("store");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
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
  useEffect(() => {
    const stripeReturn = new URLSearchParams(location.search).get("stripe");
    const hasStripeAccount = Boolean(
      store?.payment?.stripeAccountId ||
      Object.keys(store?.payment?.stripeAccountIds || {}).length,
    );
    if (
      (!stripeReturn && !hasStripeAccount) ||
      !store?.id ||
      !user ||
      !firebaseEnabled
    )
      return;
    const refresh = async () => {
      if (stripeReturn) {
        setTab("payment");
        setSaved("Confirmando sua conta Stripe…");
      }
      try {
        const token = await user.getIdToken();
        const response = await fetch(
          "/.netlify/functions/stripe-account-status",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ storeId: store.id }),
          },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setStore((current) => ({
          ...current,
          payment: {
            ...current.payment,
            stripeConnected: data.connected,
            stripeAccountId: data.accountId || current.payment?.stripeAccountId,
            stripeMode: data.mode,
            stripeStatus: {
              chargesEnabled: data.chargesEnabled,
              payoutsEnabled: data.payoutsEnabled,
              detailsSubmitted: data.detailsSubmitted,
              disabledReason: data.disabledReason,
              currentlyDue: data.currentlyDue || [],
              pendingVerification: data.pendingVerification || [],
            },
          },
        }));
        if (stripeReturn)
          setSaved(
            data.connected
              ? "Pagamento por cartão e carteira digital ativado ✓"
              : data.currentlyDue?.length
                ? `Conta conectada, mas existem ${data.currentlyDue.length} dados pendentes na Stripe.`
                : "Conta conectada. A Stripe ainda está verificando os dados enviados.",
          );
      } catch (error) {
        setSaved(`Não foi possível confirmar a conta Stripe: ${error.message}`);
      } finally {
        if (stripeReturn) history.replaceState({}, "", location.pathname);
      }
    };
    refresh();
  }, [store?.id, user]);
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
  const categories = storeCategories(store, products);
  const connectStripe = async () => {
    const storeId = store.id || (await save({}, false));
    if (!storeId) return;
    setSaving(true);
    setSaved("Abrindo o cadastro seguro da Stripe…");
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        "/.netlify/functions/create-connect-account",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ storeId }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Não foi possível abrir a Stripe.");
      location.href = data.onboardingUrl;
    } catch (error) {
      setSaved(error.message);
      setSaving(false);
    }
  };
  const uploadImage = async (file, folder) => {
    if (!file?.type.startsWith("image/"))
      throw new Error("Escolha um arquivo de imagem válido.");
    if (file.size > 8 * 1024 * 1024)
      throw new Error("A imagem deve ter no máximo 8 MB.");
    if (!firebaseEnabled)
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () =>
          reject(new Error("Não foi possível ler a imagem."));
        reader.readAsDataURL(file);
      });
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const imageRef = ref(
      storage,
      `stores/${user.uid}/${folder}/${crypto.randomUUID()}.${extension}`,
    );
    await uploadBytes(imageRef, file, { contentType: file.type });
    return getDownloadURL(imageRef);
  };
  const save = async (overrides = {}, advance = true) => {
    setSaving(true);
    setSaved("");
    const normalized = {
      ...store,
      ...overrides,
      categories,
      slug: store.slug || slugify(store.brand),
      ownerId: user.uid,
      updatedAt: serverTimestamp(),
    };
    if (!normalized.brand.trim() || !normalized.slug) {
      setSaved("Informe o nome e o endereço da loja antes de salvar.");
      setSaving(false);
      return null;
    }
    if (products.length && !categories.length) {
      setSaved("Cadastre uma categoria antes de salvar os produtos.");
      setSaving(false);
      setTab("categories");
      return null;
    }
    const categoryNames = categories.map((category) =>
      String(category.name || "")
        .trim()
        .toLowerCase(),
    );
    if (
      categoryNames.some((name) => !name) ||
      new Set(categoryNames).size !== categoryNames.length
    ) {
      setSaved("Use nomes preenchidos e diferentes para cada categoria.");
      setSaving(false);
      setTab("categories");
      return null;
    }
    const uncategorized = products.find(
      (product) => !productCategoryId(product, categories),
    );
    if (uncategorized) {
      setSaved(`Escolha uma categoria para o produto “${uncategorized.name}”.`);
      setSaving(false);
      setTab("products");
      return null;
    }
    let persistedStoreId = store.id || null;
    try {
      if (firebaseEnabled) {
        const storeRef = store.id
          ? doc(db, "stores", store.id)
          : doc(collection(db, "stores"));
        persistedStoreId = storeRef.id;
        const { id: ignoredStoreId, ...storeData } = normalized;
        await setDoc(storeRef, storeData, { merge: true });
        const savedStore = await getDoc(storeRef);
        if (!savedStore.exists())
          throw new Error("O Firestore não confirmou a criação da loja.");
        for (const p of products) {
          const productId = p.id || crypto.randomUUID();
          const categoryId = productCategoryId(p, categories);
          const category = categories.find((item) => item.id === categoryId);
          const { id: ignoredProductId, ...productData } = {
            ...p,
            categoryId,
            category: category?.name || "",
          };
          await setDoc(
            doc(db, "stores", storeRef.id, "products", productId),
            productData,
            { merge: true },
          );
        }
        setStore({ id: storeRef.id, ...savedStore.data() });
      } else {
        saveLocal(
          { ...normalized, updatedAt: new Date().toISOString() },
          products,
        );
        setStore(normalized);
      }
      setSaved(
        overrides.published
          ? "Loja publicada com sucesso ✓"
          : "Alterações salvas ✓",
      );
      if (!overrides.published && advance) {
        const steps = ["store", "categories", "products", "payment", "publish"];
        const nextStep = steps[steps.indexOf(tab) + 1];
        if (nextStep) setTab(nextStep);
      }
      setTimeout(() => setSaved(""), 3500);
      return persistedStoreId;
    } catch (error) {
      console.error("Falha ao salvar loja:", error);
      setSaved(
        error.code === "permission-denied"
          ? "Sem permissão para salvar. Saia, entre novamente e confirme se as regras do Firestore foram publicadas."
          : `Não foi possível salvar: ${error.message}`,
      );
      return null;
    } finally {
      setSaving(false);
    }
  };
  const add = () => {
    if (!categories.length) {
      setSaved("Cadastre a primeira categoria antes de adicionar produtos.");
      setTab("categories");
      return;
    }
    setProducts((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
        name: "Novo produto",
        category: categories[0].name,
        categoryId: categories[0].id,
        description: "",
        price: 0,
        unavailable: false,
        active: true,
        imageUrl: "",
        imageUrls: [],
      },
    ]);
    setTab("products");
  };
  const changeProduct = (id, key, value) =>
    setProducts((ps) =>
      ps.map((p) => (p.id === id ? { ...p, [key]: value } : p)),
    );
  const addCategory = () =>
    update("categories", [
      ...categories,
      {
        id: crypto.randomUUID(),
        name: `Categoria ${categories.length + 1}`,
      },
    ]);
  const renameCategory = (id, name) => {
    update(
      "categories",
      categories.map((category) =>
        category.id === id ? { ...category, name } : category,
      ),
    );
    setProducts((current) =>
      current.map((product) =>
        productCategoryId(product, categories) === id
          ? { ...product, categoryId: id, category: name }
          : product,
      ),
    );
  };
  const removeCategory = (category) => {
    const inUse = products.some(
      (product) => productCategoryId(product, categories) === category.id,
    );
    if (inUse) {
      setSaved(
        "Mova ou exclua os produtos desta categoria antes de removê-la.",
      );
      return;
    }
    update(
      "categories",
      categories.filter((item) => item.id !== category.id),
    );
  };
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
            ["categories", "02 · Categorias"],
            ["products", "03 · Produtos"],
            ["payment", "04 · Pagamentos"],
            ["publish", "05 · Publicar"],
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
                <ImageUpload
                  label="Logo da loja"
                  hint="PNG, JPG ou WebP · até 8 MB"
                  value={store.logoUrl}
                  onUpload={(file) => uploadImage(file, "logo")}
                  onChange={(url) => update("logoUrl", url)}
                />
                <ImageUpload
                  wide
                  label="Imagem de capa"
                  hint="Recomendado: imagem horizontal · até 8 MB"
                  value={store.heroImage}
                  onUpload={(file) => uploadImage(file, "cover")}
                  onChange={(url) => update("heroImage", url)}
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
                  label="Usuário do Instagram"
                  value={store.instagram}
                  onChange={(v) => update("instagram", instagramHandle(v))}
                  prefix="@"
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
          {tab === "categories" && (
            <>
              <div className="title-actions">
                <div>
                  <p className="eyebrow">ORGANIZAÇÃO DO CATÁLOGO</p>
                  <h1>Suas categorias.</h1>
                </div>
                <button className="button outline" onClick={addCategory}>
                  + Nova categoria
                </button>
              </div>
              <p className="intro">
                Crie as categorias antes dos produtos. Cada categoria pode
                reunir quantos itens você quiser.
              </p>
              <div className="category-editors">
                {categories.map((category) => (
                  <div className="category-editor" key={category.id}>
                    <Field
                      label="Nome da categoria"
                      value={category.name}
                      onChange={(name) => renameCategory(category.id, name)}
                    />
                    <span>
                      {
                        products.filter(
                          (product) =>
                            productCategoryId(product, categories) ===
                            category.id,
                        ).length
                      }{" "}
                      itens
                    </span>
                    <button
                      className="danger"
                      onClick={() => removeCategory(category)}
                    >
                      Excluir
                    </button>
                  </div>
                ))}
                {!categories.length && (
                  <div className="notice">Nenhuma categoria cadastrada.</div>
                )}
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
                    <img src={productImages(p)[0]} alt={`Foto de ${p.name}`} />
                    <div>
                      <Field
                        label="Nome"
                        value={p.name}
                        onChange={(v) => changeProduct(p.id, "name", v)}
                      />
                      <SelectField
                        label="Categoria"
                        value={productCategoryId(p, categories)}
                        options={categories}
                        onChange={(categoryId) => {
                          const category = categories.find(
                            (item) => item.id === categoryId,
                          );
                          changeProduct(p.id, "categoryId", categoryId);
                          changeProduct(p.id, "category", category?.name || "");
                        }}
                      />
                      <Field
                        area
                        label="Descrição"
                        value={p.description}
                        onChange={(v) => changeProduct(p.id, "description", v)}
                      />
                      <ProductImagesUpload
                        values={productImages(p).filter(
                          (url) => !url.includes("placehold.co"),
                        )}
                        onUpload={(file) =>
                          uploadImage(file, `products/${p.id}`)
                        }
                        onChange={(urls) =>
                          changeProduct(p.id, "imageUrls", urls)
                        }
                      />
                      <div>
                        <CurrencyField
                          label="Preço"
                          value={p.price}
                          onChange={(value) =>
                            changeProduct(p.id, "price", value)
                          }
                        />
                      </div>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={productUnavailable(p)}
                          onChange={(e) => {
                            changeProduct(
                              p.id,
                              "unavailable",
                              e.target.checked,
                            );
                            changeProduct(p.id, "active", true);
                          }}
                        />{" "}
                        Indisponível
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
              <p className="eyebrow">PAGAMENTO VIA PIX</p>
              <h1>Receba direto na sua chave.</h1>
              <p className="intro">
                Configure os dados Pix da sua loja. O cliente verá um QR Code e
                o código copia e cola com o valor exato da compra.
              </p>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={store.payment?.enabled}
                  onChange={(e) => updatePayment("enabled", e.target.checked)}
                />
                <span>Oferecer pagamento via Pix</span>
              </label>
              <Field
                label="Chave Pix"
                value={store.payment?.pixKey || ""}
                onChange={(value) => updatePayment("pixKey", value.trim())}
              />
              <Field
                label="Nome do recebedor"
                value={store.payment?.pixReceiverName || ""}
                onChange={(value) =>
                  updatePayment("pixReceiverName", pixText(value, 25))
                }
              />
              <Field
                label="Cidade do recebedor"
                value={store.payment?.pixCity || ""}
                onChange={(value) =>
                  updatePayment("pixCity", pixText(value, 15))
                }
              />
              <div className="notice">
                <b>Pagamento direto</b>
                <p>
                  O valor vai diretamente para esta chave Pix. Confira
                  cuidadosamente os dados antes de publicar a loja.
                </p>
              </div>
              <div className="stripe-connect-card">
                <div className="stripe-icon">S</div>
                <div>
                  <b>Cartão e carteiras digitais</b>
                  <p>
                    {store.payment?.stripeConnected
                      ? "Conta Stripe ativa. Seus clientes podem pagar com cartão e carteiras compatíveis, como Google Pay."
                      : store.payment?.stripeAccountId ||
                          Object.keys(store.payment?.stripeAccountIds || {})
                            .length
                        ? store.payment?.stripeStatus?.currentlyDue?.length
                          ? `Conta conectada, com ${store.payment.stripeStatus.currentlyDue.length} dados pendentes. Abra a Stripe para concluir.`
                          : "Conta conectada. A Stripe está verificando ou habilitando os pagamentos."
                        : "Conecte uma conta Stripe para receber diretamente pelas vendas da sua loja."}
                  </p>
                  {(store.payment?.stripeAccountId ||
                    Object.keys(store.payment?.stripeAccountIds || {}).length >
                      0) && (
                    <small className="stripe-account-status">
                      {store.payment?.stripeMode === "test"
                        ? "Ambiente de teste"
                        : "Ambiente de produção"}
                      {store.payment?.stripeConnected
                        ? " · Cobranças liberadas"
                        : " · Cobranças pendentes"}
                    </small>
                  )}
                </div>
                <button
                  className="button outline"
                  disabled={saving}
                  onClick={connectStripe}
                >
                  {store.payment?.stripeConnected
                    ? "Gerenciar conexão"
                    : store.payment?.stripeAccountId ||
                        Object.keys(store.payment?.stripeAccountIds || {})
                          .length
                      ? "Concluir cadastro Stripe"
                      : "Ativar com Stripe"}
                </button>
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
              <button
                className="button primary publish-button"
                disabled={saving}
                onClick={() => save({ published: true })}
              >
                {saving ? "Publicando…" : "Publicar loja agora"}
              </button>
            </>
          )}
          <div className="editor-actions">
            <button
              className="button primary"
              disabled={saving}
              onClick={() => save()}
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
            {saved && <span>{saved}</span>}
          </div>
        </main>
        <AdminPreview store={store} products={products} />
      </div>
    </div>
  );
}
function AdminPreview({ store, products }) {
  const visible = products.slice(0, 4);
  return (
    <aside className="live-preview">
      <p className="eyebrow">PREVIEW AO VIVO</p>
      <span>Assim seus clientes verão a loja</span>
      <div className="preview-phone">
        <header>
          {store.logoUrl ? <img src={store.logoUrl} alt="" /> : <i>●</i>}
          <b>{store.brand || "Sua loja"}</b>
        </header>
        <div
          className="preview-cover"
          style={{
            backgroundImage: `linear-gradient(90deg,#102535ba,#10253533),url(${store.heroImage || demoStore.heroImage})`,
          }}
        >
          <small>COMPRE ONLINE</small>
          <strong>
            {store.tagline || "Sua frase principal aparece aqui."}
          </strong>
        </div>
        <div className="preview-products">
          <h3>Produtos</h3>
          {visible.length ? (
            visible.map((product) => (
              <article key={product.id}>
                <img src={productImages(product)[0]} alt="" />
                <div>
                  <b>{product.name}</b>
                  <span>{money(product.price)}</span>
                  <small>
                    {productUnavailable(product)
                      ? "Indisponível"
                      : "Disponível"}
                  </small>
                </div>
              </article>
            ))
          ) : (
            <p>Adicione produtos para preencher sua vitrine.</p>
          )}
        </div>
      </div>
    </aside>
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
function SelectField({ label, value, options, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        >
          <option value="" disabled>
            Selecione uma categoria
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
function CurrencyField({ label, value, onChange }) {
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
  return (
    <label className="field currency-field">
      <span>{label}</span>
      <div>
        <input
          inputMode="numeric"
          value={formatted}
          onChange={(event) => {
            const cents = event.target.value.replace(/\D/g, "");
            onChange(Number(cents) / 100);
          }}
        />
      </div>
    </label>
  );
}
function ProductImagesUpload({ values, onUpload, onChange }) {
  const [status, setStatus] = useState("");
  const select = async (event) => {
    const available = 10 - values.length;
    const files = [...(event.target.files || [])].slice(0, available);
    if (!files.length) return;
    setStatus(
      `Enviando ${files.length} ${files.length === 1 ? "imagem" : "imagens"}…`,
    );
    try {
      const uploaded = [];
      for (const file of files) uploaded.push(await onUpload(file));
      onChange([...values, ...uploaded].slice(0, 10));
      setStatus("Upload concluído ✓");
    } catch (error) {
      setStatus(error.message);
    } finally {
      event.target.value = "";
    }
  };
  return (
    <div className="multi-upload">
      <span>
        Fotos do produto <b>{values.length}/10</b>
      </span>
      <div className="multi-thumbs">
        {values.map((url, index) => (
          <div key={url}>
            <img src={url} alt={`Foto ${index + 1}`} />
            <button
              type="button"
              aria-label={`Remover foto ${index + 1}`}
              onClick={() =>
                onChange(values.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              ×
            </button>
          </div>
        ))}
        {values.length < 10 && (
          <label className="add-photo">
            +<small>Adicionar</small>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={select}
            />
          </label>
        )}
      </div>
      <small>
        {status ||
          "Selecione até 10 imagens PNG, JPG ou WebP de até 8 MB cada."}
      </small>
    </div>
  );
}
function ImageUpload({ label, hint, value, onUpload, onChange, wide }) {
  const [status, setStatus] = useState("");
  const select = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Enviando imagem…");
    try {
      const url = await onUpload(file);
      onChange(url);
      setStatus("Upload concluído ✓");
    } catch (error) {
      setStatus(error.message);
    } finally {
      event.target.value = "";
    }
  };
  return (
    <div className={`image-upload ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <div className="image-upload-box">
        {value ? (
          <img src={value} alt={`Prévia: ${label}`} />
        ) : (
          <div className="image-placeholder">▧</div>
        )}
        <div>
          <label className="upload-button">
            Escolher imagem
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={select}
            />
          </label>
          <small>{status || hint}</small>
          {value && (
            <button
              type="button"
              className="remove-image"
              onClick={() => onChange("")}
            >
              Remover imagem
            </button>
          )}
        </div>
      </div>
    </div>
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
