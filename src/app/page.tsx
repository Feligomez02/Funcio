import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LanguageToggle } from "@/components/i18n/language-toggle";

export const metadata: Metadata = {
  title: "Funcio | Capture requirements, collaborate, deliver",
};

const Home = async () => {
  const session = await getSession();

  if (session) {
    // Signed-in users go straight to their projects
    redirect("/projects");
  }

  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);
  const { homePage } = dictionary;
  const projectDetailImages = [
    {
      src: "/images/Captura de pantalla 2025-10-29 152811.png",
      alt: `${homePage.images.projectDetail.alt} 1`,
    },
    {
      src: "/images/Captura de pantalla 2025-10-29 152831.png",
      alt: `${homePage.images.projectDetail.alt} 2`,
    },
  ];
  const requirementDetailImages = [
    {
      src: "/images/Captura de pantalla 2025-10-29 152912.png",
      alt: `${homePage.images.requirementDetail.alt} 1`,
    },
    {
      src: "/images/Captura de pantalla 2025-10-29 152929.png",
      alt: `${homePage.images.requirementDetail.alt} 2`,
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50 text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-12">
        <nav className="mb-16 flex flex-wrap items-center justify-between gap-4 rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
            <Image
              src="/images/funcio-logo.png"
              alt={homePage.brand}
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <span>{homePage.brand}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageToggle />
            <Link href="/login" className="rounded-full px-3 py-1.5 hover:text-slate-900">
              {homePage.navLogin}
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-indigo-700 transition hover:bg-indigo-100 hover:text-indigo-800"
            >
              {homePage.navSignup}
            </Link>
            <a
              href={`mailto:${homePage.contactEmail}`}
              className="rounded-full px-3 py-1.5 hover:text-slate-900"
            >
              {homePage.navContact}
            </a>
          </div>
        </nav>

        <header className="space-y-12">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              {homePage.headerTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">{homePage.headerSubtitle}</p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-500 hover:via-sky-400 hover:to-emerald-500"
              >
                {homePage.getStarted}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
              >
                {homePage.signIn}
              </Link>
              <a
                href={`mailto:${homePage.contactEmail}`}
                className="inline-flex items-center rounded-xl bg-amber-100 px-5 py-2 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-200"
              >
                {homePage.navContact}
              </a>
            </div>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {homePage.heroHighlights.map((highlight, index) => (
                <li
                  key={highlight.title}
                  className="flex gap-4 rounded-xl border border-slate-200 bg-white/90 p-5 text-left shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{highlight.title}</div>
                    <div className="text-sm text-slate-600">{highlight.description}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-6 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 p-8 shadow-xl lg:p-14">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {homePage.overviewHero.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{homePage.overviewHero.description}</p>
            <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 lg:min-h-[30rem]">
              <Image
                src="/images/Captura de pantalla 2025-10-29 153012.png"
                alt={homePage.images.projects.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 70rem"
                className="object-contain"
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">{homePage.images.projects.caption}</p>
          </div>
        </header>

        <section className="mt-20 space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">{homePage.featuresTitle}</h2>
          <p className="max-w-2xl text-slate-600">{homePage.featuresDescription}</p>
          <div className="grid gap-5 md:grid-cols-2">
            {homePage.features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-sky-200 bg-sky-50/80 p-6 shadow-sm shadow-sky-200/40"
              >
                <div className="text-sm font-semibold uppercase text-indigo-600">{feature.title}</div>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 space-y-12">
          <div className="flex flex-col gap-6 rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-amber-50 p-8 shadow-md lg:p-14">
            <h3 className="text-lg font-semibold text-slate-900">
              {homePage.images.projectDetail.title}
            </h3>
            <p className="text-sm text-slate-600">{homePage.images.projectDetail.description}</p>
            <div className="grid gap-6 lg:grid-cols-2">
              {projectDetailImages.map((screenshot) => (
                <div key={screenshot.alt} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 lg:min-h-[24rem]">
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 34rem"
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">{homePage.images.projectDetail.caption}</p>
          </div>

          <div className="flex flex-col gap-6 rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-amber-50 p-8 shadow-md lg:p-14">
            <h3 className="text-lg font-semibold text-slate-900">
              {homePage.images.requirementDetail.title}
            </h3>
            <p className="text-sm text-slate-600">{homePage.images.requirementDetail.description}</p>
            <div className="grid gap-6 lg:grid-cols-2">
              {requirementDetailImages.map((screenshot) => (
                <div key={screenshot.alt} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 lg:min-h-[24rem]">
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 34rem"
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">{homePage.images.requirementDetail.caption}</p>
          </div>
        </section>

        <section className="mt-20 space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">{homePage.howItWorksTitle}</h2>
          <p className="max-w-2xl text-slate-600">{homePage.howItWorksDescription}</p>
          <div className="grid gap-6 md:grid-cols-3">
            {homePage.steps.map((step) => (
              <div
                key={step.title}
                className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm shadow-amber-200/40"
              >
                <div className="text-sm font-semibold uppercase text-indigo-600">{step.title}</div>
                <p className="mt-3 text-sm text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-20 text-center text-sm text-slate-500">
          {homePage.footerNote}
        </footer>
      </div>
    </main>
  );
};

export default Home;
