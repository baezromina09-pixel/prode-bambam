"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

type Participante = {
  id: number | string;
  nombre: string;
  fecha: string;
};

type Resultado = {
  fecha: string;
  cantidad: number;
};

const FECHA_PROBABLE_PARTO = new Date("2026-09-07T12:00:00");
const FECHA_MINIMA = "2026-08-01";
const FECHA_MAXIMA = "2026-09-30";

const meses = [
  { anio: 2026, mes: 7, titulo: "Agosto 2026" },
  { anio: 2026, mes: 8, titulo: "Septiembre 2026" },
];

export default function Home() {
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [fechaGuardada, setFechaGuardada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [mostrarConfeti, setMostrarConfeti] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState(0);

  async function cargarParticipantes() {
    setCargando(true);

    const { data, error } = await supabase
      .from("participantes")
      .select("id, nombre, fecha")
      .order("fecha", { ascending: true });

    if (error) {
      console.error("Error al cargar participantes:", error);
      setMensaje("No pudimos cargar las participaciones. Probá nuevamente.");
      setCargando(false);
      return;
    }

    setParticipantes(data ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargarParticipantes();
  }, []);

  useEffect(() => {
    function actualizarCuentaRegresiva() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const diferencia = FECHA_PROBABLE_PARTO.getTime() - hoy.getTime();
      const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

      setDiasRestantes(Math.max(0, dias));
    }

    actualizarCuentaRegresiva();
    const intervalo = window.setInterval(actualizarCuentaRegresiva, 60_000);

    return () => window.clearInterval(intervalo);
  }, []);

  const ranking = useMemo<Resultado[]>(() => {
    const cantidades: Record<string, number> = {};

    participantes.forEach((participante) => {
      cantidades[participante.fecha] =
        (cantidades[participante.fecha] || 0) + 1;
    });

    return Object.entries(cantidades)
      .map(([fechaElegida, cantidad]) => ({
        fecha: fechaElegida,
        cantidad,
      }))
      .sort((a, b) => {
        if (b.cantidad !== a.cantidad) {
          return b.cantidad - a.cantidad;
        }

        return a.fecha.localeCompare(b.fecha);
      });
  }, [participantes]);

  const cantidadMaxima = ranking[0]?.cantidad ?? 1;

  const votosPorFecha = useMemo(() => {
    return new Map(ranking.map((resultado) => [resultado.fecha, resultado.cantidad]));
  }, [ranking]);

  function formatearFecha(fechaElegida: string, incluirAnio = false) {
    return new Date(`${fechaElegida}T12:00:00`).toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "long",
      ...(incluirAnio ? { year: "numeric" } : {}),
    });
  }

  function crearDiasCalendario(anio: number, mes: number) {
    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);
    const inicioSemana = (primerDia.getDay() + 6) % 7;

    const dias: Array<number | null> = Array(inicioSemana).fill(null);

    for (let dia = 1; dia <= ultimoDia.getDate(); dia += 1) {
      dias.push(dia);
    }

    while (dias.length % 7 !== 0) {
      dias.push(null);
    }

    return dias;
  }

  function fechaCalendario(anio: number, mes: number, dia: number) {
    const mesTexto = String(mes + 1).padStart(2, "0");
    const diaTexto = String(dia).padStart(2, "0");

    return `${anio}-${mesTexto}-${diaTexto}`;
  }

  async function guardarParticipacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje("");
    setFechaGuardada("");

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio || !fecha) {
      setMensaje("Completá tu nombre y elegí una fecha.");
      return;
    }

    setEnviando(true);

    const { data: participanteExistente, error: errorBusqueda } = await supabase
      .from("participantes")
      .select("id")
      .ilike("nombre", nombreLimpio)
      .maybeSingle();

    if (errorBusqueda) {
      console.error("Error al comprobar:", errorBusqueda);
      setMensaje("No pudimos comprobar tu participación. Probá nuevamente.");
      setEnviando(false);
      return;
    }

    if (participanteExistente) {
      setMensaje("Ese nombre ya participó del Prode de Bambam.");
      setEnviando(false);
      return;
    }

    const { error } = await supabase.from("participantes").insert({
      nombre: nombreLimpio,
      fecha,
    });

    if (error) {
      console.error("Error al guardar:", error);
      setMensaje("No pudimos guardar tu fecha. Probá nuevamente.");
      setEnviando(false);
      return;
    }

    setFechaGuardada(fecha);
    setMensaje("¡Tu predicción quedó registrada!");
    setNombre("");
    setFecha("");
    setEnviando(false);
    setMostrarConfeti(true);

    window.setTimeout(() => setMostrarConfeti(false), 2600);
    await cargarParticipantes();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f3ea] px-4 py-8 text-[#30443b] sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-24 h-52 w-52 rounded-full bg-white/70 blur-3xl" />
        <div className="absolute -right-20 top-10 h-64 w-64 rounded-full bg-[#dce8dc]/80 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#efe4d1]/80 blur-3xl" />
        <span className="absolute left-[8%] top-20 text-2xl opacity-30">☁️</span>
        <span className="absolute right-[12%] top-36 text-xl opacity-30">⭐</span>
        <span className="absolute left-[18%] top-[42%] text-lg opacity-20">✨</span>
        <span className="absolute right-[8%] top-[58%] text-2xl opacity-20">☁️</span>
      </div>

      {mostrarConfeti && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, indice) => (
            <span
              key={indice}
              className="absolute top-[-10%] animate-[confetti_2.5s_ease-out_forwards] text-xl"
              style={{
                left: `${(indice * 37) % 100}%`,
                animationDelay: `${(indice % 8) * 0.08}s`,
              }}
            >
              {["✨", "⭐", "💚", "🤍", "🎉"][indice % 5]}
            </span>
          ))}
        </div>
      )}

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-8 text-center sm:mb-10">
          <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-white/80 shadow-[0_18px_45px_rgba(74,103,87,0.15)] sm:h-40 sm:w-40">
            <img
              src="/mamut.png"
              alt=""
              className="h-full w-full object-contain p-2"
              onError={(evento) => {
                evento.currentTarget.style.display = "none";
                evento.currentTarget.parentElement?.classList.add("mamut-fallback");
              }}
            />
            <span className="hidden text-7xl [.mamut-fallback_&]:block">🦣</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-[#587465] sm:text-6xl">
            Prode de Bambam
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-[#52645b] sm:text-xl">
            ¿Qué día pensás que va a nacer Bambam?
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-[2rem] border border-white/80 bg-white/80 p-5 text-center shadow-[0_16px_40px_rgba(74,103,87,0.10)] backdrop-blur">
            <p className="text-3xl">👥</p>
            <p className="mt-2 text-3xl font-black text-[#587465]">
              {cargando ? "..." : participantes.length}
            </p>
            <p className="text-sm font-bold text-[#7c8c83]">participantes</p>
          </article>

          <article className="rounded-[2rem] border border-white/80 bg-white/80 p-5 text-center shadow-[0_16px_40px_rgba(74,103,87,0.10)] backdrop-blur">
            <p className="text-3xl">⏳</p>
            <p className="mt-2 text-3xl font-black text-[#587465]">
              {diasRestantes}
            </p>
            <p className="text-sm font-bold text-[#7c8c83]">
              {diasRestantes === 1 ? "día restante" : "días restantes"}
            </p>
          </article>

          <article className="rounded-[2rem] border border-white/80 bg-white/80 p-5 text-center shadow-[0_16px_40px_rgba(74,103,87,0.10)] backdrop-blur">
            <p className="text-3xl">🏆</p>
            <p className="mt-2 text-lg font-black capitalize text-[#587465]">
              {ranking[0]
                ? formatearFecha(ranking[0].fecha)
                : "Todavía sin votos"}
            </p>
            <p className="text-sm font-bold text-[#7c8c83]">fecha más elegida</p>
          </article>
        </section>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2.25rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_55px_rgba(74,103,87,0.12)] backdrop-blur sm:p-8">
            <div className="mb-6">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#8aa393]">
                Hacé tu predicción
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#425c50]">
                Elegí una fecha
              </h2>
            </div>

            <form onSubmit={guardarParticipacion} className="space-y-5">
              <div>
                <label htmlFor="nombre" className="mb-2 block font-bold">
                  Tu nombre
                </label>
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(evento) => setNombre(evento.target.value)}
                  placeholder="Ejemplo: Romi"
                  maxLength={80}
                  className="w-full rounded-2xl border border-[#d9e1da] bg-[#fbfcfa] px-4 py-3.5 text-[#30443b] outline-none transition focus:border-[#83a28f] focus:ring-4 focus:ring-[#dfe9e1]"
                />
              </div>

              <div>
                <label htmlFor="fecha" className="mb-2 block font-bold">
                  Fecha elegida
                </label>
                <input
                  id="fecha"
                  type="date"
                  min={FECHA_MINIMA}
                  max={FECHA_MAXIMA}
                  value={fecha}
                  onChange={(evento) => setFecha(evento.target.value)}
                  className="w-full rounded-2xl border border-[#d9e1da] bg-[#fbfcfa] px-4 py-3.5 text-[#30443b] outline-none transition focus:border-[#83a28f] focus:ring-4 focus:ring-[#dfe9e1]"
                />
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="w-full rounded-2xl bg-[#6f8f7d] px-4 py-4 text-lg font-black text-white shadow-lg shadow-[#6f8f7d]/20 transition hover:-translate-y-0.5 hover:bg-[#5f7f6e] disabled:cursor-not-allowed disabled:bg-[#aab6af]"
              >
                {enviando ? "Guardando..." : "Participar"}
              </button>
            </form>

            {mensaje && (
              <div
                className={`mt-5 rounded-3xl p-5 text-center ${
                  fechaGuardada
                    ? "bg-[#edf5ee] text-[#466151]"
                    : "bg-[#f7ece8] text-[#8a5a4a]"
                }`}
              >
                <p className="text-lg font-black">{mensaje}</p>
                {fechaGuardada && (
                  <>
                    <p className="mt-2 text-sm font-bold uppercase tracking-wider text-[#789183]">
                      Elegiste
                    </p>
                    <p className="mt-1 text-xl font-black capitalize">
                      {formatearFecha(fechaGuardada, true)}
                    </p>
                    <p className="mt-2 text-sm">¡Muchísima suerte! 🍀</p>
                  </>
                )}
              </div>
            )}

            <p className="mt-5 text-center text-xs leading-relaxed text-[#829087]">
              Una participación por persona. Las fechas pueden repetirse.
            </p>
          </section>

          <section className="rounded-[2.25rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_55px_rgba(74,103,87,0.12)] backdrop-blur sm:p-8">
            <div className="mb-6">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#8aa393]">
                Resultados en vivo
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#425c50]">
                Fechas más elegidas
              </h2>
            </div>

            {cargando ? (
              <p className="py-12 text-center text-[#7c8c83]">
                Cargando predicciones...
              </p>
            ) : ranking.length === 0 ? (
              <p className="rounded-3xl bg-[#f7f8f5] p-8 text-center text-[#7c8c83]">
                Todavía no hay participaciones.
              </p>
            ) : (
              <div className="space-y-4">
                {ranking.slice(0, 8).map((resultado, indice) => (
                  <article key={resultado.fecha}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {indice === 0
                            ? "🥇"
                            : indice === 1
                              ? "🥈"
                              : indice === 2
                                ? "🥉"
                                : "•"}
                        </span>
                        <p className="font-black capitalize text-[#425c50]">
                          {formatearFecha(resultado.fecha)}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#edf3ee] px-3 py-1 text-sm font-black text-[#587465]">
                        {resultado.cantidad}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-[#edf0eb]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#9bb4a5] to-[#6f8f7d] transition-all duration-700"
                        style={{
                          width: `${Math.max(
                            12,
                            (resultado.cantidad / cantidadMaxima) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-8 rounded-[2.25rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_55px_rgba(74,103,87,0.12)] backdrop-blur sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#8aa393]">
              Calendario del Prode
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#425c50]">
              Mirá cómo se reparten los votos
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {meses.map((mes) => (
              <article
                key={`${mes.anio}-${mes.mes}`}
                className="rounded-3xl bg-[#f8faf7] p-4 sm:p-5"
              >
                <h3 className="mb-4 text-center text-xl font-black text-[#587465]">
                  {mes.titulo}
                </h3>

                <div className="grid grid-cols-7 gap-1 text-center text-xs font-black uppercase text-[#8b988f] sm:gap-2">
                  {["L", "M", "X", "J", "V", "S", "D"].map((dia) => (
                    <div key={dia} className="py-1">
                      {dia}
                    </div>
                  ))}

                  {crearDiasCalendario(mes.anio, mes.mes).map((dia, indice) => {
                    if (!dia) {
                      return <div key={`vacio-${indice}`} className="aspect-square" />;
                    }

                    const fechaDia = fechaCalendario(mes.anio, mes.mes, dia);
                    const votos = votosPorFecha.get(fechaDia) ?? 0;
                    const esFechaProbable = fechaDia === "2026-09-07";

                    return (
                      <div
                        key={fechaDia}
                        className={`relative flex aspect-square items-center justify-center rounded-2xl border text-sm font-black transition ${
                          votos > 0
                            ? "border-[#b8cbbc] bg-[#dfeadf] text-[#496454]"
                            : "border-transparent bg-white text-[#66766d]"
                        } ${esFechaProbable ? "ring-2 ring-[#d4b576]" : ""}`}
                        title={
                          votos > 0
                            ? `${votos} ${votos === 1 ? "voto" : "votos"}`
                            : "Sin votos"
                        }
                      >
                        {dia}
                        {votos > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6f8f7d] px-1 text-[10px] text-white">
                            {votos}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>

          <p className="mt-5 text-center text-sm text-[#7b8981]">
            El círculo dorado marca la fecha probable de parto: 7 de septiembre.
          </p>
        </section>

        <section className="mt-8 rounded-[2.25rem] border border-white/80 bg-white/90 p-6 text-center shadow-[0_20px_55px_rgba(74,103,87,0.12)] backdrop-blur sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#8aa393]">
            Podio actual
          </p>
          <h2 className="mt-2 text-3xl font-black text-[#425c50]">
            Las tres fechas favoritas
          </h2>

          <div className="mt-7 grid gap-4 sm:grid-cols-3 sm:items-end">
            {[1, 0, 2].map((posicionVisual) => {
              const resultado = ranking[posicionVisual];
              const medalla =
                posicionVisual === 0 ? "🥇" : posicionVisual === 1 ? "🥈" : "🥉";

              return (
                <article
                  key={posicionVisual}
                  className={`rounded-[2rem] border p-5 ${
                    posicionVisual === 0
                      ? "border-[#d9c48c] bg-[#fff9e8] sm:-translate-y-4"
                      : "border-[#e1e7e1] bg-[#f8faf7]"
                  }`}
                >
                  <p className="text-4xl">{medalla}</p>
                  <p className="mt-3 text-lg font-black capitalize text-[#496454]">
                    {resultado
                      ? formatearFecha(resultado.fecha)
                      : "Todavía sin fecha"}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#7b8981]">
                    {resultado
                      ? `${resultado.cantidad} ${
                          resultado.cantidad === 1 ? "voto" : "votos"
                        }`
                      : "0 votos"}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="mt-10 pb-4 text-center">
          <p className="text-lg font-black text-[#587465]">
            Gracias por acompañarnos en esta espera.
          </p>
          <p className="mt-2 text-sm text-[#7b8981]">
            Cuando nazca Bambam, descubriremos quién estuvo más cerca.
          </p>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(115vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}