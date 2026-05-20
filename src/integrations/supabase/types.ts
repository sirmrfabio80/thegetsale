export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          category: string | null
          country: string | null
          created_at: string
          description: string | null
          editorial_copy: string | null
          house_group: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          tagline: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          editorial_copy?: string | null
          house_group?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          tagline?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          editorial_copy?: string | null
          house_group?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          tagline?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      prediction_runs: {
        Row: {
          algorithm_version: string
          brands_processed: number
          errors: Json | null
          finished_at: string | null
          id: string
          predictions_created: number
          predictions_updated: number
          started_at: string
          status: string
        }
        Insert: {
          algorithm_version: string
          brands_processed?: number
          errors?: Json | null
          finished_at?: string | null
          id?: string
          predictions_created?: number
          predictions_updated?: number
          started_at?: string
          status: string
        }
        Update: {
          algorithm_version?: string
          brands_processed?: number
          errors?: Json | null
          finished_at?: string | null
          id?: string
          predictions_created?: number
          predictions_updated?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_events: {
        Row: {
          admin_notes: string | null
          brand_id: string
          category: string | null
          created_at: string
          created_by: string | null
          discount_max: number | null
          discount_min: number | null
          end_date: string | null
          id: string
          sale_type: string
          source_type: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          brand_id: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          discount_max?: number | null
          discount_min?: number | null
          end_date?: string | null
          id?: string
          sale_type: string
          source_type?: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          brand_id?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          discount_max?: number | null
          discount_min?: number | null
          end_date?: string | null
          id?: string
          sale_type?: string
          source_type?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_events_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_predictions: {
        Row: {
          algorithm_version: string
          basis_years: number[] | null
          brand_id: string
          category: string | null
          confidence_label: string
          confidence_score: number
          generated_at: string
          id: string
          predicted_end_date: string | null
          predicted_start_date: string
          reasoning_summary: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sale_type: string
          sample_size: number
          signal: string | null
          status: string
        }
        Insert: {
          algorithm_version: string
          basis_years?: number[] | null
          brand_id: string
          category?: string | null
          confidence_label: string
          confidence_score: number
          generated_at?: string
          id?: string
          predicted_end_date?: string | null
          predicted_start_date: string
          reasoning_summary?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_type: string
          sample_size?: number
          signal?: string | null
          status?: string
        }
        Update: {
          algorithm_version?: string
          basis_years?: number[] | null
          brand_id?: string
          category?: string | null
          confidence_label?: string
          confidence_score?: number
          generated_at?: string
          id?: string
          predicted_end_date?: string | null
          predicted_start_date?: string
          reasoning_summary?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_type?: string
          sample_size?: number
          signal?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_predictions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_watchlist: {
        Row: {
          added_at: string
          brand_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          brand_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          brand_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watchlist_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
