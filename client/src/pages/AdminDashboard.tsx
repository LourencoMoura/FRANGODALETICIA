"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  TrendingUp,
  Package,
  Clock,
  ShoppingCart,
  Search,
  Gift,
  Users,
  Settings,
  ShieldCheck,
  CheckSquare,
  MapPin,
  Trash2,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PromotionsPanel } from "@/components/PromotionsPanel";
import { ProductsPanel } from "@/components/ProductsPanel";
import DashboardLayout from "@/components/DashboardLayout";
import { haptics } from "@/lib/haptics";

interface Order {
  id: number;
  customerId: number;
  tipo: string;
  localidade?: string;
  endereco?: string;
  horarioRetirada?: string;
  observacoes?: string;
  total: number;
  status: string;
  paymentStatus?: string;
  items: any[];
  createdAt: string;
}

type Tab = "orders" | "promotions" | "customers" | "products" | "settings";

export default function AdminDashboard() {
  const [location] = useLocation();
  // Forçar re-renderização quando a query string mudar
  const [currentSearch, setCurrentSearch] = useState(window.location.search);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentSearch(window.location.search);
    };

    // Escutar mudanças no histórico do navegador
    window.addEventListener("popstate", handleLocationChange);
    
    // Pequeno hack: como o wouter setLocation nem sempre dispara popstate em mudanças parciais,
    // vamos observar mudanças no objeto window.location periodicamente ou via interceptação
    const interval = setInterval(() => {
      if (window.location.search !== currentSearch) {
        setCurrentSearch(window.location.search);
      }
    }, 100);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      clearInterval(interval);
    };
  }, [currentSearch]);

  const searchParams = new URLSearchParams(currentSearch);
  const tabFromUrl = searchParams.get("tab") as Tab;
  const activeTab: Tab = (tabFromUrl && ["orders", "promotions", "customers", "products", "settings"].includes(tabFromUrl)) 
    ? tabFromUrl 
    : "orders";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    publicKey: "",
    accessToken: "",
  });
  const [whatsapp, setWhatsapp] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("5.00");



  // tRPC Queries
  const { data: ordersList, isLoading: isFetchingOrders } =
    trpc.orders.list.useQuery();
  const { data: customersList, isLoading: isFetchingCustomers } =
    trpc.customers.list.useQuery();
  const mpSettings = trpc.payment.getAdminSettings.useQuery();
  const { data: publicSettings } = trpc.settings.getPublicSettings.useQuery();
  const { data: adminSettings } = trpc.settings.getAdminSettings.useQuery();

  const utils = trpc.useUtils();
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      utils.orders.list.invalidate();
      toast.success("Status atualizado e notificação enviada!");
    },
  });

  const saveSettingsMutation = trpc.payment.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas!");
      mpSettings.refetch();
    },
    onError: err => toast.error("Erro ao salvar: " + err.message),
  });

  const updateWhatsappMutation = trpc.settings.updateSetting.useMutation({
    onSuccess: () => {
      toast.success("Configuração atualizada!");
      utils.settings.getPublicSettings.invalidate();
    },
    onError: err => toast.error("Erro ao salvar: " + err.message),
  });

  const deleteCustomerMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente excluído com sucesso!");
      utils.customers.list.invalidate();
    },
    onError: err => toast.error("Erro ao excluir: " + err.message),
  });

  const cleanupOrdersMutation = trpc.orders.cleanupOldOrders.useMutation({
    onSuccess: () => {
      toast.success("Histórico de pedidos limpo!");
      utils.orders.list.invalidate();
    },
    onError: err => toast.error("Erro na limpeza: " + err.message),
  });

  useEffect(() => {
    if (ordersList) {
      const formattedOrders: Order[] = ordersList.map((order: any) => ({
        ...order,
        total: parseFloat(order.total),
      }));
      setOrders(formattedOrders);
      setLoading(false);
    }
  }, [ordersList]);

  useEffect(() => {
    if (mpSettings.data) {
      setSettingsForm({
        publicKey: mpSettings.data.publicKey,
        accessToken: mpSettings.data.accessToken,
      });
    }
    if (adminSettings) {
      const wa = adminSettings.find((s: any) => s.key === "whatsapp_suporte");
      if (wa) setWhatsapp(wa.value);

      const fee = adminSettings.find((s: any) => s.key === "taxa_entrega");
      if (fee) setDeliveryFee(fee.value);
    }
  }, [mpSettings.data, adminSettings]);

  const stats = {
    total: orders.length,
    pending: orders.filter(
      o => o.status === "pedido-recebido" || o.status === "preparando"
    ).length,
    ready: orders.filter(o => o.status === "pronto").length,
    delivered: orders.filter(o => o.status === "entregue").length,
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      haptics.medium();
      await updateStatusMutation.mutateAsync({
        orderId,
        status: newStatus as any,
      });
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const filteredOrders = orders.filter(
    o =>
      o.id.toString().includes(search) ||
      o.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">

        <div className="mt-2 text-none italic-none">
          {activeTab === "orders" && (
            <div className="space-y-6">
              {/* Stats Section - Agora apenas na aba de Pedidos */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 border-l-4 border-l-orange-500 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                        Total de Pedidos
                      </p>
                      <p className="text-3xl font-black text-gray-800">
                        {stats.total}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-200" />
                  </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-yellow-500 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                        Pendentes
                      </p>
                      <p className="text-3xl font-black text-gray-800">
                        {stats.pending}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-200" />
                  </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-green-500 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                        Prontos
                      </p>
                      <p className="text-3xl font-black text-gray-800">
                        {stats.ready}
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-green-200" />
                  </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-blue-500 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                        Entregues
                      </p>
                      <p className="text-3xl font-black text-gray-800">
                        {stats.delivered}
                      </p>
                    </div>
                    <CheckSquare className="w-8 h-8 text-blue-200" />
                  </div>
                </Card>
              </div>

              <Card className="p-6 shadow-md border-orange-100 italic-none">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                    <Package className="text-orange-500" />
                    Gestão de Pedidos
                  </h2>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar pedido..."
                    className="pl-10"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 font-medium">
                    Nenhum pedido encontrado no momento.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left py-4 px-4 font-bold text-gray-600 text-sm">
                          ID
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-gray-600 text-sm">
                          Total
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-gray-600 text-sm">
                          Pagamento
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-gray-600 text-sm">
                          Status Atendimento
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-gray-600 text-sm">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredOrders.map(order => (
                        <tr
                          key={order.id}
                          className="hover:bg-orange-50/30 transition-colors"
                        >
                          <td className="py-4 px-4 font-mono font-bold text-orange-600">
                            #{order.id}
                          </td>
                          <td className="py-4 px-4 font-black">
                            R$ {order.total.toFixed(2)}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                order.paymentStatus === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : order.paymentStatus === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              {order.paymentStatus === "approved"
                                ? "Aprovado"
                                : order.paymentStatus === "pending"
                                  ? "Pendente"
                                  : "NP"}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <select
                              aria-label="Alterar status do pedido"
                              value={order.status}
                              onChange={e =>
                                handleStatusChange(order.id, e.target.value)
                              }
                              className={`px-3 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer focus:ring-2 focus:ring-orange-500 ${
                                order.status === "entregue"
                                  ? "bg-green-100 text-green-800"
                                  : order.status === "pronto"
                                    ? "bg-blue-100 text-blue-800"
                                    : order.status === "preparando"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              <option value="pedido-recebido">
                                Pedido Recebido
                              </option>
                              <option value="preparando">Em Preparo</option>
                              <option value="pronto">
                                Pronto / Aguardando
                              </option>
                              <option value="saiu-para-entrega">
                                Saiu para Entrega
                              </option>
                              <option value="entregue">Finalizado</option>
                            </select>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-orange-600 hover:text-orange-700 font-bold"
                              onClick={() => {
                                haptics.light();
                                setSelectedOrder(order);
                              }}
                            >
                              Detalhes
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Modal de Detalhes do Pedido */}
              <Dialog
                open={!!selectedOrder}
                onOpenChange={open => !open && setSelectedOrder(null)}
              >
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-orange-100">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-800">
                      Pedido #{selectedOrder?.id}
                    </DialogTitle>
                  </DialogHeader>

                  {selectedOrder && (
                    <div className="space-y-6 pt-4">
                      {/* Cliente e Status */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">
                            Status do Pedido
                          </p>
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                            {selectedOrder.status.replace("-", " ")}
                          </span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">
                            Pagamento
                          </p>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              selectedOrder.paymentStatus === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {selectedOrder.paymentStatus === "approved"
                              ? "Aprovado"
                              : "Pendente"}
                          </span>
                        </div>
                      </div>

                      {/* Itens do Pedido */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Package className="w-5 h-5 text-orange-500" />
                          Itens
                        </h3>
                        <div className="space-y-3">
                          {(() => {
                            let items = [];
                            try {
                              items = Array.isArray(selectedOrder.items)
                                ? selectedOrder.items
                                : typeof selectedOrder.items === "string"
                                  ? JSON.parse(selectedOrder.items)
                                  : [];
                            } catch (e) {
                              console.error("Erro ao converter itens:", e);
                            }

                            if (!items || items.length === 0) {
                              return (
                                <p className="text-gray-400 italic text-sm py-4 text-center bg-gray-50 rounded-lg">
                                  Nenhum item encontrado neste pedido.
                                </p>
                              );
                            }

                            return items.map((item: any, idx: number) => {
                              const nomeItem =
                                item.product_name ||
                                item.titulo ||
                                item.item_name ||
                                item.name ||
                                item.nome ||
                                "Produto";
                              const precoUnitario = Number(
                                item.unit_price ||
                                  item.price ||
                                  item.preco ||
                                  item.item_price ||
                                  0
                              );
                              const qtd = Number(
                                item.quantity || item.quantidade || 1
                              );

                              return (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:border-orange-200 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
                                      {qtd}x
                                    </span>
                                    <div className="flex flex-col">
                                      <span className="font-black text-gray-800 text-sm">
                                        {nomeItem}
                                      </span>
                                      {precoUnitario > 0 && (
                                        <span className="text-[10px] text-gray-500">
                                          R$ {precoUnitario.toFixed(2)} un.
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="font-black text-gray-900 border-l pl-3 border-orange-50">
                                    R$ {(precoUnitario * qtd).toFixed(2)}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Entrega / Retirada */}
                      <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                        <h3 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2 uppercase tracking-wider">
                          {selectedOrder.tipo === "entrega" ? (
                            <>
                              <MapPin className="w-4 h-4" /> Dados de Entrega
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4" /> Dados de Retirada
                            </>
                          )}
                        </h3>
                        {selectedOrder.tipo === "entrega" ? (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-700">
                               <strong>Localidade:</strong>{" "}
                              {selectedOrder.localidade?.replace("_", " ")}
                            </p>
                            <p className="text-sm text-gray-700">
                              <strong>Endereço:</strong> {selectedOrder.endereco}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700">
                            <strong>Horário sugerido:</strong>{" "}
                            {selectedOrder.horarioRetirada}
                          </p>
                        )}
                      </div>

                      {/* Observações */}
                      {selectedOrder.observacoes && (
                        <div>
                          <h3 className="text-sm font-bold text-gray-700 mb-2">
                            Observações do Cliente
                          </h3>
                          <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-sm text-gray-700 italic">
                            "{selectedOrder.observacoes}"
                          </div>
                        </div>
                      )}

                      {/* Total */}
                      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <span className="text-gray-500 font-bold">TOTAL</span>
                        <span className="text-3xl font-black text-orange-600">
                          R$ {Number(selectedOrder.total).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button
                          onClick={() => setSelectedOrder(null)}
                          className="bg-gray-900 hover:bg-black text-white px-8 font-bold"
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </Card>
          </div>
          )}

          {activeTab === "promotions" && <PromotionsPanel />}

          {activeTab === "customers" && (
            <Card className="p-6 shadow-md border-orange-100">
              <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                <Users className="text-orange-500" />
                Clientes & Fidelidade
              </h2>
              {isFetchingCustomers ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                </div>
              ) : !customersList || customersList.length === 0 ? (
                <p className="text-center text-gray-400 py-12">
                  Nenhum cliente cadastrado.
                </p>
              ) : (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left py-4 px-4 font-bold text-gray-600 text-sm">
                          Nome / Apelido
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-gray-600 text-sm">
                          WhatsApp
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-gray-600 text-sm">
                          Saldo Fidelidade
                        </th>
                        <th className="text-right py-4 px-4 font-bold text-gray-600 text-sm">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customersList.map((customer: any) => (
                        <tr
                          key={customer.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <p className="font-bold text-gray-800">
                              {customer.nome}
                            </p>
                            <p className="text-xs text-gray-400">
                              @{customer.apelido}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-gray-600 font-medium">
                            {customer.whatsapp}
                          </td>
                          <td className="py-4 px-4">
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-full border border-amber-100">
                              <Gift className="w-3 h-3 text-amber-500" />
                              <span className="font-black text-amber-700 text-sm">
                                {customer.points} pts
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Tem certeza que deseja excluir o cliente ${customer.nome}? Isso apagará também todo o histórico de pedidos dele.`
                                  )
                                ) {
                                  deleteCustomerMutation.mutate({
                                    id: customer.id,
                                  });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {activeTab === "products" && <ProductsPanel />}

          {activeTab === "settings" && (
            <div className="max-w-4xl space-y-6">
              <Card className="p-8 shadow-xl border-orange-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-800">
                      Pagamento Integrado
                    </h2>
                    <p className="text-gray-500 font-medium">
                      Configure suas chaves do Mercado Pago.
                    </p>
                  </div>
                </div>

                <form
                  className="space-y-6"
                  onSubmit={e => {
                    e.preventDefault();
                    saveSettingsMutation.mutate(settingsForm);
                  }}
                >
                  <div className="grid md:grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">
                        Public Key
                      </label>
                      <Input
                        value={settingsForm.publicKey}
                        onChange={e =>
                          setSettingsForm({
                            ...settingsForm,
                            publicKey: e.target.value,
                          })
                        }
                        className="h-12 border-gray-200 focus:ring-orange-500 font-mono text-xs"
                        placeholder="APP_USR-..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">
                        Access Token
                      </label>
                      <Input
                        type="password"
                        value={settingsForm.accessToken}
                        onChange={e =>
                          setSettingsForm({
                            ...settingsForm,
                            accessToken: e.target.value,
                          })
                        }
                        className="h-12 border-gray-200 focus:ring-orange-500 font-mono text-xs"
                        placeholder="APP_USR-..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => haptics.heavy()}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 h-12"
                      disabled={saveSettingsMutation.isPending}
                    >
                      {saveSettingsMutation.isPending
                        ? "Salvando..."
                        : "Salvar Configurações de Pagamento"}
                    </Button>
                  </div>
                </form>

                <div className="my-10 border-t border-gray-100 italic-none"></div>

                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100 shadow-sm">
                    <ShoppingCart className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-800">
                      Atendimento WhatsApp
                    </h2>
                    <p className="text-gray-500 font-medium">
                      Configure para onde os pedidos serão enviados.
                    </p>
                  </div>
                </div>

                <form
                  className="space-y-6"
                  onSubmit={e => {
                    e.preventDefault();
                    updateWhatsappMutation.mutate({
                      key: "whatsapp_suporte",
                      value: whatsapp,
                    });
                  }}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">
                      Número do WhatsApp (Com 55 + DDD)
                    </label>
                    <Input
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      className="h-12 border-gray-200 focus:ring-green-500 font-mono text-sm"
                      placeholder="5584999589480"
                    />
                    <p className="text-xs text-gray-400 ml-1 italic">
                      Este é o número que receberá as mensagens de pedido do
                      site principal.
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => haptics.heavy()}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 h-12"
                      disabled={updateWhatsappMutation.isPending}
                    >
                      {updateWhatsappMutation.isPending
                        ? "Salvando..."
                        : "Salvar Numero do WhatsApp"}
                    </Button>
                  </div>
                </form>

                <div className="my-10 border-t border-gray-100 italic-none"></div>

                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 shadow-sm">
                    <MapPin className="w-8 h-8 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-800">
                      Taxa de Entrega
                    </h2>
                    <p className="text-gray-500 font-medium">
                      Defina o valor cobrado para entregas.
                    </p>
                  </div>
                </div>

                <form
                  className="space-y-6"
                  onSubmit={e => {
                    e.preventDefault();
                    updateWhatsappMutation.mutate({
                      key: "taxa_entrega",
                      value: deliveryFee,
                    });
                  }}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">
                      Valor da Taxa (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.50"
                      value={deliveryFee}
                      onChange={e => setDeliveryFee(e.target.value)}
                      className="h-12 border-gray-200 focus:ring-orange-500 font-mono text-sm"
                      placeholder="5.00"
                    />
                    <p className="text-xs text-gray-400 ml-1 italic">
                      Este valor será somado ao total apenas se o cliente escolher "Entrega".
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 h-12"
                      disabled={updateWhatsappMutation.isPending}
                    >
                      {updateWhatsappMutation.isPending
                        ? "Salvando..."
                        : "Salvar Taxa de Entrega"}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
