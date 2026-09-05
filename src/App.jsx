import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  demoMarketplaceStores,
  demoProducts,
  demoStore,
  emptyStore,
} from "./data";
import Docs from "./Docs";
import Marketplace from "./Marketplace";
import MobileSiteNav from "./MobileSiteNav";
import BrazilianCityPicker from "./BrazilianCityPicker";
import CategoryAutocomplete from "./CategoryAutocomplete";
import CustomDomainSetup from "./CustomDomainSetup";
import { isValidDomain } from "./customDomain";
import { INSTALLMENT_OPTIONS, installmentMessage, productInstallments } from "./productInstallments";
import { paidOrdersInPeriod, periodSummary } from "./periodReportData";
import {
  formatDescriptionSelection,
  prefixDescriptionLines,
  stripDescriptionFormatting,
} from "./descriptionFormat";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value) || 0,
  );
const BagIcon = () => (
  <svg className="bag-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 8.5h14l-1 12H6l-1-12Z" />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
  </svg>
);
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 1.9 17.7L.3 23.5l5.9-1.6A11.8 11.8 0 0 0 23.8 12c0-3.2-1.2-6.2-3.3-8.5Zm-8.4 18.4c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-3.5.9.9-3.4-.2-.4A9.8 9.8 0 1 1 12 21.9Zm5.4-7.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2l-.9 1.1c-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.7-.3-.5.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.9 5.2 2.2.9 3.1 1 4.2.8.7-.1 1.8-.7 2.1-1.5.3-.7.3-1.4.2-1.5-.2-.3-.5-.4-.8-.5Z" /></svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm9.25 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /></svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>
);

const orderDate = (value) => {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date)
    : "Agora";
};
const normalizeCustomer = (customer) => ({
  name: String(customer.name || "")
    .trim()
    .replace(/\s+/g, " "),
  email: String(customer.email || "")
    .trim()
    .toLowerCase(),
  phone: String(customer.phone || "").replace(/\D/g, ""),
});
const customerError = (customer) => {
  const value = normalizeCustomer(customer);
  if (value.name.length < 3) return "Informe o nome completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))
    return "Informe um e-mail válido.";
  if (value.phone.length < 10 || value.phone.length > 13)
    return "Informe um telefone ou WhatsApp válido, com DDD.";
  return "";
};
const normalizeSearch = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const storePalettes = [
  {
    id: "sky",
    name: "Azul claro",
    colors: ["#55b8e8", "#247da9", "#eaf6fc", "#12202d"],
  },
  {
    id: "rose",
    name: "Rosa suave",
    colors: ["#f28ba8", "#b73f68", "#fff0f4", "#38202a"],
  },
  {
    id: "terracotta",
    name: "Terracota",
    colors: ["#e58b67", "#a84f32", "#fff2eb", "#35231e"],
  },
  {
    id: "violet",
    name: "Violeta",
    colors: ["#a78bfa", "#6d4bcc", "#f3efff", "#241d38"],
  },
  {
    id: "graphite",
    name: "Grafite",
    colors: ["#93a4ae", "#465b66", "#edf2f4", "#172126"],
  },
];
const paletteStyle = (paletteId) => {
  const palette =
    storePalettes.find((option) => option.id === paletteId) || storePalettes[0];
  return {
    "--blue": palette.colors[0],
    "--blue-dark": palette.colors[1],
    "--pale": palette.colors[2],
    "--ink": palette.colors[3],
  };
};
const productImages = (product) =>
  product.imageUrls?.length
    ? product.imageUrls
    : product.imageUrl
      ? [product.imageUrl]
      : ["https://placehold.co/800x600/eaf6fc/247da9?text=Produto"];
const productUnavailable = (product) =>
  product.unavailable === true ||
  product.active === false ||
  (product.stock !== undefined && Number(product.stock) <= 0);
const productStock = (product) =>
  product.stock === undefined || product.stock === null || product.stock === ""
    ? Infinity
    : Math.max(0, Math.floor(Number(product.stock) || 0));
const percentageNumber = (value) =>
  Number(String(value ?? "").replace(",", "."));
const productDiscount = (product) =>
  Math.max(0, Math.min(99, percentageNumber(product.cashbackPercent) || 0));
const productCheckoutPrice = (product) =>
  Math.round(
    Number(product.price || 0) * 100 * (1 - productDiscount(product) / 100),
  ) / 100;
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
const memoryStorage = new Map();
const safeStorageGet = (key) => {
  try {
    return localStorage.getItem(key) ?? memoryStorage.get(key) ?? null;
  } catch {
    return memoryStorage.get(key) ?? null;
  }
};
const safeStorageSet = (key, value) => {
  memoryStorage.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    // Alguns navegadores bloqueiam storage em previews ou iframes.
  }
};
const safeStorageRemove = (key) => {
  memoryStorage.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // Mantém o logout funcional mesmo quando storage está bloqueado.
  }
};
const readStoredJson = (key) => {
  try {
    return JSON.parse(safeStorageGet(key) || "null");
  } catch {
    return null;
  }
};
const localStore = () => readStoredJson("tv-store");
const localProducts = () => readStoredJson("tv-products");
const saveLocal = (store, products) => {
  safeStorageSet("tv-store", JSON.stringify(store));
  safeStorageSet("tv-products", JSON.stringify(products));
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
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);
  return (
    <div className="landing-page">
      <header className={`marketing-nav ${menuOpen ? "menu-open" : ""}`}>
        <Logo />
        <button
          type="button"
          className="marketing-menu-toggle"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="marketing-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav id="marketing-menu">
          <Link to="/lojas" onClick={() => setMenuOpen(false)}>Lojas</Link>
          <Link to="/doc" onClick={() => setMenuOpen(false)}>Recursos</Link>
          <Link to="/admin/login" onClick={() => setMenuOpen(false)}>Entrar</Link>
          <Link className="button primary small" to="/admin" onClick={() => setMenuOpen(false)}>
            Criar minha loja
          </Link>
        </nav>
      </header>
      {menuOpen && (
        <button
          type="button"
          className="marketing-menu-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
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
        <section className="business-app-section">
          <div className="business-app-copy">
            <p className="eyebrow">SUA MARCA NA TELA DO CLIENTE</p>
            <h2>Por que ter um aplicativo para seu negócio?</h2>
            <p>
              Transforme sua loja em uma experiência prática e presente no dia a dia
              dos seus clientes, com acesso rápido pelo celular e a identidade da sua marca.
            </p>
            <div className="business-app-points">
              <span><b>01</b> Mais facilidade para comprar</span>
              <span><b>02</b> Sua marca sempre por perto</span>
              <span><b>03</b> Experiência profissional no celular</span>
            </div>
          </div>
          <div className="business-app-video">
            <video controls playsInline preload="metadata" aria-label="Por que usar um aplicativo no seu negócio">
              <source src="/porque-usar.mp4" type="video/mp4" />
              Seu navegador não suporta a reprodução deste vídeo.
            </video>
          </div>
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
      <footer>© 2026 Tô Vendendo · Feito para bons negócios.</footer>
      <MobileSiteNav />
      <a
        className="landing-whatsapp"
        href="https://wa.me/5562985849729?text=Ol%C3%A1%21%20Gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20o%20T%C3%B4%20Vendendo."
        target="_blank"
        rel="noreferrer"
        aria-label="Contacte-nos pelo WhatsApp"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 3.5A11.8 11.8 0 0 0 1.9 17.7L.3 23.5l5.9-1.6A11.8 11.8 0 0 0 23.8 12c0-3.2-1.2-6.2-3.3-8.5Zm-8.4 18.4c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-3.5.9.9-3.4-.2-.4A9.8 9.8 0 1 1 12 21.9Zm5.4-7.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2l-.9 1.1c-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.7-.3-.5.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.9 5.2 2.2.9 3.1 1 4.2.8.7-.1 1.8-.7 2.1-1.5.3-.7.3-1.4.2-1.5-.2-.3-.5-.4-.8-.5Z" />
        </svg>
        <span>Contacte-nos</span>
      </a>
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
            <li>✓ Compartilhamento pelo WhatsApp</li>
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
          <strong>R$ 49,90 / mês</strong>
          <ul>
            <li>✓ Tudo do período de teste</li>
            <li>✓ QR Code Pix por loja</li>
            <li>✓ Código Pix copia e cola</li>
            <li>✓ Gateway de pagamento pela Stripe</li>
            <li>✓ Comentários e curtidas por item</li>
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
          Assine por R$ 49,90 por mês. Informe seus dados; o cartão será
          preenchido somente no checkout seguro do Stripe.
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
      } else safeStorageSet("tv-demo-user", email);
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
  const [deliveryOrder, setDeliveryOrder] = useState(null);
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(12);
  const [installPrompt, setInstallPrompt] = useState(() => window.__tvInstallPrompt || null);
  const [showInstall, setShowInstall] = useState(false);
  const [installUnavailable, setInstallUnavailable] = useState(false);
  const loadMoreRef = useRef(null);
  useEffect(() => {
    if (!firebaseEnabled) {
      const saved = localStore();
      const marketplaceStore = demoMarketplaceStores.find(
        (item) => item.slug === slug,
      );
      setStore(
        saved?.slug === slug
          ? saved
          : slug === demoStore.slug
            ? demoStore
            : marketplaceStore || null,
      );
      setProducts(
        saved?.slug === slug
          ? localProducts() || []
          : slug === demoStore.slug || marketplaceStore
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
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    const mobile = window.matchMedia("(max-width: 780px)").matches;
    if (!standalone && mobile) setShowInstall(true);
    const capturePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      if (mobile) setShowInstall(true);
    };
    const useCapturedPrompt = () => {
      setInstallPrompt(window.__tvInstallPrompt || null);
      if (mobile) setShowInstall(true);
    };
    const installed = () => { setShowInstall(false); setInstallPrompt(null); };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("tvinstallpromptready", useCapturedPrompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("tvinstallpromptready", useCapturedPrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, [slug]);
  useEffect(() => {
    if (!store) return undefined;
    const manifest = document.querySelector('link[rel="manifest"]');
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    const previousManifest = manifest?.getAttribute("href");
    const previousIcon = appleIcon?.getAttribute("href");
    const previousTitle = document.title;
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const previousAppleTitle = appleTitle?.getAttribute("content");
    const applicationName = document.querySelector('meta[name="application-name"]');
    const previousApplicationName = applicationName?.getAttribute("content");
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const previousThemeColor = themeColor?.getAttribute("content");
    const storeManifest = document.createElement("link");
    storeManifest.rel = "manifest";
    storeManifest.href = `/.netlify/functions/store-manifest?slug=${encodeURIComponent(store.slug)}`;
    if (manifest) manifest.replaceWith(storeManifest);
    else document.head.appendChild(storeManifest);
    const storeIcon = firebaseEnabled && store.id
      ? `/.netlify/functions/store-icon?storeId=${encodeURIComponent(store.id)}&size=192`
      : store.logoUrl;
    if (appleIcon && storeIcon) appleIcon.setAttribute("href", storeIcon);
    document.title = `${store.brand} | Tô Vendendo`;
    if (appleTitle) appleTitle.setAttribute("content", store.brand);
    if (applicationName) applicationName.setAttribute("content", store.brand);
    if (themeColor) themeColor.setAttribute("content", paletteStyle(store.palette)["--blue-dark"]);
    return () => {
      if (previousManifest) {
        const restoredManifest = document.createElement("link");
        restoredManifest.rel = "manifest";
        restoredManifest.href = previousManifest;
        storeManifest.replaceWith(restoredManifest);
      } else storeManifest.remove();
      if (appleIcon && previousIcon) appleIcon.setAttribute("href", previousIcon);
      document.title = previousTitle;
      if (appleTitle && previousAppleTitle) appleTitle.setAttribute("content", previousAppleTitle);
      if (applicationName && previousApplicationName) applicationName.setAttribute("content", previousApplicationName);
      if (themeColor && previousThemeColor) themeColor.setAttribute("content", previousThemeColor);
    };
  }, [store]);
  const dismissInstall = () => {
    setShowInstall(false);
  };
  const requestInstall = async () => {
    const prompt = installPrompt || window.__tvInstallPrompt;
    if (!prompt) {
      setInstallUnavailable(true);
      return;
    }
    await prompt.prompt();
    await prompt.userChoice;
    window.__tvInstallPrompt = null;
    setInstallPrompt(null);
    setShowInstall(false);
  };
  const installInstructions = /iPad|iPhone|iPod/.test(navigator.userAgent)
    ? "No Safari, toque em Compartilhar, escolha “Adicionar à Tela de Início” e depois toque em Adicionar."
    : "Abra o menu do navegador (⋮), escolha “Instalar app” ou “Adicionar à tela inicial” e confirme.";
  const visible = products;
  const purchasable = visible.filter((product) => !productUnavailable(product));
  const allCategories = useMemo(
    () => storeCategories(store, visible),
    [store, visible],
  );
  const categories = useMemo(
    () =>
      allCategories.filter((category) =>
        visible.some(
          (product) =>
            productCategoryId(product, allCategories) === category.id,
        ),
      ),
    [allCategories, visible],
  );
  const filtered = useMemo(() => {
    const term = normalizeSearch(search);
    return visible.filter((product) => {
      if (
        activeCategory !== "all" &&
        productCategoryId(product, allCategories) !== activeCategory
      )
        return false;
      if (!term) return true;
      const category =
        allCategories.find(
          (item) => item.id === productCategoryId(product, allCategories),
        )?.name || product.category;
      return normalizeSearch(
        [
          product.name,
          category,
          product.description,
          money(product.price),
          Number(product.price).toFixed(2).replace(".", ","),
        ].join(" "),
      ).includes(term);
    });
  }, [visible, allCategories, activeCategory, search]);
  const displayed = filtered.slice(0, visibleLimit);
  useEffect(() => setVisibleLimit(12), [search, activeCategory]);
  useEffect(() => {
    setCart((current) =>
      Object.fromEntries(
        Object.entries(current).map(([productId, quantity]) => {
          const product = products.find((item) => item.id === productId);
          return [
            productId,
            product
              ? Math.min(Number(quantity) || 0, productStock(product))
              : 0,
          ];
        }),
      ),
    );
  }, [products]);
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || displayed.length >= filtered.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting)
          setVisibleLimit((current) => Math.min(current + 12, filtered.length));
      },
      { rootMargin: "300px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [displayed.length, filtered.length]);
  const count = purchasable.reduce(
    (sum, product) => sum + (cart[product.id] || 0),
    0,
  );
  const total = purchasable.reduce(
    (sum, p) => sum + (cart[p.id] || 0) * productCheckoutPrice(p),
    0,
  );
  const cartInstallments = purchasable.reduce((maximum, product) =>
    cart[product.id] ? Math.max(maximum, productInstallments(product.installments)) : maximum, 0);
  useEffect(() => {
    setSelectedInstallments((current) => Math.min(Math.max(1, current), Math.max(1, cartInstallments)));
  }, [cartInstallments]);
  const change = (p, delta) =>
    setCart((c) => ({
      ...c,
      [p.id]: productUnavailable(p)
        ? 0
        : Math.min(
            productStock(p),
            Math.max(0, (c[p.id] || 0) + delta),
          ),
    }));
  const payOnDelivery = async () => {
    if (!count) return;
    const validationError = customerError(customer);
    if (validationError) { setError(validationError); return; }
    setPaying(true);
    setError("");
    try {
      const selected = purchasable.filter((product) => cart[product.id]);
      const items = selected.map((product) => ({ id: product.id, quantity: cart[product.id] }));
      let orderId;
      let confirmedTotal = total;
      let confirmedInstallments = selectedInstallments;
      if (firebaseEnabled) {
        const response = await fetch("/.netlify/functions/create-delivery-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: store.id, items, customer: normalizeCustomer(customer), installments: selectedInstallments }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Não foi possível registrar o pedido.");
        orderId = data.orderId;
        confirmedTotal = Number(data.total);
        confirmedInstallments = Number(data.installments) || confirmedInstallments;
      } else {
        orderId = crypto.randomUUID();
        const orderItems = selected.map((product) => ({ productId: product.id, name: product.name, quantity: cart[product.id], unitPrice: productCheckoutPrice(product) }));
        const order = { id: orderId, customer: normalizeCustomer(customer), provider: "delivery", paymentMethod: "card_on_delivery", status: "pending_confirmation", installments: selectedInstallments, total, createdAt: new Date().toISOString(), items: orderItems, stockReserved: true, stockReservations: orderItems.map(({ productId, quantity }) => ({ productId, quantity })) };
        safeStorageSet("tv-orders", JSON.stringify([order, ...(readStoredJson("tv-orders") || [])]));
        const updatedProducts = products.map((product) => cart[product.id] && Number.isFinite(productStock(product)) ? { ...product, stock: Math.max(0, productStock(product) - cart[product.id]) } : product);
        setProducts(updatedProducts);
        saveLocal(store, updatedProducts);
      }
      setDeliveryOrder({ id: orderId, total: confirmedTotal, installments: confirmedInstallments });
      setCart({});
      setCartOpen(false);
    } catch (err) { setError(err.message); } finally { setPaying(false); }
  };
  const checkout = async () => {
    if (!count) return;
    if (!store.payment?.pixKey?.trim()) {
      setError("A loja ainda não configurou uma chave Pix.");
      return;
    }
    const validationError = customerError(customer);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPaying(true);
    setError("");
    try {
      let confirmedTotal = total;
      let orderId = "";
      const items = purchasable
        .filter((product) => cart[product.id])
        .map((product) => ({ id: product.id, quantity: cart[product.id] }));
      if (firebaseEnabled) {
        const response = await fetch("/.netlify/functions/create-pix-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: store.id,
            items,
            customer: normalizeCustomer(customer),
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(data.error || "Não foi possível criar o pedido Pix.");
        confirmedTotal = Number(data.total);
        orderId = data.orderId;
      }
      const payload = createPixPayload({
        key: store.payment.pixKey,
        name: store.payment.pixReceiverName || store.brand,
        city: store.payment.pixCity || store.address,
        amount: confirmedTotal,
      });
      const qrCode = await QRCode.toDataURL(payload, {
        width: 360,
        margin: 2,
        color: { dark: "#12202d", light: "#ffffff" },
      });
      setPixPayment({ payload, qrCode, total: confirmedTotal, orderId });
      setCartOpen(false);
    } catch (err) {
      setError(
        err.message ||
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
    const validationError = customerError(customer);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPaying(true);
    setError("");
    try {
      const response = await fetch(
        "/.netlify/functions/create-store-checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: store.id,
            items,
            customer: normalizeCustomer(customer),
          }),
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
    <div className="store-page" style={paletteStyle(store.palette)}>
      <header className="store-nav">
        <a className="brand" href="#top">
          <img src={store.logoUrl || "/default-store-logo.png"} alt={`Logo da ${store.brand}`} />
          <span>{store.brand}</span>
        </a>
        <div>
          <span>{store.hours}</span>
          <button className="cart-button" onClick={() => setCartOpen(true)}>
            <BagIcon /><span>Sacola</span><b>{count}</b>
          </button>
        </div>
        <label className="store-mobile-search">
          <SearchIcon />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produtos" aria-label="Buscar produtos" />
          {search && <button onClick={() => setSearch("")} aria-label="Limpar busca">×</button>}
        </label>
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
          <label className="store-search store-desktop-search">
            <SearchIcon />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por produto, categoria, descrição ou preço"
              aria-label="Buscar produtos"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Limpar busca">
                ×
              </button>
            )}
          </label>
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
          <div
            className={`product-grid ${
              displayed.length > 1 ? "multiple-products" : "single-product"
            }`}
            aria-label={
              displayed.length > 1 ? "Lista de produtos" : "Produto da loja"
            }
          >
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
          {!filtered.length && (
            <div className="empty-search">
              <b>Nenhum item encontrado</b>
              <span>Tente buscar usando outro nome, categoria ou preço.</span>
            </div>
          )}
          {displayed.length < filtered.length && (
            <div className="infinite-loader" ref={loadMoreRef}>
              <i /> Carregando mais itens…
            </div>
          )}
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
              <span>WhatsApp</span>
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
                <span>Instagram</span>
              </a>
            )}
          </div>
        </section>
      </main>
      <footer className="docs-footer">
        <Logo />
        <span>© 2026 Tô Vendendo · Feito para bons negócios.</span>
      </footer>
      <nav className="store-app-nav" aria-label="Atalhos da loja">
        <a href={`https://wa.me/${String(store.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Conheci a ${store.brand} pelo site e gostaria de mais informações.`)}`} target="_blank" rel="noreferrer" className={!store.whatsapp ? "disabled" : ""} aria-label="Abrir WhatsApp"><WhatsAppIcon /><span>WhatsApp</span></a>
        <a href={instagramHandle(store.instagram) ? `https://instagram.com/${instagramHandle(store.instagram)}` : undefined} target="_blank" rel="noreferrer" className={!instagramHandle(store.instagram) ? "disabled" : ""} aria-label="Abrir Instagram"><InstagramIcon /><span>Instagram</span></a>
        <button onClick={() => setCartOpen(true)} aria-label={`Abrir sacola com ${count} itens`}><span className="app-bag-wrap"><BagIcon />{count > 0 && <b>{count}</b>}</span><span>Sacola</span></button>
      </nav>
      {showInstall && (
        <aside className="install-app-card" role="dialog" aria-label={`Instalar aplicativo ${store.brand}`}>
          <img src={store.logoUrl || "/default-store-logo.png"} alt="" />
          <div>
            <strong>Instale a {store.brand}</strong>
            <small>{installUnavailable ? "Siga estes passos para instalar:" : "Acesse mais rápido, como um aplicativo no seu celular."}</small>
            {installUnavailable && <em>{installInstructions}</em>}
          </div>
          <button className="install-action" onClick={installUnavailable ? dismissInstall : requestInstall}>{installUnavailable ? "Entendi" : "Instalar"}</button>
          <button className="install-close" onClick={dismissInstall} aria-label="Agora não">×</button>
        </aside>
      )}
      {count > 0 && (
        <button className="floating-cart" onClick={() => setCartOpen(true)}>
          <BagIcon /><span>Ver sacola</span><strong>{money(total)}</strong>
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
                    <small>{money(productCheckoutPrice(p))} cada</small>
                    {(cart[p.id] || 0) >= productStock(p) && (
                      <small className="stock-limit-message">
                        Limite do estoque atingido
                      </small>
                    )}
                  </div>
                  <div className="quantity">
                    <button onClick={() => change(p, -1)}>−</button>
                    <span>{cart[p.id]}</span>
                    <button
                      disabled={(cart[p.id] || 0) >= productStock(p)}
                      onClick={() => change(p, 1)}
                      aria-label={
                        (cart[p.id] || 0) >= productStock(p)
                          ? "Quantidade máxima disponível"
                          : "Adicionar uma unidade"
                      }
                    >+</button>
                  </div>
                </div>
              ))}
            <div className="cart-total">
              <span>Total</span>
              <b>{money(total)}</b>
            </div>
            <div className="checkout-customer">
              <p>Dados do cliente</p>
              <input
                value={customer.name}
                onChange={(event) =>
                  setCustomer((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Nome completo"
                autoComplete="name"
                maxLength="100"
              />
              <input
                type="email"
                value={customer.email}
                onChange={(event) =>
                  setCustomer((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="E-mail"
                autoComplete="email"
                maxLength="160"
              />
              <input
                type="tel"
                value={customer.phone}
                onChange={(event) =>
                  setCustomer((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="Telefone / WhatsApp com DDD"
                autoComplete="tel"
                maxLength="20"
              />
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
                    <b>{paying ? "Abrindo Stripe…" : "Cartão de crédito"}</b>
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
            {cartInstallments > 1 && <div className="delivery-payment-option">
              <small className="installment-note">Mais flexibilidade para você: escolha abaixo como deseja parcelar em até {cartInstallments}x na maquininha, no momento da entrega ou retirada.</small>
              <label className="checkout-installments"><span>Quantidade de parcelas</span><select value={selectedInstallments} onChange={(event) => setSelectedInstallments(Number(event.target.value))}>{INSTALLMENT_OPTIONS.filter((installments) => installments <= cartInstallments).map((installments) => <option key={installments} value={installments}>{installments}x de {money(total / installments)}*</option>)}</select><strong>{selectedInstallments}x de {money(total / selectedInstallments)}*</strong><small>* Valor sem a taxa da maquininha. A operadora poderá acrescentar a taxa do parcelamento no momento do pagamento.</small></label>
              <button className="button delivery-payment-button full" disabled={paying} onClick={payOnDelivery}>{paying ? "Registrando pedido…" : "Pagar na entrega"}<small>Maquininha na entrega ou retirada</small></button>
            </div>}
            {error && <p className="error">{error}</p>}
          </section>
        </div>
      )}
      {pixPayment && (
        <PixModal
          store={store}
          total={pixPayment.total}
          payment={pixPayment}
          onClose={() => setPixPayment(null)}
        />
      )}
      {deliveryOrder && <div className="modal-backdrop"><section className="delivery-order-success"><button className="modal-close" onClick={() => setDeliveryOrder(null)}>×</button><span>✓</span><p className="eyebrow">PEDIDO REGISTRADO</p><h2>Combinado! Você paga ao receber.</h2><p>A loja recebeu seu pedido. O pagamento será feito na maquininha no momento da entrega ou retirada.</p><strong>{money(deliveryOrder.total)}{deliveryOrder.installments > 1 ? ` · até ${deliveryOrder.installments}x` : " · à vista"}</strong><small>Pedido {deliveryOrder.id.slice(0, 8).toUpperCase()}</small><button className="button primary full" onClick={() => setDeliveryOrder(null)}>Continuar na loja</button></section></div>}
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
  drawWrappedText(
    context,
    stripDescriptionFormatting(product.description),
    70,
    1190,
    940,
    36,
    2,
  );
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
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [celebrationId, setCelebrationId] = useState(0);
  const celebrationTimer = useRef(null);
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
  const addWithCelebration = () => {
    window.clearTimeout(celebrationTimer.current);
    setCelebrationId((value) => value + 1);
    celebrationTimer.current = window.setTimeout(() => setCelebrationId(0), 850);
    onChange(product, 1);
  };
  useEffect(
    () => () => window.clearTimeout(celebrationTimer.current),
    [],
  );
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
  useEffect(() => {
    if (!descriptionModalOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setDescriptionModalOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [descriptionModalOpen]);
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
      stripDescriptionFormatting(product.description),
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
        <div
          className="product-copy"
          onClick={(event) => {
            if (!event.target.closest("button, a")) setDescriptionModalOpen(true);
          }}
        >
          <small>{product.category || "Produto"}</small>
          <h3>
            <button
              type="button"
              className="product-details-trigger"
              onClick={() => setDescriptionModalOpen(true)}
              aria-haspopup="dialog"
            >
              {product.name}
            </button>
          </h3>
          <div className="product-description-summary">
            <ProductDescription value={product.description} />
          </div>
          {productDiscount(product) > 0 && (
            <div className="site-discount-message">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3.4 13.4a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.4 7a2 2 0 0 1 0 2.8Z" />
                <circle cx="8" cy="8" r="1.3" />
              </svg>
              <span>
                Finalizando sua compra no site, você tem{" "}
                <b>{productDiscount(product)}% de desconto</b> neste item.
              </span>
            </div>
          )}
          {installmentMessage(product.installments) && (
            <div className="product-installment-info"><b>Pagamento facilitado</b><span>{installmentMessage(product.installments)}</span></div>
          )}
          {Number.isFinite(productStock(product)) && !productUnavailable(product) && (
            <small className="product-stock">
              {productStock(product)} {productStock(product) === 1
                ? "unidade disponível"
                : "unidades disponíveis"}
            </small>
          )}
          {quantity > 0 && quantity >= productStock(product) && (
            <small className="stock-limit-message">
              Limite do estoque atingido
            </small>
          )}
          <div className="product-bottom">
            <div className="product-price">
              {productDiscount(product) > 0 && (
                <small>{money(product.price)}</small>
              )}
              <b>{money(productCheckoutPrice(product))}</b>
            </div>
            {productUnavailable(product) ? (
              <button disabled>Indisponível</button>
            ) : (
              <div className="add-product-action">
                {quantity ? (
                  <div className="quantity">
                    <button onClick={() => onChange(product, -1)}>−</button>
                    <span>{quantity}</span>
                    <button
                      disabled={quantity >= productStock(product)}
                      onClick={() => onChange(product, 1)}
                      aria-label={
                        quantity >= productStock(product)
                          ? "Quantidade máxima disponível"
                          : "Adicionar uma unidade"
                      }
                    >+</button>
                  </div>
                ) : (
                  <button onClick={addWithCelebration}>Adicionar</button>
                )}
                {celebrationId > 0 && (
                  <span
                    className="add-celebration"
                    key={celebrationId}
                    aria-hidden="true"
                  >
                    {Array.from({ length: 14 }, (_, index) => {
                      const angle = (Math.PI * 2 * index) / 14;
                      const distance = 34 + (index % 3) * 9;
                      return (
                        <i
                          key={index}
                          style={{
                            "--confetti-x": `${Math.cos(angle) * distance}px`,
                            "--confetti-y": `${Math.sin(angle) * distance}px`,
                            "--confetti-delay": `${(index % 4) * 18}ms`,
                            "--confetti-rotation": `${120 + index * 37}deg`,
                          }}
                        />
                      );
                    })}
                  </span>
                )}
              </div>
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
              <span>{likesCount}</span>
            </button>
            <button
              onClick={() => setCommentsOpen(true)}
              aria-label="Ver comentários"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
              </svg>
              <span>
                {Number(product.commentsCount) || 0}
              </span>
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
              <span>{sharing ? "Preparando…" : "Compartilhar"}</span>
            </button>
          </div>
        </div>
      </article>
      {descriptionModalOpen && (
        <div
          className="modal-backdrop product-description-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget &&
            setDescriptionModalOpen(false)
          }
        >
          <section
            className="product-description-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`description-title-${product.id}`}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setDescriptionModalOpen(false)}
              aria-label="Fechar descrição"
            >
              ×
            </button>
            <img src={images[0]} alt={`Foto de ${product.name}`} />
            <div>
              <small>{product.category || "Produto"}</small>
              <h2 id={`description-title-${product.id}`}>{product.name}</h2>
              <div className="description-modal-price">
                {productDiscount(product) > 0 && (
                  <small>{money(product.price)}</small>
                )}
                <strong>{money(productCheckoutPrice(product))}</strong>
              </div>
              {productDiscount(product) > 0 && (
                <div className="site-discount-message modal-discount-message">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3.4 13.4a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.4 7a2 2 0 0 1 0 2.8Z" />
                    <circle cx="8" cy="8" r="1.3" />
                  </svg>
                  <span>
                    Comprando pelo site, você recebe <b>{productDiscount(product)}% de desconto</b>. O valor já está aplicado no preço acima.
                  </span>
                </div>
              )}
              {installmentMessage(product.installments) && (
                <div className="product-installment-info modal-installment-info">
                  <b>Pagamento facilitado</b>
                  <span>{installmentMessage(product.installments)}</span>
                </div>
              )}
              <ProductDescription value={product.description} />
            </div>
          </section>
        </div>
      )}
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
          <section
            className="image-zoom-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Fotos de ${product.name}`}
          >
            <button
              className="modal-close"
              onClick={() => setZoomOpen(false)}
              aria-label="Fechar fotos ampliadas"
            >
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
                alt={`${product.name} — foto ${current + 1} de ${images.length}`}
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="zoom-carousel-prev"
                    aria-label="Foto anterior"
                    onClick={() => move(-1)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="zoom-carousel-next"
                    aria-label="Próxima foto"
                    onClick={() => move(1)}
                  >
                    ›
                  </button>
                </>
              )}
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
            <p>
              <span>{product.name}</span>
              {images.length > 1 && (
                <small>{current + 1} / {images.length}</small>
              )}
            </p>
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
  const [productEditor, setProductEditor] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesPage, setSalesPage] = useState(1);
  const today = new Date();
  const [reportStart, setReportStart] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [reportEnd, setReportEnd] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
  );
  const [generatingReport, setGeneratingReport] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [tab, setTab] = useState("store");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [storeQrCode, setStoreQrCode] = useState("");
  const [storeLinkCopied, setStoreLinkCopied] = useState(false);
  useEffect(() => {
    if (!user) return;
    if (!firebaseEnabled) {
      setStore(localStore() || emptyStore(user.uid));
      setProducts(localProducts() || demoProducts);
      setOrders(readStoredJson("tv-orders") || []);
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
  const publicStoreSlug = store?.slug || slugify(store?.brand) || "sua-loja";
  const publicStoreUrl = `${location.origin}/loja/${publicStoreSlug}`;
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(publicStoreUrl, {
      width: 240,
      margin: 2,
      color: { dark: "#12202d", light: "#ffffff" },
    }).then((dataUrl) => active && setStoreQrCode(dataUrl))
      .catch(() => active && setStoreQrCode(""));
    return () => { active = false; };
  }, [publicStoreUrl]);
  const copyStoreLink = async () => {
    try {
      await navigator.clipboard.writeText(publicStoreUrl);
      setStoreLinkCopied(true);
      setTimeout(() => setStoreLinkCopied(false), 2200);
    } catch {
      setSaved("Não foi possível copiar o link. Selecione o endereço manualmente.");
    }
  };
  useEffect(() => {
    if (!firebaseEnabled || !store?.id || !user) return undefined;
    return onSnapshot(
      collection(db, "stores", store.id, "orders"),
      (snapshot) =>
        setOrders(
          snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort(
              (a, b) =>
                (b.createdAt?.toMillis?.() || 0) -
                (a.createdAt?.toMillis?.() || 0),
            ),
        ),
      (error) =>
        setSaved(`Não foi possível carregar as vendas: ${error.message}`),
    );
  }, [store?.id, user]);
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
  const adminProducts = products.filter((product) =>
    normalizeSearch(
      [product.name, product.category, product.stock, product.price].join(" "),
    ).includes(normalizeSearch(productSearch)),
  );
  const filteredOrders = orders.filter((order) => {
    if (
      order.provider === "stripe" &&
      !["paid", "payment_failed", "expired", "payment_review"].includes(
        order.status,
      )
    )
      return false;
    const term = normalizeSearch(salesSearch);
    if (!term) return true;
    const status =
      order.status === "paid"
        ? "pagamento validado pago"
        : order.status === "payment_failed"
          ? "cartao recusado falhou"
          : order.status === "expired"
            ? "checkout expirado"
              : order.status === "payment_review"
                ? "revisar pagamento"
              : order.status === "refunded"
                ? "estornado reembolsado"
              : order.status === "cancelled"
                ? "cancelado"
              : ["pix", "delivery"].includes(order.provider)
                ? "pendente de confirmacao"
                : "aguardando stripe pendente";
    return normalizeSearch(
      [
        order.id,
        order.paymentIntentId,
        order.customer?.name,
        order.customer?.email,
        order.customer?.phone,
        order.provider === "pix" ? "pix" : order.provider === "delivery" ? "cartao na entrega maquininha" : "cartao stripe",
        status,
        ...(order.items || []).map((item) => item.name),
      ].join(" "),
    ).includes(term);
  });
  const salesPageSize = 10;
  const salesPageCount = Math.max(
    1,
    Math.ceil(filteredOrders.length / salesPageSize),
  );
  const currentSalesPage = Math.min(salesPage, salesPageCount);
  const paginatedOrders = filteredOrders.slice(
    (currentSalesPage - 1) * salesPageSize,
    currentSalesPage * salesPageSize,
  );
  const reportOrders = paidOrdersInPeriod(orders, reportStart, reportEnd);
  const reportTotals = periodSummary(reportOrders);
  const generateReport = async () => {
    if (!reportStart || !reportEnd || reportStart > reportEnd) {
      setSaved("Informe um período válido para gerar o fechamento.");
      return;
    }
    if (!reportOrders.length) {
      setSaved("Não há vendas pagas no período selecionado.");
      return;
    }
    setGeneratingReport(true);
    setSaved("Preparando o relatório em PDF…");
    try {
      const { generatePeriodPdf } = await import("./periodReport");
      await generatePeriodPdf({
        store,
        orders: reportOrders,
        start: reportStart,
        end: reportEnd,
        appUrl: location.origin,
      });
      setSaved("Relatório gerado e baixado com sucesso ✓");
    } catch (error) {
      console.error("Falha ao gerar relatório:", error);
      setSaved(`Não foi possível gerar o PDF: ${error.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };
  const confirmManualPayment = async (order) => {
    setSaving(true);
    setSaved("Confirmando pagamento…");
    try {
      if (firebaseEnabled) {
        const token = await user.getIdToken();
        const response = await fetch("/.netlify/functions/confirm-manual-order", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ storeId: store.id, orderId: order.id }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Não foi possível confirmar o pagamento.");
      } else {
        const updated = orders.map((item) => item.id === order.id ? { ...item, status: "paid", paidAt: new Date().toISOString() } : item);
        setOrders(updated);
        safeStorageSet("tv-orders", JSON.stringify(updated));
      }
      setSaved("Pagamento confirmado ✓");
    } catch (error) {
      setSaved(error.message);
    } finally {
      setSaving(false);
    }
  };
  const refundManualOrder = async (order) => {
    const paid = order.status === "paid";
    if (!window.confirm(paid ? "Estornar este pedido e devolver os itens ao estoque? A devolução do dinheiro ao cliente deverá ser feita manualmente." : "Cancelar este pedido e devolver os itens ao estoque?")) return;
    setSaving(true);
    setSaved("Estornando pedido…");
    try {
      if (firebaseEnabled) {
        const token = await user.getIdToken();
        const response = await fetch("/.netlify/functions/refund-manual-order", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ storeId: store.id, orderId: order.id }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Não foi possível estornar o pedido.");
      } else {
        const restoredProducts = products.map((product) => {
          const reservation = (order.stockReservations || order.items || []).find((item) => item.productId === product.id);
          return reservation && Number.isFinite(productStock(product)) ? { ...product, stock: productStock(product) + Number(reservation.quantity || 0) } : product;
        });
        const updatedOrders = orders.map((item) => item.id === order.id ? { ...item, status: paid ? "refunded" : "cancelled", refundedAt: new Date().toISOString(), stockReleased: true } : item);
        setProducts(restoredProducts);
        setOrders(updatedOrders);
        saveLocal(store, restoredProducts);
        safeStorageSet("tv-orders", JSON.stringify(updatedOrders));
      }
      setSaved(paid ? "Pedido estornado e estoque devolvido ✓ Faça a devolução financeira ao cliente." : "Pedido cancelado e itens devolvidos ao estoque ✓");
    } catch (error) { setSaved(error.message); } finally { setSaving(false); }
  };
  const refreshStripeSales = async () => {
    setSaving(true);
    setSaved("Consultando pagamentos na Stripe…");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/.netlify/functions/sync-stripe-orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storeId: store.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Não foi possível consultar a Stripe.");
      setSaved(
        data.checked
          ? `${data.updated} pagamento(s) consultado(s) na Stripe ✓`
          : "Não há pagamentos Stripe pendentes para consultar.",
      );
    } catch (error) {
      setSaved(error.message);
    } finally {
      setSaving(false);
    }
  };
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
    if (!normalized.address || !normalized.city || !normalized.state) {
      setSaved("Selecione o estado e a cidade da loja.");
      setSaving(false);
      setTab("store");
      return null;
    }
    if (normalized.customDomain && !isValidDomain(normalized.customDomain)) {
      setSaved("Informe um domínio válido, sem protocolo ou caminhos.");
      setSaving(false);
      setTab("publish");
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
    const missingStock = products.find(
      (product) =>
        product.stock === "" ||
        product.stock === undefined ||
        product.stock === null ||
        !Number.isInteger(Number(product.stock)) ||
        Number(product.stock) < 0,
    );
    if (missingStock) {
      setSaved(
        `Informe a quantidade disponível do produto “${missingStock.name}”.`,
      );
      setSaving(false);
      setTab("products");
      editProduct(missingStock);
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
    setProductEditor({
      mode: "create",
      value: {
        id: crypto.randomUUID(),
        name: "",
        category: categories[0].name,
        categoryId: categories[0].id,
        description: "",
        price: 0,
        stock: 1,
        cashbackPercent: 0,
        installments: 1,
        unavailable: false,
        active: true,
        imageUrl: "",
        imageUrls: [],
      },
    });
    setTab("products");
  };
  const changeProductDraft = (key, value) =>
    setProductEditor((current) => ({
      ...current,
      value: { ...current.value, [key]: value },
    }));
  const editProduct = (product) =>
    setProductEditor({
      mode: "edit",
      value: { ...product, imageUrls: [...(product.imageUrls || [])] },
    });
  const finishProduct = () => {
    const product = productEditor?.value;
    const cashbackPercent = percentageNumber(product?.cashbackPercent || 0);
    if (!product?.name.trim()) {
      setSaved("Informe o nome do produto.");
      return;
    }
    if (!productCategoryId(product, categories)) {
      setSaved("Escolha uma categoria para o produto.");
      return;
    }
    if (!(Number(product.price) > 0)) {
      setSaved("Informe um preço válido para o produto.");
      return;
    }
    if (
      product.stock === "" ||
      product.stock === undefined ||
      product.stock === null ||
      !Number.isInteger(Number(product.stock)) ||
      Number(product.stock) < 0
    ) {
      setSaved("Informe a quantidade disponível do produto.");
      return;
    }
    if (
      !Number.isFinite(cashbackPercent) ||
      cashbackPercent < 0 ||
      cashbackPercent > 99
    ) {
      setSaved("Informe um desconto entre 0% e 99%.");
      return;
    }
    const normalizedProduct = {
      ...product,
      cashbackPercent,
      installments: productInstallments(product.installments) || 1,
    };
    setProducts((current) =>
      productEditor.mode === "create"
        ? [...current, normalizedProduct]
        : current.map((item) =>
            item.id === product.id ? normalizedProduct : item,
          ),
    );
    setProductEditor(null);
    setSaved(
      productEditor.mode === "create"
        ? "Produto adicionado. Salve as alterações para publicar ✓"
        : "Produto atualizado. Salve as alterações para publicar ✓",
    );
  };
  const addCategory = (name) =>
    update("categories", [
      ...categories,
      {
        id: crypto.randomUUID(),
        name,
      },
    ]);
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
    if (!window.confirm(`Excluir “${p.name}”? Esta ação não pode ser desfeita.`))
      return;
    setProducts((ps) => ps.filter((x) => x.id !== p.id));
    setProductEditor(null);
    if (firebaseEnabled && store.id)
      await deleteDoc(doc(db, "stores", store.id, "products", p.id));
  };
  return (
    <div className="admin">
      <header className="admin-top">
        <Logo />
        <div>
          <button
            type="button"
            className={`admin-menu-toggle ${adminMenuOpen ? "open" : ""}`}
            onClick={() => setAdminMenuOpen((open) => !open)}
            aria-label={adminMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={adminMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>
          <button className="text-button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>
      {adminMenuOpen && (
        <button
          type="button"
          className="admin-menu-backdrop"
          onClick={() => setAdminMenuOpen(false)}
          aria-label="Fechar menu"
        />
      )}
      <div className="editor">
        <aside className={adminMenuOpen ? "admin-menu-open" : ""}>
          <p>PAINEL DA LOJA</p>
          {[
            ["store", "01 · Loja"],
            ["categories", "02 · Categorias"],
            ["products", "03 · Produtos"],
            ["payment", "04 · Pagamentos"],
            ["sales", "05 · Vendas"],
            ["closing", "06 · Fechamento"],
            ["publish", "07 · Publicar"],
          ].map((x) => (
            <button
              key={x[0]}
              className={tab === x[0] ? "active" : ""}
              onClick={() => {
                setTab(x[0]);
                setAdminMenuOpen(false);
              }}
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
              <div className="palette-field">
                <div>
                  <b>Paleta da loja</b>
                  <span>Escolha as cores da sua vitrine.</span>
                </div>
                <div className="palette-options">
                  {storePalettes.map((palette) => (
                    <button
                      type="button"
                      key={palette.id}
                      className={
                        (store.palette || "sky") === palette.id ? "active" : ""
                      }
                      onClick={() => update("palette", palette.id)}
                      aria-label={`Aplicar paleta ${palette.name}`}
                    >
                      <span className="palette-swatches">
                        {palette.colors.map((color) => (
                          <i key={color} style={{ background: color }} />
                        ))}
                      </span>
                      <small>{palette.name}</small>
                    </button>
                  ))}
                </div>
              </div>
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
                <BrazilianCityPicker
                  state={store.state}
                  city={store.city}
                  onChange={(place) => setStore((current) => ({
                    ...current,
                    address: place.label,
                    city: place.city,
                    state: place.state,
                  }))}
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
              </div>
              <p className="intro">
                Crie as categorias antes dos produtos. Cada categoria pode
                reunir quantos itens você quiser.
              </p>
              <CategoryAutocomplete categories={categories} onAdd={addCategory} />
              <div className="category-editors">
                {categories.map((category) => (
                  <div className="category-editor" key={category.id}>
                    <div className="category-editor-name"><b>{category.name}</b><small>Categoria selecionada</small></div>
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
                  <h1>
                    {productEditor
                      ? productEditor.mode === "create"
                        ? "Novo produto."
                        : "Editar produto."
                      : "Seus produtos."}
                  </h1>
                </div>
                {productEditor ? (
                  <button
                    className="button outline"
                    onClick={() => setProductEditor(null)}
                  >
                    ← Voltar à lista
                  </button>
                ) : (
                  <button className="button outline" onClick={add}>
                    + Novo produto
                  </button>
                )}
              </div>
              {productEditor ? (
                <article className="product-editor product-editor-single">
                  <img
                    src={productImages(productEditor.value)[0]}
                    alt={
                      productEditor.value.name
                        ? `Foto de ${productEditor.value.name}`
                        : "Prévia do produto"
                    }
                  />
                  <div>
                    <Field
                      label="Nome"
                      value={productEditor.value.name}
                      onChange={(value) => changeProductDraft("name", value)}
                    />
                    <SelectField
                      label="Categoria"
                      value={productCategoryId(productEditor.value, categories)}
                      options={categories}
                      onChange={(categoryId) => {
                        const category = categories.find(
                          (item) => item.id === categoryId,
                        );
                        setProductEditor((current) => ({
                          ...current,
                          value: {
                            ...current.value,
                            categoryId,
                            category: category?.name || "",
                          },
                        }));
                      }}
                    />
                    <ProductDescriptionEditor
                      value={productEditor.value.description}
                      onChange={(value) =>
                        changeProductDraft("description", value)
                      }
                    />
                    <ProductImagesUpload
                      values={productImages(productEditor.value).filter(
                        (url) => !url.includes("placehold.co"),
                      )}
                      onUpload={(file) =>
                        uploadImage(file, `products/${productEditor.value.id}`)
                      }
                      onChange={(urls) =>
                        changeProductDraft("imageUrls", urls)
                      }
                    />
                    <div className="inline-fields product-commercial-fields">
                      <CurrencyField
                        label="Preço"
                        value={productEditor.value.price}
                        onChange={(value) => changeProductDraft("price", value)}
                      />
                      <label className="field">
                        <span>Quantidade disponível</span>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={productEditor.value.stock ?? ""}
                            placeholder="0"
                            required
                            onChange={(event) =>
                              changeProductDraft(
                                "stock",
                                event.target.value === ""
                                  ? ""
                                  : Math.max(
                                      0,
                                      Math.floor(
                                        Number(event.target.value) || 0,
                                      ),
                                    ),
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="field">
                        <span>Parcelamento na maquininha</span>
                        <div>
                          <select value={productInstallments(productEditor.value.installments) || 1} onChange={(event) => changeProductDraft("installments", Number(event.target.value))}>
                            <option value="1">Somente à vista</option>
                            {INSTALLMENT_OPTIONS.filter((installments) => installments > 1).map((installments) => <option key={installments} value={installments}>Até {installments}x</option>)}
                          </select>
                        </div>
                      </label>
                      <label className="field">
                        <span>Desconto no site (%)</span>
                        <div>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={productEditor.value.cashbackPercent ?? 0}
                            onChange={(event) =>
                              changeProductDraft(
                                "cashbackPercent",
                                event.target.value
                                  .replace(/[^0-9,.]/g, "")
                                  .replace(/([,.].*)[,.]/g, "$1"),
                              )
                            }
                          />
                        </div>
                      </label>
                    </div>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={
                          productEditor.value.unavailable === true ||
                          productEditor.value.active === false
                        }
                        onChange={(event) =>
                          setProductEditor((current) => ({
                            ...current,
                            value: {
                              ...current.value,
                              unavailable: event.target.checked,
                              active: true,
                            },
                          }))
                        }
                      />{" "}
                      Indisponível
                    </label>
                    <div className="product-editor-actions">
                      <button className="button primary" onClick={finishProduct}>
                        {productEditor.mode === "create"
                          ? "Adicionar produto"
                          : "Concluir edição"}
                      </button>
                      <button
                        className="button outline"
                        onClick={() => setProductEditor(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </article>
              ) : (
                <div className="product-admin-list">
                  {products.length > 0 && (
                    <label className="sales-search product-admin-search">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m16 16 5 5" />
                      </svg>
                      <input
                        type="search"
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        placeholder="Buscar produto ou categoria"
                        aria-label="Buscar produtos cadastrados"
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch("")}
                          aria-label="Limpar busca"
                        >
                          ×
                        </button>
                      )}
                    </label>
                  )}
                  {adminProducts.map((product) => (
                    <article className="product-admin-item" key={product.id}>
                      <img
                        src={productImages(product)[0]}
                        alt={`Foto de ${product.name}`}
                      />
                      <div>
                        <small>{product.category || "Sem categoria"}</small>
                        <b>{product.name || "Produto sem nome"}</b>
                        <span>
                          {money(product.price)} · {Number.isFinite(productStock(product))
                            ? `${productStock(product)} em estoque`
                            : "Quantidade não definida"}
                          {productDiscount(product) > 0
                            ? ` · ${productDiscount(product)}% de desconto`
                            : ""}
                        </span>
                      </div>
                      <span
                        className={`product-admin-status ${
                          productUnavailable(product) ? "inactive" : "active"
                        }`}
                      >
                        {productUnavailable(product) ? "Indisponível" : "Ativo"}
                      </span>
                      <div className="product-admin-actions">
                        <button
                          className="button outline small"
                          onClick={() => editProduct(product)}
                        >
                          Editar
                        </button>
                        <button className="danger" onClick={() => remove(product)}>
                          Excluir
                        </button>
                      </div>
                    </article>
                  ))}
                  {products.length > 0 && !adminProducts.length && (
                    <div className="empty-products">
                      <b>Nenhum produto encontrado</b>
                      <span>Tente buscar usando outro nome ou categoria.</span>
                    </div>
                  )}
                  {!products.length && (
                    <div className="empty-products">
                      <b>Nenhum produto cadastrado</b>
                      <span>Crie o primeiro item para começar seu catálogo.</span>
                      <button className="button primary small" onClick={add}>
                        + Novo produto
                      </button>
                    </div>
                  )}
                </div>
              )}
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
              <div className="stripe-pricing-card">
                <div className="stripe-pricing-header">
                  <div className="stripe-icon">S</div>
                  <div>
                    <b>Pagamentos online via Stripe</b>
                    <p>
                      Acesse uma plataforma de pagamentos completa com preços
                      simples e pagamento conforme o uso. Sem tarifas mensais,
                      ocultas ou de configuração.
                    </p>
                  </div>
                </div>
                <div className="stripe-pricing-value">
                  <strong>3,99% + R$ 0,39</strong>
                  <small>por transação realizada para cartões nacionais</small>
                </div>
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
          {tab === "sales" && (
            <>
              <p className="eyebrow">CHECKOUT E PEDIDOS</p>
              <h1>Vendas da loja.</h1>
              <p className="admin-help">
                Pagamentos por cartão são validados automaticamente pela Stripe.
                Confirme o Pix somente depois de conferir o recebimento.
              </p>
              <button
                className="button outline small sync-stripe"
                disabled={saving || !store.id}
                onClick={refreshStripeSales}
              >
                {saving ? "Consultando…" : "Atualizar pagamentos Stripe"}
              </button>
              <label className="sales-search">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 5 5" />
                </svg>
                <input
                  type="search"
                  value={salesSearch}
                  onChange={(event) => {
                    setSalesSearch(event.target.value);
                    setSalesPage(1);
                  }}
                  placeholder="Buscar cliente, produto, contato ou pagamento"
                  aria-label="Buscar vendas"
                />
                {salesSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSalesSearch("");
                      setSalesPage(1);
                    }}
                    aria-label="Limpar busca"
                  >
                    ×
                  </button>
                )}
              </label>
              <div className="sales-list">
                {paginatedOrders.length ? (
                  paginatedOrders.map((order) => (
                    <article className="sale-card" key={order.id}>
                      <header>
                        <div>
                          <b>
                            {order.customer?.name || "Cliente não informado"}
                          </b>
                          <small>{orderDate(order.createdAt)}</small>
                        </div>
                        <strong>
                          {money(
                            order.total ??
                              (order.items || []).reduce(
                                (sum, item) =>
                                  sum +
                                  Number(item.unitPrice) *
                                    Number(item.quantity),
                                0,
                              ),
                          )}
                        </strong>
                      </header>
                      <div className="sale-meta">
                        <span>
                          {order.provider === "pix"
                            ? "Pix"
                            : order.provider === "delivery"
                              ? `Cartão na entrega${order.installments > 1 ? ` · até ${order.installments}x` : " · à vista"}`
                            : order.status === "paid"
                              ? "Cartão · Stripe confirmado"
                              : "Cartão · Stripe"}
                        </span>
                        <span
                          className={`sale-status ${
                            order.status === "paid"
                              ? "paid"
                              : ["refunded", "cancelled"].includes(order.status)
                                ? "failed"
                              : ["payment_failed", "expired"].includes(
                                    order.status,
                                  )
                                ? "failed"
                                : "pending"
                          }`}
                        >
                          {order.status === "paid"
                            ? "Pagamento validado"
                            : order.status === "refunded"
                              ? "Pedido estornado"
                            : order.status === "cancelled"
                              ? "Pedido cancelado"
                            : order.status === "payment_failed"
                              ? "Cartão recusado"
                              : order.status === "expired"
                                ? "Checkout expirado"
                                : order.status === "payment_review"
                                  ? "Revisar pagamento"
                                  : ["pix", "delivery"].includes(order.provider)
                                    ? "Pendente de confirmação"
                                    : "Aguardando Stripe"}
                        </span>
                      </div>
                      {order.provider === "stripe" && order.paymentIntentId && (
                        <small className="stripe-transaction">
                          Transação Stripe: {order.paymentIntentId}
                        </small>
                      )}
                      {order.provider === "stripe" && order.failureMessage && (
                        <p className="stripe-failure">
                          <b>Falha informada pela Stripe:</b>{" "}
                          {order.failureMessage}
                        </p>
                      )}
                      <div className="sale-contact">
                        <a href={`mailto:${order.customer?.email || ""}`}>
                          {order.customer?.email || "E-mail não informado"}
                        </a>
                        <a
                          href={`https://wa.me/${String(order.customer?.phone || "").replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {order.customer?.phone || "Telefone não informado"}
                        </a>
                      </div>
                      <ul>
                        {(order.items || []).map((item) => (
                          <li key={item.productId}>
                            {item.quantity}× {item.name} —{" "}
                            {money(item.unitPrice)}
                          </li>
                        ))}
                      </ul>
                      {["pix", "delivery"].includes(order.provider) && !["refunded", "cancelled"].includes(order.status) && <div className="manual-order-actions">
                        {order.status !== "paid" && <button className="button primary small" disabled={saving} onClick={() => confirmManualPayment(order)}>Marcar pagamento como validado</button>}
                        <button className="button outline small refund-order-button" disabled={saving} onClick={() => refundManualOrder(order)}>Estornar pedido</button>
                      </div>}
                    </article>
                  ))
                ) : (
                  <div className="empty-sales">
                    <b>
                      {salesSearch
                        ? "Nenhuma venda encontrada"
                        : "Nenhuma venda registrada"}
                    </b>
                    <span>
                      {salesSearch
                        ? "Tente buscar usando outro termo."
                        : "Os pedidos aparecerão aqui após o checkout."}
                    </span>
                  </div>
                )}
              </div>
              {filteredOrders.length > salesPageSize && (
                <nav
                  className="sales-pagination"
                  aria-label="Páginas de vendas"
                >
                  <button
                    type="button"
                    disabled={currentSalesPage === 1}
                    onClick={() => setSalesPage((page) => page - 1)}
                  >
                    ← Anterior
                  </button>
                  <span>
                    Página {currentSalesPage} de {salesPageCount} ·{" "}
                    {filteredOrders.length} vendas
                  </span>
                  <button
                    type="button"
                    disabled={currentSalesPage === salesPageCount}
                    onClick={() => setSalesPage((page) => page + 1)}
                  >
                    Próxima →
                  </button>
                </nav>
              )}
            </>
          )}
          {tab === "closing" && (
            <>
              <p className="eyebrow">RELATÓRIO FINANCEIRO</p>
              <h1>Fechamento de período.</h1>
              <p className="admin-help">
                Selecione as datas para baixar um PDF com as vendas pagas,
                compradores, itens, valores e meios de pagamento.
              </p>
              <section className="closing-card">
                <div className="closing-period">
                  <label className="field">
                    <span>Data inicial</span>
                    <div>
                      <input
                        type="date"
                        value={reportStart}
                        max={reportEnd || undefined}
                        onChange={(event) => setReportStart(event.target.value)}
                      />
                    </div>
                  </label>
                  <label className="field">
                    <span>Data final</span>
                    <div>
                      <input
                        type="date"
                        value={reportEnd}
                        min={reportStart || undefined}
                        onChange={(event) => setReportEnd(event.target.value)}
                      />
                    </div>
                  </label>
                </div>
                <div className="closing-summary" aria-live="polite">
                  <article>
                    <small>Total vendido</small>
                    <strong>{money(reportTotals.total)}</strong>
                  </article>
                  <article>
                    <small>Vendas pagas</small>
                    <strong>{reportOrders.length}</strong>
                  </article>
                  <article>
                    <small>Itens vendidos</small>
                    <strong>{reportTotals.items}</strong>
                  </article>
                </div>
                <div className="closing-methods">
                  <span>Pix <b>{money(reportTotals.pix)}</b></span>
                  <span>Cartão <b>{money(reportTotals.card)}</b></span>
                </div>
                <button
                  type="button"
                  className="button primary closing-download"
                  disabled={
                    generatingReport ||
                    !reportStart ||
                    !reportEnd ||
                    reportStart > reportEnd ||
                    !reportOrders.length
                  }
                  onClick={generateReport}
                >
                  {generatingReport ? "Gerando PDF…" : "Baixar relatório em PDF"}
                </button>
                {!reportOrders.length && reportStart && reportEnd && (
                  <small className="closing-empty">
                    Nenhuma venda paga encontrada neste período.
                  </small>
                )}
              </section>
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
                <div className="publish-share-copy">
                  <small>ENDEREÇO DA SUA LOJA</small>
                  <strong>{publicStoreUrl}</strong>
                  <p>Compartilhe este endereço ou peça para o cliente escanear o QR Code.</p>
                  <div className="publish-share-actions">
                    <button type="button" className="button outline" onClick={copyStoreLink}>{storeLinkCopied ? "Link copiado ✓" : "Copiar link"}</button>
                    <Link className="button primary" to={`/loja/${publicStoreSlug}`} target="_blank" rel="noreferrer">Ir para loja ↗</Link>
                  </div>
                </div>
                <div className="publish-store-qr">
                  {storeQrCode ? <img src={storeQrCode} alt={`QR Code do endereço da loja ${store.brand || "Tô Vendendo"}`} /> : <span>Gerando QR Code…</span>}
                  <small>ESCANEIE PARA ABRIR</small>
                </div>
              </div>
              <CustomDomainSetup value={store.customDomain} destination={publicStoreUrl} onChange={(value) => update("customDomain", value)} />
              <button
                className="button primary publish-button"
                disabled={saving}
                onClick={() => save({ published: true })}
              >
                {saving ? "Publicando…" : "Publicar loja agora"}
              </button>
            </>
          )}
          {tab !== "sales" && !(tab === "products" && productEditor) && (
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
          )}
          {tab === "sales" && saved && (
            <div className="editor-actions sales-message">
              <span>{saved}</span>
            </div>
          )}
        </main>
        <aside className="live-preview-sidebar">
          {store.slug && (
            <Link
              to={`/loja/${store.slug}`}
              target="_blank"
              className="view-store-button"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Ver loja
            </Link>
          )}
          <AdminPreview store={store} products={products} />
        </aside>
      </div>
    </div>
  );
}
function AdminPreview({ store, products }) {
  const visible = products;
  const categories = storeCategories(store, visible);
  return (
    <aside className="live-preview">
      <p className="eyebrow">PREVIEW AO VIVO</p>
      <span>Role a tela para visualizar a loja completa</span>
      <div className="preview-phone" style={paletteStyle(store.palette)}>
        <span className="iphone-button iphone-silent" />
        <span className="iphone-button iphone-volume-up" />
        <span className="iphone-button iphone-volume-down" />
        <span className="iphone-button iphone-power" />
        <div className="dynamic-island">
          <i />
        </div>
        <div className="preview-screen">
          <header>
            <img src={store.logoUrl || "/default-store-logo.png"} alt="" />
            <b>{store.brand || "Sua loja"}</b>
            <span>Sacola</span>
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
            <p>{store.description || "A descrição da loja aparecerá aqui."}</p>
          </div>
          {categories.length > 0 && (
            <div className="preview-categories">
              <b>Todos</b>
              {categories.map((category) => (
                <span key={category.id}>{category.name}</span>
              ))}
            </div>
          )}
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
          <section className="preview-about">
            <small>SOBRE A LOJA</small>
            <h3>{store.brand || "Sua loja"}</h3>
            <p>{store.description || "Conte um pouco sobre a sua loja."}</p>
            <span>⌖ {store.address || "Sua localização"}</span>
            <span>◷ {store.hours || "Seu horário"}</span>
            <div>
              {store.whatsapp && <b>WhatsApp</b>}
              {store.instagram && <b>Instagram</b>}
            </div>
          </section>
          <section className="preview-payment">
            <b>Formas de pagamento</b>
            <span>{store.payment?.enabled ? "PIX" : ""}</span>
            <span>{store.payment?.stripeConnected ? "Cartão" : ""}</span>
          </section>
          <footer>
            <b>tô vendendo</b>
            <small>Feito para bons negócios.</small>
          </footer>
        </div>
      </div>
    </aside>
  );
}
function DescriptionInline({ value }) {
  const parts = String(value || "").split(
    /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g,
  );
  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^_[^_]+_$/.test(part))
      return <em key={index}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link)
      return (
        <a key={index} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    return part;
  });
}

function ProductDescription({ value, preview = false }) {
  const content = String(value || "").trim();
  if (!content) return preview ? <p>Confira os detalhes deste produto.</p> : null;
  return (
    <div className={`product-description ${preview ? "editor-preview" : ""}`}>
      {content.split("\n").map((line, index) => {
        if (!line.trim()) return <br key={index} />;
        const heading = line.match(/^(#{1,3})\s+(.+)$/);
        if (heading)
          return (
            <h4 key={index} className={`description-heading level-${heading[1].length}`}>
              <DescriptionInline value={heading[2]} />
            </h4>
          );
        if (/^[-*]\s+/.test(line))
          return (
            <div className="description-list-item" key={index}>
              <span>•</span>
              <p><DescriptionInline value={line.replace(/^[-*]\s+/, "")} /></p>
            </div>
          );
        return <p key={index}><DescriptionInline value={line} /></p>;
      })}
    </div>
  );
}

function ProductDescriptionEditor({ value, onChange }) {
  const inputRef = useRef(null);
  const apply = (formatter) => {
    const input = inputRef.current;
    if (!input) return;
    const result = formatter(
      String(value || ""),
      input.selectionStart,
      input.selectionEnd,
    );
    onChange(result.value);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };
  const wrap = (before, after, placeholder) =>
    apply((current, start, end) =>
      formatDescriptionSelection(
        current,
        start,
        end,
        before,
        after,
        placeholder,
      ),
    );
  return (
    <div className="rich-description-field">
      <div className="rich-description-label">
        <span>Descrição</span>
        <small>{String(value || "").length}/2000</small>
      </div>
      <div className="rich-description-editor">
        <div className="rich-description-toolbar" role="toolbar" aria-label="Formatar descrição">
          <button type="button" title="Título" aria-label="Adicionar título" onClick={() => apply((current, start, end) => prefixDescriptionLines(current, start, end, "## "))}>T</button>
          <button type="button" title="Negrito" aria-label="Aplicar negrito" onClick={() => wrap("**", "**", "texto em negrito")}><b>B</b></button>
          <button type="button" title="Itálico" aria-label="Aplicar itálico" onClick={() => wrap("_", "_", "texto em itálico")}><i>I</i></button>
          <button type="button" title="Lista" aria-label="Criar lista" onClick={() => apply((current, start, end) => prefixDescriptionLines(current, start, end, "- "))}>☷</button>
          <button type="button" title="Link" aria-label="Adicionar link" onClick={() => wrap("[", "](https://)", "texto do link")}>↗</button>
        </div>
        <textarea
          ref={inputRef}
          value={value || ""}
          maxLength={2000}
          rows={7}
          placeholder="Apresente os benefícios, materiais, medidas e diferenciais do produto…"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <div className="rich-description-preview">
        <small>PRÉVIA NA VITRINE</small>
        <ProductDescription value={value} preview />
      </div>
      <small className="rich-description-help">Selecione um trecho antes de aplicar negrito, itálico ou link.</small>
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
    const email = safeStorageGet("tv-demo-user");
    setUser(email ? { uid: "demo-user", email } : null);
  }, []);
  const logout = async () => {
    if (firebaseEnabled) await signOut(auth);
    else {
      safeStorageRemove("tv-demo-user");
      setUser(null);
    }
  };
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/doc" element={<Docs />} />
      <Route path="/lojas" element={<Marketplace />} />
      <Route path="/loja/:slug" element={<StorePage />} />
      <Route path="/admin/login" element={user === undefined ? <main className="center">Carregando…</main> : <Login user={user} />} />
      <Route path="/admin" element={user === undefined ? <main className="center">Carregando…</main> : <Admin user={user} onLogout={logout} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
