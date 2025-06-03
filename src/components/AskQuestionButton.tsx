import React, { useState } from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import { AskQuestionModal } from './AskQuestionModal';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface AskQuestionButtonProps {
  coinId: number;
  coinName: string;
  disabled?: boolean;
}

export const AskQuestionButton: React.FC<AskQuestionButtonProps> = ({ 
  coinId, 
  coinName,
  disabled = false 
}) => {
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <MessageCircleQuestion size={18} />
        Ask a Question
      </button>

      {showModal && (
        <AskQuestionModal
          coinId={coinId}
          coinName={coinName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};