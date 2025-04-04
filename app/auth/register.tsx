import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { showError, showSuccess } from '../utils/toast';

export default function RegisterScreen() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [usuario, setUsuario] = useState('');
  const [gmail, setGmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!nombre || !apellido || !usuario || !gmail || !contrasena || !confirmPassword) {
      showError('Error', 'Por favor completa todos los campos');
      return;
    }

    if (contrasena !== confirmPassword) {
      showError('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (contrasena.length < 6) {
      showError('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      await signUp(nombre, apellido, usuario, gmail, contrasena);

      showSuccess('Registro exitoso', 'Tu cuenta ha sido creada correctamente');
      router.replace('/(tabs)/welcome');
    } catch (error: any) {
      console.error('Error inesperado:', error);
      showError('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleMoney}>Money</Text>
        <Text style={styles.titleFlow}>Flow</Text>
      </View>

      <View style={styles.formContainer}>
        <ScrollView contentContainerStyle={styles.formContent}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="person" size={24} color="#6B52AE" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor="#999"
              value={nombre}
              onChangeText={setNombre}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="person" size={24} color="#6B52AE" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Apellido"
              placeholderTextColor="#999"
              value={apellido}
              onChangeText={setApellido}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="person-outline" size={24} color="#6B52AE" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nombre de usuario"
              placeholderTextColor="#999"
              value={usuario}
              onChangeText={setUsuario}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={24} color="#6B52AE" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#999"
              value={gmail}
              onChangeText={setGmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color="#6B52AE" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#999"
              value={contrasena}
              onChangeText={setContrasena}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock-outline" size={24} color="#6B52AE" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar Contraseña"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Registrarse</Text>
                <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.loginContainer}>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
            disabled={loading}
          >
            <Text style={styles.loginText}>¿Ya tienes cuenta?</Text>
            <Text style={styles.loginTextBold}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6B52AE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  titleMoney: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleFlow: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E6E0FF',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flex: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    justifyContent: 'space-between',
  },
  formContent: {
    padding: 30,
    paddingTop: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#424242',
  },
  button: {
    backgroundColor: '#6B52AE',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    elevation: 4,
    shadowColor: '#6B52AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#A497C6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  loginContainer: {
    backgroundColor: '#6B52AE',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 'auto',
  },
  loginButton: {
    alignItems: 'center',
  },
  loginText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    marginBottom: 8,
  },
  loginTextBold: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 18,
    textDecorationLine: 'underline',
  },
});
