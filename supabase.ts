import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://stmdseksfxqiibmhuqoh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0bWRzZWtzZnhxaWlibWh1cW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTE5NTQsImV4cCI6MjA1ODU4Nzk1NH0.eUawIOvNsMzB6G7396T9UFArNrHJTj0YLW41YM3S_TA';

// Tipos de datos para las tablas
export type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  usuario: string;
  gmail: string;
  contrasena: string;
};

export type Categoria = {
  id: string;
  nombre: string;
  tipo: 'ingreso' | 'egreso';
  icono?: string;
};

export type Billetera = {
  id: string;
  usuario_id: string;
  saldo: number;
};

export type Transaccion = {
  id: string;
  usuario_id: string;
  categoria_id: string;
  monto: number;
  tipo: 'ingreso' | 'egreso';
  descripcion?: string;
  fecha: string;
};

// Nombres de las tablas
export const TABLES = {
  USUARIOS: 'usuarios',
  CATEGORIAS: 'categorias',
  BILLETERA: 'billetera',
  TRANSACCIONES: 'transacciones'
} as const;

// Exportar el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

// Funciones de ayuda para interactuar con la base de datos
export const db = {
  // Usuarios
  async registrarUsuario(userData: Omit<Usuario, 'id'>) {
    const { data, error } = await supabase
      .from(TABLES.USUARIOS)
      .insert(userData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async obtenerUsuario(id: string) {
    const { data, error } = await supabase
      .from(TABLES.USUARIOS)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Billetera
  async obtenerBilletera(usuario_id: string) {
    const { data, error } = await supabase
      .from(TABLES.BILLETERA)
      .select('*')
      .eq('usuario_id', usuario_id)
      .single();
    if (error) throw error;
    return data;
  },

  // Transacciones
  async crearTransaccion(transaccionData: Omit<Transaccion, 'id' | 'fecha'>) {
    const { data, error } = await supabase
      .from(TABLES.TRANSACCIONES)
      .insert(transaccionData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async obtenerTransacciones(usuario_id: string) {
    const { data, error } = await supabase
      .from(TABLES.TRANSACCIONES)
      .select(`
        *,
        categorias (*)
      `)
      .eq('usuario_id', usuario_id)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Categorías
  async obtenerCategorias() {
    const { data, error } = await supabase
      .from(TABLES.CATEGORIAS)
      .select('*');
    if (error) throw error;
    return data;
  }
};
