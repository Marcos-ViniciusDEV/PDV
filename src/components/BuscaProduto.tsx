import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useVendaStore } from "../stores/vendaStore";
import ModalAutorizacao from "./ModalAutorizacao";

export interface BuscaProdutoRef {
  focus: () => void;
}

const BuscaProduto = forwardRef<BuscaProdutoRef>((_props, ref) => {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingMultiplier, setPendingMultiplier] = useState(1);
  const addItem = useVendaStore((state) => state.addItem);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  useEffect(() => {
    loadProducts();

    // Listen for catalog updates
    if (window.electron.db.onCatalogUpdated) {
      const unsubscribe = window.electron.db.onCatalogUpdated(() => {
        console.log("Catalog updated, reloading products...");
        loadProducts();
      });

      return () => {
        unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    if (search) {
      // Check for multiplier pattern "Nx" (e.g., "5x")
      if (/^\d+[xX]$/.test(search)) {
        setFilteredProducts([]);
        return;
      }

      const searchLower = search.toLowerCase();
      const filtered = products.filter((p) => {
        const name = p.name || p.descricao || '';
        const barcode = p.barcode || p.codigoBarras || '';
        const code = p.codigo || '';
        
        return (name.toLowerCase().includes(searchLower)) || 
               (barcode.includes(search)) || 
               (code.includes(search));
      });
      setFilteredProducts(filtered.slice(0, 10));
    } else {
      setFilteredProducts([]);
    }
  }, [search, products]);

  const loadProducts = async () => {
    const prods = await window.electron.db.getProducts();
    console.log("Products loaded:", prods);
    setProducts(prods);
  };

  const handleSelectProduct = (product: any) => {
    // Normalize product data for the cart
    const normalizedProduct = {
      ...product,
      name: product.name || product.descricao,
      price: product.price || product.precoVenda,
      barcode: product.barcode || product.codigoBarras,
      quantity: multiplier // Use the current multiplier
    };
    addItem(normalizedProduct);
    setSearch("");
    setFilteredProducts([]);
    setMultiplier(1); // Reset multiplier after adding
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Check for multiplier input "Nx"
      const match = search.match(/^(\d+)[xX]$/);
      if (match) {
        const qty = parseInt(match[1]);
        if (qty > 0) {
          setPendingMultiplier(qty);
          setShowAuth(true);
          setSearch("");
          return;
        }
      }

      if (filteredProducts.length > 0) {
        handleSelectProduct(filteredProducts[0]);
      } else {
        // Try to find exact match in all products if filter didn't catch it yet
        const exactMatch = products.find((p) => {
          const barcode = p.barcode || p.codigoBarras || '';
          const code = p.codigo || '';
          return barcode === search || code === search;
        });

        if (exactMatch) {
          handleSelectProduct(exactMatch);
        } else {
          // Only alert if not a multiplier pattern
          if (!/^\d+[xX]$/.test(search)) {
            alert("Produto não encontrado!");
          }
        }
      }
    }
  };

  return (
    <div className="busca-produto">
      <div style={{ position: 'relative' }}>
        <input 
          ref={inputRef}
          type="text" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          onKeyDown={handleKeyDown} 
          placeholder={multiplier > 1 ? `Multiplicando: ${multiplier}x (Digite o produto)` : "Buscar produto (F2)..."} 
          autoFocus 
          style={multiplier > 1 ? { borderColor: 'var(--accent-primary)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)' } : {}}
        />
        {multiplier > 1 && (
          <div style={{ 
            position: 'absolute', 
            right: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            background: 'var(--accent-primary)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600
          }}>
            {multiplier}x
          </div>
        )}
      </div>

      {filteredProducts.length > 0 && (
        <div className="autocomplete-results">
          {filteredProducts.map((product) => (
            <div key={product.id} className="autocomplete-item" onClick={() => handleSelectProduct(product)}>
              <span className="product-name">{product.name || product.descricao}</span>
              <span className="product-price">R$ {((product.price || product.precoVenda) / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {showAuth && (
        <ModalAutorizacao 
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setMultiplier(pendingMultiplier);
            setShowAuth(false);
          }}
        />
      )}
    </div>
  );
});

BuscaProduto.displayName = 'BuscaProduto';

export default BuscaProduto;
