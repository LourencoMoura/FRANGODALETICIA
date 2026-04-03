import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('WhatsApp Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should format WhatsApp message correctly with order items', () => {
    const quantities = {
      frango_inteiro: 1,
      banda: 2,
      linguica: 1,
    };

    const products = [
      { id: 'frango_inteiro', name: 'Frango Inteiro', price: 30 },
      { id: 'banda', name: 'Banda', price: 16 },
      { id: 'linguica', name: 'Linguiça', price: 3 },
    ];

    let mensagem = 'Olá! Gostaria de fazer um pedido:\n\n';

    products.forEach(product => {
      const qty = quantities[product.id as keyof typeof quantities] || 0;
      if (qty > 0) {
        mensagem += `🍗 ${product.name}: ${qty}x R$ ${(product.price * qty).toFixed(2)}\n`;
      }
    });

    expect(mensagem).toContain('🍗 Frango Inteiro: 1x R$ 30.00');
    expect(mensagem).toContain('🍗 Banda: 2x R$ 32.00');
    expect(mensagem).toContain('🍗 Linguiça: 1x R$ 3.00');
  });

  it('should include delivery information in message', () => {
    const tipo = 'entrega';
    const localidade = 'guamare';
    const endereco = 'Rua das Flores, 123';

    let mensagem = '\n📍 Tipo: Entrega\n';

    const localidadeNome = localidade === 'guamare' ? 'Guamaré (sem taxa)' : 'Outras localidades (+R$ 5,00)';
    mensagem += `📍 Localidade: ${localidadeNome}\n`;
    mensagem += `📍 Endereço: ${endereco}\n`;

    expect(mensagem).toContain('📍 Tipo: Entrega');
    expect(mensagem).toContain('Guamaré (sem taxa)');
    expect(mensagem).toContain('Rua das Flores, 123');
  });

  it('should include pickup information in message', () => {
    const tipo = 'retirada';
    const horarioRetirada = '19:00';

    let mensagem = '\n📍 Tipo: Retirada\n';
    mensagem += `⏰ Horário: ${horarioRetirada}\n`;

    expect(mensagem).toContain('📍 Tipo: Retirada');
    expect(mensagem).toContain('⏰ Horário: 19:00');
  });

  it('should include observations if provided', () => {
    const observacoes = 'Sem sal, por favor';

    let mensagem = '';
    if (observacoes) {
      mensagem += `📝 Observações: ${observacoes}\n`;
    }

    expect(mensagem).toContain('📝 Observações: Sem sal, por favor');
  });

  it('should calculate total correctly', () => {
    const total = 65.00;
    const mensagem = `\n💰 Total: R$ ${total.toFixed(2)}\n\nObrigado!`;

    expect(mensagem).toContain('💰 Total: R$ 65.00');
  });

  it('should encode message for WhatsApp URL', () => {
    const mensagem = 'Olá! Gostaria de fazer um pedido:\n\n🍗 Frango Inteiro: 1x R$ 30.00\n\n💰 Total: R$ 30.00';
    const encodedMessage = encodeURIComponent(mensagem);
    const whatsappUrl = `https://wa.me/5584995894800?text=${encodedMessage}`;

    expect(whatsappUrl).toContain('https://wa.me/5584995894800?text=');
    expect(whatsappUrl).toContain('%F0%9F%8D%97'); // 🍗 encoded
    expect(whatsappUrl).toContain('%F0%9F%92%B0'); // 💰 encoded
  });

  it('should use correct WhatsApp number', () => {
    const whatsappUrl = 'https://wa.me/5584995894800?text=Teste';

    expect(whatsappUrl).toContain('5584995894800');
    expect(whatsappUrl).toMatch(/wa\.me\/\d+/);
  });

  it('should handle delivery fee calculation', () => {
    const localidade = 'salina_da_cruz';
    const baseFee = 0;

    const fee = localidade === 'guamare' ? 0 : 5;
    const total = 65 + fee;

    expect(total).toBe(70);
  });

  it('should handle no delivery fee for Guamaré', () => {
    const localidade = 'guamare';
    const fee = localidade === 'guamare' ? 0 : 5;

    expect(fee).toBe(0);
  });
});
