import { useState, useEffect, useRef } from 'react';

interface ModalConsultarPrecoProps {
  onClose: () => void;
}

export default function ModalConsultarPreco({ onClose }: ModalConsultarPrecoProps) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    // Focus input on mount
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const loadProducts = async () => {
    try {
      const prods = await window.electron.db.getProducts();
      setProducts(prods);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  useEffect(() => {
    if (search) {
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
      
      // If exact match by barcode, select immediately
      const exactMatch = filtered.find(p => 
        (p.barcode || p.codigoBarras) === search || 
        (p.codigo) === search
      );
      
      if (exactMatch) {
        setSelectedProduct(exactMatch);
        setSearch(""); // Clear search to avoid confusion? Or keep it? Let's clear for now or keep to show what was typed.
        // Actually, if we select, we usually want to show the result.
      }
    } else {
      setFilteredProducts([]);
    }
  }, [search, products]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    
    if (e.key === 'Enter') {
      if (filteredProducts.length > 0) {
        setSelectedProduct(filteredProducts[0]);
        setSearch("");
      }
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${(value / 100).toFixed(2)}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        padding: '24px',
        borderRadius: '12px',
        width: '600px',
        maxWidth: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid #374151'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Consultar Preço</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (selectedProduct) setSelectedProduct(null); // Clear selection when typing new search
            }}
            onKeyDown={handleKeyDown}
            placeholder="Digite o nome, código ou leia o código de barras..."
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '18px',
              backgroundColor: '#374151',
              border: '2px solid #4b5563',
              borderRadius: '8px',
              color: 'white',
              outline: 'none'
            }}
          />
        </div>

        {/* Search Results List (if no product selected) */}
        {!selectedProduct && filteredProducts.length > 0 && search && (
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            backgroundColor: '#374151',
            borderRadius: '8px',
            border: '1px solid #4b5563'
          }}>
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product);
                  setSearch("");
                }}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #4b5563',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ color: 'white', fontSize: '16px' }}>{product.name || product.descricao}</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                  {formatCurrency(product.price || product.precoVenda)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Selected Product Details */}
        {selectedProduct && (
          <div style={{
            backgroundColor: '#374151',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #4b5563',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <span style={{ display: 'block', color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>Produto</span>
              <h3 style={{ 
                color: 'white', 
                fontSize: '24px', 
                fontWeight: 'bold', 
                margin: 0,
                lineHeight: 1.2
              }}>
                {selectedProduct.name || selectedProduct.descricao}
              </h3>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <span style={{ 
                  backgroundColor: '#4b5563', 
                  color: '#e5e7eb', 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  fontSize: '12px' 
                }}>
                  Cód: {selectedProduct.codigo}
                </span>
                <span style={{ 
                  backgroundColor: '#4b5563', 
                  color: '#e5e7eb', 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  fontSize: '12px' 
                }}>
                  EAN: {selectedProduct.barcode || selectedProduct.codigoBarras || 'S/N'}
                </span>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '20px',
              borderTop: '1px solid #4b5563',
              paddingTop: '20px'
            }}>
              <div>
                <span style={{ display: 'block', color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>Preço Unitário</span>
                <span style={{ 
                  display: 'block', 
                  color: '#10b981', 
                  fontSize: '36px', 
                  fontWeight: 'bold' 
                }}>
                  {formatCurrency(selectedProduct.price || selectedProduct.precoVenda)}
                </span>
              </div>
              
              <div>
                <span style={{ display: 'block', color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>Estoque Atual</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ 
                    color: 'white', 
                    fontSize: '36px', 
                    fontWeight: 'bold' 
                  }}>
                    {selectedProduct.estoque || 0}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: '18px' }}>
                    {selectedProduct.unidade || 'UN'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Fechar (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
