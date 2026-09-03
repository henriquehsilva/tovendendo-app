import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { orderTotal, periodSummary } from "./periodReportData";

const asDate = (value) => value?.toDate?.() || new Date(value);

const brl = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );

const shortDate = (value) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(asDate(value));

export async function generatePeriodPdf({ store, orders, start, end, appUrl }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const summary = periodSummary(orders);
  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
  const period = `${start.split("-").reverse().join("/")} a ${end
    .split("-")
    .reverse()
    .join("/")}`;
  const footer = (pageNumber) => {
    const pages = doc.getNumberOfPages();
    doc.setDrawColor(220, 230, 235);
    doc.line(14, 282, 196, 282);
    doc.setFontSize(8);
    doc.setTextColor(92, 110, 120);
    doc.text("Tô Vendendo · Feito para pequenos negócios.", 14, 288);
    doc.setTextColor(36, 125, 169);
    doc.textWithLink(appUrl, 14, 293, { url: appUrl });
    doc.setTextColor(92, 110, 120);
    doc.text(`Página ${pageNumber} de ${pages}`, 196, 288, { align: "right" });
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(18, 32, 45);
  doc.text("Fechamento de período", 14, 20);
  doc.setFontSize(11);
  doc.text(store.brand || "Minha loja", 14, 27);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(92, 110, 120);
  doc.text(`Período: ${period}  ·  Gerado em ${generatedAt}`, 14, 33);

  const cards = [
    ["TOTAL VENDIDO", brl(summary.total)],
    ["VENDAS", String(orders.length)],
    ["ITENS", String(summary.items)],
    ["PIX / CARTÃO", `${brl(summary.pix)} / ${brl(summary.card)}`],
  ];
  cards.forEach(([label, value], index) => {
    const x = 14 + index * 46;
    doc.setFillColor(240, 248, 252);
    doc.roundedRect(x, 40, 43, 21, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(92, 110, 120);
    doc.text(label, x + 3, 47);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(index === 3 ? 8 : 11);
    doc.setTextColor(18, 32, 45);
    doc.text(value, x + 3, 55);
    doc.setFont("helvetica", "normal");
  });

  autoTable(doc, {
    startY: 68,
    margin: { left: 14, right: 14, bottom: 20 },
    head: [["Data", "Comprador", "Itens vendidos", "Pagamento", "Valor"]],
    body: orders.map((order) => [
      shortDate(order.paidAt || order.createdAt),
      [
        order.customer?.name || "Não informado",
        order.customer?.email || "",
        order.customer?.phone || "",
      ]
        .filter(Boolean)
        .join("\n"),
      (order.items || [])
        .map(
          (item) =>
            `${item.quantity}x ${item.name} (${brl(item.unitPrice)} un.)`,
        )
        .join("\n") || "—",
      order.provider === "pix" ? "Pix" : "Cartão / Stripe",
      brl(orderTotal(order)),
    ]),
    headStyles: { fillColor: [36, 125, 169], fontSize: 8 },
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5, textColor: [40, 52, 60] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 43 },
      2: { cellWidth: 65 },
      3: { cellWidth: 28 },
      4: { cellWidth: 21, halign: "right" },
    },
    alternateRowStyles: { fillColor: [247, 250, 251] },
  });

  for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
    doc.setPage(page);
    footer(page);
  }
  const safeBrand = String(store.brand || "loja")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
  doc.save(`fechamento-${safeBrand}-${start}-${end}.pdf`);
}
