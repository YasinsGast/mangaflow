import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('E-posta doğrulanıyor...');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  async function handleAuthCallback() {
    try {
      // Get the hash fragment from the URL
      const hashFragment = window.location.hash;

      if (hashFragment && hashFragment.length > 0) {
        // Supabase will automatically handle the session from the hash
        // We just need to check if the user is now authenticated
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Error getting user:', error.message);
          setStatus('error');
          setMessage(error.message || 'Doğrulama başarısız oldu');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login?error=' + encodeURIComponent(error.message));
          }, 3000);
          return;
        }

        if (user) {
          setStatus('success');
          setMessage('E-posta başarıyla doğrulandı!');
          
          // Redirect to home page after 2 seconds
          setTimeout(() => {
            navigate('/');
          }, 2000);
          return;
        }
      }

      // If we get here, something went wrong
      setStatus('error');
      setMessage('Doğrulama bağlantısı bulunamadı');
      setTimeout(() => {
        navigate('/login?error=No session found');
      }, 3000);
    } catch (error: any) {
      console.error('Callback error:', error);
      setStatus('error');
      setMessage(error.message || 'Bir hata oluştu');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="inline-block mb-6"
        >
          {status === 'loading' && (
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-white animate-spin" />
            </div>
          )}
          
          {status === 'success' && (
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          )}
          
          {status === 'error' && (
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center">
              <XCircle className="h-12 w-12 text-white" />
            </div>
          )}
        </motion.div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          {status === 'loading' && 'Doğrulanıyor...'}
          {status === 'success' && 'Başarılı!'}
          {status === 'error' && 'Hata'}
        </h1>
        
        <p className="text-gray-300">
          {message}
        </p>
      </motion.div>
    </div>
  );
}
