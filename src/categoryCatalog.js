export const CATEGORY_GROUPS = [
  ["Moda e acessórios", ["Moda feminina", "Moda masculina", "Moda infantil", "Calçados", "Bolsas", "Joias", "Semijoias", "Relógios", "Óculos", "Acessórios"]],
  ["Casa e decoração", ["Casa", "Decoração", "Móveis", "Cama, mesa e banho", "Cozinha", "Iluminação", "Organização", "Artesanato", "Cerâmica"]],
  ["Beleza e cuidados", ["Beleza", "Cosméticos", "Maquiagem", "Perfumaria", "Cuidados com a pele", "Cuidados com o cabelo", "Higiene pessoal", "Barbearia"]],
  ["Alimentos e bebidas", ["Alimentos", "Doces", "Bolos", "Salgados", "Cafés", "Bebidas", "Congelados", "Produtos naturais", "Padaria", "Restaurante"]],
  ["Eletrônicos", ["Eletrônicos", "Celulares", "Informática", "Áudio", "Vídeo", "Games", "Acessórios para celular", "Eletrodomésticos"]],
  ["Esporte e lazer", ["Esportes", "Academia", "Ciclismo", "Camping", "Pesca", "Instrumentos musicais", "Livros", "Colecionáveis"]],
  ["Infantil", ["Brinquedos", "Bebês", "Roupas infantis", "Material escolar", "Festas infantis"]],
  ["Pets", ["Pet shop", "Alimentos para pets", "Acessórios para pets", "Higiene para pets"]],
  ["Papelaria e festas", ["Papelaria", "Convites", "Festas", "Presentes", "Embalagens personalizadas"]],
  ["Jardim e natureza", ["Jardinagem", "Plantas", "Flores", "Vasos", "Ferramentas"]],
  ["Automotivo", ["Automóveis", "Motos", "Peças automotivas", "Acessórios automotivos"]],
  ["Serviços", ["Serviços", "Fotografia", "Design", "Manutenção", "Aulas", "Eventos", "Saúde e bem-estar"]],
];

export const CATEGORY_OPTIONS = CATEGORY_GROUPS.flatMap(([group, items]) =>
  items.map((name) => ({ name, group })),
);

export const normalizeCategory = (value) => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function categorySuggestions(search, selected = []) {
  const term = normalizeCategory(search);
  const used = new Set(selected.map(normalizeCategory));
  return CATEGORY_OPTIONS.filter(({ name, group }) =>
    !used.has(normalizeCategory(name))
    && (!term || normalizeCategory(`${name} ${group}`).includes(term)),
  ).slice(0, 12);
}

export function categoryIconType(name) {
  const value = normalizeCategory(name);
  if (/eletron|celular|informatica|audio|video|game|eletrodom/.test(value)) return "tech";
  if (/moda|roupa|calcado|bolsa|joia|relogio|oculos|acessor/.test(value)) return "fashion";
  if (/casa|decor|moveis|cama|cozinha|ilumin|organiz|artesan|ceram/.test(value)) return "home";
  if (/beleza|cosmetic|maquiagem|perfume|pele|cabelo|higiene|barbear/.test(value)) return "beauty";
  if (/alimento|doce|bolo|salgado|cafe|bebida|congelado|padaria|restaurante/.test(value)) return "food";
  if (/esporte|academia|ciclis|camping|pesca/.test(value)) return "sport";
  if (/infantil|brinquedo|bebe|escolar/.test(value)) return "kids";
  if (/pet|animal/.test(value)) return "pet";
  if (/papel|convite|festa|presente|embalagem/.test(value)) return "paper";
  if (/jard|planta|flor|vaso|ferramenta/.test(value)) return "garden";
  if (/auto|moto|veiculo|peca/.test(value)) return "auto";
  if (/servico|fotografia|design|manutencao|aula|evento|saude|bem-estar/.test(value)) return "service";
  if (/livro|instrumento|colecion/.test(value)) return "leisure";
  return "shop";
}
