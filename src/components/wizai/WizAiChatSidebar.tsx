import { MessageSquarePlus, Trash2, X } from 'lucide-react';
import { WizAiChatSession } from './WizAiPremiumUtils';

interface Props {
  sessions: WizAiChatSession[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const WizAiChatSidebar = ({ sessions, activeId, onSelect, onNew, onDelete, onClose }: Props) => {
  return (
    <div className="absolute left-0 top-0 bottom-0 z-50 w-64 bg-card border-r border-border shadow-xl flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-bold text-sm text-foreground">Chat History</span>
        <button onClick={onClose} className="p-1">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <button
        onClick={onNew}
        className="flex items-center gap-2 px-4 py-3 text-sm text-primary hover:bg-primary/10 border-b border-border"
      >
        <MessageSquarePlus className="w-4 h-4" />
        New Chat
      </button>

      <div className="flex-1 overflow-y-auto">
        {sessions.map(s => (
          <div
            key={s.id}
            className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 border-b border-border ${
              s.id === activeId ? 'bg-primary/10' : ''
            }`}
          >
            <button
              onClick={() => onSelect(s.id)}
              className="flex-1 text-left truncate text-sm text-foreground"
            >
              {s.title}
              <span className="block text-xs text-muted-foreground">
                {s.messages.length} messages
              </span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              className="p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WizAiChatSidebar;
