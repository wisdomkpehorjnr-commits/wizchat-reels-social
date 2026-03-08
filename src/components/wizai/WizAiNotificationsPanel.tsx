import { WizAiNotification } from './WizAiPremiumUtils';

interface Props {
  notifications: WizAiNotification[];
  onClose: () => void;
  onMarkRead: () => void;
}

const WizAiNotificationsPanel = ({ notifications, onClose, onMarkRead }: Props) => {
  return (
    <div className="absolute right-2 top-14 z-50 w-72 bg-card border border-border rounded-xl shadow-xl animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-bold text-sm text-foreground">Notifications</span>
        {notifications.some(n => !n.read) && (
          <button onClick={onMarkRead} className="text-xs text-primary hover:underline">
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6">No notifications yet</p>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`px-4 py-3 border-b border-border last:border-b-0 text-sm ${
                !n.read ? 'bg-primary/5' : ''
              }`}
            >
              <p className="text-foreground">{n.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(n.timestamp).toLocaleDateString()} {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </div>
      <button
        onClick={onClose}
        className="w-full text-center text-xs text-muted-foreground py-2 hover:text-foreground"
      >
        Close
      </button>
    </div>
  );
};

export default WizAiNotificationsPanel;
