import type { ReactNode } from "react";
import Link from "next/link";

const AuthLayout = ({ children }: { children: ReactNode }) => (
  <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4 py-12 text-slate-100">
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/40 to-sky-500/20 blur-3xl" />
      <div className="absolute bottom-0 left-[-10%] h-80 w-80 rounded-full bg-gradient-to-tr from-amber-400/20 via-rose-400/10 to-transparent blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_45%)]" />
    </div>

    <div className="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-[1.2fr_1fr]">
      <aside className="hidden flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl lg:flex">
        <div>
          <div className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.3em] text-slate-200/80">
            Funcio · v0.9 Preview
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Requerimientos con contexto, trazabilidad y ayuda de IA.
          </h1>
          <p className="mt-4 max-w-lg text-sm text-slate-100/70">
            Estructura requerimientos, conectalos a Jira y prepara entregables con un asistente pensado para analistas. Esta preview se enfoca en acceso con email; Google, GitHub y Auth0 llegan en la proxima version.
          </p>
        </div>

        <dl className="mt-10 space-y-4 text-sm text-slate-100/70">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-6 w-6 flex-none rounded-full border border-white/30 text-center text-[11px] font-semibold leading-6">
              1
            </span>
            <div>
              <dt className="font-semibold text-white">Hecho para analistas</dt>
              <dd>
                Prioridad, criterios de aceptacion, modulos afectados e impactos listos desde el inicio.
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 h-6 w-6 flex-none rounded-full border border-white/30 text-center text-[11px] font-semibold leading-6">
              2
            </span>
            <div>
              <dt className="font-semibold text-white">Trazable hasta Jira</dt>
              <dd>
                Empuja el requerimiento a Jira cuando este listo. Manten el historial y la conversacion dentro de Funcio.
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 h-6 w-6 flex-none rounded-full border border-white/30 text-center text-[11px] font-semibold leading-6">
              3
            </span>
            <div>
              <dt className="font-semibold text-white">OAuth en camino</dt>
              <dd>
                Lanzamos esta build con login por contrasena para avanzar rapido. Proxima parada: acceso social y empresarial.
              </dd>
            </div>
          </div>
        </dl>

        <div className="flex items-center justify-between pt-6 text-xs text-slate-200/60">
          <span>&#169; {new Date().getFullYear()} Funcio. Todos los derechos reservados.</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white transition">
              Volver al sitio principal
            </Link>
            <span className="h-1 w-1 rounded-full bg-slate-200/40" />
            <Link href="/projects" className="hover:text-white transition">
              Ver proyectos
            </Link>
          </div>
        </div>
      </aside>

      <main className="relative rounded-3xl border border-white/10 bg-white/90 p-8 shadow-2xl shadow-slate-900/20 backdrop-blur md:p-10">
        <header className="mb-6 text-center md:text-left">
          <h2 className="text-2xl font-semibold text-slate-900">Funcio</h2>
          <p className="mt-2 text-sm text-slate-600">
            Accede con tu email para continuar. OAuth (Google, GitHub, Auth0) se habilita en el proximo despliegue. Gracias por probar la preview.
          </p>
        </header>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          {children}
        </div>
      </main>
    </div>
  </div>
);

export default AuthLayout;