"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, ChevronDown, FileText, User, Check, CheckCheck, Paperclip, Image as ImageIcon, Film, File as FileIcon, Smile } from "lucide-react";

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

const STICKERS = [
    { label: "Approve ✅", value: "Approve ✅" },
    { label: "Hold ⏸️", value: "Hold ⏸️" },
    { label: "Done 🎉", value: "Done 🎉" },
    { label: "Paid 💰", value: "Paid 💰" },
    { label: "Thanks 🙏", value: "Thanks 🙏" },
    { label: "Welcome ✨", value: "Welcome ✨" },
    { label: "Not Possible ❌", value: "Not Possible ❌" },
    { label: "Delay ⏳", value: "Delay ⏳" },
];

interface Project {
    id: string;
    projectName: string;
    status: string;
    vendorName?: string;
}

interface ClientChatWindowProps {
    currentUser: { id: string; name: string; email: string };
    projects: Project[];
}

export default function ClientChatWindow({ currentUser, projects }: ClientChatWindowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showStickers, setShowStickers] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
            return () => clearInterval(interval);
        }
    }, [isOpen, selectedProjectId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/chat/messages?projectId=${selectedProjectId}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setMessages(data);

                // If there are unread messages from admin, mark them read
                const unreadAdminMsg = data.findLast(m => !m.isRead && m.senderId !== currentUser.id);
                if (unreadAdminMsg && isOpen) {
                    markAsRead(unreadAdminMsg.senderId);
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

            // Optimistically update local state to show read receipts immediately if polling is slow
            setMessages(prev => prev.map(m =>
                m.senderId === senderId ? { ...m, isRead: true } : m
            ));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, contentOverride?: string) => {
        if (e) e.preventDefault();
        const content = contentOverride || newMessage;
        if (!content.trim()) return;

        setLoading(true);
        try {
            const res = await fetch("/api/chat/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: content,
                    projectId: selectedProjectId,
                }),
            });

            if (res.ok) {
                const sentMsg = await res.json();
                setMessages((prev) => [...prev, sentMsg]);
                if (!contentOverride) setNewMessage("");
                setShowStickers(false);
            } else {
                const errorData = await res.json();
                console.error("Server error sending message:", errorData.error);
                alert(`Failed to send message: ${errorData.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Network error sending message:", error);
            alert("Network error: Could not reach the server.");
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

            // Send message with attachment
            const msgRes = await fetch("/api/chat/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: `Sent an attachment: ${fileData.name}`,
                    projectId: selectedProjectId,
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
            alert("File upload failed. Please try again.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const selectedProjectName = projects.find(p => p.id === selectedProjectId)?.projectName || "Select Quote";

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
            {/* Chat Bubble */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--color-gold)] text-black shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group"
                >
                    <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="absolute -top-1 -right-1 bg-[var(--color-danger)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[var(--color-navy)] opacity-0 group-hover:opacity-100 transition-opacity">
                        Chat
                    </span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed inset-4 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-96 sm:h-[500px] bg-[var(--color-surface)] border border-white/10 rounded-2xl shadow-2xl flex flex-col glass animate-in slide-in-from-bottom-5 z-[100]">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/20 flex items-center justify-center border border-[var(--color-gold)]/30">
                                <User className="w-5 h-5 text-[var(--color-gold)]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--color-warm-white)]">Support Chat</h3>
                                <p className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider">Usually replies in minutes</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-[var(--color-slate)] hover:text-[var(--color-warm-white)]">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Quote Selector */}
                    <div className="px-4 py-2 border-b border-white/5 bg-black/20 flex items-center gap-2 relative">
                        <FileText className="w-3 h-3 text-[var(--color-gold)]" />
                        <span className="text-[10px] text-[var(--color-slate)] font-medium uppercase">Quote:</span>
                        <div className="flex-1 relative group">
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="w-full bg-transparent text-xs text-[var(--color-warm-white)] font-bold outline-none cursor-pointer appearance-none pr-6"
                            >
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id} className="bg-[var(--color-navy-lighter)] text-white">
                                        {p.projectName} {p.vendorName ? `(${p.vendorName})` : ""}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-gold)] pointer-events-none group-hover:scale-110 transition-transform" />
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                    <MessageCircle className="w-6 h-6 text-[var(--color-slate)]" />
                                </div>
                                <p className="text-xs text-[var(--color-slate)]">
                                    Start a conversation with our team about <strong>{selectedProjectName}</strong>.
                                </p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderId === currentUser.id;
                                
                                // Color Selection based on Role for Client View
                                let bubbleColor = "glass border border-white/10 text-[var(--color-warm-white)] font-normal"; // Default
                                let roleBadge = "";
                                if (isMe) {
                                    bubbleColor = "bg-[#2a2d3e] text-white font-medium border border-[#3f4354]";
                                } else if (msg.senderRole === "admin" || msg.senderRole === "super_admin") {
                                    bubbleColor = "bg-[var(--color-gold)] text-black font-medium shadow-[0_0_15px_rgba(255,215,0,0.15)]";
                                    roleBadge = "Admin Support";
                                } else if (msg.senderRole === "vendor") {
                                    bubbleColor = "bg-emerald-600/90 text-[var(--color-warm-white)] font-medium border border-emerald-500/50";
                                    roleBadge = "Vendor Partner";
                                }

                                return (
                                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[80%] relative flex flex-col ${isMe ? "items-end text-right" : "items-start text-left"}`}>
                                            {!isMe && roleBadge && (
                                                <div className="text-[9px] mb-1 font-bold uppercase tracking-widest text-[var(--color-slate)] opacity-80 pl-1">
                                                    {roleBadge} ({msg.senderName})
                                                </div>
                                            )}
                                            <div className={`rounded-2xl px-4 py-2 text-sm ${bubbleColor} ${isMe ? "rounded-tr-none text-right" : "rounded-tl-none text-left"}`}
                                            >
                                                {msg.attachmentUrl && (
                                                    <div className="mb-2 overflow-hidden rounded-lg bg-black/20 border border-white/5">
                                                        {msg.attachmentType === "image" ? (
                                                            <img src={msg.attachmentUrl} alt={msg.attachmentName || "image"} className="max-w-full h-auto object-cover" />
                                                        ) : msg.attachmentType === "video" ? (
                                                            <video src={msg.attachmentUrl} controls className="max-w-full h-auto" />
                                                        ) : (
                                                            <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 text-xs hover:bg-white/5 transition-colors">
                                                                <FileIcon className="w-5 h-5 text-[var(--color-gold)]" />
                                                                <div className="flex-1 truncate">
                                                                    <p className="font-bold truncate">{msg.attachmentName}</p>
                                                                    <p className="opacity-60 text-[10px]">Document • Click to view</p>
                                                                </div>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                <p className={msg.content.includes("✅") || msg.content.includes("🎉") ? "text-lg py-1" : ""}>
                                                    {msg.content}
                                                </p>
                                                <div className={`flex items-center gap-1 mt-1 text-[9px] ${isMe ? "justify-end text-white/60" : "justify-start text-[var(--color-slate)]"}`}>
                                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {isMe && (
                                                        msg.isRead ? (
                                                            <CheckCheck className="w-3 h-3 text-white" />
                                                        ) : (
                                                            <Check className="w-3 h-3 text-white/40" />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={(e) => handleSendMessage(e)} className="p-4 border-t border-white/10 bg-black/20 rounded-b-2xl relative">
                        {/* Stickers Menu */}
                        {showStickers && (
                            <div className="absolute bottom-[100%] left-2 right-2 sm:left-4 sm:right-4 bg-[var(--color-surface)] border border-white/10 rounded-xl p-2 shadow-2xl animate-in slide-in-from-bottom-2 grid grid-cols-4 gap-1 mb-2 glass z-[110]">
                                {STICKERS.map((s) => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onClick={() => handleSendMessage(undefined, s.value)}
                                        className="text-[10px] p-2 hover:bg-[var(--color-gold)]/20 rounded-lg text-[var(--color-warm-white)] transition-colors text-center border border-white/5"
                                    >
                                        <span className="block text-sm mb-1">{s.label.split(" ")[1]}</span>
                                        <span className="font-bold opacity-60 uppercase tracking-tighter text-[9px]">{s.label.split(" ")[0]}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                                accept="image/*,video/*,.pdf,.doc,.docx"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className={`shrink-0 w-10 h-10 rounded-xl glass border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors ${uploading ? "animate-pulse" : ""}`}
                            >
                                <Paperclip className="w-4 h-4 text-[var(--color-slate)]" />
                            </button>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowStickers(!showStickers)}
                                className={`shrink-0 w-10 h-10 rounded-xl glass border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors ${showStickers ? "bg-white/10" : ""}`}
                            >
                                <Smile className="w-4 h-4 text-[var(--color-gold)]" />
                            </button>
                            <button
                                type="submit"
                                disabled={loading || uploading || !newMessage.trim()}
                                className="shrink-0 w-10 h-10 rounded-xl bg-[var(--color-gold)] text-black flex items-center justify-center hover:bg-[var(--color-gold-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
