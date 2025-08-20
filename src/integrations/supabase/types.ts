export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          id: string
          title: string
          message: string
          type: string
          order_id: string | null
          customer_name: string | null
          order_code: string | null
          url: string | null
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          type: string
          order_id?: string | null
          customer_name?: string | null
          order_code?: string | null
          url?: string | null
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          type?: string
          order_id?: string | null
          customer_name?: string | null
          order_code?: string | null
          url?: string | null
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_info: {
        Row: {
          created_at: string
          display_order: number
          icon: string | null
          id: number
          image_url: string | null
          is_active: boolean | null
          title: string
          type: string
          updated_at: string
          url: string | null
          value: string
        }
        Insert: {
          created_at?: string
          display_order: number
          icon?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          title: string
          type: string
          updated_at?: string
          url?: string | null
          value: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
          value?: string
        }
        Relationships: []
      }
      emailjs_config: {
        Row: {
          config_name: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          public_key: string
          service_id: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          config_name?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          public_key: string
          service_id: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          config_name?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          public_key?: string
          service_id?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_images: {
        Row: {
          alt_text: string
          created_at: string
          description: string | null
          display_order: number
          id: number
          image_url: string
          is_active: boolean | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          alt_text: string
          created_at?: string
          description?: string | null
          display_order: number
          id?: number
          image_url: string
          is_active?: boolean | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: number
          image_url?: string
          is_active?: boolean | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          assigned_store_id: string | null
          created_at: string
          customer_address: string | null
          customer_city: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string

          id: string
          items: Json | null
          main_store_name: string | null
          order_code: string | null
          order_details: string | null
          order_status: string | null
          status: string | null
          subtotal: number | null
          total_amount: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_store_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_name: string
          customer_notes?: string | null
          customer_phone: string

          id?: string
          items?: Json | null
          main_store_name?: string | null
          order_code?: string | null
          order_details?: string | null
          order_status?: string | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_store_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string

          id?: string
          items?: Json | null
          main_store_name?: string | null
          order_code?: string | null
          order_details?: string | null
          order_status?: string | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_store_id_fkey"
            columns: ["assigned_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          content: string
          content_en: string
          created_at: string
          id: number
          is_active: boolean | null
          title: string
          title_en: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          content_en: string
          created_at?: string
          id?: number
          is_active?: boolean | null
          title: string
          title_en: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_en?: string
          created_at?: string
          id?: number
          is_active?: boolean | null
          title?: string
          title_en?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          additional_images: string | null
          additional_images_list: string[] | null
          barcode: string | null
          category: string | null
          category_ar: string | null
          created_at: string | null
          description: string | null
          description_en: string | null
          detailed_address: string | null
          discount_percent: number | null
          discounted_price: number | null
          id: number
          image_1: string | null
          image_2: string | null
          image_3: string | null
          image_4: string | null
          images: string | null
          is_discounted: boolean | null
          is_featured: boolean | null
          is_popular: boolean | null
          main_image_url: string | null
          main_store_name: string | null
          name: string
          name_en: string | null
          price: number
          published: boolean | null
          slug: string | null
          specifications: string | null
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          additional_images?: string | null
          additional_images_list?: string[] | null
          barcode?: string | null
          category?: string | null
          category_ar?: string | null
          created_at?: string | null
          description?: string | null
          description_en?: string | null
          detailed_address?: string | null
          discount_percent?: number | null
          discounted_price?: number | null
          id?: number
          image_1?: string | null
          image_2?: string | null
          image_3?: string | null
          image_4?: string | null
          images?: string | null
          is_discounted?: boolean | null
          is_featured?: boolean | null
          is_popular?: boolean | null
          main_image_url?: string | null
          main_store_name?: string | null
          name: string
          name_en?: string | null
          price: number
          published?: boolean | null
          slug?: string | null
          specifications?: string | null
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          additional_images?: string | null
          additional_images_list?: string[] | null
          barcode?: string | null
          category?: string | null
          category_ar?: string | null
          created_at?: string | null
          description?: string | null
          description_en?: string | null
          detailed_address?: string | null
          discount_percent?: number | null
          discounted_price?: number | null
          id?: number
          image_1?: string | null
          image_2?: string | null
          image_3?: string | null
          image_4?: string | null
          images?: string | null
          is_discounted?: boolean | null
          is_featured?: boolean | null
          is_popular?: boolean | null
          main_image_url?: string | null
          main_store_name?: string | null
          name?: string
          name_en?: string | null
          price?: number
          published?: boolean | null
          slug?: string | null
          specifications?: string | null
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      secrets: {
        Row: {
          name: string
          value: string
        }
        Insert: {
          name: string
          value: string
        }
        Update: {
          name?: string
          value?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          auto_assign_enabled: boolean
          created_at: string
          id: number
          updated_at: string
        }
        Insert: {
          auto_assign_enabled?: boolean
          created_at?: string
          id?: number
          updated_at?: string
        }
        Update: {
          auto_assign_enabled?: boolean
          created_at?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          created_at: string | null
          id: string
          name: string
          password: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          password?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          password?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          role: string
          store_id: string | null
        }
        Insert: {
          id: string
          role: string
          store_id?: string | null
        }
        Update: {
          id?: string
          role?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
        }
        Insert: {
          created_at?: string | null
          id: string
          is_admin?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_store: {
        Args: { store_name: string; store_password: string }
        Returns: string
      }
      auto_assign_order: {
        Args: { order_id_param: string }
        Returns: undefined
      }
      execute_sql: {
        Args: { sql_query: string }
        Returns: {
          additional_images: string | null
          additional_images_list: string[] | null
          barcode: string | null
          category: string | null
          category_ar: string | null
          created_at: string | null
          description: string | null
          description_en: string | null
          detailed_address: string | null
          discount_percent: number | null
          discounted_price: number | null
          id: number
          image_1: string | null
          image_2: string | null
          image_3: string | null
          image_4: string | null
          images: string | null
          is_discounted: boolean | null
          is_featured: boolean | null
          is_popular: boolean | null
          main_image_url: string | null
          main_store_name: string | null
          name: string
          name_en: string | null
          price: number
          published: boolean | null
          slug: string | null
          specifications: string | null
          stock: number | null
          updated_at: string | null
        }[]
      }
      get_orders_with_products: {
        Args: Record<PropertyKey, never>
        Returns: {
          order_id: string
          customer_name: string
          customer_phone: string
          customer_address: string
          customer_city: string
          product_name: string
          product_price: number
          store_name: string
          created_at: string
          order_code: string
          order_status: string
          assigned_store_id: string
          total_amount: number
          order_details: string
        }[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
