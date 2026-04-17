// Lógica para pedirle a la IA una planeación
export const generarPlaneacionNEM = async (grado: string, tema: string) => {
  const prompt = `
    Actúa como un experto pedagogo de la Nueva Escuela Mexicana (NEM). 
    Diseña una planeación didáctica para ${grado} de primaria sobre el tema: "${tema}".
    Incluye:
    1. Campos formativos.
    2. Ejes articuladores.
    3. Secuencia didáctica (Inicio, Desarrollo, Cierre).
    4. Evaluación formativa.
    Usa un lenguaje profesional y motivador para docentes.
  `;

  // Aquí el código llamará a la API de OpenAI usando tu llave
};