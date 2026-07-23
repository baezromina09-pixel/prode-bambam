"use client";

import { FormEvent, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Home() {
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardarParticipacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje("");

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
      setMensaje("No pudimos comprobar la participación. Intentá nuevamente.");
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
  setMensaje(`Error al guardar: ${error.message}`);
  setEnviando(false);
  return;

    }

    setMensaje("¡Tu fecha quedó guardada! Gracias por participar 💙");
    setNombre("");
    setFecha("");
    setEnviando(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-100 to-blue-200 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mb-3 text-6xl">👶🏻</div>

          <h1 className="text-4xl font-bold text-blue-700">
            Prode de Bambam
          </h1>

          <p className="mt-3 text-gray-600">
            ¿Qué día pensás que va a nacer Bambam?
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Una participación por persona. Se pueden repetir las fechas.
          </p>
        </div>

        <form onSubmit={guardarParticipacion} className="space-y-5">
          <div>
            <label
              htmlFor="nombre"
              className="mb-2 block font-semibold text-gray-700"
            >
              Tu nombre
            </label>

            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              placeholder="Ejemplo: Romi"
              maxLength={80}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label
              htmlFor="fecha"
              className="mb-2 block font-semibold text-gray-700"
            >
              Fecha elegida
            </label>

            <input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {enviando ? "Guardando..." : "Guardar mi fecha"}
          </button>
        </form>

        {mensaje && (
          <p className="mt-5 rounded-xl bg-blue-50 p-3 text-center font-medium text-blue-800">
            {mensaje}
          </p>
        )}

        <p className="mt-7 text-center text-sm text-gray-500">
          Mami y mamá esperan a Bambam con mucho amor 💙
        </p>
      </section>
    </main>
  );
}