import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Reply, Edit, Trash2, AlertCircle, MoreVertical } from 'lucide-react';
import { Comment } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import CommentForm from './CommentForm';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface CommentItemProps {
  comment: Comment;
  onToggleLike: (commentId: string, isLike: boolean) => Promise<boolean>;
  onReply: (content: string, isSpoiler: boolean) => Promise<boolean>;
  onEdit: (commentId: string, content: string, isSpoiler: boolean) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
  submitting?: boolean;
  isReply?: boolean;
}

export default function CommentItem({
  comment,
  onToggleLike,
  onReply,
  onEdit,
  onDelete,
  submitting = false,
  isReply = false,
}: CommentItemProps) {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editIsSpoiler, setEditIsSpoiler] = useState(comment.is_spoiler);
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isOwner = user?.id === comment.user_id;
  const userLike = comment.user_like;

  const handleReplySubmit = async (content: string, isSpoiler: boolean) => {
    const success = await onReply(content, isSpoiler);
    if (success) {
      setShowReplyForm(false);
    }
    return success;
  };

  const handleEditSubmit = async () => {
    const success = await onEdit(comment.id, editContent, editIsSpoiler);
    if (success) {
      setShowEditForm(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
      await onDelete(comment.id);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: tr,
  });

  // Determine user role badge
  const getRoleBadge = () => {
    if (!comment.user?.user_role) return null;
    
    const roleColors: Record<string, string> = {
      admin: 'bg-red-500/20 text-red-400 border-red-500/30',
      moderator: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      fansub: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };

    const roleNames: Record<string, string> = {
      admin: 'Admin',
      moderator: 'Moderatör',
      fansub: 'Fansub',
    };

    const role = comment.user.user_role;
    if (!roleColors[role]) return null;

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[role]}`}>
        {roleNames[role]}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isReply ? 'ml-12' : ''}`}
    >
      <div className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-4 border border-gray-700/20 hover:border-gray-700/40 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {comment.user?.username?.[0]?.toUpperCase() || 'U'}
            </div>

            {/* User info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-200">
                  {comment.user?.username || 'Anonim'}
                </span>
                {getRoleBadge()}
              </div>
              <span className="text-xs text-gray-500">{timeAgo}</span>
            </div>
          </div>

          {/* Actions menu */}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-700/30 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setShowEditForm(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Düzenle
                    </button>
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Sil
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Content */}
        {showEditForm ? (
          <div className="mb-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none mb-2"
            />
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={editIsSpoiler}
                onChange={(e) => setEditIsSpoiler(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-900/50 text-blue-500"
              />
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Spoiler içerir
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleEditSubmit}
                disabled={submitting}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                Kaydet
              </button>
              <button
                onClick={() => setShowEditForm(false)}
                className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            {comment.is_spoiler && !showSpoiler ? (
              <div className="relative">
                <div className="blur-sm select-none">
                  <p className="text-gray-300 leading-relaxed">{comment.content}</p>
                </div>
                <button
                  onClick={() => setShowSpoiler(true)}
                  className="absolute inset-0 flex items-center justify-center bg-gray-900/50 hover:bg-gray-900/30 transition-colors rounded-lg"
                >
                  <span className="flex items-center gap-2 text-yellow-400 font-medium">
                    <AlertCircle className="w-5 h-5" />
                    Spoiler içerir - Görmek için tıklayın
                  </span>
                </button>
              </div>
            ) : (
              <p className="text-gray-300 leading-relaxed">{comment.content}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 text-sm">
          {/* Like */}
          <button
            onClick={() => onToggleLike(comment.id, true)}
            disabled={!user || submitting}
            className={`flex items-center gap-1.5 transition-colors ${
              userLike?.is_like
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-blue-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>{comment.like_count > 0 ? comment.like_count : ''}</span>
          </button>

          {/* Dislike */}
          <button
            onClick={() => onToggleLike(comment.id, false)}
            disabled={!user || submitting}
            className={`flex items-center gap-1.5 transition-colors ${
              userLike && !userLike.is_like
                ? 'text-red-400'
                : 'text-gray-400 hover:text-red-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ThumbsDown className="w-4 h-4" />
          </button>

          {/* Reply (only for top-level comments) */}
          {!isReply && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              disabled={!user || submitting}
              className="flex items-center gap-1.5 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Reply className="w-4 h-4" />
              Yanıtla
              {comment.reply_count > 0 && (
                <span className="text-xs">({comment.reply_count})</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Reply form */}
      <AnimatePresence>
        {showReplyForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 ml-12"
          >
            <CommentForm
              mangaId={comment.manga_id}
              parentId={comment.id}
              onSubmit={handleReplySubmit}
              onCancel={() => setShowReplyForm(false)}
              submitting={submitting}
              placeholder="Yanıtınızı yazın..."
              buttonText="Yanıtla"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onToggleLike={onToggleLike}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              submitting={submitting}
              isReply={true}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
