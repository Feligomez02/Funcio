import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/data/projects";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const SettingsPage = async () => {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [locale, projects] = await Promise.all([
    getRequestLocale(),
    listProjectsForUser(session.user.id),
  ] as const);
  const dictionary = await getDictionary(locale);
  const emailConfirmed = Boolean(session.user.email_confirmed_at);
  const {
    settingsPage,
    projectMembersCard: { roles },
  } = dictionary;

  return (
    <div className="space-y-10">
      <PageHeader
        title={settingsPage.headerTitle}
        description={settingsPage.headerDescription}
        backHref="/projects"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">
            {settingsPage.profileCard.title}
          </h2>
          <dl className="mt-4 space-y-3 text-sm text-slate-700">
            <div>
              <dt className="font-medium text-slate-900">
                {settingsPage.profileCard.email}
              </dt>
              <dd className="mt-1 break-all">{session.user.email}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">
                {settingsPage.profileCard.emailStatus}
              </dt>
              <dd className="mt-1">
                {emailConfirmed ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    {settingsPage.profileCard.confirmed}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    {settingsPage.profileCard.pending}
                  </span>
                )}
              </dd>
              {!emailConfirmed ? (
                <p className="mt-2 text-xs text-slate-500">
                  {settingsPage.profileCard.pendingHint}
                </p>
              ) : null}
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">
            {settingsPage.rolesCard.title}
          </h2>
          {projects.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              {settingsPage.rolesCard.empty}
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {projects.map((project) => (
                <li key={project.id} className="flex justify-between">
                  <span>{project.name}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {roles[project.role] ?? project.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-xs text-slate-500">
            {settingsPage.rolesCard.hint}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
