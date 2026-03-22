"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Search, Send, User, MessageCircle, FileText,
    ExternalLink, CheckCircle, Clock, Package,
    ChevronRight, MoreVertical, Phone, Mail, Check, CheckCheck, ArrowRight,
    Paperclip, Image as ImageIcon, Film, File as FileIcon, Smile, Plus, X
} from "lucide-react";
import Link from "next/link";

interface Conversation {
    id: string;
    userId: string;
    projectId?: string;
    name: string;
    email: string;
    companyName: string | null;
    image: string | null;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    lastMessageSenderId: string;
    lastMessageIsRead: boolean;
}

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

interface BookingDetails {
    id: string;
    projectName: string;
    status: string;
    totalPrice: number | null;
    startDate: string;
    endDate: string;
    items: any[];
}

export default function AdminChatSystem({ 
    adminUser,
    initialUserId,
    initialQuoteId
}: { 
    adminUser: any;
    initialUserId?: string;
    initialQuoteId?: string;
}) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [viewingQuoteId, setViewingQuoteId] = useState<string | null>(null);
    const [quoteDetails, setQuoteDetails] = useState<BookingDetails | null>(null);
    const [loadingQuote, setLoadingQuote] = useState(false);
    const [recentQuotes, setRecentQuotes] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [showStickers, setShowStickers] = useState(false);
    const [mobileState, setMobileState] = useState<"list" | "chat">("list");
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
    const [isNewChatPlaceholder, setIsNewChatPlaceholder] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 10000); // Poll conversations every 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedConv) {
            fetchMessages();
            fetchRecentQuotes();
            setMobileState("chat");
            const interval = setInterval(fetchMessages, 5000); // Poll messages every 5s
            return () => clearInterval(interval);
        }
    }, [selectedConv]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (viewingQuoteId) {
            fetchQuoteDetails(viewingQuoteId);
        } else {
            setQuoteDetails(null);
        }
    }, [viewingQuoteId]);

    // Consolidating initial selection logic to the effect below (line ~187 in original)

    useEffect(() => {
        if (initialQuoteId) {
            setViewingQuoteId(initialQuoteId);
        }
    }, [initialQuoteId]);

    const fetchQuoteDetails = async (id: string) => {
        setLoadingQuote(true);
        try {
            const res = await fetch(`/api/admin/bookings/${id}`);
            if (!res.ok) throw new Error("Not found");
            const data = await res.json();
            if (data && !data.error) {
                const isArray = Array.isArray(data);
                const firstItem = isArray ? data[0] : data;
                setQuoteDetails({
                    id: firstItem.projectId || firstItem.id,
                    projectName: firstItem.projectName || firstItem.product?.name || "Booking",
                    status: firstItem.status,
                    totalPrice: isArray ? data.reduce((acc: number, item: any) => acc + (item.totalPrice || 0), 0) : firstItem.totalPrice,
                    startDate: firstItem.startDate,
                    endDate: firstItem.endDate,
                    items: isArray ? data : [data]
                });
            } else {
                alert("Quote not found. Please check the ID.");
                setViewingQuoteId(null);
            }
        } catch (error) {
            console.error("Failed to fetch quote details:", error);
            alert("Could not find a quote with that reference ID.");
            setViewingQuoteId(null);
        } finally {
            setLoadingQuote(false);
        }
    };
    
    // User search for new chat
    useEffect(() => {
        if (userSearchQuery.length < 2) {
            setUserSearchResults([]);
            return;
        }
        const t = setTimeout(() => {
            fetch(`/api/admin/users/search?q=${encodeURIComponent(userSearchQuery)}`)
                .then(r => r.json())
                .then(data => setUserSearchResults(data || []))
                .catch(() => setUserSearchResults([]));
        }, 300);
        return () => clearTimeout(t);
    }, [userSearchQuery]);

    // Handle initial selection from props
    useEffect(() => {
        if (initialUserId && conversations.length > 0) {
            let conv = conversations.find(c => c.userId === initialUserId && c.projectId === initialQuoteId);
            if (!conv) {
                conv = conversations.find(c => c.userId === initialUserId);
            }
            if (conv) {
                setSelectedConv(conv);
                setIsNewChatPlaceholder(false);
            } else if (!selectedConv || selectedConv.userId !== initialUserId) {
                // If not found in conversations, fetch user details to start a new chat
                fetch(`/api/admin/users/${initialUserId}`)
                    .then(r => r.json())
                    .then(user => {
                        if (user && !user.error) {
                            setSelectedConv({
                                id: initialQuoteId ? `project_${initialQuoteId}` : `user_${user.id}`,
                                userId: user.id,
                                projectId: initialQuoteId || undefined,
                                name: initialQuoteId ? `${user.name} (Quote)` : user.name,
                                email: user.email,
                                companyName: user.companyName,
                                image: user.image || null,
                                lastMessage: "Start a new conversation...",
                                lastMessageAt: new Date().toISOString(),
                                unreadCount: 0,
                                lastMessageSenderId: "",
                                lastMessageIsRead: true
                            });
                            setIsNewChatPlaceholder(true);
                        }
                    });
            }
        }
    }, [initialUserId, conversations]);

    useEffect(() => {
        if (initialQuoteId) {
            setViewingQuoteId(initialQuoteId);
        }
    }, [initialQuoteId]);

    const handleSelectFoundUser = (user: any) => {
        // Look for existing generic conversation first (no project)
        const existing = conversations.find(c => c.userId === user.id && !c.projectId);
        
        if (existing) {
            setSelectedConv(existing);
            setIsNewChatPlaceholder(false);
        } else {
            // Create a temporary conversation object for the UI
            const newConv: Conversation = {
                id: `user_${user.id}`,
                userId: user.id,
                name: user.name,
                email: user.email,
                companyName: user.companyName,
                image: user.image || null,
                lastMessage: "Start a new conversation...",
                lastMessageAt: new Date().toISOString(),
                unreadCount: 0,
                lastMessageSenderId: "",
                lastMessageIsRead: true
            };
            setSelectedConv(newConv);
            setIsNewChatPlaceholder(true);
        }
        setSearchModalOpen(false);
        setUserSearchQuery("");
        setMobileState("chat"); // Ensure we switch to chat view on mobile
    };

    const fetchRecentQuotes = async () => {
        if (!selectedConv) return;
        try {
            const res = await fetch(`/api/admin/bookings?search=${selectedConv.email}&limit=5`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setRecentQuotes(data);
            }
        } catch (error) {
            console.error("Failed to fetch recent quotes:", error);
        }
    };

    const fetchConversations = async () => {
        try {
            const res = await fetch("/api/admin/chat/conversations");
            const data = await res.json();
            if (Array.isArray(data)) {
                setConversations(data);
            }
        } catch (error) {
            console.error("Failed to fetch conversations:", error);
        }
    };

    const fetchMessages = async () => {
        if (!selectedConv) return;
        try {
            const url = selectedConv.projectId 
                ? `/api/chat/messages?projectId=${selectedConv.projectId}`
                : `/api/chat/messages?otherUserId=${selectedConv.userId}`;
            const res = await fetch(url);
            const data = await res.json();
            if (Array.isArray(data)) {
                setMessages(data);

                // Mark as read if there are unread messages from others
                const unreadSenders = Array.from(new Set(data.filter(m => !m.isRead && m.senderId !== adminUser.id).map(m => m.senderId)));
                for (const sid of unreadSenders) {
                    if (typeof sid === "string") {
                        markAsRead(sid);
                    }
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
            // Update local unread count and last message status
            setConversations(prev => prev.map(c =>
                c.userId === senderId ? { ...c, unreadCount: 0, lastMessageIsRead: true } : c
            ));
            // Optimistically update current message thread
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
        if (!selectedConv || !content.trim()) return;

        setLoading(true);
        try {
            const res = await fetch("/api/chat/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: content,
                    receiverId: selectedConv.userId,
                    projectId: selectedConv.projectId || [...messages].reverse().find(m => !!m.projectId)?.projectId || null,
                }),
            });

            if (res.ok) {
                const sentMsg = await res.json();
                setMessages((prev) => [...prev, sentMsg]);
                if (!contentOverride) setNewMessage("");
                setShowStickers(false);
                fetchConversations();
            } else {
                const errorData = await res.json();
                console.error("Server error sending message:", errorData.error);
                alert(`Error: ${errorData.error || "Unknown error occurred"}`);
            }
        } catch (error) {
            console.error("Network error sending message:", error);
            alert("Network error while sending message.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedConv) return;

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
                    receiverId: selectedConv.userId,
                    projectId: selectedConv.projectId || [...messages].reverse().find(m => !!m.projectId)?.projectId || null,
                    attachmentUrl: fileData.url,
                    attachmentType: fileData.type,
                    attachmentName: fileData.name
                }),
            });

            if (msgRes.ok) {
                const sentMsg = await msgRes.json();
                setMessages((prev) => [...prev, sentMsg]);
                fetchConversations();
            }
        } catch (error) {
            console.error("File upload failed:", error);
            alert("File upload failed. Please try again.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const filteredConversations = conversations.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.companyName && c.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="h-[calc(100vh-160px)] flex glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Sidebar: Conversation List */}
            <div className={`w-full md:w-80 border-r border-white/10 flex flex-col bg-white/5 ${selectedConv && mobileState === "chat" ? "hidden md:flex" : "flex"}`}>
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-[var(--color-warm-white)] font-[family-name:var(--font-heading)]">Messages</h2>
                        <button 
                            onClick={() => setSearchModalOpen(true)}
                            className="p-1.5 rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-all border border-[var(--color-gold)]/30"
                            title="New Chat"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center">
                            <MessageCircle className="w-8 h-8 text-[var(--color-slate)] mx-auto mb-2 opacity-20" />
                            <p className="text-xs text-[var(--color-slate)]">No conversations found</p>
                        </div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <button
                                key={conv.id || conv.userId}
                                onClick={() => setSelectedConv(conv)}
                                className={`w-full p-4 flex gap-3 border-b border-white/5 hover:bg-white/10 transition-colors text-left ${selectedConv?.id === conv.id ? "bg-white/10 border-l-4 border-l-[var(--color-gold)]" : ""}`}
                            >
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-[var(--color-gold)]/10 border border-white/10 flex items-center justify-center overflow-hidden">
                                        {conv.image ? (
                                            <img src={conv.image} alt={conv.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-6 h-6 text-[var(--color-gold)]" />
                                        )}
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-[var(--color-danger)] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[var(--color-navy)]">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h3 className="text-sm font-bold text-[var(--color-warm-white)] truncate">{conv.name}</h3>
                                        <span className="text-[10px] text-[var(--color-slate)] shrink-0">
                                            {new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--color-slate)] truncate mb-0.5">{conv.companyName || "Personal Client"}</p>
                                    <p className={`text-xs truncate flex items-center gap-1 ${conv.unreadCount > 0 ? "text-[var(--color-warm-white)] font-bold" : "text-[var(--color-slate)] opacity-80"}`}>
                                        {conv.lastMessageSenderId === adminUser.id && (
                                            conv.lastMessageIsRead ? (
                                                <CheckCheck className="w-3 h-3 text-[var(--color-gold)] shrink-0" />
                                            ) : (
                                                <Check className="w-3 h-3 text-[var(--color-slate)] opacity-50 shrink-0" />
                                            )
                                        )}
                                        <span className="truncate">{conv.lastMessage}</span>
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-black/20 ${!selectedConv || mobileState === "list" ? "hidden md:flex" : "flex"}`}>
                {selectedConv ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-3 md:p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-2 md:gap-3">
                                <button
                                    onClick={() => setMobileState("list")}
                                    className="md:hidden p-2 -ml-2 text-[var(--color-slate)]"
                                >
                                    <ArrowRight className="w-5 h-5 rotate-180" />
                                </button>
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[var(--color-gold)]/20 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                    {selectedConv.image ? (
                                        <img src={selectedConv.image} alt={selectedConv.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-gold)]" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs md:text-sm font-bold text-[var(--color-warm-white)] truncate">{selectedConv.name}</h3>
                                    <p className="text-[9px] md:text-[10px] text-[var(--color-slate)] uppercase tracking-wider truncate">
                                        {selectedConv.companyName ? `${selectedConv.companyName} • ` : ""}Online
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1 md:gap-2 items-center">
                                <div className="relative group hidden sm:block">
                                    <input
                                        type="text"
                                        placeholder="Quote ID..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = (e.target as HTMLInputElement).value.toLowerCase();
                                                if (val) setViewingQuoteId(val);
                                                (e.target as HTMLInputElement).value = "";
                                            }
                                        }}
                                        className="w-24 md:w-32 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:w-40 md:focus:w-48 transition-all outline-none"
                                    />
                                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-slate)] pointer-events-none" />
                                </div>
                                {([...messages].reverse().find(m => !!m.projectId)) && (
                                    <button
                                        onClick={() => {
                                            const lastProjectMsg = [...messages].reverse().find(m => !!m.projectId);
                                            if (lastProjectMsg) setViewingQuoteId(lastProjectMsg.projectId);
                                        }}
                                        className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 glass border border-[var(--color-gold)]/30 text-[var(--color-gold)] rounded-lg text-[10px] md:text-xs font-bold hover:bg-[var(--color-gold)]/10 transition-all"
                                    >
                                        <Package className="w-3 md:w-3.5 h-3 md:h-3.5" />
                                        <span className="hidden xs:inline">Context Quote</span>
                                    </button>
                                )}
                                <button className="p-1.5 md:p-2 text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5 rounded-lg transition-all">
                                    <MoreVertical className="w-4 md:w-5 h-4 md:h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {messages.map((msg) => {
                                const isMe = msg.senderId === adminUser.id;
                                // Color Selection based on Role
                                let bubbleColor = "glass border border-white/10 text-[var(--color-warm-white)] font-normal"; // Default client
                                let roleBadge = "";
                                if (isMe || msg.senderRole === "admin" || msg.senderRole === "super_admin") {
                                    bubbleColor = "bg-[var(--color-gold)] text-black font-medium";
                                    if (!isMe) roleBadge = "Admin Support";
                                } else if (msg.senderRole === "vendor") {
                                    bubbleColor = "bg-emerald-600/90 text-[var(--color-warm-white)] font-medium border border-emerald-500/50";
                                    roleBadge = "Vendor Partner";
                                }

                                return (
                                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[70%] group relative ${isMe ? "text-right" : "text-left"}`}>
                                            {msg.projectId && (
                                                <div className={`text-[9px] mb-1 font-bold uppercase tracking-widest text-[var(--color-gold)] opacity-60`}>
                                                    Ref: Quote #{msg.projectId.slice(0, 8)} 
                                                    {roleBadge && <span className="ml-2 text-[var(--color-slate)] opacity-80">{roleBadge} ({msg.senderName})</span>}
                                                </div>
                                            )}
                                            {!msg.projectId && roleBadge && (
                                                 <div className={`text-[9px] mb-1 font-bold uppercase tracking-widest text-[var(--color-slate)] opacity-60`}>
                                                    {roleBadge} ({msg.senderName})
                                                </div>
                                            )}
                                            <div className={`rounded-2xl px-4 py-2 text-sm inline-block ${bubbleColor} ${isMe ? "rounded-tr-none" : "rounded-tl-none"}`}
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
                                            </div>
                                            <div className={`flex items-center gap-1 mt-1 text-[9px] text-[var(--color-slate)] ${isMe ? "justify-end" : "justify-start"}`}>
                                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isMe && (
                                                    msg.isRead ? (
                                                        <CheckCheck className="w-3 h-3 text-[var(--color-gold)]" />
                                                    ) : (
                                                        <Check className="w-3 h-3 text-[var(--color-slate)] opacity-50" />
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={(e) => handleSendMessage(e)} className="p-3 md:p-4 border-t border-white/10 bg-white/5 relative">
                            {/* Stickers Menu */}
                            {showStickers && (
                                <div className="absolute bottom-[100%] left-2 right-2 md:left-4 md:right-4 bg-[var(--color-surface)] border border-white/10 rounded-xl p-3 shadow-2xl animate-in slide-in-from-bottom-2 grid grid-cols-3 xs:grid-cols-4 gap-2 mb-2 glass z-20">
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
                                    className={`shrink-0 w-12 h-12 rounded-xl glass border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors ${uploading ? "animate-pulse" : ""}`}
                                >
                                    <Paperclip className="w-5 h-5 text-[var(--color-slate)]" />
                                </button>

                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`Message ${selectedConv?.name}...`}
                                    className="flex-1 bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all shadow-inner"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowStickers(!showStickers)}
                                    className={`shrink-0 w-12 h-12 rounded-xl glass border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors ${showStickers ? "bg-[var(--color-gold)]/20 text-[var(--color-gold)]" : ""}`}
                                >
                                    <Smile className="w-5 h-5 text-[var(--color-gold)]" />
                                </button>

                                <button
                                    type="submit"
                                    disabled={loading || uploading || !newMessage.trim()}
                                    className="w-12 h-12 rounded-xl bg-[var(--color-gold)] text-black flex items-center justify-center hover:bg-[var(--color-gold-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[var(--color-gold)]/10"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-40">
                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                            <MessageCircle className="w-10 h-10 text-[var(--color-slate)]" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--color-warm-white)] mb-2 font-[family-name:var(--font-heading)]">Select a Conversation</h2>
                        <p className="max-w-xs text-sm text-[var(--color-slate)]">
                            Choose a client from the list to start chatting and manage their quote requests.
                        </p>
                    </div>
                )}
            </div>

            {/* Right Sidebar: Context Details or Quote Details */}
            {selectedConv && (
                <div className={`w-full md:w-80 border-l border-white/10 bg-white/5 flex flex-col overflow-hidden absolute inset-0 md:relative z-30 md:z-auto glass md:glass-none ${viewingQuoteId ? "flex" : "hidden lg:flex"}`}>
                    {viewingQuoteId && quoteDetails ? (
                        <div className="flex-1 flex flex-col h-full animate-fade-in">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">Quote Details</h3>
                                <button
                                    onClick={() => setViewingQuoteId(null)}
                                    className="text-[var(--color-slate)] hover:text-white text-xs"
                                >
                                    Close ×
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <div className="mb-6">
                                    <h4 className="text-sm font-bold text-[var(--color-warm-white)] mb-1">{quoteDetails?.projectName}</h4>
                                    <div className="flex flex-col gap-1 mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${quoteDetails?.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-[var(--color-gold)]/10 text-[var(--color-gold)] border-[var(--color-gold)]/20'
                                                }`}>
                                                {quoteDetails?.status?.toUpperCase()}
                                            </span>
                                            <span className="text-[10px] text-[var(--color-slate)]">
                                                {quoteDetails?.id?.split('-')[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-[var(--color-slate)]">
                                            {quoteDetails?.startDate} — {quoteDetails?.endDate}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {quoteDetails.items.map((item: any) => (
                                            <div key={item.id} className="flex gap-3 text-xs border-b border-white/5 pb-2">
                                                <div className="w-8 h-8 rounded bg-white/5 flex-shrink-0 flex items-center justify-center">
                                                    <span className="text-[10px] font-bold text-[var(--color-gold)]">{item.units}x</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[var(--color-warm-white)] truncate">{item.product.name}</p>
                                                    <p className="text-[10px] text-[var(--color-slate)]">{item.product.pricePerDay} QAR/day</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-black/30 border border-white/10 mb-6">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-[var(--color-slate)] uppercase">Total Amount</span>
                                        <span className="text-lg font-bold text-[var(--color-gold)]">{quoteDetails.totalPrice?.toLocaleString()} QAR</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Link
                                        href={`/admin/bookings/${quoteDetails.id}`}
                                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[var(--color-gold)] text-black text-xs font-bold hover:bg-[var(--color-gold-light)] transition-all"
                                    >
                                        Full Edit Window
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                    <button className="w-full p-3 rounded-xl glass border border-white/10 text-xs text-[var(--color-warm-white)] hover:bg-white/5 transition-all">
                                        Send Reminder
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 p-6 flex flex-col">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-6">Client Details</h3>

                            <div className="text-center mb-8">
                                <div className="w-20 h-20 rounded-2xl bg-[var(--color-gold)]/10 border border-white/10 flex items-center justify-center overflow-hidden mx-auto mb-4">
                                    {selectedConv?.image ? (
                                        <img src={selectedConv.image} alt={selectedConv.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-10 h-10 text-[var(--color-gold)]" />
                                    )}
                                </div>
                                <h4 className="text-base font-bold text-[var(--color-warm-white)] mb-1">{selectedConv?.name}</h4>
                                <p className="text-xs text-[var(--color-slate)] mb-4">{selectedConv?.companyName || "Individual Client"}</p>

                                <div className="flex justify-center gap-2">
                                    <a href={`mailto:${selectedConv?.email}`} className="p-2 glass border border-white/10 rounded-lg text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-all">
                                        <Mail className="w-4 h-4" />
                                    </a>
                                    <button className="p-2 glass border border-white/10 rounded-lg text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-all">
                                        <Phone className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                                <div>
                                    <h5 className="text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-wider mb-3">Recent Quotes</h5>
                                    <div className="space-y-2">
                                        {recentQuotes.map(q => (
                                            <button
                                                key={q.id}
                                                onClick={() => setViewingQuoteId(q.id)}
                                                className="w-full text-left p-3 rounded-lg glass border border-white/10 hover:border-[var(--color-gold)]/50 transition-all group"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-bold text-[var(--color-gold)]">{q.id.split('-')[0].toUpperCase()}</span>
                                                    <span className="text-[9px] text-[var(--color-slate)]">{q.status}</span>
                                                </div>
                                                <p className="text-[10px] text-[var(--color-warm-white)] truncate">{q.projectName}</p>
                                            </button>
                                        ))}
                                        <Link
                                            href={`/admin/bookings?search=${selectedConv.email}`}
                                            className="w-full flex items-center justify-between p-2 rounded-lg text-[10px] text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-all group text-center border border-dashed border-white/10 mt-2"
                                        >
                                            <span>View Full Pipeline</span>
                                            <ChevronRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-[var(--color-navy)] border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-3.5 h-3.5 text-[var(--color-slate)]" />
                                        <span className="text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-wider">Note</span>
                                    </div>
                                    <p className="text-[10px] leading-relaxed text-[var(--color-slate)]">
                                        You are currently chatting with {selectedConv.name.split(' ')[0]}. Any quote they reference can be opened directly here.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* New Chat Search Modal */}
            {searchModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSearchModalOpen(false)}>
                    <div className="glass rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <h3 className="font-bold text-[var(--color-warm-white)]">Start New Conversation</h3>
                            <button onClick={() => setSearchModalOpen(false)} className="text-[var(--color-slate)] hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search by name, email, or company..."
                                    value={userSearchQuery}
                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                    className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none shadow-inner"
                                />
                            </div>

                            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                                {userSearchResults.length > 0 ? (
                                    userSearchResults.map((user: any) => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleSelectFoundUser(user)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors text-left group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/20 border border-white/10 flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5 text-[var(--color-gold)]" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors truncate">{user.name}</p>
                                                <p className="text-[10px] text-[var(--color-slate)] truncate">
                                                    {user.email} {user.companyName ? `• ${user.companyName}` : ""}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-[var(--color-slate)] ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                                        </button>
                                    ))
                                ) : userSearchQuery.length >= 2 ? (
                                    <div className="py-8 text-center text-xs text-[var(--color-slate)]">
                                        No clients found matching "{userSearchQuery}"
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-xs text-[var(--color-slate)] opacity-60">
                                        Type at least 2 characters to search...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

