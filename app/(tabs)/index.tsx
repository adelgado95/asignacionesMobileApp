import { Redirect } from 'expo-router';

// "/" is the default entry point (after login, cold start): always land on VyMC.
export default function Index() {
  return <Redirect href="/vymc" />;
}
