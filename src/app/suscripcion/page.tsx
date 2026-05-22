import { Metadata } from "next";
import SuscripcionSection from "@/components/planea/SuscripcionSection";

export const metadata: Metadata = {
  title: "Suscripción — PlaneaDocente",
  description: "Elige el plan perfecto para tu labor docente. Compatible con la Nueva Escuela Mexicana (NEM).",
};

export default function SuscripcionPage() {
  return <SuscripcionSection />;
}