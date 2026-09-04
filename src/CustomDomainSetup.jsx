import { useState } from "react";
import { isValidDomain, normalizeDomain } from "./customDomain";

export default function CustomDomainSetup({ value, destination, onChange }) {
  const [copied, setCopied] = useState("");
  const domain = normalizeDomain(value);
  const valid = !domain || isValidDomain(domain);
  const copy = async (text, key) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1800);
  };

  return <section className="custom-domain-setup">
    <div className="custom-domain-heading"><div><small>DOMÍNIO PRÓPRIO</small><h2>Use o endereço da sua marca.</h2><p>Configure um domínio já comprado para redirecionar visitantes diretamente à sua loja.</p></div><span>Opcional</span></div>
    <label className="field"><span>Seu domínio</span><div><small>https://</small><input value={value || ""} onChange={(event) => onChange(normalizeDomain(event.target.value))} placeholder="minhaloja.com.br" inputMode="url" /></div></label>
    {!valid && <p className="custom-domain-error">Informe somente o domínio, sem caminhos. Exemplo: minhaloja.com.br</p>}
    {domain && valid && <>
      <div className="domain-routing-data">
        <div><small>ENDEREÇO DE ORIGEM</small><strong>https://{domain}</strong><button type="button" onClick={() => copy(`https://${domain}`, "origin")}>{copied === "origin" ? "Copiado ✓" : "Copiar"}</button></div>
        <span aria-hidden="true">→</span>
        <div><small>DESTINO DA LOJA</small><strong>{destination}</strong><button type="button" onClick={() => copy(destination, "destination")}>{copied === "destination" ? "Copiado ✓" : "Copiar"}</button></div>
      </div>
      <ol className="domain-steps">
        <li><b>Acesse o painel onde comprou o domínio.</b><span>Procure por “Redirecionamento de domínio”, “URL forwarding” ou “Encaminhamento web”.</span></li>
        <li><b>Crie um redirecionamento permanente (301).</b><span>Use <code>https://{domain}</code> como origem e <code>{destination}</code> como destino.</span></li>
        <li><b>Configure também a versão com www.</b><span>Redirecione <code>https://www.{domain.replace(/^www\./, "")}</code> para o mesmo destino.</span></li>
        <li><b>Salve e aguarde a propagação.</b><span>A ativação pode levar de alguns minutos até 48 horas, dependendo do provedor.</span></li>
      </ol>
      <p className="domain-note"><b>Seu provedor oferece apenas configuração DNS?</b> Um registro CNAME sozinho não consegue apontar para o caminho da sua loja. Nesse caso, o domínio precisa ser adicionado ao projeto da Netlify e receber certificado SSL antes da configuração.</p>
    </>}
  </section>;
}
