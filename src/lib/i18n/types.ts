import type { Locale } from "./config";

export type InviteMemberFormDictionary = {
  emailLabel: string;
  roleLabel: string;
  submit: string;
  submitting: string;
  hint: string;
  success: string;
  errors: {
    "user-not-found": string;
    "duplicate-member": string;
    timeout: string;
    network: string;
    generic: string;
  };
};

export type RolesDictionary = {
  admin: string;
  analyst: string;
  collaborator: string;
};

export type ProjectMembersCardDictionary = {
  title: string;
  description: string;
  empty: string;
  inviteOnlyNote: string;
  anonymousMember: string;
  statuses: {
    active: string;
    invited: string;
  };
  roles: RolesDictionary;
  addedOn: string;
};

export type ProjectPageDictionary = {
  defaultDescription: string;
  backToProjectsLabel: string;
  header: {
    roleLabel: string;
    updatedLabel: string;
    jiraStatusLabel: string;
    credentialsLabel: string;
    sourceLabel: string;
    sources: {
      project: string;
      environment: string;
      missing: string;
    };
    connectionStates?: {
      connected: string;
      expired: string;
      invalid: string;
    };
    lastValidatedLabel: string;
  };
  actions: {
    newRequirement: string;
    inviteMember: string;
    manageIntegrations: string;
  };
  board: {
    title: string;
    empty: string;
    columnEmpty: string;
    addRequirement: string;
    unassignedTitle: string;
    openRequirement: string;
  };
  drawer: {
    createTitle: string;
    editTitle: string;
  };
  metrics: {
    title: string;
  };
  menu: {
    edit: string;
    delete: string;
    editTitle: string;
    editDescription: string;
    nameLabel: string;
    descriptionLabel: string;
    save: string;
    saving: string;
    cancel: string;
    deleteConfirm: string;
    deleteAction: string;
    deleteBusy: string;
  };
};

export type RequirementFormDictionary = {
  fields: {
    titleLabel: string;
    titlePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    typeLabel: string;
    priorityLabel: string;
    statusLabel: string;
    changeNoteLabel: string;
    changeNotePlaceholder: string;
    userStoryLabel: string;
    userStoryPlaceholder: string;
    acceptanceCriteriaLabel: string;
    acceptanceCriteriaPlaceholder: string;
    issuesLabel: string;
    issuesPlaceholder: string;
  };
  ai: {
    sectionLabel: string;
    languageLabel: string;
    improveButton: string;
    improvingButton: string;
    applySuggestion: string;
    errors: {
      descriptionTooShort: string;
      generic: string;
    };
    result: {
      improvedTitle: string;
      userStoryTitle: string;
      acceptanceTitle: string;
      issuesTitle: string;
      noIssues: string;
      confidence: string;
      provider: string;
      tokens: string;
    };
  };
  typeSuggestionCard?: {
    title: string;
    reasonLabel: string;
    confidenceLabel: string;
    changeNoteLabel: string;
    applyButton: string;
    appliedLabel: string;
    reminder: string;
  };
  create: {
    submit: string;
    submitting: string;
    disabledHint: string;
    error: string;
  };
  edit: {
    submit: string;
    submitting: string;
    disabledHint: string;
    success: string;
    error: string;
    typeChangeReasonRequired: string;
    delete: string;
    deleting: string;
    deleteConfirm: string;
    deleteError: string;
    deleteHint: string;
  };
  requirementTypes: Record<string, string>;
  requirementStatuses: Record<string, string>;
};

export type CommonDictionary = {
  languageLabel: string;
  locales: Record<Locale, string>;
};

export type AppShellDictionary = {
  brand: string;
  nav: {
    projects: string;
    settings: string;
  };
  accountLabel: string;
};

export type ProjectsPageDictionary = {
  headerTitle: string;
  headerDescription: string;
  emptyState: string;
  projectRoleLabel: string;
  card: {
    titleFallback: string;
    descriptionFallback: string;
  };
  sidebar: {
    title: string;
    searchPlaceholder: string;
    newProject: string;
    empty: string;
    countLabel: {
      singular: string;
      plural: string;
    };
  };
  newProjectCard: {
    title: string;
    description: string;
  };
  overview: {
    noProjectTitle: string;
    noProjectDescription: string;
    roleLabel: string;
    updatedLabel: string;
    descriptionFallback: string;
    credentialsLabel: string;
    credentialSources: {
      project: string;
      environment: string;
      missing: string;
    };
    connectionStates: {
      connected: string;
      expired: string;
      invalid: string;
    };
    lastValidatedLabel: string;
    metricsTitle: string;
    statusBreakdownTitle: string;
    metricsEmpty: string;
    recentRequirementsTitle: string;
    recentRequirementsEmpty: string;
    actions: {
      newRequirement: string;
      openProject: string;
      viewAllRequirements: string;
    };
  };
};

export type ProjectFormDictionary = {
  fields: {
    nameLabel: string;
    namePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
  };
  submit: string;
  submitting: string;
  error: string;
};

export type SettingsPageDictionary = {
  headerTitle: string;
  headerDescription: string;
  profileCard: {
    title: string;
    email: string;
    emailStatus: string;
    confirmed: string;
    pending: string;
    pendingHint: string;
  };
  rolesCard: {
    title: string;
    empty: string;
    hint: string;
    roleLabel: string;
  };
};

export type AuthDictionary = {
  signOut: {
    default: string;
    loading: string;
  };
};

export type HomePageDictionary = {
  brand: string;
  navLogin: string;
  navSignup: string;
  navContact: string;
  contactEmail: string;
  headerTitle: string;
  headerSubtitle: string;
  getStarted: string;
  signIn: string;
  heroHighlights: Array<{ title: string; description: string }>;
  featuresTitle: string;
  featuresDescription: string;
  features: Array<{ title: string; description: string }>;
  overviewHero: {
    title: string;
    description: string;
  };
  images: {
    projects: {
      alt: string;
      caption: string;
    };
    projectDetail: {
      title: string;
      description: string;
      alt: string;
      caption: string;
    };
    requirementDetail: {
      title: string;
      description: string;
      alt: string;
      caption: string;
    };
  };
  howItWorksTitle: string;
  howItWorksDescription: string;
  steps: Array<{ title: string; description: string }>;
  screenshotPlaceholderTitle: string;
  screenshotPlaceholderText: string;
  screenshotInstructions: string;
  footerNote: string;
};

export type Dictionary = {
  common: CommonDictionary;
  inviteMemberForm: InviteMemberFormDictionary;
  projectMembersCard: ProjectMembersCardDictionary;
  projectPage: ProjectPageDictionary;
  homePage: HomePageDictionary;
  requirementForm: RequirementFormDictionary;
  appShell: AppShellDictionary;
  projectsPage: ProjectsPageDictionary;
  projectForm: ProjectFormDictionary;
  settingsPage: SettingsPageDictionary;
  auth: AuthDictionary;
};

