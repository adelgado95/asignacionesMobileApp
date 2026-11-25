import { Redirect } from 'expo-router';

// "/" is the default entry point (after login, cold start): always land on Mis asignaciones.
export default function Index() {
  return <Redirect href="/mis-partes" />;
}
