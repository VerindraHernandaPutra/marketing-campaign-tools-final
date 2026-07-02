import { createContext, useContext } from 'react';
import type { NotificationType } from './NotificationToast';

export interface NotificationContextType {
  show: (title: string, message: string, type?: NotificationType) => void;
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
