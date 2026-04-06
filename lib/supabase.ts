import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Substitua pelas suas credenciais do painel do Supabase
const supabaseUrl = 'https://zaevycwnncculgsotlpf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZXZ5Y3dubmNjdWxnc290bHBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQyNjczMSwiZXhwIjoyMDkxMDAyNzMxfQ.YnjJCZob1Sij0mdCYHuMQhZTwPzizqzhMdkuolCqn1k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);