import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ChefHat, ShoppingCart, Clock, MapPin, Bell, Flame, Shield, LogOut, Gift } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import OrderHistory from "./OrderHistory";
import AuthPage from "./AuthPage";
import { PublicLayout } from "@/components/PublicLayout";

type OrderStep = "order" | "confirmation";
type OrderType = "entrega" | "retirada";
type Localidade = "guamare" | "salina_da_cruz" | "outras";

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
}

const PRODUCTS: Product[] = [
  { id: 1, name: "Frango Inteiro", price: 30, description: "Frango assado inteiro, suculento e temperado" },
  { id: 2, name: "Banda de Frango", price: 16, description: "Meia frango assado, perfeito para uma pessoa" },
  { id: 3, name: "Linguiça Unid.", price: 3, description: "Linguiça grelhada, unidade" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<OrderStep>("order");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Login state
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [mpPreferenceId, setMpPreferenceId] = useState<string | null>(null);

  // Push notifications
  const { 
    subscribe: subscribeToPush, 
    unsubscribe: unsubscribeFromPush,
    isSubscribed, 
    isSupported: isPushSupported,
    isLoading: isPushLoading 
  } = usePushNotifications();

  // Order state
  const [tipo, setTipo] = useState<OrderType>("entrega");
  const [localidade, setLocalidade] = useState<Localidade>("guamare");
  const [endereco, setEndereco] = useState("");
  const [horarioRetirada, setHorarioRetirada] = useState("11:00");
  const [observacoes, setObservacoes] = useState("");

  // Product quantities
  const [quantities, setQuantities] = useState({ 1: 0, 2: 0, 3: 0 });
  const [total, setTotal] = useState(0);

  // tRPC mutations
  const createOrderMutation = trpc.orders.createOrder.useMutation();
  const scheduleReminderMutation = trpc.orders.scheduleReminder.useMutation();
  const createPreferenceMutation = trpc.payment.createPreference.useMutation();

  // Queries for manual fetching
  const { refetch: fetchOrderById } = trpc.orders.getById.useQuery(
    { id: lastOrderId || 0 },
    { enabled: false }
  );

  // For the auto-redirect effect
  const [targetOrderId, setTargetOrderId] = useState<number | null>(null);
  const { data: autoOrderData, refetch: fetchAutoOrder } = trpc.orders.getById.useQuery(
    { id: targetOrderId || 0 },
    { enabled: false }
  );

  const { data: publicSettings } = trpc.settings.getPublicSettings.useQuery();
  const whatsappNumber = useMemo(() => publicSettings?.whatsapp || "5584999589480", [publicSettings]);

  // Calculate total
  useEffect(() => {
    let subtotal = 0;
    PRODUCTS.forEach(product => {
      subtotal += (quantities[product.id as keyof typeof quantities] || 0) * product.price;
    });

    let taxa = 0;
    if (tipo === "entrega" && localidade !== "guamare") {
      taxa = 5;
    }

    setTotal(subtotal + taxa);
  }, [quantities, tipo, localidade]);

  const checkNotificationStatus = () => {
    // A lógica agora é gerida pelo hook usePushNotifications
  };

  const handleLoginSuccess = (id: number, name: string, nickname: string) => {
    setCustomerId(id);
    setNome(name);
    setApelido(nickname);
    setStep("order");
    checkNotificationStatus();
  };

  const handleToggleNotifications = async () => {
    if (!customerId) {
      toast.error("Faça login primeiro");
      return;
    }

    try {
      if (isSubscribed) {
        await unsubscribeFromPush();
      } else {
        await subscribeToPush(customerId);
      }
    } catch (error) {
      console.error("Erro ao alternar notificações:", error);
    }
  };

  const handleLogout = () => {
    setCustomerId(null);
    setNome("");
    setApelido("");
    setStep("order");
    setShowHistory(false);
    toast.success("Desconectado com sucesso");
  };

  // 1. WhatsApp Message Builder Utility
  const buildWhatsAppMessage = (id: number, customerName: string, customerNickname: string, orderTipo: string, orderLocalidade: string | undefined, orderEndereco: string | undefined, orderHorario: string | undefined, orderObs: string | undefined, orderItems: any[], orderTotal: number, isPaid: boolean) => {
    let msg = `*FRANGO DA LETÍCIA* 🍗\n`;
    msg += ` --------------------------- \n`;
    msg += `🛍️ *PEDIDO:* #${id} \n`;
    msg += `👤 *CLIENTE:* ${customerName} (${customerNickname}) \n`;
    msg += `--------------------------- \n`;
    msg += `*PAGAMENTO:* ${isPaid ? "JÁ ESTÁ PAGO! ✅" : "NA ENTREGA / RETIRADA 💵"} \n`;
    msg += `--------------------------- \n`;
    msg += `*ITENS DO PEDIDO:* \n`;
    
    orderItems.forEach(item => {
      msg += `🔹 ${String(item.quantity).padStart(2, '0')} x ${item.product_name || item.name}\n`;
    });
    
    msg += ` --------------------------- \n`;
    
    if (orderTipo === "entrega") {
      msg += `🛵 *ENTREGA:* ${orderLocalidade === "guamare" ? "Guamaré" : "Salina / Outras"}\n`;
    } else {
      msg += `🏪 *RETIRADA:* ${orderHorario}\n`;
    }
    
    msg += ` 💰 *TOTAL:* R$ ${Number(orderTotal).toFixed(2)}\n`;
    msg += ` --------------------------- `;
    
    return encodeURIComponent(msg);
  };

  // 2. URL Detector for Mercado Pago Back URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    const orderIdParam = params.get('orderId');

    if (paymentStatus === 'approved' && orderIdParam && customerId) {
      setTargetOrderId(Number(orderIdParam));
    }
  }, [customerId]);

  useEffect(() => {
    if (targetOrderId && customerId) {
      const triggerWhatsApp = async () => {
        try {
          setLoading(true);
          const response = await fetchAutoOrder();
          if (response.data) {
            const data = response.data;
            const encodedMsg = buildWhatsAppMessage(
              data.id,
              nome,
              apelido,
              data.tipo,
              data.localidade || undefined,
              data.endereco || undefined,
              data.horarioRetirada || undefined,
              data.observacoes || undefined,
              data.items as any[],
              Number(data.total),
              true
            );
            
            toast.success("Pagamento Confirmado! 🎉 Abrindo WhatsApp...");
            
            setTimeout(() => {
              window.open(`https://wa.me/${whatsappNumber}?text=${encodedMsg}`, "_blank");
              window.history.replaceState({}, document.title, "/");
              setTargetOrderId(null);
              setLoading(false);
            }, 2000);
          }
        } catch (err) {
          console.error("Erro ao processar retorno do pagamento:", err);
          setLoading(false);
        }
      };
      triggerWhatsApp();
    }
  }, [targetOrderId, customerId, nome, apelido, fetchAutoOrder]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("Erro: Cliente não identificado. Faça login novamente.");
      return;
    }

    if (total === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }

    if (tipo === "entrega" && !endereco) {
      toast.error("Informe o endereço para entrega");
      return;
    }

    setLoading(true);
    try {
      // Build items array
      const items = PRODUCTS
        .filter(p => (quantities[p.id as keyof typeof quantities] || 0) > 0)
        .map(p => ({
          product_id: p.id,
          product_name: p.name,
          quantity: quantities[p.id as keyof typeof quantities] || 0,
          unit_price: p.price,
        }));

      // Use tRPC mutation to create order (default to presencial initially)
      const orderResult = await createOrderMutation.mutateAsync({
        customerId,
        tipo,
        localidade: tipo === "entrega" ? localidade : undefined,
        endereco: tipo === "entrega" ? endereco : undefined,
        horarioRetirada: tipo === "retirada" ? horarioRetirada : undefined,
        observacoes,
        items,
        total,
        paymentMethod: 'presencial', // We will update this if they pay online
      });

      if (!orderResult.success) {
        toast.error("Erro ao criar pedido");
        return;
      }

      const orderId = orderResult.orderId;

      // Schedule reminder if order was created successfully
      if (orderId) {
        try {
          await scheduleReminderMutation.mutateAsync({
            orderId,
          });
        } catch (reminderError) {
          console.error("Erro ao agendar lembrete:", reminderError);
          // Don't fail the order creation if reminder fails
        }
      }

      // Subscribe to push notifications with customer ID
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          if (subscription) {
            // Update subscription with customer ID
            const authKey = subscription.getKey('auth');
            const p256dhKey = subscription.getKey('p256dh');
            
            if (authKey && p256dhKey) {
              const authArray = Array.from(new Uint8Array(authKey));
              const p256dhArray = Array.from(new Uint8Array(p256dhKey));
              
              // await pushSubscribeMutation.mutateAsync({
              //   endpoint: subscription.endpoint,
              //   keys: {
              //     auth: btoa(String.fromCharCode(...authArray)),
              //     p256dh: btoa(String.fromCharCode(...p256dhArray)),
              //   },
              //   customerId,
              // });
            }
          }
        } catch (pushError) {
          console.error("Erro ao atualizar subscrição de push:", pushError);
        }
      }

      // Build WhatsApp message
      let mensagem = `Cliente: ${nome} (${apelido})\nPedido #${orderId}\n\nOlá! Gostaria de fazer um pedido:\n\n`;
      
      PRODUCTS.forEach(product => {
        const qty = quantities[product.id as keyof typeof quantities] || 0;
        if (qty > 0) {
          mensagem += `🍗 ${product.name}: ${qty}x R$ ${(product.price * qty).toFixed(2)}\n`;
        }
      });
      
      mensagem += `\n📍 Tipo: ${tipo === "entrega" ? "Entrega" : "Retirada"}\n`;
      
      if (tipo === "entrega") {
        const localidadeNome = localidade === "guamare" ? "Guamaré (sem taxa)" : localidade === "salina_da_cruz" ? "Salina da Cruz (+R$ 5,00)" : "Outras localidades (+R$ 5,00)";
        mensagem += `📍 Localidade: ${localidadeNome}\n`;
        mensagem += `📍 Endereço: ${endereco}\n`;
      } else {
        mensagem += `⏰ Horário: ${horarioRetirada}\n`;
      }
      
      if (observacoes) {
        mensagem += `📝 Observações: ${observacoes}\n`;
      }
      
      mensagem += `\n💰 Total: R$ ${total.toFixed(2)}\n\nObrigado!`;
      
      // Encode message for WhatsApp
      const encodedMessage = encodeURIComponent(mensagem);
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
      
      setStep("confirmation");
      setLastOrderId(orderId);
      toast.success("Pedido registrado! 🎉");
      
      // Reset form
      setQuantities({ 1: 0, 2: 0, 3: 0 });
      setEndereco("");
      setObservacoes("");

      // Optional: Generate payment preference automatically
      try {
        const pref = await createPreferenceMutation.mutateAsync({ orderId: orderId! });
        if (pref && pref.id) {
          setMpPreferenceId(pref.id);
        }
      } catch (e) {
        console.error("Erro ao gerar link de pagamento:", e);
      }
      
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao criar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayOnline = () => {
    if (mpPreferenceId) {
      const url = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${mpPreferenceId}`;
      window.open(url, "_blank");
    } else {
      toast.error("Link de pagamento não disponível. Tente o WhatsApp.");
    }
  };

  const handleWhatsAppRedirect = async () => {
    if (!lastOrderId) return;
    
    setLoading(true);
    try {
      const response = await fetchOrderById();
      if (response.data) {
        const data = response.data;
        const encodedMsg = buildWhatsAppMessage(
          data.id,
          nome,
          apelido,
          data.tipo,
          data.localidade || undefined,
          data.endereco || undefined,
          data.horarioRetirada || undefined,
          data.observacoes || undefined,
          data.items as any[],
          Number(data.total),
          false // Presencial
        );
        
        window.open(`https://wa.me/${whatsappNumber}?text=${encodedMsg}`, "_blank");
        setStep("order");
      }
    } catch (err) {
      toast.error("Erro ao redirecionar para WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  // Show auth page if not logged in
  if (!customerId) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }



  // Fetch customer details to get points
  const { data: customerData } = trpc.customers.getById.useQuery(
    { id: customerId || 0 },
    { enabled: !!customerId }
  );

  return (
    <PublicLayout
      nickname={apelido}
      points={customerData?.points || 0}
      onLogout={handleLogout}
    >

      {/* Main Content */}
      <div className="container py-8">
        {showHistory && customerId && nome ? (
          <OrderHistory
            customerId={customerId}
            customerName={nome}
            onBack={() => setShowHistory(false)}
            onRepeatOrder={(order) => {
              toast.info("Funcionalidade em desenvolvimento");
            }}
          />
        ) : (
          <>
            {step === "order" && (
              <div className="max-w-2xl mx-auto">
                <Card className="p-8 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      <ShoppingCart className="w-6 h-6 text-orange-600" />
                      Selecione seus Produtos
                    </h2>
                    <div className="flex gap-2">
                      {isPushSupported && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPushLoading}
                          onClick={handleToggleNotifications}
                          className={`gap-2 transition-all duration-300 ${
                            isSubscribed 
                              ? "border-green-600 text-green-600 hover:bg-green-50 shadow-sm" 
                              : "border-orange-600 text-orange-600 hover:bg-orange-50"
                          }`}
                        >
                          {isPushLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Bell className={`w-4 h-4 ${isSubscribed ? "fill-current" : ""}`} />
                          )}
                          {isSubscribed ? "Notificações Ativas" : "Habilitar Notificações"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHistory(true)}
                        className="border-orange-600 text-orange-600 hover:bg-orange-50"
                      >
                        Ver Histórico
                      </Button>
                    </div>
                  </div>

                  {/* Badge de horario de entregas */}
                  <div className="mb-6 p-3 bg-orange-50 border-2 border-orange-200 rounded-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <p className="text-sm font-semibold text-orange-700">Entregas a partir de 11:50</p>
                  </div>

                  {/* Products */}
                  <div className="space-y-4 mb-6">
                    {PRODUCTS.map(product => (
                      <Card key={product.id} className="p-4 border-2 border-orange-200 hover:border-orange-400 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-800">{product.name}</h3>
                            <p className="text-sm text-gray-600">{product.description}</p>
                          </div>
                          <p className="text-lg font-bold text-orange-600">R$ {product.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setQuantities(prev => ({
                              ...prev,
                              [product.id]: Math.max(0, (prev[product.id as keyof typeof prev] || 0) - 1)
                            }))}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-bold">
                            {quantities[product.id as keyof typeof quantities] || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantities(prev => ({
                              ...prev,
                              [product.id]: (prev[product.id as keyof typeof prev] || 0) + 1
                            }))}
                            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Delivery Type */}
                  <div className="mb-6 border-t-2 border-orange-200 pt-6">
                    <h3 className="font-bold text-gray-800 mb-4">Tipo de Entrega</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="tipo"
                          value="entrega"
                          checked={tipo === "entrega"}
                          onChange={(e) => setTipo(e.target.value as OrderType)}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-700">Entrega</span>
                      </label>
                      {tipo === "entrega" && (
                        <div className="ml-7 space-y-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Localidade</label>
                            <select
                              value={localidade}
                              title="Localidade"
                              onChange={(e) => setLocalidade(e.target.value as Localidade)}
                              className="w-full px-3 py-2 border-2 border-orange-200 rounded focus:outline-none focus:border-orange-500"
                            >
                              <option value="guamare">Guamaré (sem taxa)</option>
                              <option value="salina_da_cruz">Salina da Cruz (+R$ 5,00)</option>
                              <option value="outras">Outras localidades (+R$ 5,00)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Endereço</label>
                            <input
                              type="text"
                              placeholder="Rua, número, complemento"
                              value={endereco}
                              onChange={(e) => setEndereco(e.target.value)}
                              className="w-full px-3 py-2 border-2 border-orange-200 rounded focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                      )}
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="tipo"
                          value="retirada"
                          checked={tipo === "retirada"}
                          onChange={(e) => setTipo(e.target.value as OrderType)}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-700">Retirada</span>
                      </label>
                    </div>
                  </div>

                  {/* Observations */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Observações</label>
                    <input
                      type="text"
                      placeholder="Ex: bem assado, sem sal..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-orange-200 rounded focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Total */}
                  <Card className="p-4 bg-orange-50 border-2 border-orange-200 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800">Total:</span>
                      <span className="text-2xl font-bold text-orange-600">R$ {total.toFixed(2)}</span>
                    </div>
                  </Card>

                  {/* Submit Button */}
                  <Button
                    onClick={handleCreateOrder}
                    disabled={loading || total === 0}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Confirmar Pedido"
                    )}
                  </Button>
                </Card>
              </div>
            )}

            {step === "confirmation" && (
              <div className="max-w-2xl mx-auto text-center py-12 animate-in zoom-in-95">
                <div className="mb-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ChefHat className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Pedido Recebido! 🍗</h2>
                  <p className="text-gray-600 mb-8 text-lg">Escolha como deseja prosseguir com seu pedido #{lastOrderId}:</p>
                  
                  <div className="grid gap-6 max-w-sm mx-auto">
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Pague Agora e agilize</p>
                      <Button
                        onClick={handlePayOnline}
                        disabled={!mpPreferenceId || createPreferenceMutation.isPending || loading}
                        className="w-full bg-[#009EE3] hover:bg-[#0089C7] text-white font-bold py-8 rounded-2xl shadow-lg border-b-4 border-[#007EB5] active:border-b-0 transition-all h-auto flex flex-col gap-1 ring-offset-2 hover:ring-2 ring-[#009EE3]"
                      >
                        {createPreferenceMutation.isPending || loading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <span className="text-xl">💳 Pagar Online</span>
                            <span className="text-xs font-normal opacity-90 text-white/80">PIX ou Cartão (Mercado Pago)</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200"></span>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500 font-bold">Ou se preferir</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Button
                        onClick={handleWhatsAppRedirect}
                        variant="outline"
                        disabled={loading}
                        className="w-full border-2 border-green-600 text-green-600 font-bold py-8 rounded-2xl hover:bg-green-50 transition-all h-auto flex flex-col gap-1 ring-offset-2 hover:ring-2 ring-green-600"
                      >
                        {loading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <span className="text-xl">💵 Pagar na Entrega</span>
                            <span className="text-xs font-normal opacity-70">Avisar Pedido no WhatsApp</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <button 
                      onClick={() => setStep("order")}
                      className="text-gray-400 text-sm hover:underline mt-4"
                    >
                      Voltar ao Início
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </PublicLayout>
  );
}
