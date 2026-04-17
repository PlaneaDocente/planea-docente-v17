
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface CalendarEvent {
  id: string;
  titulo: string;
  fecha: string;
  tipo: string;
  color: string;
}

interface MiniCalendarProps {
  events: CalendarEvent[];
}

const DAYS = ["D", "L", "M", "X", "J", "V", "S"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function MiniCalendar({ events }: MiniCalendarProps) {
  const today = new Date();
  const [current, setCurrent] = useState({ month: today.getMonth(), year: today.getFullYear() });

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  const eventDates = events.reduce<Record<string, string>>((acc, e) => {
    const d = new Date(e.fecha);
    if (d.getMonth() === current.month && d.getFullYear() === current.year) {
      acc[d.getDate()] = e.color;
    }
    return acc;
  }, {});

  const prevMonth = () => setCurrent(c => c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year });
  const nextMonth = () => setCurrent(c => c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year });

  const cells = Array.from({ length: firstDay }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-foreground">Calendario Escolar</h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-medium text-muted-foreground w-24 text-center">
            {MONTHS[current.month]} {current.year}
          </span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          const isToday = day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();
          const eventColor = day ? eventDates[day] : null;
          return (
            <motion.div
              key={i}
              whileHover={day ? { scale: 1.1 } : {}}
              className={`relative text-center text-xs py-1.5 rounded-lg cursor-default transition-colors ${
                isToday ? "bg-primary text-primary-foreground font-bold" :
                day ? "hover:bg-muted text-foreground" : ""
              }`}
            >
              {day}
              {eventColor && !isToday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: eventColor }} />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Próximos eventos</p>
        {events.slice(0, 3).map(e => (
          <div key={e.id} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
            <span className="text-xs text-foreground truncate flex-1">{e.titulo}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(e.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
