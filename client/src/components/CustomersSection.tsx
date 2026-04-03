import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

export function CustomersSection() {
  return (
    <div className="space-y-8">
      <Card className="p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-orange-600" />
          Clientes
        </h2>
        <p className="text-center text-gray-600 py-12">
          Funcionalidade de clientes desabilitada temporariamente
        </p>
      </Card>
    </div>
  );
}
