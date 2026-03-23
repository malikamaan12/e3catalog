"use client";

import React, { useState, useEffect } from "react";
import { format, addDays, parseISO, startOfToday, isWithinInterval, subDays } from "date-fns";
import { Loader2, Calendar as CalendarIcon, Package, Truck, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { BOOKING_STATUS } from "@/lib/constants";

type CalendarBooking = {
    id: string;
    projectId: string;
    projectName: string;
    status: string;
    startDate: string;
    endDate: string;
    fulfillmentStatus: string;
    units: number;
    customerName: string;
    productName: string;
    productItemCode: string;
    vendorName: string;
    bufferBefore: number;
    bufferAfter: number;
};

export default function OperationalCalendarPage() {
    const [bookings, setBookings] = useState<CalendarBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewDays, setViewDays] = useState(14); // Next 14 days view

    useEffect(() => {
        fetchCalendarData();
    }, []);

    const fetchCalendarData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/calendar");
            if (res.ok) {
                const data = await res.json();
                setBookings(data);
            }
        } catch (error) {
            console.error("Failed to fetch calendar", error);
        } finally {
            setLoading(false);
        }
    };

    // Generate timeline dates
    const today = startOfToday();
    const timelineDates = Array.from({ length: viewDays }, (_, i) => addDays(today, i - 2)); // Start 2 days ago for context

    const getStatusColor = (status: string) => {
        switch (status) {
            case BOOKING_STATUS.QUOTE_ACCEPTED: return "bg-blue-500 text-white";
            case BOOKING_STATUS.APPROVED: return "bg-green-500 text-white";
            case BOOKING_STATUS.BOOKED: return "bg-emerald-600 text-white";
            case BOOKING_STATUS.BOOKING_REQUESTED: return "bg-orange-500 text-white";
            default: return "bg-gray-500 text-white";
        }
    };

    const getFulfillmentIcon = (status: string) => {
        switch (status) {
            case "pending": return <Clock className="w-3 h-3" />;
            case "packing": return <Package className="w-3 h-3" />;
            case "out_for_delivery": return <Truck className="w-3 h-3" />;
            case "delivered": return <CheckCircle className="w-3 h-3" />;
            default: return <AlertCircle className="w-3 h-3" />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-gold)]" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-warm-white)] flex items-center gap-3">
                        <CalendarIcon className="w-8 h-8 text-[var(--color-gold)]" />
                        Operational Calendar
                    </h1>
                    <p className="text-[var(--color-slate)] mt-1">Live pipeline of active bookings and logistics schedules.</p>
                </div>

                <div className="flex items-center gap-2 bg-[var(--color-navy-lighter)] p-1 rounded-lg border border-[var(--color-border-subtle)]">
                    {[7, 14, 30].map(days => (
                        <button
                            key={days}
                            onClick={() => setViewDays(days)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                viewDays === days 
                                    ? "bg-[var(--color-gold)] text-black" 
                                    : "text-[var(--color-slate)] hover:text-white"
                            }`}
                        >
                            {days} Days
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <div className="min-w-[1000px] p-6">
                        
                        {/* Timeline Header */}
                        <div className="flex border-b border-[var(--color-border-subtle)] pb-4 mb-4">
                            <div className="w-64 shrink-0 font-bold text-[var(--color-slate)] uppercase tracking-wider text-xs">
                                Asset & Project
                            </div>
                            <div className="flex-1 flex">
                                {timelineDates.map(date => {
                                    const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
                                    return (
                                        <div key={date.toISOString()} className={`flex-1 flex flex-col items-center ${isToday ? "text-[var(--color-gold)]" : "text-[var(--color-slate)]"}`}>
                                            <span className="text-xs uppercase font-bold">{format(date, "EEE")}</span>
                                            <span className={`text-lg font-black mt-1 ${isToday ? "bg-[var(--color-gold)]/20 px-2 rounded" : ""}`}>
                                                {format(date, "dd")}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Timeline Rows */}
                        <div className="space-y-4">
                            {bookings.length === 0 ? (
                                <div className="text-center py-10 text-[var(--color-slate)]">No upcoming active bookings found.</div>
                            ) : (
                                bookings.map(booking => {
                                    const start = parseISO(booking.startDate);
                                    const end = parseISO(booking.endDate);
                                    
                                    // Determine visually which grid cells this booking occupies
                                    const renderCells = timelineDates.map(date => {
                                        const dateStr = format(date, "yyyy-MM-dd");
                                        const bStartStr = format(start, "yyyy-MM-dd");
                                        const bEndStr = format(end, "yyyy-MM-dd");
                                        
                                        const isActiveDay = date >= start && date <= end;
                                        const isStart = dateStr === bStartStr;
                                        const isEnd = dateStr === bEndStr;
                                        
                                        return (
                                            <div key={dateStr} className="flex-1 relative h-10 border-l border-[var(--color-border-subtle)]/30 flex items-center justify-center group">
                                                {isActiveDay && (
                                                    <div className={`absolute inset-y-1 inset-x-0 mx-0.5 ${getStatusColor(booking.status)} opacity-90 flex items-center justify-center text-[10px] font-bold shadow-sm z-10 
                                                        ${isStart ? "rounded-l-full ml-1" : ""} 
                                                        ${isEnd ? "rounded-r-full mr-1" : ""}
                                                    `}>
                                                        {isStart && <span className="truncate px-2">{booking.units}x</span>}
                                                    </div>
                                                )}
                                                {/* Tooltip on hover for active days */}
                                                {isActiveDay && (
                                                    <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs p-2 rounded whitespace-nowrap z-50">
                                                        {format(start, "MMM dd")} - {format(end, "MMM dd")}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });

                                    return (
                                        <div key={booking.id} className="flex items-center hover:bg-[var(--color-navy-lighter)] rounded-lg transition-colors p-1">
                                            {/* Left Column Info */}
                                            <div className="w-64 shrink-0 pr-4">
                                                <div className="text-sm font-bold text-white truncate">{booking.productName}</div>
                                                <div className="text-xs text-[var(--color-gold)] truncate">{booking.projectName}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider bg-[var(--color-navy)] px-1.5 rounded">
                                                        {booking.customerName}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-800 px-1.5 rounded" title="Fulfillment Status">
                                                        {getFulfillmentIcon(booking.fulfillmentStatus)}
                                                        {booking.fulfillmentStatus}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Right Column Grid */}
                                            <div className="flex-1 flex bg-[var(--color-navy)]/30 rounded-lg overflow-hidden">
                                                {renderCells}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                    </div>
                </div>
            </div>
            
        </div>
    );
}
