import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const sections = [
  ["visao-geral", "Visão geral"],
  ["primeiros-passos", "Primeiros passos"],
  ["vitrine", "Vitrine e produtos"],
  ["checkout", "Vendas e pagamentos"],
  ["pedidos", "Gestão de pedidos"],
  ["fechamento", "Fechamento e relatórios"],
  ["divulgacao", "Divulgação"],
];

const Icon = ({ children }) => <span className="docs-icon">{children}</span>;

function StoreDemo() {
  const [liked, setLiked] = useState(false);
  const [inCart, setInCart] = useState(false);
  return (
    <div className="docs-demo store-demo">
      <div className="demo-browser"><i /><i /><i /><span>tovendendo.app/loja/sua-loja</span></div>
      <div className="demo-store-head"><b>Sua marca</b><span>⌕ Buscar</span><span>🛍 {inCart ? 1 : 0}</span></div>
      <div className="demo-product">
        <div className="demo-product-image">NOVA<br />COLEÇÃO</div>
        <div><small>ACESSÓRIOS</small><h3>Bolsa urbana</h3><p>Leve, resistente e perfeita para todos os dias.</p><strong>R$ 129,90</strong><div className="demo-actions"><button onClick={() => setLiked(!liked)}>{liked ? "♥ Curtido" : "♡ Curtir"}</button><button className="demo-add" onClick={() => setInCart(!inCart)}>{inCart ? "✓ Na sacola" : "Adicionar"}</button></div></div>
      </div>
    </div>
  );
}

function PaymentDemo() {
  const [method, setMethod] = useState("pix");
  return (
    <div className="docs-demo payment-demo">
      <div className="demo-order"><span>Seu pedido</span><strong>R$ 219,80</strong></div>
      <p>Como você quer pagar?</p>
      <div className="demo-payment-tabs">
        <button className={method === "pix" ? "active" : ""} onClick={() => setMethod("pix")}><Icon>◆</Icon><b>Pix</b><small>Direto para sua conta</small></button>
        <button className={method === "card" ? "active card" : ""} onClick={() => setMethod("card")}><Icon>▰</Icon><b>Cartão</b><small>Checkout seguro</small></button>
      </div>
      <div className="demo-payment-result">
        {method === "pix" ? <><div className="fake-qr">▦</div><div><b>Pix gerado na hora</b><span>QR Code e código copia e cola</span></div></> : <><div className="stripe-s">S</div><div><b>Pagamento com Stripe</b><span>Cartão e carteiras compatíveis</span></div></>}
      </div>
    </div>
  );
}

function ClosingDemo() {
  return (
    <div className="docs-demo closing-demo">
      <div className="closing-demo-head">
        <b>Fechamento de período</b>
        <small>RELATÓRIO FINANCEIRO</small>
      </div>
      <div className="closing-demo-period">
        <span>01/09/2026 a 30/09/2026</span>
        <b>Achadinhos da Ana</b>
      </div>
      <div className="closing-demo-totals">
        <article><small>TOTAL VENDIDO</small><b>R$ 4.289,70</b></article>
        <article><small>VENDAS</small><b>32</b></article>
        <article><small>ITENS</small><b>47</b></article>
      </div>
      <div className="closing-demo-table">
        <div><b>Comprador</b><b>Pagamento</b><b>Valor</b></div>
        <div><span>Ana Souza</span><span>Pix</span><strong>R$ 219,80</strong></div>
        <div><span>Rafael Melo</span><span>Cartão</span><strong>R$ 89,90</strong></div>
        <div><span>Carla Lima</span><span>Pix</span><strong>R$ 174,50</strong></div>
      </div>
      <footer>Tô Vendendo · Feito para pequenos negócios.</footer>
    </div>
  );
}

function Docs() {
  useEffect(() => {
    document.title = "Recursos e documentação | Tô Vendendo";
    return () => { document.title = "Tô Vendendo"; };
  }, []);

  return (
    <div className="docs-page">
      <header className="docs-nav">
        <Link className="product-logo" to="/"><i>●</i> tô<span>vendendo</span></Link>
        <nav><Link to="/lojas">Lojas</Link><a href="#recursos">Recursos</a><Link to="/admin/login">Entrar</Link><Link className="button primary small" to="/admin">Criar minha loja</Link></nav>
      </header>

      <main>
        <section className="docs-hero" id="visao-geral">
          <div className="docs-orb orb-one" /><div className="docs-orb orb-two" />
          <p className="eyebrow">CONHEÇA A PLATAFORMA</p>
          <h1>Tudo para transformar seus produtos em uma loja de verdade.</h1>
          <p>Um guia visual de cada recurso — da primeira configuração ao pagamento confirmado.</p>
          <div className="docs-hero-actions"><Link className="button primary" to="/admin">Começar grátis</Link><a className="button outline" href="#primeiros-passos">Explorar recursos ↓</a></div>
          <div className="docs-stats"><div><b>30 dias</b><span>de teste completo</span></div><div><b>10 fotos</b><span>por produto</span></div><div><b>3 formas</b><span>de fechar uma venda</span></div></div>
        </section>

        <div className="docs-layout" id="recursos">
          <aside><span>NESTA PÁGINA</span>{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}<div><b>Pronto para vender?</b><Link to="/admin">Criar loja grátis →</Link></div></aside>
          <div className="docs-content">
            <section className="docs-section" id="primeiros-passos">
              <p className="eyebrow">01 · PRIMEIROS PASSOS</p><h2>Sua loja no ar em poucos minutos.</h2><p className="docs-lead">Não precisa instalar nada nem escrever código. Configure a identidade do negócio, organize o catálogo e publique seu link.</p>
              <div className="docs-feature-grid">
                <article><Icon>✦</Icon><h3>Identidade da marca</h3><p>Adicione nome, descrição, logo e imagem de capa. Escolha entre cinco paletas para deixar a vitrine com a cara do seu negócio.</p></article>
                <article><Icon>⌁</Icon><h3>Link exclusivo</h3><p>Defina um endereço fácil de lembrar, como <code>/loja/minha-marca</code>, para usar na bio e nas redes sociais.</p></article>
                <article><Icon>◉</Icon><h3>Informações comerciais</h3><p>Exiba WhatsApp, Instagram, endereço e horário de funcionamento no rodapé da loja.</p></article>
                <article><Icon>↗</Icon><h3>Publicação controlada</h3><p>Edite com tranquilidade e publique quando estiver pronto. A prévia em tempo real mostra como o cliente verá a página.</p></article>
              </div>
            </section>

            <section className="docs-section docs-showcase" id="vitrine">
              <div><p className="eyebrow">02 · VITRINE E PRODUTOS</p><h2>Um catálogo bonito, organizado e fácil de comprar.</h2><p className="docs-lead">Crie categorias, adicione até 10 fotos por item e controle o que pode ou não ser comprado.</p><ul className="docs-checks"><li><b>Busca inteligente</b><span>Encontra por nome, categoria, descrição ou preço.</span></li><li><b>Galeria ampliável</b><span>Fotos em carrossel e zoom para mostrar cada detalhe.</span></li><li><b>Disponibilidade</b><span>Pause um produto sem precisar apagar o cadastro.</span></li><li><b>Interação</b><span>Curtidas e comentários ajudam a entender o interesse.</span></li></ul></div>
              <StoreDemo />
            </section>

            <section className="docs-section" id="checkout">
              <p className="eyebrow">03 · VENDAS E PAGAMENTOS</p><h2>Do carrinho ao pagamento, sem atrito.</h2><p className="docs-lead">O cliente revisa a sacola, informa seus dados e escolhe como concluir. Experimente a demonstração abaixo.</p>
              <div className="docs-payment-layout"><PaymentDemo /><div className="docs-payment-copy"><article><span>01</span><div><h3>Pix instantâneo</h3><p>O QR Code e o código copia e cola são gerados no navegador. O valor segue diretamente para a chave cadastrada pela loja.</p></div></article><article><span>02</span><div><h3>Cartão pela Stripe</h3><p>O cliente segue para um checkout hospedado e seguro. A venda volta para o painel com validação automática.</p></div></article><article><span>03</span><div><h3>WhatsApp</h3><p>Uma mensagem pronta leva o resumo dos itens e os dados do cliente para combinar pagamento ou entrega.</p></div></article></div></div>
            </section>

            <section className="docs-section docs-dark" id="pedidos">
              <div><p className="eyebrow">04 · GESTÃO DE PEDIDOS</p><h2>Saiba o que vendeu e o que precisa de atenção.</h2><p>Todos os pedidos ficam reunidos no painel. Busque por cliente, produto, contato ou forma de pagamento e acompanhe o status de cada venda.</p></div>
              <div className="orders-demo"><div className="orders-top"><b>Pedidos recentes</b><span>⌕ Buscar pedidos</span></div><div className="order-row"><i>AS</i><div><b>Ana Souza</b><small>Bolsa urbana · 2 itens</small></div><strong>R$ 219,80</strong><em className="paid">● Pago</em></div><div className="order-row"><i>RM</i><div><b>Rafael Melo</b><small>Luminária · 1 item</small></div><strong>R$ 89,90</strong><em>● Revisar Pix</em></div><div className="order-row"><i>CL</i><div><b>Carla Lima</b><small>Kit autocuidado · 1 item</small></div><strong>R$ 74,50</strong><em className="waiting">● Aguardando</em></div></div>
            </section>

            <section className="docs-section docs-report" id="fechamento">
              <div>
                <p className="eyebrow">05 · FECHAMENTO E RELATÓRIOS</p>
                <h2>Transforme suas vendas em um relatório pronto.</h2>
                <p className="docs-lead">Escolha uma data inicial e final no painel para gerar um PDF profissional com toda a movimentação paga do período.</p>
                <ul className="docs-checks">
                  <li><b>Resumo financeiro</b><span>Total vendido, quantidade de vendas e itens, separados entre Pix e cartão.</span></li>
                  <li><b>Detalhamento completo</b><span>Data, comprador, contato, produtos, quantidades, preços e meio de pagamento.</span></li>
                  <li><b>Separação por pagamento</b><span>Veja com clareza quanto entrou por Pix e quanto foi processado por cartão.</span></li>
                  <li><b>PDF organizado</b><span>Documento paginado com link de acesso e rodapé oficial da plataforma.</span></li>
                </ul>
                <p className="docs-report-note"><b>Como gerar:</b> acesse <strong>Painel → Fechamento</strong>, informe o período e clique em <strong>Baixar relatório em PDF</strong>. Apenas pagamentos confirmados entram nos valores.</p>
              </div>
              <ClosingDemo />
            </section>

            <section className="docs-section" id="divulgacao">
              <p className="eyebrow">06 · DIVULGAÇÃO</p><h2>Produtos prontos para circular.</h2>
              <div className="docs-share-grid"><article className="share-card"><div className="share-art">sua<br />marca<i>↗</i></div><h3>Compartilhamento visual</h3><p>Gere uma imagem do produto com marca, nome e preço para compartilhar pelo celular.</p></article><article><Icon>◍</Icon><h3>WhatsApp em um toque</h3><p>O link do produto abre uma conversa pronta, ideal para fechar vendas rapidamente.</p></article><article><Icon>♡</Icon><h3>Prova social</h3><p>Curtidas e comentários ficam visíveis na vitrine e aproximam clientes da sua marca.</p></article></div>
            </section>
          </div>
        </div>

        <section className="docs-final"><p className="eyebrow">COMECE HOJE</p><h2>Sua próxima venda pode começar aqui.</h2><p>Teste todos os recursos por 30 dias e publique sua loja sem precisar programar.</p><Link className="button light" to="/admin">Criar minha loja grátis →</Link></section>
      </main>
      <footer className="docs-footer"><Link className="product-logo" to="/"><i>●</i> tô<span>vendendo</span></Link><span>© 2026 Tô Vendendo · Feito para pequenos negócios.</span><Link to="/">Voltar ao início</Link></footer>
    </div>
  );
}

export default Docs;
