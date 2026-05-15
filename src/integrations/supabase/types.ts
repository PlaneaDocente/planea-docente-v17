/**
 * Tipos de Supabase para PlaneaDocente V17
 * GENERADO MANUALMENTE - Reemplazar con tipos oficiales via:
 * npx supabase gen types typescript --project-id "tu-project-id" --schema public > src/integrations/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          role: 'admin' | 'teacher' | 'user' | null;
          created_at: string | null;
          updated_at: string | null;
          stripe_customer_id: string | null;
          subscription_status: string | null;
          subscription_plan: string | null;
          subscription_expires_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'teacher' | 'user' | null;
          created_at?: string | null;
          updated_at?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          subscription_plan?: string | null;
          subscription_expires_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'teacher' | 'user' | null;
          created_at?: string | null;
          updated_at?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          subscription_plan?: string | null;
          subscription_expires_at?: string | null;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          status: string | null;
          plan_name: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          status?: string | null;
          plan_name?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          status?: string | null;
          plan_name?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          stripe_payment_intent_id: string | null;
          amount: number | null;
          currency: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_payment_intent_id?: string | null;
          amount?: number | null;
          currency?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_payment_intent_id?: string | null;
          amount?: number | null;
          currency?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
      };
      alumnos: {
        Row: {
          id: string;
          user_id: string;
          nombre: string;
          grado: string | null;
          grupo: string | null;
          promedio: number | null;
          asistencia: number | null;
          estado: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          nombre: string;
          grado?: string | null;
          grupo?: string | null;
          promedio?: number | null;
          asistencia?: number | null;
          estado?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          nombre?: string;
          grado?: string | null;
          grupo?: string | null;
          promedio?: number | null;
          asistencia?: number | null;
          estado?: string | null;
          created_at?: string | null;
        };
      };
      planeaciones: {
        Row: {
          id: string;
          user_id: string;
          titulo: string;
          tipo: string | null;
          materia: string | null;
          campo_formativo: string | null;
          fase_aprendizaje: string | null;
          objetivos_aprendizaje: Json | null;
          desempeños: Json | null;
          evidencias: Json | null;
          fecha_inicio: string | null;
          fecha_fin: string | null;
          estado: string | null;
          generada_por_ia: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          titulo: string;
          tipo?: string | null;
          materia?: string | null;
          campo_formativo?: string | null;
          fase_aprendizaje?: string | null;
          objetivos_aprendizaje?: Json | null;
          desempeños?: Json | null;
          evidencias?: Json | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          estado?: string | null;
          generada_por_ia?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          titulo?: string;
          tipo?: string | null;
          materia?: string | null;
          campo_formativo?: string | null;
          fase_aprendizaje?: string | null;
          objetivos_aprendizaje?: Json | null;
          desempeños?: Json | null;
          evidencias?: Json | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          estado?: string | null;
          generada_por_ia?: boolean | null;
          created_at?: string | null;
        };
      };
      actividades: {
        Row: {
          id: string;
          user_id: string;
          titulo: string;
          tipo: string | null;
          materia: string | null;
          campo_formativo: string | null;
          fecha_entrega: string | null;
          entregadas: number | null;
          total: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          titulo: string;
          tipo?: string | null;
          materia?: string | null;
          campo_formativo?: string | null;
          fecha_entrega?: string | null;
          entregadas?: number | null;
          total?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          titulo?: string;
          tipo?: string | null;
          materia?: string | null;
          campo_formativo?: string | null;
          fecha_entrega?: string | null;
          entregadas?: number | null;
          total?: number | null;
          created_at?: string | null;
        };
      };
      asistencia: {
        Row: {
          id: string;
          user_id: string;
          fecha: string;
          presentes: number | null;
          ausentes: number | null;
          justificados: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          fecha: string;
          presentes?: number | null;
          ausentes?: number | null;
          justificados?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          fecha?: string;
          presentes?: number | null;
          ausentes?: number | null;
          justificados?: number | null;
          created_at?: string | null;
        };
      };
      evaluaciones: {
        Row: {
          id: string;
          user_id: string;
          titulo: string;
          tipo: string | null;
          materia: string | null;
          campo_formativo: string | null;
          fecha: string | null;
          promedio: number | null;
          aplicados: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          titulo: string;
          tipo?: string | null;
          materia?: string | null;
          campo_formativo?: string | null;
          fecha?: string | null;
          promedio?: number | null;
          aplicados?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          titulo?: string;
          tipo?: string | null;
          materia?: string | null;
          campo_formativo?: string | null;
          fecha?: string | null;
          promedio?: number | null;
          aplicados?: number | null;
          created_at?: string | null;
        };
      };
      comunicados: {
        Row: {
          id: string;
          user_id: string;
          titulo: string;
          tipo: string | null;
          fecha: string | null;
          leidos: number | null;
          total: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          titulo: string;
          tipo?: string | null;
          fecha?: string | null;
          leidos?: number | null;
          total?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          titulo?: string;
          tipo?: string | null;
          fecha?: string | null;
          leidos?: number | null;
          total?: number | null;
          created_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Alias de tipos comunes para facilitar imports
export type User = Tables<'users'>;
export type Subscription = Tables<'subscriptions'>;
export type Payment = Tables<'payments'>;
export type Alumno = Tables<'alumnos'>;
export type Planeacion = Tables<'planeaciones'>;
export type Actividad = Tables<'actividades'>;
export type Asistencia = Tables<'asistencia'>;
export type Evaluacion = Tables<'evaluaciones'>;
export type Comunicado = Tables<'comunicados'>;
