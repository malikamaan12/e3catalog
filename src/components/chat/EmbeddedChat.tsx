"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, User, Check, CheckCheck, Paperclip, Smile, X, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    projectId: string | null;
    content: string;
    attachmentUrl: string | null;
    attachmentType: string | null;
    attachmentName: string | null;
    isRead: boolean;
    createdAt: string;
    senderRole?: string;
    senderName?: string;
}

interface EmbeddedChatProps {
    currentUser: { id: string; role: string };
    projectId: string;
    receiverId: string; // The person the admin is talking to (usually the client)
    receiverName: string;
    title?: string;
}

export default function EmbeddedChat({ currentUser, projectId, receiverId, receiverName, title = "Direct Negotiation" }: EmbeddedChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [projectId, receiverId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/chat/messages?projectId=${projectId}&otherUserId=${receiverId}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setMessages(data);
                
                // Mark unread as read
                const unreadFromOther = data.findLast(m => !m.isRead && m.senderId === receiverId);
                if (unreadFromOther) {
                    markAsRead(receiverId);
                }
            }
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        }
    };

    const markAsRead = async (senderId: string) => {
        try {
            await fetch("/api/chat/messages/read", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ senderId }),
            });
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setLoading(true);
        try {
            const res = await fetch("/api/chat/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: newMessage,
                    projectId: projectId,
                    receiverId: receiverId
                }),
            });

            if (res.ok) {
                const sentMsg = await res.json();
                setMessages((prev) => [...prev, sentMsg]);
                setNewMessage("");
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const uploadRes = await fetch("/api/chat/upload", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) throw new Error("Upload failed");
            const fileData = await uploadRes.json();

            const msgRes = await fetch("/api/chat/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: `Sent an attachment: ${fileData.name}`,
                    projectId: projectId,
                    receiverId: receiverId,
                    attachmentUrl: fileData.url,
                    attachmentType: fileData.type,
                    attachmentName: fileData.name
                }),
            });

            if (msgRes.ok) {
                const sentMsg = await msgRes.json();
                setMessages((prev) => [...prev, sentMsg]);
            }
        } catch (error) {
            console.error("File upload failed:", error);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex flex-col h-full glass-dark border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
                        <User className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
                        <p className="text-[10px] text-slate/60 uppercase tracking-[0.2em]">{receiverName}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 text-slate/40 hover:text-white transition-colors">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                        <MessageCircle className="w-12 h-12 mb-3" />
                        <p className="text-xs uppercase tracking-[0.2em] font-black">Secure Line Established</p>
                        <p className="text-[10px] mt-1 italic lowercase">Start the negotiation below</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === currentUser.id;
                        return (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={msg.id} 
                                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`max-w-[85%] ${isMe ? "bg-white/10" : "bg-gold text-navy"} rounded-2xl px-4 py-2.5 shadow-lg border border-white/5`}>
                                    {msg.attachmentUrl && (
                                        <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                                            {msg.attachmentType === "image" ? (
                                                <img src={msg.attachmentUrl} alt="attachment" className="max-w-full h-auto" />
                                            ) : (
                                                <div className="p-2 bg-black/20 text-[10px] flex items-center gap-2">
                                                    <Paperclip className="w-3 h-3" />
                                                    {msg.attachmentName}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    <div className={`flex items-center gap-1 mt-1 text-[9px] ${isMe ? "text-slate/50" : "text-navy/50"} font-bold`}>
                                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {isMe && (msg.isRead ? <CheckCheck className="w-3 h-3 text-gold" /> : <Check className="w-3 h-3" />)}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-12 h-12 rounded-2xl glass border border-white/10 flex items-center justify-center text-slate/40 hover:text-white transition-all"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Negotiate terms..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:border-gold outline-none transition-all placeholder:text-slate/20"
                    />
                    <button
                        type="submit"
                        disabled={loading || !newMessage.trim()}
                        className="w-12 h-12 rounded-2xl bg-gold text-navy flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}
