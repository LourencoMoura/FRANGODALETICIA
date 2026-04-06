import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ShoppingCart,
  Trash2,
  Edit2,
  Plus,
  Loader2,
  X,
  Package,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  price: string | number;
  description: string | null;
  createdAt: string;
}

export function ProductsPanel() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
  });

  const { data: products, isLoading } = trpc.products.list.useQuery();

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Produto adicionado ao cardápio! 🍗");
      resetForm();
      utils.products.list.invalidate();
    },
    onError: err => toast.error("Erro ao criar: " + err.message),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Produto atualizado!");
      resetForm();
      utils.products.list.invalidate();
    },
    onError: err => toast.error("Erro ao atualizar: " + err.message),
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto removido do cardápio!");
      utils.products.list.invalidate();
    },
    onError: err => toast.error("Erro ao excluir: " + err.message),
  });

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: 0,
    });
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || "",
      price: typeof product.price === "string" ? parseFloat(product.price) : product.price,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price <= 0) {
      toast.error("Nome e preço são obrigatórios.");
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <Card className="p-6 shadow-xl border-orange-100 bg-white/50 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-orange-600" />
            Gestão de Cardápio
          </h2>
          <p className="text-gray-500 text-sm italic">
            Adicione, edite ou remova itens que aparecem para os seus clientes.
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 hover:bg-orange-700 gap-2 font-bold shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-orange-50/50 p-6 rounded-2xl mb-8 border border-orange-200 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-orange-800 uppercase tracking-tight">
              {editingProduct ? "✏️ Editar Item" : "✨ Novo Item no Cardápio"}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm} className="hover:bg-orange-200/50 text-orange-800">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase ml-1">
                  Nome do Produto
                </label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Frango Assado Inteiro"
                  className="h-12 border-2 border-orange-100 focus:border-orange-500 bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase ml-1">
                  Preço (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={e =>
                    setForm({ ...form, price: parseFloat(e.target.value) })
                  }
                  placeholder="0.00"
                  className="h-12 border-2 border-orange-100 focus:border-orange-500 bg-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase ml-1">
                Descrição / Detalhes
              </label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Acompanha farofa e batatas coradas..."
                rows={3}
                className="border-2 border-orange-100 focus:border-orange-500 bg-white"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 h-12 font-black shadow-lg"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Package className="w-4 h-4 mr-2" />
                )}
                {editingProduct
                  ? "Salvar Alterações"
                  : "Adicionar ao Cardápio"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="h-12 px-6 border-2 border-orange-200 text-orange-800 font-bold hover:bg-orange-50"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
          <p className="text-orange-800 font-black animate-pulse uppercase tracking-widest text-xs">Carregando Cardápio...</p>
        </div>
      ) : products?.length === 0 ? (
        <div className="text-center py-20 border-4 border-dotted border-orange-100 rounded-3xl bg-orange-50/20">
          <ShoppingCart className="w-16 h-16 text-orange-200 mx-auto mb-4" />
          <h4 className="text-lg font-black text-orange-800 uppercase">Cardápio Vazio</h4>
          <p className="text-gray-400 font-medium">Comece adicionando seus deliciosos produtos clicando no botão acima.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border-2 border-orange-50 shadow-inner">
          <table className="w-full">
            <thead className="bg-orange-50/50">
              <tr className="text-left">
                <th className="py-4 px-6 font-black text-gray-500 text-xs uppercase tracking-wider">Produto</th>
                <th className="py-4 px-6 font-black text-gray-500 text-xs uppercase tracking-wider">Preço</th>
                <th className="py-4 px-6 font-black text-gray-500 text-xs uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-50">
              {products?.map((product: any) => (
                <tr
                  key={product.id}
                  className="group hover:bg-orange-50/30 transition-colors"
                >
                  <td className="py-5 px-6">
                    <div className="font-black text-gray-800 text-lg">
                      {product.name}
                    </div>
                    {product.description && (
                      <div className="text-sm text-gray-400 italic mt-0.5 line-clamp-1">
                        {product.description}
                      </div>
                    )}
                  </td>
                  <td className="py-5 px-6">
                    <span className="font-mono font-black text-xl text-orange-600">
                      R$ {parseFloat(product.price.toString()).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-5 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                        className="h-10 w-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (
                            confirm(
                              `Tem certeza que deseja remover "${product.name}" do cardápio?`
                            )
                          ) {
                            deleteMutation.mutate({ id: product.id });
                          }
                        }}
                        className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
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
