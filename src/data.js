export const demoStore = {
  id: 'demo', slug: 'loja-exemplo', published: true,
  brand: 'Achadinhos da Ana', tagline: 'Coisas bonitas para facilitar o seu dia.',
  description: 'Uma seleção especial de acessórios, casa, beleza e presentes.',
  heroImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1500&q=85',
  logoUrl: '', whatsapp: '5511999999999', address: 'São Paulo · SP', hours: 'Seg–Sáb · 9h às 18h',
  payment: { enabled: true, maxInstallments: 12, statementDescriptor: 'ACHADINHOS' },
};
export const demoProducts = [
  { id:'1', name:'Bolsa urbana', category:'Acessórios', description:'Leve, resistente e perfeita para todos os dias.', price:129.9, stock:8, active:true, imageUrl:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80' },
  { id:'2', name:'Luminária minimalista', category:'Casa', description:'Luz aconchegante com design contemporâneo.', price:89.9, stock:3, active:true, imageUrl:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80' },
  { id:'3', name:'Kit autocuidado', category:'Beleza', description:'Um presente delicado para uma pausa especial.', price:74.5, stock:0, active:true, imageUrl:'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80' },
];
export const emptyStore = uid => ({ ...demoStore, id: undefined, slug:'', brand:'', ownerId:uid, published:false, payment:{ enabled:false, maxInstallments:12, statementDescriptor:'' } });
