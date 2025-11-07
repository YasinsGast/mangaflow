import { motion } from 'framer-motion';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useComments } from '@/hooks/useComments';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

interface CommentListProps {
  mangaId: string;
}

export default function CommentList({ mangaId }: CommentListProps) {
  const {
    comments,
    loading,
    submitting,
    addComment,
    updateComment,
    deleteComment,
    toggleLike,
  } = useComments(mangaId);

  const handleAddComment = async (content: string, isSpoiler: boolean) => {
    return await addComment({
      manga_id: mangaId,
      content,
      is_spoiler: isSpoiler,
    });
  };

  const handleReply = (parentId: string) => async (content: string, isSpoiler: boolean) => {
    return await addComment({
      manga_id: mangaId,
      content,
      is_spoiler: isSpoiler,
      parent_id: parentId,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-gray-100">
          Yorumlar
          {comments.length > 0 && (
            <span className="ml-2 text-lg text-gray-400">({comments.length})</span>
          )}
        </h2>
      </div>

      {/* Comment form */}
      <CommentForm
        mangaId={mangaId}
        onSubmit={handleAddComment}
        submitting={submitting}
      />

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Comments list */}
          {comments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-gray-800/20 backdrop-blur-sm rounded-xl border border-gray-700/20"
            >
              <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Henüz yorum yok</p>
              <p className="text-gray-500 text-sm mt-2">İlk yorumu siz yapın!</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onToggleLike={toggleLike}
                  onReply={handleReply(comment.id)}
                  onEdit={updateComment}
                  onDelete={deleteComment}
                  submitting={submitting}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
