import { Card } from "@/components/ui/card";
import { InviteMemberForm } from "@/components/projects/invite-member-form";
import type { ProjectMemberSummary } from "@/lib/data/project-members";
import type { Locale } from "@/lib/i18n/config";
import type { ProjectMembersCardDictionary } from "@/lib/i18n/types";

const formatDate = (value: string | null, locale: Locale) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
};

export const ProjectMembersCard = ({
  projectId,
  members,
  canInvite,
  locale,
  copy,
}: {
  projectId: string;
  members: ProjectMemberSummary[];
  canInvite: boolean;
  locale: Locale;
  copy: ProjectMembersCardDictionary;
}) => (
  <Card className="space-y-6 p-6">
    <div>
      <h2 className="text-lg font-semibold text-slate-950 tracking-tight">{copy.title}</h2>
      <p className="mt-2 text-sm text-slate-600">{copy.description}</p>
      <p className="mt-1 text-xs text-slate-500">{copy.inviteOnlyNote}</p>
    </div>
    <div className="space-y-4">
      {members.length === 0 ? (
        <p className="text-sm text-slate-600">{copy.empty}</p>
      ) : (
        <ul className="space-y-3">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 text-sm ring-1 ring-slate-200"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-slate-900">
                  {member.email ?? copy.anonymousMember}
                </span>
                <span className="text-xs text-slate-500">
                  {copy.roles[member.role] ?? member.role} · {" "}
                  {copy.statuses[member.status] ?? member.status}
                  {member.createdAt
                    ? ` · ${copy.addedOn.replace(
                        "{date}",
                        formatDate(member.createdAt, locale)
                      )}`
                    : ""}
                </span>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {copy.roles[member.role] ?? member.role}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
    {canInvite ? (
      <div className="border-t border-slate-200 pt-4">
        <InviteMemberForm projectId={projectId} />
      </div>
    ) : null}
  </Card>
);
