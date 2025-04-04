import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { showError, showInfo, showSuccess } from '../utils/toast';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES } from '../../supabase';
import type { Transaccion, Categoria } from '../../supabase';
import { useRouter } from 'expo-router';

type MaterialIconName = 'attach-money' | 'work' | 'business' | 'card-giftcard' | 'account-balance' | 'savings' | 'more-horiz' | 'add' | 'restaurant' | 'directions-car' | 'movie' | 'build' | 'shopping-cart' | 'person' | 'logout' | 'arrow-upward' | 'arrow-downward' | 'delete' | 'trending-down' | 'compare-arrows';

interface Categoria {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'egreso';
}

interface CategoriaExtendida extends Categoria {
  icono: MaterialIconName;
  color: string;
  descripcion: string;
}

type TipoTransaccion = 'ingreso' | 'egreso';

type IconosPorCategoria = {
  [key in TipoTransaccion]: {
    [key: string]: MaterialIconName;
  };
};

type ColoresPorCategoria = {
  [key in TipoTransaccion]: {
    [key: string]: string;
  };
};

type DescripcionesPorCategoria = {
  [key in TipoTransaccion]: {
    [key: string]: string;
  };
};

interface TransaccionConCategoria {
  id: number;
  usuario_id: number;
  categoria_id: number;
  monto: number;
  tipo: 'ingreso' | 'egreso';
  fecha: string;
  descripcion?: string;
  categorias: Categoria;
}

// Categorías predefinidas
const CATEGORIAS_DEFAULT = [
  { nombre: 'Salario', tipo: 'ingreso' },
  { nombre: 'Inversiones', tipo: 'ingreso' },
  { nombre: 'Regalos', tipo: 'ingreso' },
  { nombre: 'Freelance', tipo: 'ingreso' },
  { nombre: 'Ahorros', tipo: 'ingreso' },
  { nombre: 'Otros', tipo: 'ingreso' },
  { nombre: 'Comida', tipo: 'egreso' },
  { nombre: 'Transporte', tipo: 'egreso' },
  { nombre: 'Entretenimiento', tipo: 'egreso' },
  { nombre: 'Servicios', tipo: 'egreso' },
  { nombre: 'Compras', tipo: 'egreso' },
  { nombre: 'Otros', tipo: 'egreso' },
];

const mostrarMensaje = async (titulo: string, mensaje: string, tipo: 'success' | 'error' | 'warning' = 'success') => {
  showInfo('Información', mensaje);
};

const confirmarEliminacion = async (monto: number): Promise<boolean> => {
  return new Promise((resolve) => {
    showInfo('¿Eliminar transacción?', `Estás a punto de eliminar una transacción por: $${monto.toFixed(2)}\n\nEsta acción no se puede deshacer`);
    resolve(true);
  });
};

const mostrarRecomendacionesSaldoNegativo = async (saldoActual: number) => {
  showInfo('Recomendaciones', 'Para mejorar tu situación financiera, considera:\n1. Reducir gastos no esenciales\n2. Buscar fuentes adicionales de ingreso\n3. Crear un presupuesto mensual\n4. Establecer metas de ahorro');
};

const mostrarAdvertenciaSaldoNegativo = async (monto: number, saldo: number): Promise<boolean> => {
  return new Promise((resolve) => {
    showInfo('Advertencia de Saldo', `El gasto excede tu saldo actual:\n\nMonto del gasto: $${monto.toFixed(2)}\nSaldo actual: $${saldo.toFixed(2)}\n\n¿Desea continuar? Tu saldo quedará en negativo.`);
    resolve(true);
  });
};

export default function WelcomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnimation = React.useRef(new Animated.Value(0)).current;
  const menuAnimation = React.useRef(new Animated.Value(0)).current;
  const [menuVisible, setMenuVisible] = useState(false);
  const [insightsVisible, setInsightsVisible] = useState(false);
  const insightsAnimation = React.useRef(new Animated.Value(0)).current;
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoTransaccion>('ingreso');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<Categoria | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [transacciones, setTransacciones] = useState<TransaccionConCategoria[]>([]);
  const [saldo, setSaldo] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [datosIngresos, setDatosIngresos] = useState<{ categoria: string; monto: number; color: string }[]>([]);
  const [datosEgresos, setDatosEgresos] = useState<{ categoria: string; monto: number; color: string }[]>([]);

  // Definir los iconos y colores por tipo
  const iconosPorTipo: { [key: string]: { [key: string]: MaterialIconName } } = {
    ingreso: {
      'Salario': 'work',
      'Inversiones': 'business',
      'Regalos': 'card-giftcard',
      'Freelance': 'attach-money',
      'Ahorros': 'savings',
      'Otros': 'more-horiz'
    },
    egreso: {
      'Comida': 'restaurant',
      'Transporte': 'directions-car',
      'Entretenimiento': 'movie',
      'Servicios': 'build',
      'Compras': 'shopping-cart',
      'Otros': 'more-horiz'
    }
  };

  const coloresPorTipo: { [key: string]: { [key: string]: string } } = {
    ingreso: {
      'Salario': '#4CAF50',
      'Inversiones': '#2196F3',
      'Regalos': '#9C27B0',
      'Freelance': '#FF9800',
      'Ahorros': '#00BCD4',
      'Otros': '#607D8B'
    },
    egreso: {
      'Comida': '#FF6B6B',
      'Transporte': '#4ECDC4',
      'Entretenimiento': '#45B7D1',
      'Servicios': '#96CEB4',
      'Compras': '#D4A5A5',
      'Otros': '#6B717E'
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (user) {
      inicializarCategorias();
      cargarDatos();
      obtenerSaldoActual();
    }
  }, [user]);

  const inicializarCategorias = async () => {
    try {
      // Verificar si ya existen categorías
      const { data: categoriasExistentes, error: errorConsulta } = await supabase
        .from(TABLES.CATEGORIAS)
        .select('*');

      if (errorConsulta) throw errorConsulta;

      // Si no hay categorías, insertar las predefinidas
      if (!categoriasExistentes || categoriasExistentes.length === 0) {
        const { error: errorInsercion } = await supabase
          .from(TABLES.CATEGORIAS)
          .insert(CATEGORIAS_DEFAULT);

        if (errorInsercion) throw errorInsercion;
        console.log('Categorías predefinidas insertadas correctamente');
      }
    } catch (error) {
      console.error('Error inicializando categorías:', error);
      await mostrarMensaje('Error', 'No se pudieron inicializar las categorías', 'error');
    }
  };

  const cargarDatos = async () => {
    try {
      setLoadingDatos(true);
      const { data: transacciones, error: transaccionesError } = await supabase
        .from('transacciones')
        .select(`
          *,
          categorias (
            id,
            nombre,
            tipo
          )
        `)
        .eq('usuario_id', user?.id)
        .order('fecha', { ascending: false });

      if (transaccionesError) throw transaccionesError;

      setTransacciones(transacciones || []);

      // Actualizar categorías si es necesario
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre', { ascending: true });

      if (categoriasError) throw categoriasError;

      setCategorias(categoriasData || []);

    } catch (error) {
      console.error('Error cargando datos:', error);
      await mostrarMensaje('Error', 'No se pudieron cargar los datos', 'error');
    } finally {
      setLoadingDatos(false);
    }
  };

  const obtenerSaldoActual = async () => {
    try {
      // Obtener todas las transacciones del usuario
      const { data: transacciones, error } = await supabase
        .from('transacciones')
        .select('*')
        .eq('usuario_id', user?.id);

      if (error) {
        console.error('Error obteniendo saldo:', error);
        return;
      }

      // Calcular el saldo sumando ingresos y restando egresos
      const nuevoSaldo = transacciones.reduce((acc, trans) => {
        if (trans.tipo === 'ingreso') {
          return acc + trans.monto;
        } else {
          return acc - trans.monto;
        }
      }, 0);

      setSaldo(nuevoSaldo);

      // Mostrar recomendaciones si el saldo es negativo
      if (nuevoSaldo < 0) {
        await mostrarRecomendacionesSaldoNegativo(nuevoSaldo);
      }
    } catch (error) {
      console.error('Error calculando saldo:', error);
    }
  };

  const procesarTransacciones = () => {
    const ingresosPorCategoria: { [key: string]: number } = {};
    const egresosPorCategoria: { [key: string]: number } = {};

    transacciones.forEach(transaccion => {
      const categoria = transaccion.categorias.nombre;
      const monto = transaccion.monto;

      if (transaccion.tipo === 'ingreso') {
        ingresosPorCategoria[categoria] = (ingresosPorCategoria[categoria] || 0) + monto;
      } else {
        egresosPorCategoria[categoria] = (egresosPorCategoria[categoria] || 0) + monto;
      }
    });

    const coloresIngresos = ['#4CAF50', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E9'];
    const coloresEgresos = ['#FF6B6B', '#FF8A8A', '#FFA9A9', '#FFC8C8', '#FFE7E7'];

    const datosIngresos = Object.entries(ingresosPorCategoria).map(([categoria, monto], index) => ({
      categoria,
      monto,
      color: coloresIngresos[index % coloresIngresos.length],
    }));

    const datosEgresos = Object.entries(egresosPorCategoria).map(([categoria, monto], index) => ({
      categoria,
      monto,
      color: coloresEgresos[index % coloresEgresos.length],
    }));

    setDatosIngresos(datosIngresos);
    setDatosEgresos(datosEgresos);
  };

  useEffect(() => {
    procesarTransacciones();
  }, [transacciones]);

  const renderGraficoExponencial = (datos: { categoria: string; monto: number; color: string }[], total: number) => {
    const datosOrdenados = [...datos].sort((a, b) => b.monto - a.monto);
    const maxMonto = Math.max(...datosOrdenados.map(d => d.monto));
    const windowWidth = Dimensions.get('window').width;
    const maxBars = Math.min(6, datosOrdenados.length);
    const alturaMaxima = 150;
    
    let datosAgrupados = datosOrdenados;
    if (datosOrdenados.length > maxBars) {
      const principales = datosOrdenados.slice(0, maxBars - 1);
      const otros = datosOrdenados.slice(maxBars - 1);
      const montoOtros = otros.reduce((acc, curr) => acc + curr.monto, 0);
      
      datosAgrupados = [
        ...principales,
        {
          categoria: 'Otros',
          monto: montoOtros,
          color: '#9E9E9E'
        }
      ];
    }

    return (
      <View>
        <View style={styles.barraContainer}>
          {datosAgrupados.map((item, index) => {
            const porcentaje = (item.monto / total) * 100;
            const altura = Math.max(30, (porcentaje * alturaMaxima) / 100);
            
            return (
              <View key={index} style={styles.barraWrapper}>
                <Text style={styles.barraPorcentaje}>{porcentaje.toFixed(1)}%</Text>
                <View style={styles.barraContent}>
                  <View
                    style={[
                      styles.barra,
                      {
                        height: altura,
                        backgroundColor: item.color,
                        width: 28
                      }
                    ]}
                  />
                </View>
                <Text style={styles.barraLabel}>
                  {item.categoria}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    Animated.timing(slideAnimation, {
      toValue: 1.1,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setModalVisible(false);
      slideAnimation.setValue(0);
      setTipoSeleccionado('ingreso');
      setCategoriaSeleccionada(null);
      setMonto('');
      setDescripcion('');
    });
  };

  const agregarTransaccion = async () => {
    if (!monto || !categoriaSeleccionada) {
      await mostrarMensaje('Error', 'Por favor ingresa el monto y selecciona una categoría', 'error');
      return;
    }

    if (isNaN(Number(monto)) || Number(monto) <= 0) {
      await mostrarMensaje('Error', 'Por favor ingresa un monto válido', 'error');
      return;
    }

    const montoNumerico = Number(monto);

    try {
      setLoading(true);
      const nuevoSaldo = tipoSeleccionado === 'ingreso' 
        ? saldo + montoNumerico 
        : saldo - montoNumerico;

      // Validar que no se pueda hacer un egreso mayor al saldo actual
      if (tipoSeleccionado === 'egreso' && montoNumerico > saldo) {
        // Primero cerrar el modal de agregar transacción
        handleCloseModal();
        
        const confirmado = await mostrarAdvertenciaSaldoNegativo(montoNumerico, saldo);
        if (!confirmado) {
          setLoading(false);
          return;
        }
      } else {
        // Si no hay advertencia, cerrar el modal normalmente
        handleCloseModal();
      }

      // Iniciar transacción
      const { error: transaccionError } = await supabase.rpc('crear_transaccion', {
        p_usuario_id: user?.id,
        p_categoria_id: categoriaSeleccionada.id,
        p_monto: montoNumerico,
        p_tipo: tipoSeleccionado,
        p_descripcion: descripcion || null
      });

      if (transaccionError) throw transaccionError;
      
      // Actualizar datos
      await Promise.all([
        cargarDatos(),
        obtenerSaldoActual()
      ]);

      // Mostrar mensaje de éxito después de que todo esté actualizado
      await mostrarMensaje('¡Éxito!', `${tipoSeleccionado === 'ingreso' ? 'Ingreso' : 'Gasto'} agregado correctamente`, 'success');
    } catch (error) {
      console.error('Error agregando transacción:', error);
      await mostrarMensaje('Error', `No se pudo agregar el ${tipoSeleccionado === 'ingreso' ? 'ingreso' : 'gasto'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const eliminarTransaccion = async (usuarioId: number, transaccionId: number, monto: number) => {
    try {
      setLoading(true);
      console.log('Intentando eliminar transacción:', { usuarioId, transaccionId });

      // Verificar que el usuario tenga permiso para eliminar esta transacción
      const { data: transaccion, error: checkError } = await supabase
        .from('transacciones')
        .select('*')
        .eq('id', transaccionId)
        .eq('usuario_id', usuarioId)
        .single();

      if (checkError || !transaccion) {
        console.error('Error verificando permisos:', checkError);
        await mostrarMensaje('Error de permisos', 'No tienes permiso para eliminar esta transacción', 'error');
        return;
      }

      // Llamar a la función RPC para eliminar la transacción
      const { error } = await supabase.rpc('eliminar_transaccion', {
        p_usuario_id: usuarioId,
        p_transaccion_id: transaccionId
      });
  
      if (error) {
        console.error('Error al eliminar transacción:', error);
        await mostrarMensaje('Error', 'No se pudo eliminar la transacción. Intenta nuevamente.', 'error');
        return;
      }
  
      // Actualizar los datos incluyendo el saldo
      await Promise.all([
        cargarDatos(),          // Actualiza las transacciones
        obtenerSaldoActual(),   // Actualiza el saldo
      ]);
      
      await mostrarMensaje('¡Éxito!', 'La transacción ha sido eliminada correctamente', 'success');
    } catch (error) {
      console.error('Error inesperado al eliminar transacción:', error);
      await mostrarMensaje('Error', 'Ocurrió un error al eliminar la transacción', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderTransaccion = ({ item }: { item: TransaccionConCategoria }) => {
    const icono = iconosPorTipo[item.tipo]?.[item.categorias.nombre] || 'more-horiz';
    const color = coloresPorTipo[item.tipo]?.[item.categorias.nombre] || '#607D8B';
    const esIngreso = item.tipo === 'ingreso';
    
    return (
      <View style={styles.transaccionItem}>
        <View style={[styles.transaccionIcono, { backgroundColor: color + '20' }]}>
          <MaterialIcons 
            name={icono}
            size={24} 
            color={color} 
          />
        </View>
        <View style={styles.transaccionInfo}>
          <Text style={styles.transaccionCategoria}>
            {item.categorias.nombre}
          </Text>
          {item.descripcion && (
            <Text style={styles.transaccionDescripcion}>{item.descripcion}</Text>
          )}
          <Text style={styles.transaccionFecha}>
            {new Date(item.fecha).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.transaccionAcciones}>
          <Text style={[
            styles.transaccionMonto, 
            { color: esIngreso ? '#4CAF50' : '#FF6B6B' }
          ]}>
            {esIngreso ? '+' : '-'}${item.monto.toFixed(2)}
          </Text>
          <TouchableOpacity
            style={[styles.deleteButton, { padding: 8 }]}
            onPress={async () => {
              try {
                if (!user?.id) {
                  await mostrarMensaje('Error', 'Usuario no identificado', 'error');
                  return;
                }

                const usuarioId = Number(user.id);
                const transaccionId = item.id;

                if (isNaN(usuarioId)) {
                  await mostrarMensaje('Error', 'Error con el ID del usuario', 'error');
                  return;
                }

                const confirmado = await confirmarEliminacion(item.monto);
                if (confirmado) {
                  await eliminarTransaccion(usuarioId, transaccionId, item.monto);
                }
              } catch (error) {
                console.error('Error en el proceso de eliminación:', error);
                await mostrarMensaje('Error', 'Ocurrió un error al procesar la eliminación', 'error');
              }
            }}
          >
            <MaterialIcons 
              name="delete" 
              size={24} 
              color="#FF6B6B"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      await mostrarMensaje('Error', 'No se pudo cerrar la sesión', 'error');
    }
  };

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(menuAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.spring(menuAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      }).start();
    }
  };

  const toggleInsights = () => {
    if (insightsVisible) {
      Animated.timing(insightsAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start(() => setInsightsVisible(false));
    } else {
      setInsightsVisible(true);
      Animated.timing(insightsAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  };

  const cargarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre');

      if (error) throw error;

      if (data) {
        setCategorias(data);
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      await mostrarMensaje('Error', 'No se pudieron cargar las categorías', 'error');
    }
  };

  useEffect(() => {
    if (user) {
      cargarCategorias();
      cargarDatos();
      obtenerSaldoActual();
    }
  }, [user]);

  const categoriasFiltradas = categorias.filter(cat => cat.tipo === tipoSeleccionado);
  console.log('Tipo seleccionado:', tipoSeleccionado);
  console.log('Categorías filtradas:', categoriasFiltradas);

  const renderCategoriaItem = ({ item }: { item: Categoria }) => {
    const icono = iconosPorTipo[tipoSeleccionado]?.[item.nombre] || 'more-horiz';
    const color = coloresPorTipo[tipoSeleccionado]?.[item.nombre] || '#607D8B';
    const isSelected = categoriaSeleccionada?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.categoriaItem,
          isSelected && styles.categoriaItemSelected
        ]}
        onPress={() => setCategoriaSeleccionada(item)}
      >
        <View style={[styles.categoriaIcono, { backgroundColor: color + '20' }]}>
          <MaterialIcons name={icono} size={24} color={color} />
        </View>
        <Text style={[
          styles.categoriaNombre,
          isSelected && styles.categoriaNombreSelected
        ]}>
          {item.nombre}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderModalContent = () => {
    return (
      <View style={styles.modalContent}>
        <View style={styles.tipoTransaccionContainer}>
          <TouchableOpacity
            style={[
              styles.tipoTransaccionButton,
              tipoSeleccionado === 'ingreso'
                ? styles.tipoTransaccionButtonIngreso
                : styles.tipoTransaccionButtonUnselected,
            ]}
            onPress={() => setTipoSeleccionado('ingreso')}
          >
            <MaterialIcons
              name="arrow-upward"
              size={24}
              color={tipoSeleccionado === 'ingreso' ? '#fff' : '#495057'}
            />
            <Text
              style={[
                styles.tipoTransaccionText,
                tipoSeleccionado === 'ingreso'
                  ? styles.tipoTransaccionTextSelected
                  : styles.tipoTransaccionTextUnselected,
              ]}
            >
              Ingreso
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tipoTransaccionButton,
              tipoSeleccionado === 'egreso'
                ? styles.tipoTransaccionButtonEgreso
                : styles.tipoTransaccionButtonUnselected,
            ]}
            onPress={() => setTipoSeleccionado('egreso')}
          >
            <MaterialIcons
              name="arrow-downward"
              size={24}
              color={tipoSeleccionado === 'egreso' ? '#fff' : '#495057'}
            />
            <Text
              style={[
                styles.tipoTransaccionText,
                tipoSeleccionado === 'egreso'
                  ? styles.tipoTransaccionTextSelected
                  : styles.tipoTransaccionTextUnselected,
              ]}
            >
              Egreso
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoriasContainer}>
          <Text style={styles.categoriasTitle}>Selecciona una categoría</Text>
          <FlatList
            data={categoriasFiltradas}
            renderItem={renderCategoriaItem}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            nestedScrollEnabled={true}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Monto"
          value={monto}
          onChangeText={(text) => {
            setMonto(text);
          }}
          keyboardType="numeric"
        />

        <TextInput
          style={[styles.input, styles.inputDescripcion]}
          placeholder="Descripción (opcional)"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.addButton,
            (!monto || !categoriaSeleccionada) && styles.addButtonDisabled,
            { backgroundColor: tipoSeleccionado === 'ingreso' ? '#4CAF50' : '#FF6B6B' }
          ]}
          onPress={agregarTransaccion}
          disabled={loading || !monto || !categoriaSeleccionada}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.addButtonText}>
              Agregar {tipoSeleccionado === 'ingreso' ? 'Ingreso' : 'Gasto'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  useEffect(() => {
    if (modalVisible) {
      Animated.spring(slideAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,    // Reducimos la tensión para una entrada más suave
        friction: 10,   // Aumentamos la fricción para evitar el rebote
        velocity: 3     // Velocidad inicial controlada
      }).start();
    }
  }, [modalVisible]);

  const getSpendingInsights = () => {
    if (!datosEgresos.length) return [];

    const insights = [];
    const datosOrdenados = [...datosEgresos].sort((a, b) => b.monto - a.monto);
    const mayorGasto = datosOrdenados[0];
    const totalGastos = datosOrdenados.reduce((acc, curr) => acc + curr.monto, 0);
    const porcentaje = ((mayorGasto.monto / totalGastos) * 100).toFixed(1);

    insights.push({
      titulo: 'Mayor gasto',
      mensaje: `Tu categoría de mayor gasto es ${mayorGasto.categoria} (${porcentaje}% del total)`,
      icon: (iconosPorTipo.egreso[mayorGasto.categoria] || 'trending-down') as MaterialIconName,
      color: coloresPorTipo.egreso[mayorGasto.categoria] || '#FF6B6B'
    });

    if (datosOrdenados.length >= 2) {
      const segundoMayor = datosOrdenados[1];
      const diferencia = ((mayorGasto.monto - segundoMayor.monto) / mayorGasto.monto * 100).toFixed(1);
      
      insights.push({
        titulo: 'Comparación',
        mensaje: `Gastas ${diferencia}% más en ${mayorGasto.categoria} que en ${segundoMayor.categoria}`,
        icon: 'compare-arrows' as MaterialIconName,
        color: '#FFA726'
      });
    }

    return insights;
  };

  return (
    <View style={styles.container}>
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeHeader}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeEmoji}>✨</Text>
            <Text style={styles.welcomeText}>
              ¡Bienvenido, <Text style={styles.userName}>{user?.usuario}</Text>!
            </Text>
            <Text style={styles.welcomeSubtext}>Tu asistente financiero personal</Text>
          </View>
          <TouchableOpacity
            style={styles.userButton}
            onPress={toggleMenu}
          >
            <MaterialIcons name="person" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.insightsButton}
              onPress={toggleInsights}
            >
              <MaterialIcons name="insights" size={24} color="#6B52AE" />
            </TouchableOpacity>
            
            {saldo < 0 && (
              <TouchableOpacity
                style={[styles.insightsButton, { marginLeft: 8, backgroundColor: '#fff3e0' }]}
                onPress={() => mostrarRecomendacionesSaldoNegativo(saldo)}
              >
                <MaterialIcons name="warning" size={24} color="#ff9800" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.saldoContainer}>
            <View style={styles.saldoLabelContainer}>
              <MaterialIcons name="account-balance-wallet" size={14} color="#6B52AE" style={styles.saldoIcon} />
              <Text style={styles.saldoLabel}>Saldo actual</Text>
            </View>
            <Text style={[styles.saldoMonto, { color: saldo >= 0 ? '#4CAF50' : '#FF6B6B' }]}>
              ${saldo.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {menuVisible && (
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={toggleMenu}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              {
                transform: [
                  { scale: menuAnimation },
                  {
                    translateY: menuAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
                opacity: menuAnimation,
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <View style={styles.avatarContainer}>
                <MaterialIcons name="person" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.menuName}>{user?.nombre} {user?.apellido}</Text>
              <Text style={styles.menuEmail}>{user?.gmail}</Text>
            </View>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <MaterialIcons name="logout" size={24} color="#FFF" />
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {insightsVisible && (
        <Animated.View
          style={[
            styles.insightsContainer,
            {
              opacity: insightsAnimation,
              transform: [{
                translateY: insightsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.insightsHeader}>
            <Text style={styles.insightsTitle}>Recomendaciones</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={toggleInsights}
            >
              <MaterialIcons name="close" size={24} color="#666666" />
            </TouchableOpacity>
          </View>
          {getSpendingInsights().map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: insight.color + '20' }]}>
                <MaterialIcons name={insight.icon} size={24} color={insight.color} />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.titulo}</Text>
                <Text style={styles.insightMessage}>{insight.mensaje}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      )}

      <ScrollView style={styles.content}>
        {loadingDatos ? (
          <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
        ) : (
          <View style={styles.graficosContainer}>
            <View style={styles.graficoSeccion}>
              <Text style={[styles.tituloGrafico, { color: '#2E7D32' }]}>Ingresos</Text>
              {datosIngresos.length > 0 ? (
                <View style={styles.graficoContent}>
                  {renderGraficoExponencial(
                    datosIngresos,
                    datosIngresos.reduce((acc, curr) => acc + curr.monto, 0)
                  )}
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                  <MaterialIcons name="show-chart" size={48} color="#CCC" />
                  <Text style={styles.noDataText}>No hay datos de ingresos</Text>
                </View>
              )}
            </View>

            <View style={styles.graficoSeccion}>
              <Text style={[styles.tituloGrafico, { color: '#C62828' }]}>Egresos</Text>
              {datosEgresos.length > 0 ? (
                <View style={styles.graficoContent}>
                  {renderGraficoExponencial(
                    datosEgresos,
                    datosEgresos.reduce((acc, curr) => acc + curr.monto, 0)
                  )}
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                  <MaterialIcons name="show-chart" size={48} color="#CCC" />
                  <Text style={styles.noDataText}>No hay datos de egresos</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <FlatList
          data={transacciones}
          renderItem={renderTransaccion}
          keyExtractor={item => item.id.toString()}
          style={styles.lista}
          contentContainerStyle={styles.listaContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="account-balance-wallet" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No hay transacciones registradas</Text>
              <Text style={styles.emptySubtext}>Toca el botón + para agregar una</Text>
            </View>
          }
        />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenModal}
      >
        <MaterialIcons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{
                  translateY: slideAnimation.interpolate({
                    inputRange: [0, 1, 1.1],
                    outputRange: [600, 0, 800]
                  })
                }]
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Transacción</Text>
              <TouchableOpacity 
                onPress={handleCloseModal}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {renderModalContent()}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  welcomeContainer: {
    backgroundColor: '#6B52AE',
    padding: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    marginBottom: 24,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeEmoji: {
    fontSize: 36,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  welcomeText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  welcomeSubtext: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    letterSpacing: 0.25,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  userName: {
    fontWeight: '800',
    color: '#FFD700',
  },
  userButton: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightsButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 82, 174, 0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saldoContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  saldoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 82, 174, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  saldoIcon: {
    marginRight: 4,
  },
  saldoLabel: {
    fontSize: 14,
    color: '#6B52AE',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  saldoMonto: {
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  graficosContainer: {
    padding: 16,
    marginBottom: 16,
  },
  graficoSeccion: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tituloGrafico: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  graficoContent: {
    minHeight: 150,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6B52AE',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 280,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  menuHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  menuEmail: {
    fontSize: 14,
    color: '#757575',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5252',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  lista: {
    flex: 1,
    marginTop: 24,
  },
  listaContent: {
    paddingBottom: 80,
  },
  transaccionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transaccionIcono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transaccionInfo: {
    flex: 1,
  },
  transaccionCategoria: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  transaccionFecha: {
    fontSize: 14,
    color: '#757575',
  },
  transaccionMonto: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 'auto',
    width: '100%',
    maxHeight: '90%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  tipoTransaccionContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  tipoTransaccionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  tipoTransaccionButtonIngreso: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  tipoTransaccionButtonEgreso: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  tipoTransaccionButtonUnselected: {
    backgroundColor: '#fff',
    borderColor: '#dee2e6',
  },
  tipoTransaccionText: {
    fontSize: 16,
    marginLeft: 8,
  },
  tipoTransaccionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  tipoTransaccionTextUnselected: {
    color: '#495057',
  },
  categoriasContainer: {
    marginBottom: 24,
  },
  categoriasTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F5F6F8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputDescripcion: {
    height: 100,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#6B52AE',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  graficoSeccion: {
    marginBottom: 24,
  },
  tituloGrafico: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  graficoWrapper: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  graficoExponencial: {
    position: 'relative',
    marginBottom: 24,
    backgroundColor: '#fff',
    height: 180,
    width: '100%',
    paddingHorizontal: 5,
  },
  graficoContent: {
    width: '100%',
  },
  ejeX: {
    position: 'absolute',
    height: 2, // Haciendo el eje más grueso
    backgroundColor: '#9E9E9E', // Color más oscuro para mejor visibilidad
    bottom: 0,
    left: 0,
    right: 0,
  },
  ejeY: {
    position: 'absolute',
    width: 2, // Haciendo el eje más grueso
    backgroundColor: '#9E9E9E', // Color más oscuro para mejor visibilidad
    left: 20,
    top: 0,
    bottom: 0,
  },
  lineaVertical: {
    position: 'absolute',
    width: 12, // Barras más delgadas
    opacity: 0.85,
  },
  puntoDatos: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  etiquetaCategoria: {
    position: 'absolute',
    width: 40, // Etiquetas más compactas
    textAlign: 'center',
    fontSize: 10, // Texto más pequeño
    fontWeight: '600',
    color: '#424242',
    transform: [{ rotate: '-45deg' }],
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  leyendaGrafico: {
    width: '100%',
  },
  itemLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  colorLeyenda: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  textoLeyenda: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  porcentajeLeyenda: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A237E',
    marginLeft: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  noDataText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightsContainer: {
    position: 'absolute',
    top: 220,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1000,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  transaccionDescripcion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  transaccionAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
  },
  categoriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  categoriaItemSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  categoriaNombreSelected: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  categoriaIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoriaNombre: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
  },
  categoriaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  categoriaSeleccionada: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  barraContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 180,
    paddingBottom: 45,
    paddingTop: 30,
    paddingHorizontal: 10,
    marginTop: 20,
  },
  barraWrapper: {
    alignItems: 'center',
    marginHorizontal: 8,
    minWidth: 120,
    position: 'relative',
  },
  barraPorcentaje: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    position: 'absolute',
    top: -20,
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    borderRadius: 4,
    zIndex: 1,
    left: '50%',
    transform: [{ translateX: -20 }],
  },
  barraContent: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    width: '100%',
  },
  barra: {
    borderRadius: 4,
    width: 28,
  },
  barraLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    width: 120,
    position: 'absolute',
    bottom: -30,
    left: 0,
  },
});
