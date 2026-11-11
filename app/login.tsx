import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput as PaperInput } from 'react-native-paper';

import { Colors, type Palette } from '@/constants/Colors';
import { API_URL } from '@/constants/api';
import { LoginError, useAuth } from '@/lib/auth';
import { useThemed } from '@/lib/theme';


// Palette taken from the meeting program: teal (Tesoros), gold (Seamos mejores maestros),
// wine red (Nuestra vida cristiana) on white, with neutral gray text.
const PROGRAM = {
  teal: '#387C88',
  gold: '#D48C00',
  wine: '#942824',
  ink: '#333333',
  muted: '#5C5C5C',
  line: '#BDBDBD',
} as const;

// Dark mode: the same program colors, with neutral text/lines taken from the dark palette.
const programFor = (p: Palette) =>
  p === Colors.dark ? { ...PROGRAM, ink: p.text, muted: p.secondaryText, line: p.field, wine: p.badText } : PROGRAM;

const MESSAGES = {
  credentials: 'Usuario o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.',
  network: `No hay conexión con el servidor (${API_URL}). Comprueba que el backend esté en marcha.`,
  server: 'El servidor no pudo procesar el inicio de sesión. Inténtalo de nuevo en un momento.',
} as const;

export default function LoginScreen() {
  const { palette, styles } = useThemed(makeStyles);
  const program = programFor(palette);
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);

  // The form is short, so "scroll to the end" always brings the focused field and the button into view.
  const revealForm = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

  // Android (edge-to-edge) does not resize the window for the keyboard, and KeyboardAvoidingView is unreliable
  // there: pad the bottom of the scroll content by the keyboard height instead. iOS uses KeyboardAvoidingView.
  // If the window is resized anyway the padding only adds spare scroll room, so the field is never covered.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      revealForm();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.content, keyboardHeight > 0 && { paddingBottom: 48 + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets>
        <Text style={styles.title}>Asignaciones</Text>
        <View style={styles.rule} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.ruleSegment, { backgroundColor: program.teal }]} />
          <View style={[styles.ruleSegment, { backgroundColor: program.gold }]} />
          <View style={[styles.ruleSegment, { backgroundColor: program.wine }]} />
        </View>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Usuario</Text>
            <PaperInput
              value={username}
              onChangeText={setUsername}
              onFocus={revealForm}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              outlineColor={program.line}
              activeOutlineColor={program.teal}
            />
          </View>

          <View>
            <Text style={styles.label}>Contraseña</Text>
            <PaperInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              onFocus={revealForm}
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
              outlineColor={program.line}
              activeOutlineColor={program.teal}
              right={
                <PaperInput.Icon
                  icon={() => (
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={program.muted} />
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
            buttonColor={program.teal}
            textColor="#FFFFFF"
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

const makeStyles = (palette: Palette) => {
  const program = programFor(palette);
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.surface },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 6,
  },
  title: {
    color: program.ink,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  rule: { flexDirection: 'row', gap: 4, marginTop: 12, marginBottom: 32 },
  ruleSegment: { width: 28, height: 4, borderRadius: 2 },
  form: { gap: 16 },
  label: {
    color: program.muted,
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
    color: program.wine,
    fontSize: 14,
    lineHeight: 20,
  },
  button: { borderRadius: 10, marginTop: 4 },
  buttonContent: { minHeight: 48 },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
});
};
