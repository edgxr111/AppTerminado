import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useApp } from '../context/AppContext';
import { PieChart } from 'react-native-chart-kit';

const COLORS = [
  '#FF6384',
  '#36A2EB',
  '#FFCE56',
  '#4BC0C0',
  '#9966FF',
  '#FF9F40',
  '#FF6384',
  '#4BC0C0',
  '#FF9F40',
];

export default function StatisticsScreen() {
  const { transactions, account } = useApp();
  const screenWidth = Dimensions.get('window').width;

  const expenses = transactions.filter(t => t.type === 'expense');
  const income = transactions.filter(t => t.type === 'income');

  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

  // Calcular gastos por categoría
  const expensesByCategory = useMemo(() => {
    const categories: { [key: string]: number } = {};
    expenses.forEach(expense => {
      if (categories[expense.category]) {
        categories[expense.category] += expense.amount;
      } else {
        categories[expense.category] = expense.amount;
      }
    });

    return Object.entries(categories).map(([name, amount], index) => ({
      name,
      amount,
      percentage: (amount / totalExpenses) * 100,
      color: COLORS[index % COLORS.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));
  }, [expenses, totalExpenses]);

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Estadísticas</Text>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Saldo Actual</Text>
          <Text style={[styles.summaryAmount, { color: account.balance >= 0 ? '#4CAF50' : '#F44336' }]}>
            S/. {account.balance.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Salario Mensual</Text>
          <Text style={[styles.summaryAmount, styles.incomeColor]}>
            S/. {account.monthlySalary.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Gastos del Mes</Text>
          <Text style={[styles.summaryAmount, styles.expenseColor]}>
            S/. {totalExpenses.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Distribución de Gastos</Text>
        {expensesByCategory.length > 0 ? (
          <>
            <PieChart
              data={expensesByCategory}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 10]}
              absolute
            />
            <View style={styles.legendContainer}>
              {expensesByCategory.map((category) => (
                <View key={category.name} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: category.color }]} />
                  <View style={styles.legendText}>
                    <Text style={styles.legendCategory}>{category.name}</Text>
                    <Text style={styles.legendAmount}>
                      S/. {category.amount.toFixed(2)} ({category.percentage.toFixed(1)}%)
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>No hay gastos registrados</Text>
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  incomeColor: {
    color: '#4CAF50',
  },
  expenseColor: {
    color: '#F44336',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  legendContainer: {
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    marginTop: 4,
  },
  legendText: {
    flex: 1,
  },
  legendCategory: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  legendAmount: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginVertical: 20,
  },
});
