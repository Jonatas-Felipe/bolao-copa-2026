import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { User } from '../types';
import { login, register } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering && pin !== confirmPin) {
      setError('Os PINs não conferem!');
      return;
    }

    if (!name.trim() || !pin.trim()) return;

    setLoading(true);
    try {
      if (isRegistering) {
        await register(name.trim(), pin.trim());
        // Após registrar, faz login automaticamente
      }
      const { data } = await login(name.trim(), pin.trim());
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 409) {
        setError('Nome de usuário já existe');
      } else if (err.response?.status === 401) {
        setError('Credenciais inválidas');
      } else if (err.response?.status === 400) {
        setError(msg || 'PIN deve ter no mínimo 4 caracteres');
      } else {
        setError(msg || 'Erro ao conectar com o servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-br-blue flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-br-green rounded-full blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] bg-br-yellow rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 relative z-10 border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-br-green rounded-full flex items-center justify-center mb-4 shadow-lg shadow-br-green/30">
            <Trophy className="text-br-yellow w-8 h-8" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 text-center">
            Bolão Copa <span className="text-br-green">26</span>
          </h1>
          <p className="text-gray-500 mt-2 text-center text-sm">
            {isRegistering ? 'Crie sua conta para participar' : 'Faça seu palpite e concorra ao topo do ranking'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome de Usuário
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-br-green focus:ring-2 focus:ring-br-green/20 outline-none transition-all placeholder:text-gray-400"
              placeholder="Ex: João Silva"
              required
            />
          </div>
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
              PIN (Senha)
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-br-green focus:ring-2 focus:ring-br-green/20 outline-none transition-all placeholder:text-gray-400 tracking-[0.2em]"
              placeholder="••••"
              required
            />
          </div>

          {isRegistering && (
            <div>
              <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar PIN
              </label>
              <input
                id="confirmPin"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-br-green focus:ring-2 focus:ring-br-green/20 outline-none transition-all placeholder:text-gray-400 tracking-[0.2em]"
                placeholder="••••"
                required
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-br-green hover:bg-br-green-dark text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-br-green/30 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              isRegistering ? 'Cadastrar' : 'Entrar no Bolão'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setPin('');
              setConfirmPin('');
            }}
            className="text-sm font-medium text-br-blue hover:underline"
          >
            {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}
