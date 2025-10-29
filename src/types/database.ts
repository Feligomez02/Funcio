export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProjectRole = "analyst" | "collaborator" | "admin";

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string | null;
          created_at: string | null;
          integrations: Json | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id?: string | null;
          created_at?: string | null;
          integrations?: Json | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string | null;
          created_at?: string | null;
          integrations?: Json | null;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: ProjectRole;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: ProjectRole;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: ProjectRole;
          created_at?: string | null;
        };
        Relationships: [];
      };
      requirements: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string;
          type: string | null;
          priority: number | null;
          status: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
          ai_user_story: string | null;
          ai_acceptance_criteria: Json | null;
          ai_issues: Json | null;
          ai_confidence: number | null;
          ai_provider: string | null;
          ai_language: string | null;
          ai_tokens_used: number | null;
          ai_type_suggestion: string | null;
          ai_type_confidence: number | null;
          ai_type_reason: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description: string;
          type?: string | null;
          priority?: number | null;
          status?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          ai_user_story?: string | null;
          ai_acceptance_criteria?: Json | null;
          ai_issues?: Json | null;
          ai_confidence?: number | null;
          ai_provider?: string | null;
          ai_language?: string | null;
          ai_tokens_used?: number | null;
          ai_type_suggestion?: string | null;
          ai_type_confidence?: number | null;
          ai_type_reason?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string;
          type?: string | null;
          priority?: number | null;
          status?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          ai_user_story?: string | null;
          ai_acceptance_criteria?: Json | null;
          ai_issues?: Json | null;
          ai_confidence?: number | null;
          ai_provider?: string | null;
          ai_language?: string | null;
          ai_tokens_used?: number | null;
          ai_type_suggestion?: string | null;
          ai_type_confidence?: number | null;
          ai_type_reason?: string | null;
        };
        Relationships: [];
      };
      requirement_history: {
        Row: {
          id: string;
          requirement_id: string | null;
          project_id: string | null;
          user_id: string | null;
          action: string;
          changed_fields: Json | null;
          change_note: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          requirement_id?: string | null;
          project_id?: string | null;
          user_id?: string | null;
          action: string;
          changed_fields?: Json | null;
          change_note?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          requirement_id?: string | null;
          project_id?: string | null;
          user_id?: string | null;
          action?: string;
          changed_fields?: Json | null;
          change_note?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      requirement_links: {
        Row: {
          id: string;
          requirement_id: string;
          project_id: string;
          provider: string;
          external_type: string;
          external_id: string;
          external_key: string | null;
          summary: string | null;
          status: string | null;
          url: string | null;
          metadata: Json | null;
          created_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          requirement_id: string;
          project_id: string;
          provider: string;
          external_type: string;
          external_id: string;
          external_key?: string | null;
          summary?: string | null;
          status?: string | null;
          url?: string | null;
          metadata?: Json | null;
          created_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          requirement_id?: string;
          project_id?: string;
          provider?: string;
          external_type?: string;
          external_id?: string;
          external_key?: string | null;
          summary?: string | null;
          status?: string | null;
          url?: string | null;
          metadata?: Json | null;
          created_by?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity: string | null;
          entity_id: string | null;
          created_at: string | null;
          payload: Json | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity?: string | null;
          entity_id?: string | null;
          created_at?: string | null;
          payload?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity?: string | null;
          entity_id?: string | null;
          created_at?: string | null;
          payload?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
