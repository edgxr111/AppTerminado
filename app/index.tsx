import { Redirect } from 'expo-router';

export default function Index() {
  // Redirigir automáticamente a la página de login
  return <Redirect href="/auth/login" />;
}
