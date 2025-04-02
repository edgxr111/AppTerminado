import { useEffect } from 'react';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useSearchParams } from 'expo-router';
import { supabase } from '../../supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        if (params.error_description) {
          throw new Error(params.error_description);
        }

        if (params.access_token) {
          const { error } = await supabase.auth.getSession();
          if (error) throw error;
        }

        // Redirigir al login después de la verificación
        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);

      } catch (error: any) {
        console.error('Error en la verificación:', error);
      }
    };

    handleEmailConfirmation();
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2E7D32" style={styles.spinner} />
      <Text style={styles.text}>Verificando email...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  spinner: {
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    color: '#333',
  },
});
