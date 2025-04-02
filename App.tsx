import React from 'react';
import { AppProvider } from './context/AppContext';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

// Importar las pantallas
import TabOneScreen from './app/(tabs)';
import ExpensesScreen from './components/ExpensesScreen';
import IncomeScreen from './components/IncomeScreen';
import StatisticsScreen from './components/StatisticsScreen';
import ProfileScreen from './components/ProfileScreen';

const Tab = createBottomTabNavigator();

function Navigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            paddingBottom: 5,
            height: 55,
          },
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={TabOneScreen}
          options={{
            tabBarLabel: 'Inicio',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Expenses" 
          component={ExpensesScreen}
          options={{
            tabBarLabel: 'Gastos',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="money-off" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Income" 
          component={IncomeScreen}
          options={{
            tabBarLabel: 'Ingresos',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="attach-money" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Statistics" 
          component={StatisticsScreen}
          options={{
            tabBarLabel: 'Estadísticas',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="bar-chart" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Navigation />
    </AppProvider>
  );
}
