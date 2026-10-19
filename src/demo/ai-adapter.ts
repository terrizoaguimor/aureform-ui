export type DemoModel = "balanced" | "precise" | "creative";
export type StreamOptions = {
  locale: "en" | "es";
  model: DemoModel;
  signal: AbortSignal;
  mode?: "chat" | "code";
  fail?: boolean;
  delay?: number;
  temperature?: number;
};
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const aborted = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", aborted);
      resolve();
    }, ms);
    signal.addEventListener("abort", aborted, { once: true });
  });
}
/** Replace this deterministic adapter with your model provider's streaming transport. */
export async function* streamDemoReply(
  prompt: string,
  options: StreamOptions,
): AsyncGenerator<string> {
  const {
    locale,
    model,
    signal,
    fail,
    delay = 20,
    mode = "chat",
    temperature = 0.7,
  } = options;
  await wait(delay * 5, signal);
  if (fail)
    throw new Error(
      locale === "es"
        ? "El adaptador de demostración simuló un error. Puedes reintentar."
        : "The demo adapter simulated a connection error. You can retry.",
    );
  const topic = prompt.slice(0, 160);
  const text =
    mode === "code"
      ? (locale === "es"
          ? "Este es un ejemplo editable para tu interfaz. El componente recibe datos y una acción; la lógica de negocio se mantiene fuera.\n\n"
          : "Here is an editable interface example. The component receives data and an action; business logic stays outside.\n\n") +
        '```tsx\nimport {Button} from "@/components/ui/button";\nimport {Card} from "@/components/ui/card";\n\ntype SummaryProps = {\n  title: string;\n  value: string;\n  onExplore: () => void;\n};\n\nexport function Summary({title, value, onExplore}: SummaryProps) {\n  return (\n    <Card className="p-6">\n      <h2 className="text-sm font-medium">{title}</h2>\n      <p className="mt-3 text-3xl font-semibold">{value}</p>\n      <Button className="mt-5" onClick={onExplore}>Explore</Button>\n    </Card>\n  );\n}\n```'
      : locale === "es"
        ? `Podemos dar forma a “${topic}” con tres decisiones claras.\n\n1. Define la acción principal. Haz que la persona entienda qué puede lograr antes de mostrarle opciones.\n\n2. Construye una jerarquía tranquila. Usa una superficie clara, texto preciso y un único acento para guiar la atención.\n\n3. Diseña los estados completos. Incluye carga, resultados vacíos, errores recuperables y una confirmación visible.\n\n${model === "precise" ? "Siguiente paso: define el contrato de datos y verifica el recorrido con teclado." : model === "creative" ? `Una dirección creativa: convierte el primer paso en una pequeña invitación a explorar. Intensidad creativa: ${Math.round(temperature * 100)}%.` : "Empieza con un bloque pequeño y reutilizable. Después conecta tu API y valida el recorrido completo."}\n\nEsta respuesta se generó con el adaptador local de demostración.`
        : `We can shape “${topic}” around three considered decisions.\n\n1. Define the primary action. Help people understand what they can achieve before asking them to choose.\n\n2. Build a calm hierarchy. Use clear surfaces, precise language and one purposeful accent to guide attention.\n\n3. Design the complete state. Include loading, empty results, recoverable errors and a visible confirmation.\n\n${model === "precise" ? "Next step: define the data contract and verify the entire journey with a keyboard." : model === "creative" ? `A creative direction: make the first step feel like a small invitation to explore. Creative intensity: ${Math.round(temperature * 100)}%.` : "Start with one small, reusable block. Then connect your API and validate the whole journey."}\n\nThis response uses the local demonstration adapter.`;
  const chunks = text.match(/\S+\s*/g) ?? [];
  for (const chunk of chunks) {
    await wait(delay, signal);
    yield chunk;
  }
}
