import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export interface Comment {
  id: string;
  manga_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_spoiler: boolean;
  is_approved: boolean;
  like_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    username: string;
    avatar_url: string | null;
    user_role: string | null;
  };
  user_like?: {
    is_like: boolean;
  } | null;
  replies?: Comment[];
}

export interface CommentInput {
  manga_id: string;
  content: string;
  is_spoiler?: boolean;
  parent_id?: string | null;
}

export function useComments(mangaId: string | undefined) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load comments
  const loadComments = async () => {
    if (!mangaId) return;

    try {
      setLoading(true);

      // Fetch top-level comments (parent_id is null) with LEFT JOIN for anonymous users
      const { data: topLevelComments, error } = await supabase
        .from('comments' as any)
        .select(`
          *,
          user:profiles!comments_user_id_fkey (
            username,
            avatar_url,
            user_role
          )
        `)
        .eq('manga_id', mangaId)
        .is('parent_id', null)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process anonymous comments - set default values when user_id is null
      const processedComments = (topLevelComments || []).map((comment: any) => {
        // If user_id is null (anonymous comment), set default user info
        if (!comment.user_id) {
          comment.user = {
            username: 'Anonim',
            avatar_url: null,
            user_role: null
          };
        }
        return comment;
      });

      // Fetch replies for each top-level comment
      const commentsWithReplies = await Promise.all(
        processedComments.map(async (comment: any) => {
          const { data: replies, error: repliesError } = await supabase
            .from('comments' as any)
            .select(`
              *,
              user:profiles!comments_user_id_fkey (
                username,
                avatar_url,
                user_role
              )
            `)
            .eq('parent_id', comment.id)
            .eq('is_approved', true)
            .order('created_at', { ascending: true });

          if (repliesError) {
            console.error('Error loading replies:', repliesError);
            return { ...comment, replies: [] };
          }

          // Process anonymous replies - set default values when user_id is null
          const processedReplies = (replies || []).map((reply: any) => {
            // If user_id is null (anonymous reply), set default user info
            if (!reply.user_id) {
              reply.user = {
                username: 'Anonim',
                avatar_url: null,
                user_role: null
              };
            }
            return reply;
          });

          // Fetch user likes for replies
          let repliesWithLikes = processedReplies;
          if (user && processedReplies && processedReplies.length > 0) {
            const replyIds = processedReplies.map((r: any) => r.id);
            const { data: userLikes } = await supabase
              .from('comment_likes' as any)
              .select('comment_id, is_like')
              .eq('user_id', user.id)
              .in('comment_id', replyIds);

            repliesWithLikes = processedReplies.map((reply: any) => ({
              ...reply,
              user_like: userLikes?.find((like: any) => like.comment_id === reply.id) || null,
            }));
          }

          return { ...comment, replies: repliesWithLikes };
        })
      );

      // Fetch user likes for top-level comments
      if (user && commentsWithReplies.length > 0) {
        const commentIds = commentsWithReplies.map((c: any) => c.id);
        const { data: userLikes } = await supabase
          .from('comment_likes' as any)
          .select('comment_id, is_like')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);

        const finalComments = commentsWithReplies.map((comment: any) => ({
          ...comment,
          user_like: userLikes?.find((like: any) => like.comment_id === comment.id) || null,
        }));

        setComments(finalComments);
      } else {
        setComments(commentsWithReplies);
      }
    } catch (error: any) {
      console.error('Error loading comments:', error);
      toast.error('Yorumlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Add comment
  const addComment = async (input: CommentInput): Promise<boolean> => {
    if (!input.content || input.content.trim().length === 0) {
      toast.error('Yorum içeriği boş olamaz');
      return false;
    }

    if (input.content.length > 500) {
      toast.error('Yorum 500 karakterden uzun olamaz');
      return false;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('comments' as any)
        .insert({
          manga_id: input.manga_id,
          user_id: user?.id || null, // Support both authenticated and anonymous users
          content: input.content.trim(),
          is_spoiler: input.is_spoiler || false,
          parent_id: input.parent_id || null,
        });

      if (error) throw error;

      toast.success('Yorum başarıyla eklendi');
      await loadComments(); // Reload comments
      return true;
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Yorum eklenirken hata oluştu');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Update comment
  const updateComment = async (commentId: string, content: string, is_spoiler: boolean): Promise<boolean> => {
    if (!user) {
      toast.error('Yorum düzenlemek için giriş yapmalısınız');
      return false;
    }

    if (!content || content.trim().length === 0) {
      toast.error('Yorum içeriği boş olamaz');
      return false;
    }

    if (content.length > 500) {
      toast.error('Yorum 500 karakterden uzun olamaz');
      return false;
    }

    try {
      const { error } = await supabase
        .from('comments' as any)
        .update({
          content: content.trim(),
          is_spoiler,
        })
        .eq('id', commentId)
        .eq('user_id', user.id); // Ensure user owns the comment

      if (error) throw error;

      toast.success('Yorum güncellendi');
      await loadComments();
      return true;
    } catch (error: any) {
      console.error('Error updating comment:', error);
      toast.error('Yorum güncellenirken hata oluştu');
      return false;
    }
  };

  // Delete comment
  const deleteComment = async (commentId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Yorum silmek için giriş yapmalısınız');
      return false;
    }

    try {
      const { error } = await supabase
        .from('comments' as any)
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Ensure user owns the comment

      if (error) throw error;

      toast.success('Yorum silindi');
      await loadComments();
      return true;
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error('Yorum silinirken hata oluştu');
      return false;
    }
  };

  // Toggle like/dislike
  const toggleLike = async (commentId: string, isLike: boolean): Promise<boolean> => {
    if (!user) {
      toast.error('Beğenmek için giriş yapmalısınız');
      return false;
    }

    try {
      // Check if user already liked/disliked
      const { data: existingLike } = await supabase
        .from('comment_likes' as any)
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        // If same action, remove the like
        if ((existingLike as any).is_like === isLike) {
          const { error } = await supabase
            .from('comment_likes' as any)
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id);

          if (error) throw error;
        } else {
          // If different action, update
          const { error } = await supabase
            .from('comment_likes' as any)
            .update({ is_like: isLike })
            .eq('comment_id', commentId)
            .eq('user_id', user.id);

          if (error) throw error;
        }
      } else {
        // Insert new like
        const { error } = await supabase
          .from('comment_likes' as any)
          .insert({
            comment_id: commentId,
            user_id: user.id,
            is_like: isLike,
          });

        if (error) throw error;
      }

      await loadComments(); // Reload to get updated like counts
      return true;
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error('Beğeni güncellenirken hata oluştu');
      return false;
    }
  };

  // Load comments on mount and when mangaId changes
  useEffect(() => {
    loadComments();
  }, [mangaId, user?.id]);

  return {
    comments,
    loading,
    submitting,
    addComment,
    updateComment,
    deleteComment,
    toggleLike,
    reloadComments: loadComments,
  };
}
