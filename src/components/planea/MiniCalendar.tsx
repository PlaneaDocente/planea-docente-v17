import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  events?: { day: number; title: string }[];
}

export default function MiniCalendar({ events = [] }: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // FIX: Declaramos el array con tipo (number | null)[] para que acepte ambos
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  const today = new Date();

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1 hover:bg-muted rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-sm">
          {monthNames[month]} {year}
        </h3>
        <button onClick={nextMonth} className="p-1 hover:bg-muted rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
        {["D", "L", "M", "M", "J", "V", "S"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="h-8" />;
          }

          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          const hasEvent = events.some((e) => e.day === day);

          return (
            <motion.div
              key={day}
              whileHover={{ scale: 1.1 }}
              className={cn(
                "h-8 flex items-center justify-center rounded-lg text-xs cursor-pointer transition-colors",
                isToday
                  ? "bg-primary text-primary-foreground font-bold"
                  : "hover:bg-muted",
                hasEvent && !isToday && "bg-amber-100 text-amber-700 font-semibold"
              )}
            >
              {day}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}