/**
 * TableFlow Database typings.
 *
 * Origin: hand-aligned from `supabase/BOOTSTRAP_TABLEFLOW.sql` + verified app contracts
 * (not live `supabase gen types` — regenerate procedure documented in docs/refactoring/B10_TYPES.md).
 *
 * Domain models in `core/models/models.ts` mirror these Rows for app use.
 * Do not invent columns or RPC signatures beyond bootstrap/code evidence.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = 'ADMIN' | 'USER' | 'RECEPTOR';
export type TableShape = 'circle' | 'rectangle';
export type TableType = 'TABLE' | 'RESERVED';
export type FloorElementKind = 'wall' | 'zone' | 'door' | 'text';
export type OrderStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type OrderItemStatus = 'PENDING' | 'PLACED' | 'CANCELLED';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: AppRole;
          username: string | null;
          /** Present after 0017 / remote company migration. Null for legacy users. */
          company_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: AppRole;
          username?: string | null;
          company_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: AppRole;
          username?: string | null;
          company_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      companies: {
        Row: {
          id: string;
          name: string;
          onboarding_plan_done: boolean;
          onboarding_products_done: boolean;
          onboarding_users_done: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          onboarding_plan_done?: boolean;
          onboarding_products_done?: boolean;
          onboarding_users_done?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          onboarding_plan_done?: boolean;
          onboarding_products_done?: boolean;
          onboarding_users_done?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      app_secrets: {
        Row: {
          id: string;
          secret_key: string;
          description: string | null;
          secret_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          secret_key: string;
          description?: string | null;
          secret_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          secret_key?: string;
          description?: string | null;
          secret_hash?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      floor_plans: {
        Row: {
          id: string;
          name: string;
          width: number;
          height: number;
          is_active: boolean;
          is_locked: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          width?: number;
          height?: number;
          is_active?: boolean;
          is_locked?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          width?: number;
          height?: number;
          is_active?: boolean;
          is_locked?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      floor_plan_elements: {
        Row: {
          id: string;
          floor_plan_id: string;
          kind: FloorElementKind;
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          points: Json | null;
          label: string | null;
          font_size: number | null;
          z_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          floor_plan_id: string;
          kind: FloorElementKind;
          x: number;
          y: number;
          width?: number;
          height?: number;
          rotation?: number;
          points?: Json | null;
          label?: string | null;
          font_size?: number | null;
          z_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          floor_plan_id?: string;
          kind?: FloorElementKind;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          rotation?: number;
          points?: Json | null;
          label?: string | null;
          font_size?: number | null;
          z_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      tables: {
        Row: {
          id: string;
          floor_plan_id: string;
          type: TableType;
          number: number;
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          shape: TableShape;
          attended: boolean;
          observation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          floor_plan_id: string;
          type?: TableType;
          number: number;
          x: number;
          y: number;
          width?: number;
          height?: number;
          rotation?: number;
          shape?: TableShape;
          attended?: boolean;
          observation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          floor_plan_id?: string;
          type?: TableType;
          number?: number;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          rotation?: number;
          shape?: TableShape;
          attended?: boolean;
          observation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      reservations: {
        Row: {
          id: string;
          table_id: string;
          name: string;
          reservation_date: string;
          reservation_time: string | null;
          people: number;
          notes: string | null;
          status: ReservationStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_id: string;
          name: string;
          reservation_date: string;
          reservation_time?: string | null;
          people?: number;
          notes?: string | null;
          status?: ReservationStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_id?: string;
          name?: string;
          reservation_date?: string;
          reservation_time?: string | null;
          people?: number;
          notes?: string | null;
          status?: ReservationStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      product_categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          category_id: string;
          company_id: string | null;
          name: string;
          price: number | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          company_id?: string | null;
          name: string;
          price?: number | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          company_id?: string | null;
          name?: string;
          price?: number | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };

      orders: {
        Row: {
          id: string;
          table_id: string;
          created_by: string;
          status: OrderStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_id: string;
          created_by: string;
          status?: OrderStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_id?: string;
          created_by?: string;
          status?: OrderStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          status: OrderItemStatus;
          attended: boolean;
          created_by: string;
          placed_by: string | null;
          placed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          status?: OrderItemStatus;
          attended?: boolean;
          created_by: string;
          placed_by?: string | null;
          placed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          status?: OrderItemStatus;
          attended?: boolean;
          created_by?: string;
          placed_by?: string | null;
          placed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      replace_floor_plan_snapshot: {
        Args: {
          p_floor_plan_id: string;
          /** JSON array of element payloads (transport; not a typed composite). */
          p_elements: Json;
          /** JSON array of table payloads including ids. */
          p_tables: Json;
        };
        Returns: undefined;
      };

      verify_app_secret: {
        Args: {
          p_key: string;
          p_secret: string;
        };
        Returns: boolean;
      };

      assign_products_to_table: {
        Args: {
          p_table_id: string;
          /** JSON array of `{ product_id, quantity }`. */
          p_items: Json;
        };
        Returns: string;
      };

      set_table_attended: {
        Args: {
          p_table_id: string;
          p_attended: boolean;
        };
        Returns: undefined;
      };

      set_table_observation: {
        Args: {
          p_table_id: string;
          p_observation: string | null;
        };
        Returns: undefined;
      };

      delete_table_with_orders: {
        Args: {
          p_table_id: string;
          p_secret: string;
          p_force: boolean;
        };
        /** Dynamic jsonb `{ ok, reason }` — adapt at service boundary. */
        Returns: Json;
      };

      product_has_order_history: {
        Args: { p_product_id: string };
        Returns: boolean;
      };

      category_has_order_history: {
        Args: { p_category_id: string };
        Returns: boolean;
      };

      delete_product_safe: {
        Args: { p_product_id: string };
        Returns: boolean;
      };

      delete_category_safe: {
        Args: { p_category_id: string };
        Returns: boolean;
      };
    };

    Enums: {
      app_role: AppRole;
      table_shape: TableShape;
      table_type: TableType;
      floor_element_kind: FloorElementKind;
      order_status: OrderStatus;
      order_item_status: OrderItemStatus;
      reservation_status: ReservationStatus;
    };

    CompositeTypes: Record<string, never>;
  };
}

/** Helpers mirroring supabase-js generated helpers. */
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
