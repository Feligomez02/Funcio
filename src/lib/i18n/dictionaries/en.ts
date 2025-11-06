import type { Dictionary } from "../types";

const dictionary: Dictionary = {
  common: {
    languageLabel: "Language",
    locales: {
      en: "English",
      es: "Español",
    },
  },
  inviteMemberForm: {
    emailLabel: "Collaborator email",
    roleLabel: "Role",
    submit: "Send invite",
    submitting: "Sending…",
    hint:
      "For security, invitations only work for existing accounts. The server validates email and permissions.",
    success: "Invitation sent successfully.",
    errors: {
      "user-not-found": "We couldn't invite that user. Ask them to register, then try again.",
      "duplicate-member": "That user is already part of this project.",
      timeout: "Request timed out. Please try again.",
      network: "Network error. Check your connection and try again.",
      generic: "Unable to send invitation.",
    },
  },
  projectMembersCard: {
    title: "Project members",
    description:
      "Manage collaborators and track invitation status.",
    empty: "No collaborators yet. Invite teammates to start collaborating.",
    inviteOnlyNote: "Only admins can invite new members.",
    anonymousMember: "Invited user",
    statuses: {
      active: "Active",
      invited: "Invitation pending",
    },
    roles: {
      admin: "Admin",
      analyst: "Analyst",
      collaborator: "Collaborator",
    },
    addedOn: "Added {date}",
  },
  projectPage: {
    defaultDescription: "Capture and refine project requirements.",
    backToProjectsLabel: "Back to projects",
    header: {
      roleLabel: "Role",
      updatedLabel: "Updated {value}",
      jiraStatusLabel: "JIRA status",
      credentialsLabel: "Credentials",
      sourceLabel: "Source",
      sources: {
        project: "Project override",
        environment: "Environment",
        missing: "Missing",
      },
      connectionStates: {
        connected: "Connected",
        expired: "Expired",
        invalid: "Invalid",
      },
      lastValidatedLabel: "Last validated {value}",
    },
    actions: {
      newRequirement: "New requirement",
      inviteMember: "Invite member",
      manageIntegrations: "Manage integrations",
    },
    board: {
      title: "Requirements board",
      empty: "No requirements yet. Create one to get started.",
      columnEmpty: "No requirements in this column yet.",
      addRequirement: "Add",
      unassignedTitle: "Unassigned",
      openRequirement: "View requirement",
    },
    drawer: {
      createTitle: "New requirement",
      editTitle: "Edit requirement",
    },
    metrics: {
      title: "Requirement metrics",
    },
    menu: {
      edit: "Edit project",
      delete: "Delete project",
      editTitle: "Project details",
      editDescription: "Update the project name and description. Changes apply immediately.",
      nameLabel: "Name",
      descriptionLabel: "Description",
      save: "Save changes",
      saving: "Saving...",
      cancel: "Cancel",
      deleteConfirm: "Are you sure you want to delete this project? This action cannot be undone.",
      deleteAction: "Delete project",
      deleteBusy: "Deleting...",
    },
  },
  requirementForm: {
    fields: {
      titleLabel: "Title",
      titlePlaceholder: "User can reset password",
      descriptionLabel: "Description",
      descriptionPlaceholder: "Provide detailed context for the requirement",
      typeLabel: "Type",
      priorityLabel: "Priority",
      statusLabel: "Status",
      changeNoteLabel: "Change note (optional)",
      changeNotePlaceholder: "Summarize why this requirement changed",
      userStoryLabel: "User story",
      userStoryPlaceholder: "Capture the user story in the standard format",
      acceptanceCriteriaLabel: "Acceptance criteria",
      acceptanceCriteriaPlaceholder: "List each criterion on its own line",
      issuesLabel: "Known issues",
      issuesPlaceholder: "List each issue on its own line",
    },
    ai: {
      sectionLabel: "AI assistant (optional)",
      languageLabel: "Language",
      improveButton: "Improve description",
      improvingButton: "Asking AI...",
      applySuggestion: "Use suggestion",
      errors: {
        descriptionTooShort: "Provide at least a short description before asking AI.",
        generic: "The AI assistant was unable to process the request.",
      },
    result: {
      improvedTitle: "Improved requirement",
      userStoryTitle: "User story",
      acceptanceTitle: "Acceptance criteria",
      issuesTitle: "Issues",
      noIssues: "No issues detected.",
      confidence: "Confidence {value}",
      provider: "Provider: {value}",
      tokens: "Tokens used: {value}",
    },
  },
  typeSuggestionCard: {
    title: "AI type review",
    reasonLabel: "Reason",
    confidenceLabel: "Confidence",
    changeNoteLabel: "Suggested change note",
    applyButton: "Use suggested type",
    appliedLabel: "Suggested type already selected",
    reminder:
      "Add a change note when you update the requirement type so teammates understand the decision.",
  },
  create: {
      submit: "Add requirement",
      submitting: "Saving...",
      disabledHint: "Only analysts or admins can create requirements.",
      error: "Unable to create requirement",
    },
    edit: {

      submit: "Save changes",

      submitting: "Updating...",
      disabledHint: "Only analysts or admins can edit requirements.",
      success: "Requirement updated successfully.",
      error: "We couldn't update the requirement.",
      typeChangeReasonRequired:
        "Add a change note explaining why the requirement type is being updated.",
      delete: "Delete requirement",
      deleting: "Deleting...",
      deleteConfirm: "Are you sure you want to delete this requirement? This action can't be undone.",
      deleteError: "We couldn't delete the requirement.",
      deleteHint: "Deleting will permanently remove this requirement from the project.",
    },
    requirementTypes: {
      functional: "Functional",
      "non-functional": "Non-Functional",
      performance: "Performance",
      security: "Security",
      usability: "Usability",
      compliance: "Compliance",
      integration: "Integration",
      data: "Data",
      other: "Other",
    },
    requirementStatuses: {
      analysis: "Analysis",
      discovery: "In Discovery",
      ready: "Ready for Dev",
      "in-progress": "In Progress",
      blocked: "Blocked",
      done: "Done",
    },
  },
  appShell: {
    brand: "Funcio",
    nav: {
      projects: "Projects",
      settings: "Settings",
    },
    accountLabel: "Account",
  },
  projectsPage: {
    headerTitle: "Projects",
    headerDescription:
      "Track functional analysis work by project, manage members, and review requirement progress.",
    emptyState: "No projects yet. Create one to get started.",
    projectRoleLabel: "Role",
    card: {
      titleFallback: "Untitled project",
      descriptionFallback: "No description provided.",
    },
    sidebar: {
      title: "Projects",
      searchPlaceholder: "Search projects...",
      newProject: "New project",
      empty: "You are not part of any projects yet.",
      countLabel: {
        singular: "project",
        plural: "projects",
      },
    },
    newProjectCard: {
      title: "New Project",
      description:
        "You will be assigned as project admin. Invite collaborators after creation.",
    },
    overview: {
      noProjectTitle: "Select a project",
      noProjectDescription:
        "Choose a project from the sidebar to review integrations, requirements, and quick actions.",
      roleLabel: "Role",
      updatedLabel: "Updated {value}",
      descriptionFallback: "No description provided.",
      credentialsLabel: "Credentials",
      credentialSources: {
        project: "Project override",
        environment: "Environment",
        missing: "Missing",
      },
      connectionStates: {
        connected: "Connected",
        expired: "Expired",
        invalid: "Invalid",
      },
      lastValidatedLabel: "Last validated: {value}",
      metricsTitle: "Requirement metrics",
      statusBreakdownTitle: "Status breakdown",
      metricsEmpty: "No requirements yet. Create one to get started.",
      recentRequirementsTitle: "Recent requirements",
      recentRequirementsEmpty:
        "There are no recent requirements for this project yet.",
      actions: {
        newRequirement: "New requirement",
        openProject: "Open project space",
        viewAllRequirements: "View all requirements",
      },
    },
  },
  projectForm: {
    fields: {
      nameLabel: "Project name",
      namePlaceholder: "Customer Onboarding",
      descriptionLabel: "Description",
      descriptionPlaceholder: "Short summary for context",
    },
    submit: "Create project",
    submitting: "Creating...",
    error: "Unable to create project",
  },
  settingsPage: {
    headerTitle: "Account settings",
    headerDescription:
      "Manage session security, review project roles, and confirm contact details.",
    profileCard: {
      title: "Profile",
      email: "Email",
      emailStatus: "Email status",
      confirmed: "Confirmed",
      pending: "Pending confirmation",
      pendingHint:
        "Check your inbox for the Supabase confirmation email. You cannot access protected features until confirmed.",
    },
    rolesCard: {
      title: "Project roles",
      empty: "You are not part of any projects yet. Create one or ask an admin to invite you.",
      hint:
        "Roles control access to AI actions and project updates. Admins can update membership directly in Supabase Auth or via future UI.",
      roleLabel: "Role",
    },
  },
  auth: {
    signOut: {
      default: "Sign out",
      loading: "Signing out...",
    },
  },
  homePage: {
    brand: "Funcio",
    navLogin: "Log in",
    navSignup: "Sign up",
    navContact: "Contact",
    contactEmail: "felipeg3110@gmail.com",
    headerTitle: "Capture requirements, collaborate, deliver",
    headerSubtitle:
      "A lightweight workspace for analysts to collect, refine, and track requirements across projects.",
    getStarted: "Get started, it's free",
    signIn: "Sign in",
    heroHighlights: [
      {
        title: "Structure requirements quickly",
        description: "Capture the essentials with priority, acceptance criteria, and optional AI help.",
      },
      {
        title: "Let AI help you write better",
        description: "Get suggestions, catch ambiguities, and elevate the quality of every specification.",
      },
      {
        title: "See project health instantly",
        description: "Dashboards surface metrics, roles, and recent updates in one view.",
      },
      {
        title: "Connect to your delivery flow",
        description: "Sync with JIRA credentials so documentation and execution stay together.",
      },
    ],
    featuresTitle: "Everything organized for your analysis team",
    featuresDescription:
      "Move from scattered documents to a single source of truth for requirements, decisions, and integrations.",
    features: [
      {
        title: "Collaborative workspace",
        description: "Invite teammates, assign roles, and review updates together in a secure workflow.",
      },
      {
        title: "Traceable integrations",
        description: "Link requirements to JIRA and keep validation history in context.",
      },
      {
        title: "Visual status board",
        description: "Track discovery, analysis, and delivery with a drag-and-drop board tailored for analysts.",
      },
      {
        title: "AI-assisted refinement",
        description: "Generate suggestions for user stories, acceptance criteria, and potential issues when you need them.",
      },
    ],
    overviewHero: {
      title: "Projects at a glance",
      description: "Review status, integrations, and next steps from a clean project overview dashboard.",
    },
    images: {
      projects: {
        alt: "Funcio project overview",
        caption: "See roles, connection status, and quick actions for each project in one place.",
      },
      projectDetail: {
        title: "Project workspace",
        description: "Track integrations, metrics, and recent requirements without leaving the page.",
        alt: "Funcio project detail view",
        caption: "Understand project health and review the most recent requirement updates instantly.",
      },
      requirementDetail: {
        title: "Requirement collaboration",
        description: "Refine descriptions, capture acceptance criteria, and link related JIRA issues.",
        alt: "Funcio requirement detail view",
        caption: "Collaborators can review history, propose changes, and link delivery work clearly.",
      },
    },
    screenshotPlaceholderTitle: "Preview",
    screenshotPlaceholderText: "Drop in screenshots to show your project dashboard or workflow here.",
    screenshotInstructions: "Place images under /public/images and reference them here (e.g. /images/home-screenshot-1.png).",
    howItWorksTitle: "How it works",
    howItWorksDescription: "Create a project, add requirements, invite collaborators and optionally integrate with JIRA. Use the board to organize and prioritize work.",
    steps: [
      { title: "Create project", description: "Start a workspace for your initiative and set a clear goal." },
      { title: "Add requirements", description: "Capture needs with descriptions, priority, and acceptance criteria." },
      { title: "Collaborate & deliver", description: "Assign roles, review changes, and link to your delivery tools." }
    ],
    footerNote: "Free for small teams — Premium tiers include more AI features."
  },
};

export default dictionary;
