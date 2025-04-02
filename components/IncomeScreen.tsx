import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';

type Income = {
  id: string;
  user_id: string;
  type: 'income';
  amount: number;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  is_recurring: boolean;
  recurring_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  status: 'pending' | 'completed' | 'cancelled';
};

const CATEGORIES = ['Salario', 'Inversiones', 'Freelance'];

export default function IncomeScreen() {
  const navigation = useNavigation();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState<{[key: string]: number}>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.log('Usuario no autenticado:', error);
        setIsAuthenticated(false);
        Alert.alert(
          'Error de Autenticación',
          'Por favor inicia sesión para continuar',
          [
            {
              text: 'Ir a Login',
              onPress: () => navigation.navigate('Login' as never)
            }
          ]
        );
        return;
      }

      console.log('Usuario autenticado correctamente:', user.id);
      setIsAuthenticated(true);
      loadUserIncomes();
    } catch (error) {
      console.log('Error al verificar autenticación:', error);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    console.log('Calculando totales...');
    calculateTotals();
  }, [incomes]);

  const calculateTotals = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyIncomes = incomes.filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate >= firstDayOfMonth && incomeDate <= now;
    });

    const total = monthlyIncomes.reduce((sum, income) => sum + income.amount, 0);
    setMonthlyTotal(total);

    const totals = CATEGORIES.reduce((acc, cat) => {
      acc[cat] = monthlyIncomes
        .filter(income => income.category === cat)
        .reduce((sum, income) => sum + income.amount, 0);
      return acc;
    }, {} as {[key: string]: number});

    setCategoryTotals(totals);
  };

  const loadUserIncomes = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('Error de autenticación:', userError);
        Alert.alert('Error', 'Por favor inicia sesión');
        return;
      }

      console.log('Usuario autenticado:', user.id);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error al cargar ingresos:', error);
        Alert.alert('Error', 'No se pudieron cargar los ingresos');
        return;
      }

      console.log('Ingresos cargados:', data);
      setIncomes(data || []);
    } catch (error: any) {
      console.log('Error inesperado:', error);
      Alert.alert('Error', error.message);
    }
  };

  const validateForm = () => {
    if (!amount.trim()) {
      console.log('Validación del formulario falló: monto vacío');
      Alert.alert('Error', 'Por favor ingresa un monto');
      return false;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.log('Validación del formulario falló: monto inválido');
      Alert.alert('Error', 'El monto debe ser un número válido mayor a 0');
      return false;
    }

    if (!category) {
      console.log('Validación del formulario falló: categoría vacía');
      Alert.alert('Error', 'Por favor selecciona una categoría');
      return false;
    }

    return true;
  };

  const handleSaveIncome = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Por favor inicia sesión para guardar ingresos');
      return;
    }

    try {
      if (!validateForm()) {
        console.log('Validación del formulario falló');
        return;
      }

      setLoading(true);
      console.log('Iniciando guardado de ingreso...');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('Error de autenticación:', userError);
        Alert.alert('Error', 'Por favor inicia sesión nuevamente');
        return;
      }

      console.log('Usuario autenticado para inserción:', user.id);

      const numericAmount = parseFloat(amount);
      const now = new Date().toISOString();
      
      const newIncome = {
        user_id: user.id,
        type: 'income' as const,
        amount: numericAmount,
        category,
        description: description.trim() || null,
        date: now,
        is_recurring: false,
        recurring_frequency: null,
        status: 'completed' as const
      };

      console.log('Intentando insertar ingreso:', newIncome);

      const { data, error } = await supabase
        .from('transactions')
        .insert([newIncome])
        .select();

      if (error) {
        console.log('Error al insertar:', error);
        Alert.alert('Error', 'No se pudo guardar el ingreso: ' + error.message);
        return;
      }

      console.log('Ingreso guardado exitosamente:', data);

      // Limpiar campos
      setAmount('');
      setDescription('');
      
      Alert.alert(
        'Éxito',
        'Ingreso guardado correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Recargando ingresos...');
              loadUserIncomes();
            }
          }
        ]
      );
    } catch (error: any) {
      console.log('Error inesperado:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `S/. ${amount.toFixed(2)}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingresos del Mes</Text>
        <Text style={styles.totalAmount}>{formatCurrency(monthlyTotal)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categorías</Text>
        {CATEGORIES.map((cat) => (
          <View key={cat} style={styles.categoryItem}>
            <Text style={styles.categoryName}>{cat}</Text>
            <Text style={styles.categoryAmount}>
              {formatCurrency(categoryTotals[cat] || 0)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Agregar Ingreso</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Monto"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholderTextColor="#666"
        />

        <View style={styles.categoryButtons}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                category === cat && styles.categoryButtonSelected
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[
                styles.categoryButtonText,
                category === cat && styles.categoryButtonTextSelected
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor="#666"
        />

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSaveIncome}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Ingreso</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Últimos Ingresos</Text>
        {incomes.length > 0 ? (
          incomes.slice(0, 5).map((income) => (
            <View key={income.id} style={styles.incomeItem}>
              <View>
                <Text style={styles.incomeAmount}>{formatCurrency(income.amount)}</Text>
                <Text style={styles.incomeCategory}>{income.category}</Text>
                {income.description && (
                  <Text style={styles.incomeDescription}>{income.description}</Text>
                )}
              </View>
              <Text style={styles.incomeDate}>
                {new Date(income.date).toLocaleDateString()}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay ingresos registrados</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
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
    marginBottom: 15,
    color: '#333',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  input: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryButton: {
    flex: 1,
    padding: 10,
    margin: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    color: '#333',
    fontSize: 14,
  },
  categoryButtonTextSelected: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  incomeCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  incomeDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  incomeDate: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});
