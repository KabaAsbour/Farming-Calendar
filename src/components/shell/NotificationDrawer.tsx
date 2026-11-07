import React from 'react';
import { X, AlertTriangle, Clock, CheckCircle2, Package, Calendar, ArrowRight } from 'lucide-react';

export interface NotificationItem {
  id: string;
  type: 'warning' | 'info' | 'success' | 'urgent';
  title: string;
  message: string;
  timestamp: string;
  targetTab?: string;
  read: boolean;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onNavigate: (tab: string) => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onNavigate
}: NotificationDrawerProps) {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[#173F35]/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-[#14201A] border-l border-[#E1E7E0] dark:border-[#24352C] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#E1E7E0] dark:border-[#24352C] bg-[#F7F8F4] dark:bg-[#18261F] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-[#202924] dark:text-[#EEF4F0]">
                Centre d'Alertes & Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  {unreadCount} non lues
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-[#2F7D4A] dark:text-[#77A96B] hover:underline font-medium"
              >
                Tout marquer lu
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[#66736B] hover:text-[#202924] hover:bg-[#E1E7E0]/50 dark:text-[#9EB0A5] dark:hover:text-[#EEF4F0] dark:hover:bg-[#283D33]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#66736B] dark:text-[#9EB0A5]">
                Aucune alerte opérationnelle en attente.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (notif.targetTab) {
                      onNavigate(notif.targetTab);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    notif.read
                      ? 'bg-[#F7F8F4]/50 dark:bg-[#18261F]/30 border-[#E1E7E0] dark:border-[#283D33]'
                      : 'bg-white dark:bg-[#1B2B23] border-[#CDD6CC] dark:border-[#334A3E] shadow-xs'
                  } hover:border-[#2F7D4A] dark:hover:border-[#77A96B]`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#F0F4EE] dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#283D33] flex-shrink-0 mt-0.5">
                      {notif.type === 'urgent' || notif.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : notif.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] truncate">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-[#8A988F] font-mono flex-shrink-0 ml-2">
                          {notif.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      {notif.targetTab && (
                        <div className="flex items-center gap-1 mt-2 text-[11px] text-[#2F7D4A] dark:text-[#77A96B] font-medium">
                          <span>Accéder à l'action</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
