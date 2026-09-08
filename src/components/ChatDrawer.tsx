import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storageService';
import { FirestoreService } from '../services/firestoreService';
import { User, ChatMessage } from '../types';
import {
  X,
  Send,
  MessageSquare,
  Search,
  Building2,
  Check,
  CheckCheck,
  User as UserIcon,
  Circle
} from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecipientId?: string | null;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  initialRecipientId,
}) => {
  const { currentUser, usersList } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter colleague list
  const availableColleagues = usersList.filter(
    (u) => u.id !== currentUser?.id && (
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  useEffect(() => {
    if (initialRecipientId) {
      const found = usersList.find((u) => u.id === initialRecipientId);
      if (found) setSelectedUser(found);
    } else if (!selectedUser && availableColleagues.length > 0) {
      setSelectedUser(availableColleagues[0]);
    }
  }, [initialRecipientId, usersList]);

  // Load chat messages between currentUser and selectedUser
  useEffect(() => {
    if (currentUser && selectedUser) {
      const msgs = StorageService.getChatMessages(currentUser.id, selectedUser.id);
      setMessages(msgs);

      // Subscribe to real-time chat messages in Firestore
      const unsubscribe = FirestoreService.subscribeToChatMessages(
        currentUser.id,
        selectedUser.id,
        (liveMsgs) => {
          setMessages(liveMsgs);
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [currentUser, selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !currentUser) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser) return;

    const newMsg = StorageService.sendChatMessage({
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      senderName: currentUser.fullName,
      recipientId: selectedUser.id,
      recipientUsername: selectedUser.username,
      content: inputText.trim(),
    });

    // Sync message to Firestore
    FirestoreService.saveChatMessage(newMsg).catch(() => {});

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Optional simulated reply from colleague after 1.5s
    setTimeout(() => {
      const reply = StorageService.sendChatMessage({
        senderId: selectedUser.id,
        senderUsername: selectedUser.username,
        senderName: selectedUser.fullName,
        recipientId: currentUser.id,
        recipientUsername: currentUser.username,
        content: `Halo ${currentUser.fullName}! Terima kasih sudah menghubungi divisi ${selectedUser.department}. Pesan Anda telah kami terima dan akan segera kami follow up.`,
      });
      FirestoreService.saveChatMessage(reply).catch(() => {});
      setMessages((prev) => [...prev, reply]);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-zinc-900/40 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col sm:flex-row border-l border-zinc-200">
        {/* Left Column: Colleagues List */}
        <div className="w-full sm:w-64 border-r border-zinc-200 flex flex-col bg-zinc-50/70">
          {/* Header */}
          <div className="p-3.5 border-b border-zinc-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zinc-700" />
              <h3 className="text-xs font-semibold text-zinc-900">
                Chat Internal
              </h3>
            </div>
            <button
              onClick={onClose}
              className="sm:hidden p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-2.5 border-b border-zinc-200 bg-white">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari rekan kerja..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 focus:bg-white"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {availableColleagues.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-400">
                Belum ada rekan kerja lain yang terdaftar. Ajak rekan untuk membuat akun.
              </div>
            ) : (
              availableColleagues.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full p-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-zinc-200/60 font-medium' : 'hover:bg-zinc-100/70'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={user.avatar}
                        alt={user.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-200"
                      />
                      {user.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-zinc-900 truncate">
                        {user.fullName}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate">
                        @{user.username}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {user.department}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="flex-1 flex flex-col h-full bg-white">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2.5">
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.fullName}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-200"
                  />
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900">
                      {selectedUser.fullName}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <span className="font-mono text-zinc-600">@{selectedUser.username}</span>
                      <span>•</span>
                      <span>{selectedUser.department}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                  title="Tutup Chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-zinc-50/50">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 text-xs">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40 text-zinc-500" />
                    Belum ada percakapan dengan {selectedUser.fullName}. Kirim pesan pertama untuk berkoordinasi!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-xs shadow-2xs leading-relaxed ${
                            isMe
                              ? 'bg-zinc-900 text-white'
                              : 'bg-white border border-zinc-200 text-zinc-900'
                          }`}
                        >
                          <div>{msg.content}</div>
                          <div
                            className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                              isMe ? 'text-zinc-400' : 'text-zinc-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMe && <CheckCheck className="w-3 h-3 text-zinc-400" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-2.5 border-t border-zinc-200 bg-white flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Ketik pesan ke ${selectedUser.fullName}...`}
                  className="flex-1 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs">
              Pilih rekan kerja untuk mulai berkirim pesan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
