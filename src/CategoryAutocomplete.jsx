import { useMemo, useState } from "react";
import { categorySuggestions } from "./categoryCatalog";

export default function CategoryAutocomplete({ categories, onAdd }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => categorySuggestions(search, categories.map((item) => item.name)), [search, categories]);
  const choose = (name) => { onAdd(name); setSearch(""); setOpen(false); };

  return <div className="category-autocomplete">
    <label><span>Buscar categoria</span><div><span aria-hidden="true">⌕</span><input value={search} onFocus={() => setOpen(true)} onChange={(event) => { setSearch(event.target.value); setOpen(true); }} placeholder="Ex.: Moda feminina, doces, eletrônicos…" autoComplete="off" /></div></label>
    {open && <div className="category-suggestions">
      {suggestions.map((item) => <button type="button" key={item.name} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item.name)}><span>{item.name}</span><small>{item.group}</small><b>+</b></button>)}
      {!suggestions.length && <p>Nenhuma outra categoria encontrada.</p>}
    </div>}
  </div>;
}
