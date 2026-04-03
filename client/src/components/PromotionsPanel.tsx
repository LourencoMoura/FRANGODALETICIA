import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Gift, Send, Trash2, Edit2, Plus, Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Promotion {
  id: number;
  titulo: string;
  descricao: string;
  desconto: number;
  tipo: "percentual" | "fixo";
  ativo: number;
  dataFim?: string;
  createdAt: string;
}

export function PromotionsPanel() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    desconto: 0,
    tipo: "percentual" as "percentual" | "fixo",
    dataFim: "",
  });

  const { data: promotions, isLoading } = trpc.promotions.list.useQuery();

  const createMutation = trpc.promotions.create.useMutation({
    onSuccess: () => {
      toast.success("Promoção criada e enviada aos clientes! 🎉");
      resetForm();
      utils.promotions.list.invalidate();
    },
    onError: err => toast.error("Erro ao criar: " + err.message),
  });

  const updateMutation = trpc.promotions.update.useMutation({
    onSuccess: () => {
      toast.success("Promoção atualizada!");
      resetForm();
      utils.promotions.list.invalidate();
    },
    onError: err => toast.error("Erro ao atualizar: " + err.message),
  });

  const deleteMutation = trpc.promotions.delete.useMutation({
    onSuccess: () => {
      toast.success("Promoção excluída!");
      utils.promotions.list.invalidate();
    },
    onError: err => toast.error("Erro ao excluir: " + err.message),
  });

  const toggleMutation = trpc.promotions.toggleStatus.useMutation({
    onSuccess: () => {
      utils.promotions.list.invalidate();
      toast.success("Status atualizado!");
    },
  });

  const resetForm = () => {
    setForm({
      titulo: "",
      descricao: "",
      desconto: 0,
      tipo: "percentual",
      dataFim: "",
    });
    setShowForm(false);
    setEditingPromo(null);
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setForm({
      titulo: promo.titulo,
      descricao: promo.descricao,
      desconto: promo.desconto,
      tipo: promo.tipo,
      dataFim: promo.dataFim
        ? new Date(promo.dataFim).toISOString().split("T")[0]
        : "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo || !form.descricao || form.desconto <= 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingPromo) {
      updateMutation.mutate({ id: editingPromo.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <Card className="p-6 shadow-xl border-orange-100 bg-white/50 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Gift className="w-6 h-6 text-orange-600" />
            Promoções & Ofertas
          </h2>
          <p className="text-gray-500 text-sm">
            Gerencie suas promoções e envie notificações push em massa.
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 hover:bg-orange-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Promoção
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-orange-50/50 p-6 rounded-2xl mb-8 border border-orange-200 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-orange-800">
              {editingPromo ? "Editar Promoção" : "Criar Nova Promoção"}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Título
                </label>
                <Input
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Super Combo de Domingo"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Validade (Opcional)
                </label>
                <Input
                  type="date"
                  value={form.dataFim}
                  onChange={e => setForm({ ...form, dataFim: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Descrição
              </label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                placeholder="Detalhes da promoção que aparecerão na notificação..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Valor do Desconto
                </label>
                <Input
                  type="number"
                  value={form.desconto}
                  onChange={e =>
                    setForm({ ...form, desconto: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Tipo de Desconto
                </label>
                <Select
                  value={form.tipo}
                  onValueChange={(v: "percentual" | "fixo") =>
                    setForm({ ...form, tipo: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="fixo">Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="flex-1 bg-orange-600 hover:bg-orange-700 h-12"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {editingPromo
                  ? "Salvar Alterações"
                  : "Criar e Notificar Clientes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="h-12 px-6"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      ) : promotions?.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
          <Gift className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Nenhuma promoção ativa no momento.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-4 font-semibold text-gray-600">Promoção</th>
                <th className="pb-4 font-semibold text-gray-600">Desconto</th>
                <th className="pb-4 font-semibold text-gray-600">Status</th>
                <th className="pb-4 font-semibold text-gray-600 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {promotions?.map((promo: any) => (
                <tr
                  key={promo.id}
                  className="group hover:bg-orange-50/30 transition-colors"
                >
                  <td className="py-4">
                    <div className="font-bold text-gray-800">
                      {promo.titulo}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-1">
                      {promo.descricao}
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="font-mono font-bold text-orange-600">
                      {promo.tipo === "percentual"
                        ? `${promo.desconto}%`
                        : `R$ ${promo.desconto}`}
                    </span>
                  </td>
                  <td className="py-4">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: promo.id,
                          ativo: promo.ativo ? 0 : 1,
                        })
                      }
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        promo.ativo
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {promo.ativo ? "Ativa" : "Pausada"}
                    </button>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(promo)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (
                            confirm(
                              "Tem certeza que deseja excluir esta promoção?"
                            )
                          ) {
                            deleteMutation.mutate({ id: promo.id });
                          }
                        }}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
