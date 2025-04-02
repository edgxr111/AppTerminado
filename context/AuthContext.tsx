import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, TABLES } from '../supabase';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import type { Usuario } from '../supabase';

type AuthContextType = {
  user: Usuario | null;
  loading: boolean;
  signUp: (nombre: string, apellido: string, usuario: string, gmail: string, contrasena: string) => Promise<void>;
  signIn: (gmail: string, contrasena: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const hashPassword = async (password: string): Promise<string> => {
    try {
      // Verificar si crypto.subtle está disponible
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } else {
        // Alternativa simple para entornos donde crypto.subtle no está disponible
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
          const char = password.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convertir a 32 bits
        }
        // Convertir a string hexadecimal y asegurar que tenga al menos 8 caracteres
        return Math.abs(hash).toString(16).padStart(8, '0');
      }
    } catch (error) {
      console.error('Error al hashear la contraseña:', error);
      // Usar la alternativa simple en caso de error
      let hash = 0;
      for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    }
  };

  const signUp = async (nombre: string, apellido: string, usuario: string, gmail: string, contrasena: string) => {
    try {
      const hashedPassword = await hashPassword(contrasena);

      // 1. Crear usuario en la tabla usuarios
      const { data: userData, error: userError } = await supabase
        .from(TABLES.USUARIOS)
        .insert([{
          nombre,
          apellido,
          usuario,
          gmail,
          contrasena: hashedPassword
        }])
        .select()
        .single();

      if (userError) throw userError;

      // 2. Crear billetera para el usuario
      const { error: walletError } = await supabase
        .from(TABLES.BILLETERA)
        .insert([{
          usuario_id: userData.id,
          saldo: 0
        }]);

      if (walletError) {
        // Si falla la creación de la billetera, eliminar el usuario
        await supabase.from(TABLES.USUARIOS).delete().eq('id', userData.id);
        throw walletError;
      }

      setUser(userData);
    } catch (error) {
      console.error('Error en el registro:', error);
      throw error;
    }
  };

  const signIn = async (gmail: string, contrasena: string) => {
    try {
      // Obtener el usuario por gmail primero
      const { data: user, error: userError } = await supabase
        .from(TABLES.USUARIOS)
        .select('*')
        .eq('gmail', gmail)
        .single();

      if (userError || !user) {
        throw new Error('Credenciales incorrectas');
      }

      // Intentar con el nuevo método de hash
      const newHashedPassword = await hashPassword(contrasena);
      
      // Si coincide con el nuevo hash, permitir el acceso
      if (user.contrasena === newHashedPassword) {
        setUser(user);
        return;
      }

      // Si no coincidió con el nuevo hash, intentar con el método antiguo
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(contrasena);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const oldHashedPassword = Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (user.contrasena === oldHashedPassword) {
          // Si coincide con el hash antiguo, actualizar a nuevo hash
          const { error: updateError } = await supabase
            .from(TABLES.USUARIOS)
            .update({ contrasena: newHashedPassword })
            .eq('id', user.id);

          if (!updateError) {
            setUser(user);
            return;
          }
        }
      } catch (hashError) {
        console.error('Error al verificar hash antiguo:', hashError);
      }

      // Si llegamos aquí, ningún método funcionó
      throw new Error('Credenciales incorrectas');

    } catch (error) {
      console.error('Error en inicio de sesión:', error);
      throw error;
    }
  };

  const signOut = async () => {
    setUser(null);
  };

  useEffect(() => {
    if (!user && !loading) {
      router.replace('/auth/login');
    }
  }, [user, loading]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
