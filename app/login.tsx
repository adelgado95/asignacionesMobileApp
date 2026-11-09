import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput as PaperInput } from 'react-native-paper';

import { Colors } from '@/constants/Colors';
import { API_URL } from '@/constants/api';
import { LoginError, useAuth } from '@/lib/auth';

const palette = Colors.light;

const MESSAGES = {
  credentials: 'Usuario o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.',
  network: `No hay conexión con el servidor (${API_URL}). Comprueba que el backend esté en marcha.`,
  server: 'El servidor no pudo procesar el inicio de sesión. Inténtalo de nuevo en un momento.',
} as const;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<any>(null);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(username.trim(), password);
    } catch (e) {
      setError(MESSAGES[e instanceof LoginError ? e.kind : 'server']);
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Asignaciones</Text>
        <Text style={styles.subtitle}>Inicia sesión con tu usuario de Django.</Text>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Usuario</Text>
            <PaperInput
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              outlineColor="#C9D2E3"
              activeOutlineColor={palette.primary}
            />
          </View>

          <View>
            <Text style={styles.label}>Contraseña</Text>
            <PaperInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              outlineColor="#C9D2E3"
              activeOutlineColor={palette.primary}
              right={
                <PaperInput.Icon
                  icon={() => (
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={palette.secondaryText} />
                  )}
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                />
              }
            />
          </View>

          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <Button
            mode="contained"
            onPress={submit}
            disabled={!canSubmit}
            loading={submitting}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}>
            {submitting ? 'Entrando…' : 'Iniciar sesión'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.surface },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 6,
  },
  title: {
    color: palette.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: palette.secondaryText,
    fontSize: 16,
    marginBottom: 24,
  },
  form: { gap: 16 },
  label: {
    color: palette.secondaryText,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: palette.surface,
    minHeight: 48,
    fontSize: 16,
  },
  inputOutline: { borderRadius: 10 },
  error: {
    color: '#B83232',
    fontSize: 14,
    lineHeight: 20,
  },
  button: { borderRadius: 10, marginTop: 4 },
  buttonContent: { minHeight: 48 },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
});
