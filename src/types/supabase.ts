export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
          role: "student" | "faculty" | "admin";
          display_name: string | null;
          university_id: string | null;
          avatar_url: string | null;
          rating_avg: number | null;
          rating_count: number;
          is_verified: boolean;
        };
        Insert: {
          email: string;
          role?: "student" | "faculty" | "admin";
          display_name?: string;
          university_id?: string;
          avatar_url?: string;
          is_verified?: boolean;
        };
        Update: {
          email?: string;
          role?: "student" | "faculty" | "admin";
          display_name?: string;
          university_id?: string;
          avatar_url?: string;
          is_verified?: boolean;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          icon: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          parent_id?: string;
          icon?: string;
          position?: number;
        };
        Update: {
          name?: string;
          slug?: string;
          parent_id?: string;
          icon?: string;
          position?: number;
        };
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          category_id: string;
          title: string;
          description: string | null;
          price: number;
          original_price: number | null;
          condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
          status: "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "REMOVED" | "EXPIRED";
          images: string[];
          meetup_location_preference: string | null;
          view_count: number;
          is_negotiable: boolean;
          created_at: string;
          updated_at: string;
          expires_at: string | null;
        };
        Insert: {
          seller_id: string;
          category_id: string;
          title: string;
          description?: string;
          price: number;
          original_price?: number;
          condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
          images?: string[];
          meetup_location_preference?: string;
          is_negotiable?: boolean;
          expires_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          price?: number;
          original_price?: number;
          condition?: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
          status?: "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "REMOVED" | "EXPIRED";
          images?: string[];
          meetup_location_preference?: string;
          is_negotiable?: boolean;
          expires_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          listing_id: string | null;
          item_request_id: string | null;
          buyer_id: string;
          seller_id: string;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          listing_id?: string;
          item_request_id?: string;
          buyer_id: string;
          seller_id: string;
        };
        Update: {
          listing_id?: string;
          item_request_id?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: "TEXT" | "OFFER" | "COUNTER_OFFER" | "SYSTEM" | "IMAGE";
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: "TEXT" | "OFFER" | "COUNTER_OFFER" | "SYSTEM" | "IMAGE";
        };
        Update: {
          content?: string;
          message_type?: "TEXT" | "OFFER" | "COUNTER_OFFER" | "SYSTEM" | "IMAGE";
          read_at?: string;
        };
      };
      offers: {
        Row: {
          id: string;
          conversation_id: string;
          listing_id: string;
          buyer_id: string;
          amount: number;
          note: string | null;
          status: "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED" | "CANCELLED" | "EXPIRED";
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          conversation_id: string;
          listing_id: string;
          buyer_id: string;
          amount: number;
          note?: string;
        };
        Update: {
          amount?: number;
          note?: string;
          status?: "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED" | "CANCELLED" | "EXPIRED";
          responded_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          agreed_price: number;
          meetup_location_id: string | null;
          scheduled_at: string | null;
          status: "PENDING" | "RESERVED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";
          buyer_confirmed_at: string | null;
          seller_confirmed_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          agreed_price: number;
        };
        Update: {
          agreed_price?: number;
          meetup_location_id?: string;
          scheduled_at?: string;
          status?: "PENDING" | "RESERVED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";
          buyer_confirmed_at?: string;
          seller_confirmed_at?: string;
          completed_at?: string;
        };
      };
      meetup_locations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          building: string | null;
          floor: string | null;
          room: string | null;
          landmark: string | null;
          security_present: boolean;
          lighting_condition: "well_lit" | "moderate" | "dim";
          campus_classification: "indoor" | "outdoor" | "covered";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          security_present?: boolean;
          lighting_condition?: "well_lit" | "moderate" | "dim";
          campus_classification?: "indoor" | "outdoor" | "covered";
          is_active?: boolean;
        };
        Update: {
          name?: string;
          description?: string;
          building?: string;
          floor?: string;
          room?: string;
          landmark?: string;
          security_present?: boolean;
          lighting_condition?: "well_lit" | "moderate" | "dim";
          campus_classification?: "indoor" | "outdoor" | "covered";
          is_active?: boolean;
        };
      };
      ratings: {
        Row: {
          id: string;
          transaction_id: string;
          rater_id: string;
          rated_id: string;
          score: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          transaction_id: string;
          rater_id: string;
          rated_id: string;
          score: number;
          comment?: string;
        };
        Update: {
          score?: number;
          comment?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "student" | "faculty" | "admin";
      listing_condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
      listing_status: "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "REMOVED" | "EXPIRED";
      message_type: "TEXT" | "OFFER" | "COUNTER_OFFER" | "SYSTEM" | "IMAGE";
      offer_status: "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED" | "CANCELLED" | "EXPIRED";
      transaction_status: "PENDING" | "RESERVED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";
      lighting_condition: "well_lit" | "moderate" | "dim";
      campus_classification: "indoor" | "outdoor" | "covered";
    };
  };
};