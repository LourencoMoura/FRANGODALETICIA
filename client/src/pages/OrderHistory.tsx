import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface Order {
  id: number;
  customer_id: number;
  tipo: string;
  localidade?: string;
  endereco?: string;
  horario_retirada?: string;
  observacoes?: string;
  total: number;
  status: string;
  created_at: string;
}

interface OrderHistoryProps {
  customerId: number;
  customerName: string;
  onBack: () => void;
  onRepeatOrder: (order: Order) => void;
}

export default function OrderHistory({
  customerId,
  customerName,
  onBack,
  onRepeatOrder,
}: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: listData, isLoading: isOrdersLoading } = trpc.orders.getOrdersByCustomer.useQuery(undefined, {
    enabled: !!customerId
  });

  useEffect(() => {
    if (listData?.success && listData.orders) {
      setOrders(listData.orders as Order[]);
    }
  }, [listData]);

  useEffect(() => {
    if (!isOrdersLoading) {
      setLoading(false);
    }
  }, [isOrdersLoading]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "entregue":
        return "bg-green-100 text-green-800";
      case "pronto":
        return "bg-blue-100 text-blue-800";
      case "preparando":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h2 className="text-2xl font-bold text-gray-800">
          Histórico de Pedidos - {customerName}
        </h2>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Nenhum pedido encontrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Card
              key={order.id}
              className="p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    Pedido #{order.id}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <p className="font-semibold text-gray-800">{order.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-semibold text-orange-600 text-lg">
                    R$ {order.total.toFixed(2)}
                  </p>
                </div>
              </div>

              {order.endereco && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Endereço</p>
                  <p className="text-gray-800">{order.endereco}</p>
                </div>
              )}

              <Button
                onClick={() => onRepeatOrder(order)}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-2 rounded-lg"
              >
                Repetir Pedido
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
