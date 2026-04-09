import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ChefHat, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface AuthPageProps {
  onLoginSuccess: (customerId: number, nome: string, apelido: string) => void;
}

type AuthMode = "choice" | "login" | "signup";

function AdminButton() {
  const [, setLocation] = useLocation();

  return (
    <button
      type="button"
      onClick={() => setLocation("/admin")}
      className="fixed bottom-6 right-6 flex flex-col items-center justify-center gap-1 hover:opacity-70 transition-opacity cursor-pointer group"
      title="Painel Administrativo - Site Seguro"
      style={{ background: "none", border: "none" }}
    >
      <div className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center bg-white shadow-sm group-hover:shadow-md transition-shadow">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6 text-gray-400"
        >
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
        </svg>
      </div>
      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
        site seguro
      </span>
    </button>
  );
}

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("choice");
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginWhatsapp, setLoginWhatsapp] = useState("");

  // Signup state
  const [signupWhatsapp, setSignupWhatsapp] = useState("");
  const [signupNome, setSignupNome] = useState("");
  const [signupApelido, setSignupApelido] = useState("");

  // tRPC mutations
  const loginMutation = trpc.auth.loginCustomer.useMutation();
  const signupMutation = trpc.auth.signupCustomer.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginWhatsapp) {
      toast.error("Digite seu WhatsApp");
      return;
    }

    setLoading(true);
    try {
      const result = await loginMutation.mutateAsync({
        whatsapp: loginWhatsapp,
      });

      // Se por algum motivo o servidor não disparar erro mas retornar sucesso falso
      if (!result.success || !result.customer) {
        toast.error("WhatsApp não encontrado. Faça o cadastro primeiro!");
        setSignupWhatsapp(loginWhatsapp);
        setMode("signup");
        setLoading(false);
        return;
      }

      onLoginSuccess(
        result.customer.id,
        result.customer.nome,
        result.customer.apelido
      );
      toast.success(`Bem-vindo de volta, ${result.customer.apelido}! 🍗`);
    } catch (error: any) {
      console.error("Login Error:", error);
      
      // Verifica se o erro é de "Cliente não encontrado" (NOT_FOUND ou mensagem específica)
      const isNotFound = 
        error?.message?.includes("Cliente não encontrado") || 
        error?.shape?.data?.code === "NOT_FOUND";

      if (isNotFound) {
        toast.error("Número não cadastrado! Vamos te levar para a tela de cadastro... 🍗", {
          duration: 4000
        });
        
        // Pequeno delay para o usuário ler a mensagem antes de mudar a tela
        setTimeout(() => {
          setSignupWhatsapp(loginWhatsapp);
          setMode("signup");
        }, 800);
      } else {
        const errorMsg = error?.message || "Erro ao fazer login";
        toast.error("Sistema Temporariamente Indisponível. Tente novamente em instantes.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupWhatsapp || !signupNome || !signupApelido) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const result = await signupMutation.mutateAsync({
        whatsapp: signupWhatsapp,
        nome: signupNome,
        apelido: signupApelido,
      });

      if (!result.success || !result.customer) {
        toast.error("Erro ao fazer cadastro");
        return;
      }

      onLoginSuccess(
        result.customer.id,
        result.customer.nome,
        result.customer.apelido
      );
      toast.success("Cadastro realizado com sucesso! 🎉");
    } catch (error: any) {
      console.error("Signup Error:", error);
      const errorMsg = error?.message || "Erro ao fazer cadastro";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative">
      {/* Security Badge - Bottom Right */}
      <AdminButton />

      {/* Choice Mode */}
      {mode === "choice" && (
        <Card className="relative z-10 w-full max-w-md p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src="/logo-animated.gif" alt="Logo" className="w-48 h-48" />
            </div>
          </div>

          <p className="text-center text-gray-700 mb-6 font-semibold">
            Como você gostaria de continuar?
          </p>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={() => {
                setMode("login");
                setLoginWhatsapp("");
              }}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              ENTRAR
            </Button>

            <div className="relative">
              <Button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setSignupWhatsapp("");
                  setSignupNome("");
                  setSignupApelido("");
                }}
                variant="outline"
                className="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                CADASTRAR-SE
              </Button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Faça seu pedido de frango assado em poucos cliques
            </p>
          </div>
        </Card>
      )}

      {/* Login Mode */}
      {mode === "login" && (
        <Card className="relative z-10 w-full max-w-md p-8 shadow-2xl">
          <div className="text-center mb-8">
            <LogIn className="w-12 h-12 mx-auto mb-4 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-800">Fazer Login</h2>
            <p className="text-gray-600 mt-2">Digite seu WhatsApp cadastrado</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                WhatsApp
              </label>
              <Input
                type="tel"
                placeholder="(84) 99999-9999"
                value={loginWhatsapp}
                onChange={e => setLoginWhatsapp(e.target.value)}
                disabled={loading}
                className="border-2 border-orange-200 focus:border-orange-600 bg-white"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !loginWhatsapp}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? "Entrando..." : "ENTRAR"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("choice");
                setLoginWhatsapp("");
              }}
              className="text-sm text-orange-600 hover:text-orange-700 font-semibold transition-colors"
            >
              Voltar
            </button>
          </div>
        </Card>
      )}

      {/* Signup Mode */}
      {mode === "signup" && (
        <Card className="relative z-10 w-full max-w-md p-8 shadow-2xl">
          <div className="text-center mb-8">
            <UserPlus className="w-12 h-12 mx-auto mb-4 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-800">Cadastro</h2>
            <p className="text-gray-600 mt-2">
              Crie sua conta em poucos passos
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                WhatsApp
              </label>
              <Input
                type="tel"
                placeholder="(84) 99999-9999"
                value={signupWhatsapp}
                onChange={e => setSignupWhatsapp(e.target.value)}
                disabled={loading}
                className="border-2 border-orange-200 focus:border-orange-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome Completo
              </label>
              <Input
                type="text"
                placeholder="João Silva"
                value={signupNome}
                onChange={e => setSignupNome(e.target.value)}
                disabled={loading}
                className="border-2 border-orange-200 focus:border-orange-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Apelido
              </label>
              <Input
                type="text"
                placeholder="João"
                value={signupApelido}
                onChange={e => setSignupApelido(e.target.value)}
                disabled={loading}
                className="border-2 border-orange-200 focus:border-orange-600 bg-white"
              />
            </div>

            <Button
              type="submit"
              disabled={
                loading || !signupWhatsapp || !signupNome || !signupApelido
              }
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? "Cadastrando..." : "CADASTRAR"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("choice");
                setSignupWhatsapp("");
                setSignupNome("");
                setSignupApelido("");
              }}
              className="text-sm text-orange-600 hover:text-orange-700 font-semibold transition-colors"
            >
              Voltar
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
