import 'react-native-get-random-values';
import { Stack, useRootNavigationState, router } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppProvider } from '../context/AppContext';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <RootLayoutNav />
        <Toast />
      </AppProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { user } = useAuth();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    // Verificar autenticación al cargar/refrescar la página
    if (!user) {
      router.replace('/auth/login');
    }
  }, [rootNavigationState?.key, user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="auth/login"
        options={{
          title: 'Iniciar Sesión',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="auth/register"
        options={{
          title: 'Registro',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
