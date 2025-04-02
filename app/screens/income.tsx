import React, { useMemo, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal,
  TextInput,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { useRouter } from 'expo-router';

type IconName = 'work' | 'trending-up' | 'laptop' | 'attach-money';

type Transaction = {
  id: string;
  user_id: string;
  type: 'income';
  amount: number;
  category: string;
  description: string | null;
  date: string;
  created_at?: string;
  updated_at?: string;
  is_recurring: boolean;
  recurring_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  status: 'pending' | 'completed' | 'cancelled';
};

const INCOME_CATEGORIES: Array<{
  id: string;
  icon: IconName;
  color: string;
}> = [
  { id: 'Salario', icon: 'work', color: '#2E7D32' },
  { id: 'Inversiones', icon: 'trending-up', color: '#1565C0' },
  { id: 'Freelance', icon: 'laptop', color: '#6A1B9A' },
  { id: 'Otros', icon: 'attach-money', color: '#666' }
];

export default function IncomeScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('No hay sesión activa, redirigiendo a login...');
        router.replace('/auth/login');
        return;
      }

      console.log('Sesión encontrada:', session.user.id);
      setIsAuthenticated(true);
      loadTransactions();
    };

    initializeAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Verificando autenticación...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('Usuario no autenticado:', error);
        setIsAuthenticated(false);
        router.replace('/auth/login');
        return;
      }

      console.log('Usuario autenticado:', session.user.id);
      setIsAuthenticated(true);
      loadTransactions();
    } catch (error) {
      console.log('Error al verificar autenticación:', error);
      setIsAuthenticated(false);
      router.replace('/auth/login');
    }
  };

  const loadTransactions = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!session) {
        console.log('Usuario no autenticado en loadTransactions');
        setIsAuthenticated(false);
        return;
      }

      console.log('Cargando transacciones para usuario:', session.user.id);
      const { data, error: loadError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('type', 'income')
        .order('date', { ascending: false });

      if (loadError) {
        console.error('Error al cargar transacciones:', loadError);
        if (loadError.code === '22P02') {
          console.log('Error de formato UUID, estableciendo transacciones vacías');
          setTransactions([]);
          return;
        }
        Alert.alert('Error', 'No se pudieron cargar los ingresos: ' + loadError.message);
        return;
      }

      console.log('Transacciones cargadas:', data);
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error en loadTransactions:', error);
      if (error.code === '22P02') {
        console.log('Error de formato UUID, estableciendo transacciones vacías');
        setTransactions([]);
        return;
      }
      Alert.alert('Error', 'Error al cargar las transacciones: ' + error.message);
    }
  };

  // Filtrar ingresos del mes actual (para la vista de transacciones)
  const currentMonthIncomes = transactions.filter(t => 
    t.type === 'income' && 
    new Date(t.date).getMonth() === new Date().getMonth()
  );

  // Calcular total de ingresos (usando todas las transacciones, no solo las del mes actual)
  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Calcular ingresos por categoría (mantenemos solo las del mes actual para el desglose)
  const incomesByCategory = useMemo(() => {
    const categories: { [key: string]: number } = {};
    currentMonthIncomes.forEach(income => {
      if (categories[income.category]) {
        categories[income.category] += income.amount;
      } else {
        categories[income.category] = income.amount;
      }
    });
    return categories;
  }, [currentMonthIncomes]);

  const handleAddIncome = async () => {
    console.log('Iniciando handleAddIncome');
    console.log('Estado de autenticación:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('Usuario no autenticado, redirigiendo a login...');
      Alert.alert(
        'Error de Autenticación',
        'Por favor inicia sesión para agregar ingresos',
        [
          {
            text: 'Iniciar Sesión',
            onPress: () => router.push('/auth/login')
          }
        ]
      );
      return;
    }

    // Validación de campos
    if (!amount.trim()) {
      console.log('Validación fallida: Monto vacío');
      Alert.alert('Error', 'Por favor ingresa un monto');
      return;
    }

    const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.log('Validación fallida: Monto inválido', amount);
      Alert.alert('Error', 'El monto debe ser un número válido mayor a 0');
      return;
    }

    if (!category) {
      console.log('Validación fallida: Categoría no seleccionada');
      Alert.alert('Error', 'Por favor selecciona una categoría');
      return;
    }

    try {
      setLoading(true);
      console.log('Obteniendo usuario actual');

      const { data: { session }, error: userError } = await supabase.auth.getSession();
      
      if (userError || !session) {
        console.error('Error de autenticación:', userError);
        Alert.alert('Error', 'Por favor inicia sesión nuevamente');
        return;
      }

      console.log('Usuario autenticado:', session.user.id);

      const now = new Date().toISOString();
      const newIncome = {
        user_id: session.user.id,
        type: 'income' as const,
        amount: numericAmount,
        category,
        description: description.trim() || null,
        date: now,
        is_recurring: false,
        recurring_frequency: null,
        status: 'completed' as const
      };

      console.log('Datos a guardar:', newIncome);

      console.log('Intentando insertar en Supabase');
      const { data, error } = await supabase
        .from('transactions')
        .insert([newIncome])
        .select();

      if (error) {
        console.error('Error al guardar:', error);
        if (error.code === '42P01') {
          Alert.alert('Error', 'La tabla de transacciones no existe. Por favor contacta al administrador.');
        } else {
          Alert.alert('Error', 'No se pudo guardar el ingreso: ' + error.message);
        }
        return;
      }

      console.log('Ingreso guardado exitosamente:', data);

      await loadTransactions();
      setModalVisible(false);
      resetForm();
      Alert.alert('Éxito', 'Ingreso guardado correctamente');
    } catch (error: any) {
      console.error('Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado: ' + (error.message || 'Por favor intenta nuevamente'));
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        Alert.alert('Error', 'No se pudo eliminar el ingreso');
        return;
      }

      await loadTransactions();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setDescription('');
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <MaterialIcons
        name={INCOME_CATEGORIES.find(cat => cat.id === item.category)?.icon ?? 'attach-money'}
        size={24}
        color={INCOME_CATEGORIES.find(cat => cat.id === item.category)?.color || '#666'}
      />
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>{item.description || item.category}</Text>
        <Text style={styles.transactionDate}>
          {new Date(item.date).toLocaleDateString('es-ES')}
        </Text>
      </View>
      <Text style={styles.transactionAmount}>+S/. {item.amount.toFixed(2)}</Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert(
            'Confirmar',
            '¿Estás seguro de que quieres eliminar esta transacción?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar', onPress: () => deleteTransaction(item.id), style: 'destructive' }
            ]
          );
        }}
      >
        <MaterialIcons name="delete" size={20} color="#2E7D32" />
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Ingresos del Mes</Text>
        <Text style={styles.totalAmount}>S/. {totalIncome.toFixed(2)}</Text>
      </View>

      <View style={styles.categories}>
        <Text style={styles.sectionTitle}>Categorías</Text>
        <View style={styles.categoryGrid}>
          {INCOME_CATEGORIES.slice(0, -1).map(cat => (
            <View key={cat.id} style={styles.categoryCard}>
              <MaterialIcons name={cat.icon as any} size={24} color={cat.color} />
              <Text style={styles.categoryTitle}>{cat.id}</Text>
              <Text style={styles.categoryAmount}>
                S/. {(incomesByCategory[cat.id] || 0).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.transactionsHeader}>
        <Text style={styles.sectionTitle}>Últimos Ingresos</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={currentMonthIncomes}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Nuevo Ingreso</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Monto"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <View style={styles.categorySelector}>
              <Text style={styles.modalSubtitle}>Categoría:</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={INCOME_CATEGORIES}
                keyExtractor={item => item.id}
                renderItem={({item: cat}) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      category === cat.id && { backgroundColor: cat.color }
                    ]}
                    onPress={() => {
                      console.log('Seleccionando categoría:', cat.id);
                      setCategory(cat.id);
                    }}
                  >
                    <MaterialIcons 
                      name={cat.icon as any} 
                      size={24} 
                      color={category === cat.id ? 'white' : cat.color} 
                    />
                    <Text style={[
                      styles.categoryButtonText,
                      category === cat.id && { color: 'white' }
                    ]}>
                      {cat.id}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Descripción (opcional)"
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSave]}
                onPress={handleAddIncome}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    paddingBottom: 80, // Espacio para el FAB
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
    borderRadius: 10,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  categories: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
    borderRadius: 10,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 5,
  },
  transactionsHeader: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 10,
    marginBottom: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 10,
  },
  transactionTitle: {
    fontSize: 16,
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginRight: 10,
  },
  deleteButton: {
    padding: 5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#2E7D32',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalView: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categorySelector: {
    marginBottom: 15,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 120,
  },
  categoryButtonText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonCancel: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonSave: {
    backgroundColor: '#2E7D32',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
