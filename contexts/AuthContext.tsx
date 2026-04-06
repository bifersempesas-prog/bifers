import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUsuarios, Usuario } from '../hooks/useUsuarios';

interface AuthContextType {
  usuarioAtual: Usuario | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<any>;
  logout: () => void;
  temPermissao: (acoes: any[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { usuarioAtual, loading, autenticar, logout, temPermissao } = useUsuarios();

  const value: AuthContextType = {
    usuarioAtual,
    loading,
    login: autenticar,
    logout,
    temPermissao,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
