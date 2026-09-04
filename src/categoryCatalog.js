export const CATEGORY_GROUPS = [
  ["Moda e acessórios", ["Moda feminina", "Moda masculina", "Moda infantil", "Moda praia", "Moda fitness", "Moda íntima", "Calçados", "Tênis", "Bolsas", "Mochilas", "Joias", "Semijoias", "Bijuterias", "Relógios", "Óculos", "Bonés e chapéus", "Acessórios"]],
  ["Casa e decoração", ["Casa", "Decoração", "Móveis", "Cama, mesa e banho", "Cozinha", "Utilidades domésticas", "Iluminação", "Organização", "Tapetes", "Cortinas", "Artesanato", "Cerâmica", "Antiguidades"]],
  ["Beleza e cuidados", ["Beleza", "Cosméticos", "Maquiagem", "Perfumaria", "Cuidados com a pele", "Cuidados com o cabelo", "Unhas", "Higiene pessoal", "Barbearia", "Suplementos", "Ótica"]],
  ["Alimentos e bebidas", ["Alimentos", "Doces", "Bolos", "Salgados", "Marmitas", "Cestas", "Cafés", "Chás", "Bebidas", "Vinhos", "Congelados", "Produtos naturais", "Produtos orgânicos", "Padaria", "Restaurante", "Lanchonete"]],
  ["Eletrônicos", ["Eletrônicos", "Celulares", "Telefonia", "Informática", "Computadores", "Notebooks", "Impressoras", "Áudio", "Vídeo", "Televisores", "Câmeras", "Drones", "Games", "Consoles", "Acessórios para celular", "Eletrodomésticos", "Climatização"]],
  ["Esporte e lazer", ["Esportes", "Academia", "Bicicletas", "Peças para bicicletas", "Acessórios para bicicletas", "Ciclismo", "Futebol", "Corrida", "Natação", "Skates", "Patins", "Camping", "Pesca", "Instrumentos musicais", "Livros", "Colecionáveis"]],
  ["Infantil", ["Brinquedos", "Bebês", "Roupas infantis", "Carrinhos de bebê", "Quarto de bebê", "Material escolar", "Festas infantis"]],
  ["Pets", ["Pet shop", "Cães", "Gatos", "Aves", "Aquários", "Alimentos para pets", "Acessórios para pets", "Higiene para pets", "Medicamentos veterinários"]],
  ["Papelaria e festas", ["Papelaria", "Material de escritório", "Agendas", "Convites", "Festas", "Artigos para festas", "Presentes", "Embalagens personalizadas"]],
  ["Jardim e natureza", ["Jardinagem", "Plantas", "Flores", "Sementes", "Vasos", "Ferramentas", "Piscinas", "Churrasqueiras"]],
  ["Automotivo", ["Automóveis", "Motos", "Caminhões", "Náutica", "Pneus", "Som automotivo", "Peças automotivas", "Acessórios automotivos", "Peças para motos", "Acessórios para motos"]],
  ["Construção", ["Materiais de construção", "Ferragens", "Elétrica", "Hidráulica", "Tintas", "Pisos e revestimentos", "Portas e janelas", "Máquinas e ferramentas", "Segurança residencial"]],
  ["Saúde", ["Saúde e bem-estar", "Farmácia", "Ortopedia", "Equipamentos médicos", "Produtos hospitalares", "Vitaminas", "Cuidados para idosos"]],
  ["Agro", ["Agropecuária", "Máquinas agrícolas", "Insumos agrícolas", "Rações", "Selaria", "Produtos rurais"]],
  ["Viagem", ["Malas", "Acessórios de viagem", "Turismo", "Hospedagem"]],
  ["Serviços", ["Serviços", "Fotografia", "Design", "Gráfica", "Manutenção", "Assistência técnica", "Limpeza", "Costura", "Aulas", "Eventos", "Buffet", "Fretes e mudanças"]],
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
  );
}

export function categoryIconType(name) {
  const value = normalizeCategory(name);
  if (/eletron|celular|informatica|audio|video|game|eletrodom/.test(value)) return "tech";
  if (/moda|roupa|calcado|bolsa|joia|relogio|oculos|acessor/.test(value)) return "fashion";
  if (/casa|decor|moveis|cama|cozinha|ilumin|organiz|artesan|ceram/.test(value)) return "home";
  if (/beleza|cosmetic|maquiagem|perfume|pele|cabelo|higiene|barbear/.test(value)) return "beauty";
  if (/alimento|doce|bolo|salgado|cafe|bebida|congelado|padaria|restaurante/.test(value)) return "food";
  if (/esporte|academia|bicicleta|ciclis|futebol|corrida|natacao|skate|patins|camping|pesca/.test(value)) return "sport";
  if (/infantil|brinquedo|bebe|escolar/.test(value)) return "kids";
  if (/pet|animal/.test(value)) return "pet";
  if (/papel|convite|festa|presente|embalagem/.test(value)) return "paper";
  if (/jard|planta|flor|semente|vaso|piscina|churrasqueira/.test(value)) return "garden";
  if (/auto|moto|veiculo|peca/.test(value)) return "auto";
  if (/servico|fotografia|design|grafica|manutencao|assistencia|limpeza|costura|aula|evento|buffet|frete|mudanca|saude|farmacia|ortopedia|medico|hospital|vitamina|idoso|construcao|ferragem|eletrica|hidraulica|tinta|piso|revestimento|porta|janela|seguranca|agro|agricola|racao|selaria|turismo|hospedagem|viagem/.test(value)) return "service";
  if (/livro|instrumento|colecion/.test(value)) return "leisure";
  return "shop";
}
