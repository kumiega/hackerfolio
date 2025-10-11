export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      app_errors: {
        Row: {
          client_ip: unknown | null;
          context: Json;
          endpoint: string | null;
          error_code: string | null;
          id: number;
          message: string;
          occurred_at: string;
          portfolio_id: string | null;
          request_id: string | null;
          route: string | null;
          session_id: string | null;
          severity: Database["public"]["Enums"]["error_severity"];
          source: Database["public"]["Enums"]["error_source"];
          stack: string | null;
          user_agent: string | null;
          user_id: string | null;
          username: string | null;
        };
        Insert: {
          client_ip?: unknown | null;
          context?: Json;
          endpoint?: string | null;
          error_code?: string | null;
          id?: number;
          message: string;
          occurred_at?: string;
          portfolio_id?: string | null;
          request_id?: string | null;
          route?: string | null;
          session_id?: string | null;
          severity?: Database["public"]["Enums"]["error_severity"];
          source?: Database["public"]["Enums"]["error_source"];
          stack?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
          username?: string | null;
        };
        Update: {
          client_ip?: unknown | null;
          context?: Json;
          endpoint?: string | null;
          error_code?: string | null;
          id?: number;
          message?: string;
          occurred_at?: string;
          portfolio_id?: string | null;
          request_id?: string | null;
          route?: string | null;
          session_id?: string | null;
          severity?: Database["public"]["Enums"]["error_severity"];
          source?: Database["public"]["Enums"]["error_source"];
          stack?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "app_errors_portfolio_id_fkey";
            columns: ["portfolio_id"];
            isOneToOne: false;
            referencedRelation: "portfolios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "app_errors_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      components: {
        Row: {
          created_at: string;
          data: Json;
          id: string;
          position: number;
          section_id: string;
          type: Database["public"]["Enums"]["component_type"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          data: Json;
          id?: string;
          position: number;
          section_id: string;
          type: Database["public"]["Enums"]["component_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          data?: Json;
          id?: string;
          position?: number;
          section_id?: string;
          type?: Database["public"]["Enums"]["component_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "components_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolios: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_published: boolean;
          published_at: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_published?: boolean;
          published_at?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_published?: boolean;
          published_at?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolios_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sections: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          portfolio_id: string;
          position: number;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          portfolio_id: string;
          position: number;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          portfolio_id?: string;
          position?: number;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "sections_portfolio_id_fkey";
            columns: ["portfolio_id"];
            isOneToOne: false;
            referencedRelation: "portfolios";
            referencedColumns: ["id"];
          },
        ];
      };
      oauth_tokens: {
        Row: {
          access_token: string;
          created_at: string;
          expires_at: string | null;
          id: string;
          provider: string;
          refresh_token: string | null;
          scope: string | null;
          token_type: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          provider: string;
          refresh_token?: string | null;
          scope?: string | null;
          token_type?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          provider?: string;
          refresh_token?: string | null;
          scope?: string | null;
          token_type?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oauth_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      app_errors_cleanup: {
        Args: { retain_days?: number };
        Returns: number;
      };
      log_app_error: {
        Args: {
          client_ip_in?: unknown;
          context_in?: Json;
          endpoint_in?: string;
          error_code_in?: string;
          message_in: string;
          portfolio_id_in?: string;
          request_id_in?: string;
          route_in?: string;
          session_id_in?: string;
          severity_in?: Database["public"]["Enums"]["error_severity"];
          source_in?: Database["public"]["Enums"]["error_source"];
          stack_in?: string;
          user_agent_in?: string;
        };
        Returns: {
          client_ip: unknown | null;
          context: Json;
          endpoint: string | null;
          error_code: string | null;
          id: number;
          message: string;
          occurred_at: string;
          portfolio_id: string | null;
          request_id: string | null;
          route: string | null;
          session_id: string | null;
          severity: Database["public"]["Enums"]["error_severity"];
          source: Database["public"]["Enums"]["error_source"];
          stack: string | null;
          user_agent: string | null;
          user_id: string | null;
          username: string | null;
        };
      };
      set_username: {
        Args: { username_input: string };
        Returns: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
          username: string | null;
        };
      };
    };
    Enums: {
      component_type: "text" | "project_card" | "tech_list" | "social_links" | "list" | "gallery" | "bio";
      error_severity: "debug" | "info" | "warn" | "error" | "fatal";
      error_source: "frontend" | "api" | "edge" | "worker" | "db" | "other";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      component_type: ["text", "project_card", "tech_list", "social_links", "list", "gallery", "bio"],
      error_severity: ["debug", "info", "warn", "error", "fatal"],
      error_source: ["frontend", "api", "edge", "worker", "db", "other"],
    },
  },
} as const;
