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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      animes: {
        Row: {
          anilist_id: number | null
          banner_url: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          featured: boolean
          genres: string[]
          has_dub: boolean
          id: string
          score: number | null
          status: string | null
          studio: string | null
          title: string
        }
        Insert: {
          anilist_id?: number | null
          banner_url?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          genres?: string[]
          has_dub?: boolean
          id?: string
          score?: number | null
          status?: string | null
          studio?: string | null
          title: string
        }
        Update: {
          anilist_id?: number | null
          banner_url?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          genres?: string[]
          has_dub?: boolean
          id?: string
          score?: number | null
          status?: string | null
          studio?: string | null
          title?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          episode_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          episode_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          episode_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          anime_id: string
          created_at: string
          id: string
          number: number
          title: string | null
          video_url: string | null
        }
        Insert: {
          anime_id: string
          created_at?: string
          id?: string
          number: number
          title?: string | null
          video_url?: string | null
        }
        Update: {
          anime_id?: string
          created_at?: string
          id?: string
          number?: number
          title?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: { body: string; created_at: string; id: string; read_at: string | null; recipient_id: string; sender_id: string }
        Insert: { body: string; created_at?: string; id?: string; read_at?: string | null; recipient_id: string; sender_id: string }
        Update: { body?: string; created_at?: string; id?: string; read_at?: string | null; recipient_id?: string; sender_id?: string }
        Relationships: []
      }
      user_cosmetics: {
        Row: { name_color: string | null; owned: string[]; profile_theme: Json | null; site_theme: Json | null; updated_at: string; user_id: string; vip_badge: boolean }
        Insert: { name_color?: string | null; owned?: string[]; profile_theme?: Json | null; site_theme?: Json | null; updated_at?: string; user_id: string; vip_badge?: boolean }
        Update: { name_color?: string | null; owned?: string[]; profile_theme?: Json | null; site_theme?: Json | null; updated_at?: string; user_id?: string; vip_badge?: boolean }
        Relationships: []
      }
      user_wallets: {
        Row: { coins: number; created_at: string; last_claim: string | null; user_id: string }
        Insert: { coins?: number; created_at?: string; last_claim?: string | null; user_id: string }
        Update: { coins?: number; created_at?: string; last_claim?: string | null; user_id?: string }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent_color: string | null
          avatar_url: string | null
          badge: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          id: string
          username: string
        }
        Insert: {
          accent_color?: string | null
          avatar_url?: string | null
          badge?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          id: string
          username?: string
        }
        Update: {
          accent_color?: string | null
          avatar_url?: string | null
          badge?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          anime_id: string
          score: number
          user_id: string
        }
        Insert: {
          anime_id: string
          score: number
          user_id: string
        }
        Update: {
          anime_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
        ]
      }
      room_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          episode_id: string
          host_id: string
          id: string
          is_playing: boolean
          position: number
          title: string | null
        }
        Insert: {
          code: string
          created_at?: string
          episode_id: string
          host_id: string
          id?: string
          is_playing?: boolean
          position?: number
          title?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          episode_id?: string
          host_id?: string
          id?: string
          is_playing?: boolean
          position?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_anime: {
        Row: {
          anime_id: string
          status: Database["public"]["Enums"]["list_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          anime_id: string
          status: Database["public"]["Enums"]["list_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          anime_id?: string
          status?: Database["public"]["Enums"]["list_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_anime_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          episode_id: string
          id: string
          user_id: string
          watched_at: string
        }
        Insert: {
          episode_id: string
          id?: string
          user_id: string
          watched_at?: string
        }
        Update: {
          episode_id?: string
          id?: string
          user_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buy_xir_item: { Args: { _item: string }; Returns: Json }
      claim_daily_reward: { Args: never; Returns: Json }
      save_xir_cosmetics: {
        Args: { _name_color: string | null; _profile_theme: Json | null; _site_theme: Json | null; _vip_badge: boolean }
        Returns: undefined
      }
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
      list_status: "watching" | "completed" | "plan" | "dropped"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      list_status: ["watching", "completed", "plan", "dropped"],
    },
  },
} as const
