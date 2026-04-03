import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, KeyRound, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: Token + New Password
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const loginMutation = trpc.admins.login.useMutation({
    onSuccess: data => {
      localStorage.setItem(
        "adminSession",
        JSON.stringify({
          user: data.admin.email,
          timestamp: Date.now(),
        })
      );
      toast.success("Bem-vinda, Letícia! Acesso autorizado.");
      setLocation("/admin/dashboard");
    },
    onError: error => {
      toast.error(error.message || "Erro ao realizar login");
      setPassword("");
    },
  });

  const requestResetMutation = trpc.admins.requestPasswordReset.useMutation({
    onSuccess: data => {
      if (data.whatsapp && data.resetToken) {
        toast.success("Código de recuperação gerado!");
        const message = `Olá Letícia! Seu código de recuperação do Painel é: *${data.resetToken}* 🍗🔐`;
        const whatsappUrl = `https://wa.me/${data.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
        setResetStep(2);
      } else {
        toast.info("Se o e-mail estiver correto, você receberá as instruções.");
        setResetStep(2);
      }
    },
  });

  const resetPasswordMutation = trpc.admins.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso! Agora você já pode entrar.");
      setShowReset(false);
      setResetStep(1);
    },
    onError: error => {
      toast.error(error.message || "Erro ao resetar senha");
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await loginMutation.mutateAsync({ email, password });
    setLoading(false);
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await requestResetMutation.mutateAsync({ email: resetEmail });
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await resetPasswordMutation.mutateAsync({
      email: resetEmail,
      token: resetToken,
      newPassword,
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      </div>

      <Card className="relative w-full max-w-md p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Shield className="w-16 h-16 text-orange-600" />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-amber-600 rounded-full opacity-10" />
            </div>
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Frango da Letícia
          </h1>
          <p className="text-gray-600 mt-2">
            {showReset ? "Recuperação de Acesso" : "Painel Administrativo"}
          </p>
        </div>

        {!showReset ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                E-mail Administrativo
              </label>
              <Input
                type="email"
                placeholder="ex: leticia@frangodaleticia.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                className="border-2 border-orange-200 focus:border-orange-600 bg-white"
                required
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-bold"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Input
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className="border-2 border-orange-200 focus:border-orange-600 bg-white"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Autenticando...
                </>
              ) : (
                "Entrar no Painel"
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {resetStep === 1 ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100 flex items-start">
                  <KeyRound className="w-5 h-5 mr-2 text-orange-600 shrink-0" />
                  Informe o seu e-mail administrativo para receber um código de
                  recuperação via WhatsApp.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    E-mail do Admin
                  </label>
                  <Input
                    type="email"
                    placeholder="Seu e-mail cadastrado"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    disabled={loading}
                    className="border-2 border-orange-200 focus:border-orange-600 bg-white"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !resetEmail}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg flex items-center justify-center"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Gerar Código via WhatsApp"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium py-2"
                >
                  Voltar para o Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 mb-4">
                  <p className="text-sm text-green-700 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
                    Enviamos o código para o seu WhatsApp!
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Código de 6 Dígitos
                  </label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={resetToken}
                    onChange={e => setResetToken(e.target.value)}
                    disabled={loading}
                    className="border-2 border-orange-200 text-center text-xl font-bold tracking-widest focus:border-orange-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nova Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={loading}
                    className="border-2 border-orange-200 focus:border-orange-600"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={
                    loading || resetToken.length !== 6 || newPassword.length < 6
                  }
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Confirmar Nova Senha"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setResetStep(1)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium py-2"
                >
                  Reenviar código
                </button>
              </form>
            )}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Painel Blindado e Seguro para Administradores
          </p>
        </div>
      </Card>
    </div>
  );
}
