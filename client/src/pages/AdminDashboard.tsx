"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PromotionsPanel } from "@/components/PromotionsPanel";
import DashboardLayout from "@/components/DashboardLayout";

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
  createdAt: string;
}

type Tab = "orders" | "promotions" | "customers" | "products" | "settings";

export default function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    publicKey: "",
    accessToken: "",
  });
  const [whatsapp, setWhatsapp] = useState("");

  // Sync tab with URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get("tab") as Tab;
    if (
      tabFromUrl &&
      ["orders", "promotions", "customers", "products", "settings"].includes(
        tabFromUrl
      )
    ) {
      setActiveTab(tabFromUrl);
    } else {
      setActiveTab("orders");
    }
  }, [location]);

  // Check admin session
  useEffect(() => {
    const session = localStorage.getItem("adminSession");
    if (!session) {
      setLocation("/admin");
    }
  }, [setLocation]);

  // tRPC Queries
  const { data: ordersList, isLoading: isFetchingOrders } =
    trpc.orders.list.useQuery();
  const { data: customersList, isLoading: isFetchingCustomers } =
    trpc.customers.list.useQuery();
  const mpSettings = trpc.payment.getAdminSettings.useQuery();
  const { data: publicSettings } = trpc.settings.getPublicSettings.useQuery();

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
      toast.success("WhatsApp atualizado!");
      utils.settings.getPublicSettings.invalidate();
    },
    onError: err => toast.error("Erro ao salvar WhatsApp: " + err.message),
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
    if (publicSettings) {
      setWhatsapp(publicSettings.whatsapp);
    }
  }, [mpSettings.data, publicSettings]);

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
        {/* Stats Section - Visible mostly on Orders tab but keeps layout consistent */}
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

        {/* Content Tabs */}
        <div className="mt-8">
          {activeTab === "orders" && (
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
            </Card>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {activeTab === "products" && (
            <div className="bg-white rounded-2xl p-16 text-center shadow-xl border-2 border-dashed border-orange-100 flex flex-col items-center">
              <div className="bg-orange-50 p-6 rounded-full mb-6">
                <ShoppingCart className="w-16 h-16 text-orange-400" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-3">
                Gestão de Cardápio
              </h3>
              <p className="text-gray-500 max-w-sm leading-relaxed">
                Esta funcionalidade está sendo preparada para que você mude
                preços e adicione novos itens em segundos.
              </p>
            </div>
          )}

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
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 h-12"
                      disabled={updateWhatsappMutation.isPending}
                    >
                      {updateWhatsappMutation.isPending
                        ? "Salvando..."
                        : "Salvar Numero do WhatsApp"}
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

// Helper icon not imported correctly initially
function CheckSquare({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="9 11 12 14 22 4"></polyline>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
    </svg>
  );
}
