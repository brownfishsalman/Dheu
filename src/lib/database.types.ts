// Hand-written to mirror supabase/migrations/*.sql. Keep the two in sync.

export type NotificationType = "like" | "follow" | "comment" | "story_reaction" | "follow_request" | "follow_accepted";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Database = {
  public: {
    Tables: {
      invite_codes: {
        Row: {
          id: string;
          code: string;
          note: string;
          max_uses: number;
          use_count: number;
          expires_at: string | null;
          disabled: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          note?: string;
          max_uses?: number;
          use_count?: number;
          expires_at?: string | null;
          disabled?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          note?: string;
          max_uses?: number;
          use_count?: number;
          expires_at?: string | null;
          disabled?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invite_codes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string;
          bio: string;
          avatar_path: string | null;
          is_admin: boolean;
          banned_at: string | null;
          invite_code_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name: string;
          bio?: string;
          avatar_path?: string | null;
          is_admin?: boolean;
          banned_at?: string | null;
          invite_code_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string;
          bio?: string;
          avatar_path?: string | null;
          is_admin?: boolean;
          banned_at?: string | null;
          invite_code_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_invite_code_id_fkey";
            columns: ["invite_code_id"];
            isOneToOne: false;
            referencedRelation: "invite_codes";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: { follower_id: string; following_id: string; created_at: string };
        Insert: { follower_id: string; following_id: string; created_at?: string };
        Update: { follower_id?: string; following_id?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          caption: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          caption?: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          caption?: string;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      post_images: {
        Row: {
          id: string;
          post_id: string;
          path: string;
          width: number;
          height: number;
          position: number;
        };
        Insert: {
          id?: string;
          post_id: string;
          path: string;
          width: number;
          height: number;
          position?: number;
        };
        Update: {
          id?: string;
          post_id?: string;
          path?: string;
          width?: number;
          height?: number;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_images_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "post_feed";
            referencedColumns: ["id"];
          },
        ];
      };
      post_likes: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string; created_at?: string };
        Update: { post_id?: string; user_id?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "post_feed";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "post_feed";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      stories: {
        Row: {
          id: string;
          author_id: string;
          image_path: string;
          width: number;
          height: number;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          image_path: string;
          width: number;
          height: number;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          image_path?: string;
          width?: number;
          height?: number;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      story_views: {
        Row: { story_id: string; viewer_id: string; viewed_at: string };
        Insert: { story_id: string; viewer_id: string; viewed_at?: string };
        Update: { story_id?: string; viewer_id?: string; viewed_at?: string };
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey";
            columns: ["viewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      story_reactions: {
        Row: { story_id: string; user_id: string; emoji: string; created_at: string };
        Insert: { story_id: string; user_id: string; emoji: string; created_at?: string };
        Update: { story_id?: string; user_id?: string; emoji?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      story_highlights: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          cover_story_id: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          cover_story_id?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          cover_story_id?: string | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_highlights_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_highlights_cover_story_id_fkey";
            columns: ["cover_story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      highlight_items: {
        Row: { highlight_id: string; story_id: string; added_at: string };
        Insert: { highlight_id: string; story_id: string; added_at?: string };
        Update: { highlight_id?: string; story_id?: string; added_at?: string };
        Relationships: [
          {
            foreignKeyName: "highlight_items_highlight_id_fkey";
            columns: ["highlight_id"];
            isOneToOne: false;
            referencedRelation: "story_highlights";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "highlight_items_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          created_at: string;
          last_message_at: string | null;
        };
        Insert: {
          id?: string;
          user_a: string;
          user_b: string;
          created_at?: string;
          last_message_at?: string | null;
        };
        Update: {
          id?: string;
          user_a?: string;
          user_b?: string;
          created_at?: string;
          last_message_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_user_a_fkey";
            columns: ["user_a"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_user_b_fkey";
            columns: ["user_b"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          story_id: string | null;
          image_path: string | null;
          image_expires_at: string | null;
          reply_to_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body?: string;
          story_id?: string | null;
          image_path?: string | null;
          image_expires_at?: string | null;
          reply_to_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          story_id?: string | null;
          image_path?: string | null;
          image_expires_at?: string | null;
          reply_to_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey";
            columns: ["reply_to_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string;
          type: NotificationType;
          post_id: string | null;
          comment_id: string | null;
          story_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id: string;
          type: NotificationType;
          post_id?: string | null;
          comment_id?: string | null;
          story_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string;
          type?: NotificationType;
          post_id?: string | null;
          comment_id?: string | null;
          story_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "post_feed";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string; created_at?: string };
        Update: { blocker_id?: string; blocked_id?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_requests: {
        Row: { requester_id: string; target_id: string; created_at: string };
        Insert: { requester_id: string; target_id: string; created_at?: string };
        Update: { requester_id?: string; target_id?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "follow_requests_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_requests_target_id_fkey";
            columns: ["target_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      announcements: {
        Row: { id: string; author_id: string | null; body: string; created_at: string };
        Insert: { id?: string; author_id?: string | null; body: string; created_at?: string };
        Update: { id?: string; author_id?: string | null; body?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      announcement_reads: {
        Row: { user_id: string; last_read_at: string };
        Insert: { user_id: string; last_read_at?: string };
        Update: { user_id?: string; last_read_at?: string };
        Relationships: [
          {
            foreignKeyName: "announcement_reads_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_reads: {
        Row: { conversation_id: string; user_id: string; last_read_at: string };
        Insert: { conversation_id: string; user_id: string; last_read_at?: string };
        Update: { conversation_id?: string; user_id?: string; last_read_at?: string };
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_reads_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      post_feed: {
        Row: {
          id: string;
          author_id: string;
          caption: string;
          created_at: string;
          expires_at: string;
          like_count: number;
          comment_count: number;
          liked_by_me: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      admin_stats: { Args: Record<string, never>; Returns: Json };
      blocked_either: { Args: { p_a: string; p_b: string }; Returns: boolean };
      block_status: { Args: { p_other: string }; Returns: string | null };
      can_view_content_of: { Args: { p_author: string }; Returns: boolean };
      conversation_blocked: { Args: { p_conversation_id: string }; Returns: boolean };
      accept_follow_request: { Args: { p_requester: string }; Returns: undefined };
      has_blocked_me: { Args: { p_user: string }; Returns: boolean };
      unread_announcement_count: { Args: Record<string, never>; Returns: number };
      is_conversation_member: { Args: { p_conversation_id: string }; Returns: boolean };
      claim_invite_code: { Args: { p_code: string }; Returns: string };
      release_invite_code: { Args: { p_id: string }; Returns: undefined };
      get_or_create_conversation: { Args: { p_other_id: string }; Returns: string };
      unread_counts: {
        Args: Record<string, never>;
        Returns: { conversation_id: string; unread: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience aliases
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];

export type Profile = Tables<"profiles">;
export type Post = Tables<"posts">;
export type PostImage = Tables<"post_images">;
export type Comment = Tables<"comments">;
export type Story = Tables<"stories">;
export type Message = Tables<"messages">;
export type Conversation = Tables<"conversations">;
export type InviteCode = Tables<"invite_codes">;
export type StoryHighlight = Tables<"story_highlights">;
export type Notification = Tables<"notifications">;
export type Announcement = Tables<"announcements">;

// Generic `Rel` is only used to keep the shape documented above.
export type _Relationship = Rel;
