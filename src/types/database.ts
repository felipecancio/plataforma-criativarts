/**
 * Tipos do schema Supabase (public).
 * Espelha as migrations em `supabase/migrations/`.
 *
 * Para regenerar via CLI (quando o projeto estiver linkado):
 *   npm run db:types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          quantity: number;
          style: string;
          price: number;
          compare_at_price: number;
          sold_count: number;
          image: string;
          gallery: string[];
          sort_order: number;
          is_active: boolean;
          storage_provider: string | null;
          storage_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          slug: string;
          quantity: number;
          style?: string;
          price: number;
          compare_at_price: number;
          sold_count?: number;
          image: string;
          gallery?: string[];
          sort_order?: number;
          is_active?: boolean;
          storage_provider?: string | null;
          storage_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          quantity?: number;
          style?: string;
          price?: number;
          compare_at_price?: number;
          sold_count?: number;
          image?: string;
          gallery?: string[];
          sort_order?: number;
          is_active?: boolean;
          storage_provider?: string | null;
          storage_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status: Database["public"]["Enums"]["order_status"];
          currency: string;
          subtotal: number;
          total: number;
          customer_email: string | null;
          payment_provider: string | null;
          payment_id: string | null;
          preference_id: string | null;
          paid_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: Database["public"]["Enums"]["order_status"];
          currency?: string;
          subtotal: number;
          total: number;
          customer_email?: string | null;
          payment_provider?: string | null;
          payment_id?: string | null;
          preference_id?: string | null;
          paid_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
          currency?: string;
          subtotal?: number;
          total?: number;
          customer_email?: string | null;
          payment_provider?: string | null;
          payment_id?: string | null;
          preference_id?: string | null;
          paid_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_slug: string;
          unit_price: number;
          quantity: number;
          line_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_slug: string;
          unit_price: number;
          quantity?: number;
          line_total: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          product_slug?: string;
          unit_price?: number;
          quantity?: number;
          line_total?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      user_library: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          order_id: string;
          order_item_id: string | null;
          status: Database["public"]["Enums"]["library_status"];
          granted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          order_id: string;
          order_item_id?: string | null;
          status?: Database["public"]["Enums"]["library_status"];
          granted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          order_id?: string;
          order_item_id?: string | null;
          status?: Database["public"]["Enums"]["library_status"];
          granted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_library_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_library_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_library_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_library_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      grant_library_from_paid_order: {
        Args: { p_order_id: string };
        Returns: number;
      };
      record_order_payment: {
        Args: {
          p_order_id: string;
          p_payment_id: string;
          p_mp_status: string;
          p_mp_status_detail?: string | null;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      sync_my_paid_orders_library: {
        Args: Record<string, never>;
        Returns: number;
      };
      grant_library_for_order: {
        Args: {
          p_order_id: string;
          p_product_ids?: string[] | null;
        };
        Returns: number;
      };
      finalize_order_from_mercadopago: {
        Args: {
          p_order_id: string;
          p_payment_id: string;
          p_mp_status: string;
          p_mp_status_detail?: string | null;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      claim_order_access_email: {
        Args: { p_order_id: string };
        Returns: boolean;
      };
      mark_order_access_email_sent: {
        Args: {
          p_order_id: string;
          p_resend_id?: string | null;
        };
        Returns: undefined;
      };
      release_order_access_email_claim: {
        Args: {
          p_order_id: string;
          p_error?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      // Representados como text + check no SQL; tipados aqui para o app
      order_status:
        | "pending"
        | "paid"
        | "cancelled"
        | "refunded"
        | "failed"
        | "expired";
      library_status: "active" | "revoked";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type ProductRow = Tables<"products">;
export type ProfileRow = Tables<"profiles">;
export type OrderRow = Tables<"orders">;
export type OrderItemRow = Tables<"order_items">;
export type UserLibraryRow = Tables<"user_library">;
