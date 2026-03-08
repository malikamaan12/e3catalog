"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Trash2, Calendar, User, Package, CheckCircle, ChevronRight, X, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface Product {
    id: string;
    name: string;
    pricePerDay: number;
    thumbnailUrl: string | null;
    totalUnits: number;
    packagingFee?: number;
    handlingFee?: number;
    setupFee?: number;
}

interface Client {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
    phoneNumber: string | null;
}

interface BookingItem {
    productId: string;
    name: string;
    quantity: number;
    startDate: string;
    endDate: string;
    price: number;
}

interface ManualBookingFlowProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function ManualBookingFlow({ onClose, onSuccess }: ManualBookingFlowProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Client
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [clientSearch, setClientSearch] = useState("");
    const [foundClients, setFoundClients] = useState<Client[]>([]);
    const [newClient, setNewClient] = useState({ name: "", email: "", phone: "" });
    const [isNewClient, setIsNewClient] = useState(false);

    // Step 2: Products
    const [items, setItems] = useState<BookingItem[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const [foundProducts, setFoundProducts] = useState<Product[]>([]);
    const [foundProductsCache, setFoundProductsCache] = useState<Record<string, Product>>({});
    const [defaultDates, setDefaultDates] = useState({
        start: format(new Date(), "yyyy-MM-dd"),
        end: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    });

    // Step 3: Financials & Notes
    const [discount, setDiscount] = useState(0);
    const [logisticsCost, setLogisticsCost] = useState(0);
    const [projectName, setProjectName] = useState("");
    const [notes, setNotes] = useState("");

    // --- Search Logic ---
    useEffect(() => {
        if (clientSearch.length >= 2) {
            fetch(`/api/admin/users/search?q=${encodeURIComponent(clientSearch)}`)
                .then(r => r.json())
                .then(setFoundClients);
        } else {
            setFoundClients([]);
        }
    }, [clientSearch]);

    useEffect(() => {
        if (productSearch.length >= 2) {
            fetch(`/api/admin/products`) // Uses vendor-scoped auth — only returns products the logged-in user owns
                .then(r => r.json())
                .then((data: Product[]) => {
                    if (!Array.isArray(data)) return;
                    const filtered = data.filter(p =>
                        p.name.toLowerCase().includes(productSearch.toLowerCase())
                    );
                    setFoundProducts(filtered);
                });
        } else {
            setFoundProducts([]);
        }
    }, [productSearch]);

    const addItem = (product: Product) => {
        const newItem: BookingItem = {
            productId: product.id,
            name: product.name,
            quantity: 1,
            startDate: defaultDates.start,
            endDate: defaultDates.end,
            price: product.pricePerDay
        };
        setItems([...items, newItem]);
        // Cache the product for fee lookups in the summary
        setFoundProductsCache(prev => ({ ...prev, [product.id]: product }));
        setProductSearch("");
        setFoundProducts([]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, key: keyof BookingItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [key]: value };
        setItems(newItems);
    };

    const getDays = (item: BookingItem) => {
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff);
    };

    const calculateItemSubtotal = (item: BookingItem) => {
        return item.price * item.quantity * getDays(item);
    };

    const calculateSubtotal = () => {
        return items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
    };

    // Extra fees collected from matched products
    const calculateExtraFees = () => {
        return items.reduce((sum, item) => {
            const prod = foundProductsCache[item.productId];
            if (!prod) return sum;
            return sum + ((prod.packagingFee || 0) + (prod.handlingFee || 0) + (prod.setupFee || 0)) * item.quantity;
        }, 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const fees = calculateExtraFees();
        const discountAmount = (subtotal + fees) * (discount / 100);
        return subtotal + fees - discountAmount + Number(logisticsCost);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                userId: isNewClient ? null : selectedClient?.id,
                customerName: isNewClient ? newClient.name : selectedClient?.name,
                customerEmail: isNewClient ? newClient.email : selectedClient?.email,
                customerPhone: isNewClient ? newClient.phone : selectedClient?.phoneNumber,
                projectName,
                notes,
                discount,
                logisticsCost,
                items
            };

            const res = await fetch("/api/admin/bookings/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to create booking");
            }
        } catch (error) {
            alert("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="glass rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Plus className="w-5 h-5 text-[var(--color-gold)]" />
                            Create Manual Booking
                        </h2>
                        <p className="text-xs text-[var(--color-slate)] mt-1">Create a quote or reservation manually for a client</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-[var(--color-slate)]" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex bg-white/5 border-b border-white/10 h-1">
                    <div
                        className="bg-[var(--color-gold)] transition-all duration-300"
                        style={{ width: `${(step / 4) * 100}%` }}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">

                    {/* Step 1: Client Selection */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-4 mb-4">
                                <button
                                    onClick={() => setIsNewClient(false)}
                                    className={`flex-1 p-4 rounded-xl border transition-all ${!isNewClient ? 'bg-[var(--color-gold)]/10 border-[var(--color-gold)] text-white' : 'border-white/10 bg-white/5 text-[var(--color-slate)] hover:bg-white/10'}`}
                                >
                                    <User className="w-5 h-5 mx-auto mb-2" />
                                    <span className="text-sm font-medium">Existing Client</span>
                                </button>
                                <button
                                    onClick={() => setIsNewClient(true)}
                                    className={`flex-1 p-4 rounded-xl border transition-all ${isNewClient ? 'bg-[var(--color-gold)]/10 border-[var(--color-gold)] text-white' : 'border-white/10 bg-white/5 text-[var(--color-slate)] hover:bg-white/10'}`}
                                >
                                    <Plus className="w-5 h-5 mx-auto mb-2" />
                                    <span className="text-sm font-medium">New Client</span>
                                </button>
                            </div>

                            {!isNewClient ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, email or company..."
                                            value={clientSearch}
                                            onChange={(e) => setClientSearch(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:border-[var(--color-gold)] focus:outline-none transition-all"
                                        />
                                    </div>

                                    {foundClients.length > 0 && (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {foundClients.map(client => (
                                                <div
                                                    key={client.id}
                                                    onClick={() => setSelectedClient(client)}
                                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedClient?.id === client.id ? 'bg-[var(--color-gold)]/20 border-[var(--color-gold)]/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold text-white">{client.name}</p>
                                                            <p className="text-xs text-[var(--color-slate)]">{client.email}</p>
                                                        </div>
                                                        {client.companyName && (
                                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-[var(--color-slate)] uppercase font-bold">
                                                                {client.companyName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {selectedClient && (
                                        <div className="mt-4 p-4 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider mb-1">Selected Client</p>
                                                <p className="text-white font-medium">{selectedClient.name}</p>
                                            </div>
                                            <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-white/10 rounded-lg">
                                                <X className="w-4 h-4 text-white/50" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[var(--color-slate)]">Full Name</label>
                                        <input
                                            type="text"
                                            value={newClient.name}
                                            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-[var(--color-gold)] focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[var(--color-slate)]">Email Address</label>
                                        <input
                                            type="email"
                                            value={newClient.email}
                                            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-[var(--color-gold)] focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-medium text-[var(--color-slate)]">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={newClient.phone}
                                            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-[var(--color-gold)] focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Product Selection */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                                    <input
                                        type="text"
                                        placeholder="Add products to booking..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:border-[var(--color-gold)] focus:outline-none transition-all"
                                    />
                                    {foundProducts.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-navy-dark)] border border-white/10 rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto">
                                            {foundProducts.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => addItem(p)}
                                                    className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 flex items-center gap-3"
                                                >
                                                    <div className="w-10 h-10 rounded bg-white/10 flex-shrink-0">
                                                        {p.thumbnailUrl && <img src={p.thumbnailUrl} alt={p.name} className="w-full h-full object-cover rounded" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{p.name}</p>
                                                        <p className="text-xs text-[var(--color-gold)]">{p.pricePerDay} QAR / day</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={defaultDates.start}
                                        onChange={(e) => setDefaultDates({ ...defaultDates, start: e.target.value })}
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--color-gold)] focus:outline-none"
                                    />
                                    <input
                                        type="date"
                                        value={defaultDates.end}
                                        onChange={(e) => setDefaultDates({ ...defaultDates, end: e.target.value })}
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--color-gold)] focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Selected Items ({items.length})
                                </h3>
                                {items.length === 0 ? (
                                    <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                                        <Package className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm text-[var(--color-slate)]">No items added yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col md:flex-row md:items-center gap-4">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-white">{item.name}</p>
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-[var(--color-slate)]">
                                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.startDate} → {item.endDate}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-[var(--color-slate)] uppercase font-bold">Qty</label>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                                                            className="w-16 bg-white/10 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-[var(--color-slate)] uppercase font-bold">Price</label>
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => updateItem(idx, "price", Number(e.target.value))}
                                                            className="w-24 bg-white/10 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                        />
                                                    </div>
                                                    <button onClick={() => removeItem(idx)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors mt-4">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Financials & Notes */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[var(--color-slate)]">Project / Event Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Annual Gala 2025"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-[var(--color-gold)] focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[var(--color-slate)]">Booking Notes</label>
                                        <textarea
                                            rows={4}
                                            placeholder="Special instructions or internal notes..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-[var(--color-gold)] focus:outline-none resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="glass p-6 rounded-2xl border border-white/10 space-y-3">
                                    <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest text-[var(--color-slate)]">Cost Breakdown</h3>

                                    {/* Per-item rows */}
                                    {items.map((item, idx) => {
                                        const days = getDays(item);
                                        return (
                                            <div key={idx} className="text-xs text-[var(--color-slate)] border-b border-white/5 pb-2">
                                                <p className="text-white font-medium truncate">{item.name}</p>
                                                <div className="flex justify-between mt-0.5">
                                                    <span>{item.quantity} unit{item.quantity > 1 ? 's' : ''} × {days} day{days > 1 ? 's' : ''} × {item.price} QAR</span>
                                                    <span className="text-white">{calculateItemSubtotal(item).toLocaleString()} QAR</span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Extra fees */}
                                    {calculateExtraFees() > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-[var(--color-slate)]">Packaging / Setup / Handling</span>
                                            <span className="text-white">{calculateExtraFees().toLocaleString()} QAR</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-sm pt-1">
                                        <span className="text-[var(--color-slate)]">Subtotal</span>
                                        <span className="text-white">{(calculateSubtotal() + calculateExtraFees()).toLocaleString()} QAR</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm text-[var(--color-slate)]">Discount (%)</span>
                                        <input
                                            type="number"
                                            value={discount}
                                            onChange={(e) => setDiscount(Number(e.target.value))}
                                            className="w-20 bg-white/10 border border-white/10 rounded px-2 py-1 text-xs text-white text-right"
                                        />
                                    </div>
                                    {discount > 0 && (
                                        <div className="flex justify-between text-xs text-red-400">
                                            <span>Discount ({discount}%)</span>
                                            <span>-{((calculateSubtotal() + calculateExtraFees()) * discount / 100).toLocaleString()} QAR</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm text-[var(--color-slate)]">Logistics (QAR)</span>
                                        <input
                                            type="number"
                                            value={logisticsCost}
                                            onChange={(e) => setLogisticsCost(Number(e.target.value))}
                                            className="w-24 bg-white/10 border border-white/10 rounded px-2 py-1 text-xs text-white text-right"
                                        />
                                    </div>
                                    <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                                        <span className="text-base font-bold text-white">Grand Total</span>
                                        <span className="text-xl font-bold gradient-text-gold">{calculateTotal().toLocaleString()} QAR</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Confirmation */}
                    {step === 4 && (
                        <div className="text-center space-y-6 animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-[var(--color-gold)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-10 h-10 text-[var(--color-gold)]" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Ready to Book?</h3>
                                <p className="text-[var(--color-slate)] max-w-md mx-auto">
                                    This will create a quote for <span className="text-white font-medium">{isNewClient ? newClient.name : selectedClient?.name}</span> with {items.length} items.
                                    The status will be set to <span className="text-[var(--color-gold)] font-medium">Quote Sent</span>.
                                </p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left max-w-lg mx-auto space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-xs text-[var(--color-slate)] uppercase font-bold tracking-wider">Client</span>
                                    <span className="text-sm font-medium text-white">{isNewClient ? newClient.name : selectedClient?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-[var(--color-slate)] uppercase font-bold tracking-wider">Project</span>
                                    <span className="text-sm font-medium text-white">{projectName || "Not specified"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-[var(--color-slate)] uppercase font-bold tracking-wider">Total Amount</span>
                                    <span className="text-sm font-bold text-[var(--color-gold)]">{calculateTotal().toLocaleString()} QAR</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10 bg-white/5 flex gap-3">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all text-sm font-medium disabled:opacity-50"
                        >
                            Back
                        </button>
                    )}
                    <div className="flex-1" />
                    {step < 4 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            disabled={(step === 1 && !selectedClient && !isNewClient) || (step === 2 && items.length === 0)}
                            className="px-8 py-2.5 rounded-xl bg-[var(--color-gold)] text-black hover:bg-[var(--color-gold-light)] transition-all text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            Continue
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-2.5 rounded-xl bg-[var(--color-gold)] text-black hover:bg-[var(--color-gold-light)] transition-all text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Confirm & Create Booking
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
