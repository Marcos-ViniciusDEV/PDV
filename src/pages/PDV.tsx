import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useVendaStore } from '../stores/vendaStore';
import BuscaProduto from '../components/BuscaProduto';
import Carrinho from '../components/Carrinho';
import ModalPagamento from '../components/ModalPagamento';
import { ConnectionStatus } from '../components/ConnectionStatus';
import ModalUtilidades from '../components/ModalUtilidades';
import ModalAutorizacao from '../components/ModalAutorizacao';
import ModalRemoverItem from '../components/ModalRemoverItem';
import ModalDesconto from '../components/ModalDesconto';
import ModalOpcoesDesconto from '../components/ModalOpcoesDesconto';

export default function PDV() {
  const { user, logout } = useAuthStore();
  const { items, getNetTotal } = useVendaStore();
  const [showPayment, setShowPayment] = useState(false);
  const [showUtils, setShowUtils] = useState(false);
  const [showAuthDelete, setShowAuthDelete] = useState(false);
  const [showRemoveItem, setShowRemoveItem] = useState(false);
  const [showAuthDiscount, setShowAuthDiscount] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showDiscountOptions, setShowDiscountOptions] = useState(false);
  const [showAuthCancel, setShowAuthCancel] = useState(false);

  const handleFinalizeSale = () => {
    if (items.length === 0) {
      alert('Adicione produtos ao carrinho');
      return;
    }
    setShowPayment(true);
  };

  const handleRemoveItemRequest = () => {
    const currentItems = useVendaStore.getState().items;
    if (currentItems.length === 0) {
      alert('Não há itens para remover');
      return;
    }
    setShowAuthDelete(true);
  };

  const handleAuthDeleteSuccess = () => {
    setShowRemoveItem(true);
  };

  const handleConfirmRemoveItem = (index: number) => {
    useVendaStore.getState().removeItem(index);
    setShowRemoveItem(false);
  };

  const handleDiscountRequest = () => {
    const total = useVendaStore.getState().getTotal();
    if (total === 0) {
      alert('Não há itens para aplicar desconto');
      return;
    }
    setShowDiscountOptions(true);
  };

  const handleGiveDiscount = () => {
    setShowDiscountOptions(false);
    setShowAuthDiscount(true);
  };

  const handleRemoveDiscount = () => {
    useVendaStore.getState().setDiscount(0);
    setShowDiscountOptions(false);
  };

  const handleAuthDiscountSuccess = () => {
    setShowDiscountModal(true);
  };

  const handleConfirmDiscount = (value: number) => {
    useVendaStore.getState().setDiscount(value);
    setShowDiscountModal(false);
  };

  const handleCancelSaleRequest = () => {
    const total = useVendaStore.getState().getTotal();
    if (total === 0) {
      alert('Não há venda para cancelar');
      return;
    }
    setShowAuthCancel(true);
  };

  const handleAuthCancelSuccess = async () => {
    if (window.confirm('Tem certeza que deseja cancelar o cupom atual?')) {
      try {
        await useVendaStore.getState().cancelSale(user?.id || 0, user?.name || 'Desconhecido');
        setShowAuthCancel(false);
      } catch (error) {
        alert('Erro ao cancelar venda');
      }
    } else {
      setShowAuthCancel(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea is focused
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setShowUtils(true);
      }
      
      if (e.key === 'Escape') {
        setShowUtils(false);
        setShowAuthDelete(false);
        setShowRemoveItem(false);
        setShowAuthDiscount(false);
        setShowDiscountModal(false);
        setShowDiscountOptions(false);
        setShowAuthCancel(false);
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        handleRemoveItemRequest();
      }

      if (e.key === 'F9') {
        e.preventDefault();
        handleDiscountRequest();
      }

      if (e.key === 'F7') {
        e.preventDefault();
        handleCancelSaleRequest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatCurrency = (value: number) => {
    return `R$ ${(value / 100).toFixed(2)}`;
  };

  return (
    <div className="pdv-container">
      {/* Header */}
      <div className="pdv-header">
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1>CAIXA LIVRE</h1>
          <ConnectionStatus />
        </div>
        <div className="header-right">
          <div className="operator-info">
            <span className="operator-name">{user?.name}</span>
            <span className="operator-role">Operador de Caixa</span>
          </div>
          <button onClick={logout} className="btn-logout">
            Sair
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pdv-content">
        {/* Left Panel - Main Area (Search + Cart) */}
        <div className="pdv-left">
          {/* Busca de Produto */}
          <BuscaProduto />
          
          {/* Carrinho */}
          <Carrinho />
        </div>

        {/* Right Panel - Sidebar (Info + Actions) */}
        <div className="pdv-right">
          {/* Total Gigante */}
          <div className="info-card">
            <span className="label">Valor Total</span>
            <span className="value total">{formatCurrency(getNetTotal())}</span>
          </div>

          {/* Ações Rápidas */}
          <div className="info-card" style={{ flex: 1 }}>
            <span className="label">Ações Rápidas</span>
            <div className="action-buttons" style={{ marginTop: '16px' }}>
              <button className="action-btn primary" onClick={handleFinalizeSale}>
                <span>F12</span>
                <span>Finalizar Venda</span>
              </button>
              <button className="action-btn" onClick={handleDiscountRequest}>
                <span>F9</span>
                <span>Desconto</span>
              </button>
              <button className="action-btn">
                <span>F5</span>
                <span>Identificar Cliente</span>
              </button>
              <button className="action-btn" onClick={handleCancelSaleRequest}>
                <span>F7</span>
                <span>Cancelar Cupom</span>
              </button>
              <button className="action-btn">
                <span>F6</span>
                <span>Pesar Produto</span>
              </button>
              <button className="action-btn" onClick={handleRemoveItemRequest}>
                <span>DEL</span>
                <span>Remover Item</span>
              </button>
              <button className="action-btn" onClick={() => setShowUtils(true)}>
                <span>R</span>
                <span>Menu / Utils</span>
              </button>
            </div>
          </div>

          {/* Info Caixa */}
          <div className="info-card">
            <span className="label">Informações do Caixa</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Terminal</span>
                <span style={{ fontWeight: 600 }}>02</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>● Online</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Data</span>
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento */}
      {showPayment && (
        <ModalPagamento
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
          }}
        />
      )}

      {/* Modal de Utilidades */}
      {showUtils && (
        <ModalUtilidades
          onClose={() => setShowUtils(false)}
        />
      )}

      {showAuthDelete && (
        <ModalAutorizacao
          onClose={() => setShowAuthDelete(false)}
          onSuccess={handleAuthDeleteSuccess}
          title="Autorização para Remover"
          description="Digite a senha do supervisor para remover um item"
        />
      )}

      {showRemoveItem && (
        <ModalRemoverItem
          onClose={() => setShowRemoveItem(false)}
          onConfirm={handleConfirmRemoveItem}
          maxItems={items.length}
        />
      )}

      {showAuthDiscount && (
        <ModalAutorizacao
          onClose={() => setShowAuthDiscount(false)}
          onSuccess={handleAuthDiscountSuccess}
          title="Autorização de Desconto"
          description="Digite a senha do supervisor para aplicar desconto"
        />
      )}

      {showDiscountModal && (
        <ModalDesconto
          onClose={() => setShowDiscountModal(false)}
          onConfirm={handleConfirmDiscount}
          maxValue={useVendaStore.getState().getTotal()}
        />
      )}

      {showDiscountOptions && (
        <ModalOpcoesDesconto
          onClose={() => setShowDiscountOptions(false)}
          onGiveDiscount={handleGiveDiscount}
          onRemoveDiscount={handleRemoveDiscount}
          hasDiscount={useVendaStore.getState().getDiscount() > 0}
        />
      )}

      {showAuthCancel && (
        <ModalAutorizacao
          onClose={() => setShowAuthCancel(false)}
          onSuccess={handleAuthCancelSuccess}
          title="Autorização de Cancelamento"
          description="Digite a senha do supervisor para cancelar o cupom"
        />
      )}
    </div>
  );
}
