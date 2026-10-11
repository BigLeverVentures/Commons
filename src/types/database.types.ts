export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      auth_email_allowlist: {
        Row: {
          id: number
          email: string
          created_at: string
        }
        Insert: {
          id?: number
          email: string
          created_at?: string
        }
        Update: {
          id?: number
          email?: string
          created_at?: string
        }
        Relationships: []
      }
      fellows: {
        Row: {
          id: string
          email: string
          name: string | null
          cohort: string | null
          location: string | null
          avatar_path: string | null
          bio: string | null
          interests?: string[]
          contribution_preferences?: string[]
          personal_links?: Json
          avatar_style?: string | null
          introduction_emails?: boolean
          email_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          cohort?: string | null
          location?: string | null
          avatar_path?: string | null
          bio?: string | null
          interests?: string[]
          contribution_preferences?: string[]
          personal_links?: Json
          avatar_style?: string | null
          introduction_emails?: boolean
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          cohort?: string | null
          location?: string | null
          avatar_path?: string | null
          bio?: string | null
          interests?: string[]
          contribution_preferences?: string[]
          personal_links?: Json
          avatar_style?: string | null
          introduction_emails?: boolean
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          description_mentions?: import('../lib/mentions').FellowMention[]
          outcome_mentions?: import('../lib/mentions').FellowMention[]
          description: string
          collaborator_credits?: import('../lib/collaborator-credits').CollaboratorCredit[] | null
          collaborators: string[]
          tags: string[]
          status: string
          is_public: boolean
          topic: string | null
          outcome_summary: string | null
          outcome_url: string | null
          participation?: import('../lib/invitations').Participation | null
          share_target?: import('../lib/share-destination').ShareTarget | null
          sharing?: import('../lib/invitations').Sharing | null
          participation_published_at?: string | null
          sharing_published_at?: string | null
          confirmed_at?: string | null
          attachment?: Json | null
          link_preview: Json | null
          built_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          description_mentions?: import('../lib/mentions').FellowMention[]
          outcome_mentions?: import('../lib/mentions').FellowMention[]
          description: string
          collaborator_credits?: import('../lib/collaborator-credits').CollaboratorCredit[] | null
          collaborators?: string[]
          tags?: string[]
          status?: string
          is_public?: boolean
          topic?: string | null
          outcome_summary?: string | null
          outcome_url?: string | null
          participation?: import('../lib/invitations').Participation | null
          share_target?: import('../lib/share-destination').ShareTarget | null
          sharing?: import('../lib/invitations').Sharing | null
          participation_published_at?: string | null
          sharing_published_at?: string | null
          confirmed_at?: string | null
          attachment?: Json | null
          link_preview?: Json | null
          built_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          description_mentions?: import('../lib/mentions').FellowMention[]
          outcome_mentions?: import('../lib/mentions').FellowMention[]
          description?: string
          collaborator_credits?: import('../lib/collaborator-credits').CollaboratorCredit[] | null
          collaborators?: string[]
          tags?: string[]
          status?: string
          is_public?: boolean
          topic?: string | null
          outcome_summary?: string | null
          outcome_url?: string | null
          participation?: import('../lib/invitations').Participation | null
          share_target?: import('../lib/share-destination').ShareTarget | null
          sharing?: import('../lib/invitations').Sharing | null
          participation_published_at?: string | null
          sharing_published_at?: string | null
          confirmed_at?: string | null
          attachment?: Json | null
          link_preview?: Json | null
          built_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'fellows'
            referencedColumns: ['id']
          }
        ]
      }
      responses: {
        Row: {
          id: string
          post_id: string
          user_id: string
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          note: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          note?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'responses_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'responses_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'fellows'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
