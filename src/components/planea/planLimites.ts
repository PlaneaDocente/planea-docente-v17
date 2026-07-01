// Límites por plan de suscripción (grupos y alumnos por grupo)
export interface LimitesPlan {
  maxGrupos: number;
  maxAlumnosPorGrupo: number;
  planLabel: string;
}

export function limitesDePlan(plan?: string | null): LimitesPlan {
  switch (plan) {
    case "institucional":
      return { maxGrupos: 18, maxAlumnosPorGrupo: 50, planLabel: "Institucional" };
    case "profesional":
      return { maxGrupos: 3, maxAlumnosPorGrupo: 45, planLabel: "Profesional" };
    case "basico":
      return { maxGrupos: 1, maxAlumnosPorGrupo: 35, planLabel: "Básico" };
    case "gratuito":
      return { maxGrupos: 1, maxAlumnosPorGrupo: 35, planLabel: "Gratuito" };
    default:
      // Si por alguna razón no se detecta el plan, usamos límites de Profesional
      // para no bloquear a un usuario legítimo por error.
      return { maxGrupos: 3, maxAlumnosPorGrupo: 45, planLabel: "Profesional" };
  }
}
