import type { Dictionary } from "../types";

const dictionary: Dictionary = {
  common: {
    languageLabel: "Idioma",
    locales: {
      en: "English",
      es: "Español",
    },
  },
  inviteMemberForm: {
    emailLabel: "Correo de la persona colaboradora",
    roleLabel: "Rol",
    submit: "Enviar invitación",
    submitting: "Enviando",
    hint:
      "Por seguridad, solo puedes invitar cuentas existentes. El servidor valida el correo y los permisos.",
    success: "Invitación enviada correctamente.",
    errors: {
      "user-not-found": "No encontramos a esa persona. Pídeles que se registren y vuelve a intentarlo.",
      "duplicate-member": "Esa persona ya forma parte del proyecto.",
      timeout: "La solicitud tardó demasiado. Vuelve a intentarlo.",
      network: "Error de red. Revisa tu conexión y vuelve a intentarlo.",
      generic: "No fue posible enviar la invitación.",
    },
  },
  projectMembersCard: {
    title: "Personas en el proyecto",
    description: "Administra colaboradores y revisa el estado de las invitaciones.",
    empty: "Aún no hay colaboradores. Invita a tu equipo para comenzar.",
    inviteOnlyNote: "Solo los administradores pueden invitar integrantes nuevos.",
    anonymousMember: "Persona invitada",
    statuses: {
      active: "Activa",
      invited: "Invitación pendiente",
    },
    roles: {
      admin: "Administrador",
      analyst: "Analista",
      collaborator: "Colaborador",
    },
    addedOn: "Añadido el {date}",
  },
  projectPage: {
    defaultDescription: "Captura y mejora los requerimientos del proyecto.",
    backToProjectsLabel: "Volver a proyectos",
    header: {
      roleLabel: "Rol",
      updatedLabel: "Actualizado {value}",
      jiraStatusLabel: "Estado de JIRA",
      credentialsLabel: "Credenciales",
      sourceLabel: "Origen",
      sources: {
        project: "Override del proyecto",
        environment: "Variables de entorno",
        missing: "Pendiente",
      },
      connectionStates: {
        connected: "Conectado",
        expired: "Expirado",
        invalid: "Inválido",
      },
      lastValidatedLabel: "Última validación {value}",
    },
    actions: {
      newRequirement: "Nuevo requerimiento",
      inviteMember: "Invitar miembro",
      manageIntegrations: "Gestionar integraciones",
    },
    board: {
      title: "Tablero de requerimientos",
      empty: "Todavía no hay requerimientos. Crea uno para comenzar.",
      columnEmpty: "No hay requerimientos en esta columna.",
      addRequirement: "Agregar",
      unassignedTitle: "Sin estado",
      openRequirement: "Ver requerimiento",
    },
    drawer: {
      createTitle: "Nuevo requerimiento",
      editTitle: "Editar requerimiento",
    },
    metrics: {
      title: "Métricas de requerimientos",
    },
    menu: {
      edit: "Editar proyecto",
      delete: "Eliminar proyecto",
      editTitle: "Detalles del proyecto",
      editDescription: "Actualiza el nombre y la descripción del proyecto. Los cambios se aplican de inmediato.",
      nameLabel: "Nombre",
      descriptionLabel: "Descripción",
      save: "Guardar cambios",
      saving: "Guardando...",
      cancel: "Cancelar",
      deleteConfirm: "¿Estás seguro de eliminar este proyecto? Esta acción no se puede deshacer.",
      deleteAction: "Eliminar proyecto",
      deleteBusy: "Eliminando...",
    },
  },
  requirementForm: {
    fields: {
      titleLabel: "Título",
      titlePlaceholder: "La persona usuaria puede restablecer su contraseña",
      descriptionLabel: "Descripción",
      descriptionPlaceholder: "Incluye el contexto y los detalles del requerimiento",
      typeLabel: "Tipo",
      priorityLabel: "Prioridad",
      statusLabel: "Estado",
      changeNoteLabel: "Nota del cambio (opcional)",
      changeNotePlaceholder: "Resume por qué cambió este requerimiento",
      userStoryLabel: "Historia de usuario",
      userStoryPlaceholder: "Redacta la historia de usuario en el formato estándar",
      acceptanceCriteriaLabel: "Criterios de aceptación",
      acceptanceCriteriaPlaceholder: "Escribe cada criterio en una línea distinta",
      issuesLabel: "Problemas u observaciones",
      issuesPlaceholder: "Escribe cada observación en una línea distinta",
    },
    ai: {
      sectionLabel: "Asistente de IA (opcional)",
      languageLabel: "Idioma",
      improveButton: "Mejorar descripción",
      improvingButton: "Preguntando a la IA...",
      applySuggestion: "Aplicar sugerencia",
      errors: {
        descriptionTooShort: "Escribe al menos una breve descripción antes de pedir ayuda a la IA.",
        generic: "El asistente de IA no pudo procesar la solicitud.",
      },
      result: {
        improvedTitle: "Requerimiento mejorado",
        userStoryTitle: "Historia de usuario",
        acceptanceTitle: "Criterios de aceptación",
        issuesTitle: "Observaciones",
        noIssues: "Sin observaciones.",
        confidence: "Confianza {value}",
        provider: "Proveedor: {value}",
        tokens: "Tokens usados: {value}",
      },
    },
    typeSuggestionCard: {
      title: "Revisión de tipo sugerida por IA",
      reasonLabel: "Motivo",
      confidenceLabel: "Confianza",
      changeNoteLabel: "Nota sugerida",
      applyButton: "Usar tipo sugerido",
      appliedLabel: "Tipo sugerido ya aplicado",
      reminder:
        "Incluye una nota de cambio cuando modifiques el tipo para mantener el historial claro.",
    },
    create: {
      submit: "Crear requerimiento",
      submitting: "Guardando...",
      disabledHint: "Solo analistas o administradores pueden crear requerimientos.",
      error: "No fue posible crear el requerimiento.",
    },
    edit: {
      submit: "Guardar cambios",
      submitting: "Actualizando...",
      disabledHint: "Solo analistas o administradores pueden editar requerimientos.",
      success: "Requerimiento actualizado correctamente.",
      error: "No fue posible actualizar el requerimiento.",
      typeChangeReasonRequired:
        "Agrega una nota del cambio que explique por qué se actualiza el tipo del requerimiento.",
    },
    requirementTypes: {
      functional: "Funcional",
      "non-functional": "No funcional",
      performance: "Rendimiento",
      security: "Seguridad",
      usability: "Usabilidad",
      compliance: "Cumplimiento",
      integration: "Integración",
      data: "Datos y calidad",
      other: "Otro",
    },
    requirementStatuses: {
      analysis: "Análisis",
      discovery: "Descubrimiento",
      ready: "Listo para desarrollo",
      "in-progress": "En progreso",
      blocked: "Bloqueado",
      done: "Finalizado",
    },
  },
  appShell: {
    brand: "Funcio",
    nav: {
      projects: "Proyectos",
      settings: "Configuración",
    },
    accountLabel: "Cuenta",
  },
  projectsPage: {
    headerTitle: "Proyectos",
    headerDescription:
      "Controla el trabajo de análisis funcional por proyecto, gestiona integrantes y revisa el avance de requerimientos.",
    emptyState: "Aún no hay proyectos. Crea uno para comenzar.",
    projectRoleLabel: "Rol",
    card: {
      titleFallback: "Proyecto sin título",
      descriptionFallback: "Sin descripción.",
    },
    newProjectCard: {
      title: "Nuevo proyecto",
      description:
        "Serás administrador del proyecto. Invita colaboradores después de crearlo.",
    },
    sidebar: {
      title: "Proyectos",
      searchPlaceholder: "Buscar proyectos...",
      newProject: "Nuevo proyecto",
      empty: "Todavía no participas en proyectos.",
      countLabel: {
        singular: "proyecto",
        plural: "proyectos",
      },
    },
    overview: {
      noProjectTitle: "Elige un proyecto",
      noProjectDescription:
        "Selecciona un proyecto en la barra lateral para revisar integraciones, requerimientos y acciones rápidas.",
      roleLabel: "Rol",
      updatedLabel: "Actualizado {value}",
      descriptionFallback: "Sin descripción disponible.",
      credentialsLabel: "Credenciales",
      credentialSources: {
        project: "Override del proyecto",
        environment: "Variables de entorno",
        missing: "Pendiente",
      },
      connectionStates: {
        connected: "Conectado",
        expired: "Expirado",
        invalid: "Inválido",
      },
      lastValidatedLabel: "Última validación {value}",
      metricsTitle: "Métricas de requerimientos",
      statusBreakdownTitle: "Distribución de estados",
      metricsEmpty: "Todavía no hay requerimientos en este proyecto.",
      recentRequirementsTitle: "Requerimientos recientes",
      recentRequirementsEmpty: "Aún no hay requerimientos recientes en este proyecto.",
      actions: {
        newRequirement: "Nuevo requerimiento",
        openProject: "Abrir espacio del proyecto",
        viewAllRequirements: "Ver todos los requerimientos",
      },
    },
  },
  projectForm: {
    fields: {
      nameLabel: "Nombre del proyecto",
      namePlaceholder: "Onboarding de clientes",
      descriptionLabel: "Descripción",
      descriptionPlaceholder: "Resumen breve para contexto",
    },
    submit: "Crear proyecto",
    submitting: "Creando...",
    error: "No fue posible crear el proyecto.",
  },
  settingsPage: {
    headerTitle: "Configuración de la cuenta",
    headerDescription:
      "Administra la seguridad de la sesión, revisa tus roles y confirma tus datos de contacto.",
    profileCard: {
      title: "Perfil",
      email: "Correo electrónico",
      emailStatus: "Estado del correo",
      confirmed: "Confirmado",
      pending: "Pendiente de confirmación",
      pendingHint:
        "Revisa tu correo por el mensaje de confirmación de Supabase. No podrás usar funciones protegidas hasta confirmarlo.",
    },
    rolesCard: {
      title: "Roles en proyectos",
      empty: "Aún no participas en proyectos. Crea uno o pide a un administrador que te invite.",
      hint:
        "Los roles controlan el acceso a acciones de IA y actualizaciones. Los administradores pueden gestionar membresías desde Supabase o futuras interfaces.",
      roleLabel: "Rol",
    },
  },
  auth: {
    signOut: {
      default: "Cerrar sesión",
      loading: "Cerrando sesión...",
    },
  },
  homePage: {
    headerTitle: "Captura requerimientos, colabora, entrega",
    headerSubtitle: "Un espacio ligero para analistas: captura, refina y sigue requerimientos por proyecto.",
    brand: "Funcio",
    navLogin: "Iniciar sesión",
    navSignup: "Crear cuenta",
    navContact: "Contacto",
    contactEmail: "felipeg3110@gmail.com",
    getStarted: "Comenzar, es gratis",
    signIn: "Iniciar sesión",
    heroHighlights: [
      {
        title: "Estructura requerimientos al instante",
        description: "Captura prioridad, criterios de aceptación y notas asistidas por IA sin perder contexto.",
      },
      {
        title: "Colabora con una IA entrenada para analistas",
        description: "Transforma ideas en requerimientos claros y consistentes en cuestión de segundos.",
      },
      {
        title: "Entiende el estado del proyecto de un vistazo",
        description: "Métricas, roles y actividad reciente muestran qué requiere atención.",
      },
      {
        title: "Vincula documentación con la ejecución",
        description: "Sincroniza con JIRA para que credenciales y validaciones queden en un solo lugar.",
      },
    ],
    featuresTitle: "Todo tu análisis en un solo lugar",
    featuresDescription:
      "Centraliza la captura de requerimientos, conserva el contexto y mantiene al equipo alineado.",
    features: [
      {
        title: "Espacio de trabajo colaborativo",
        description: "Invita a tu equipo, asigna roles y revisa actualizaciones con un flujo consistente.",
      },
      {
        title: "Integraciones trazables",
        description: "Vincula requerimientos con JIRA y consulta el historial de validación desde el mismo lugar.",
      },
      {
        title: "Tablero visual",
        description: "Da seguimiento al descubrimiento, análisis y entrega con un tablero arrastrar y soltar.",
      },
      {
        title: "Refinamiento asistido por IA",
        description: "Genera sugerencias para historias de usuario, criterios y hallazgos cuando lo necesites.",
      },
    ],
    overviewHero: {
      title: "Proyectos a simple vista",
      description: "Revisa estado, integraciones y próximos pasos desde un panel claro.",
    },
    images: {
      projects: {
        alt: "Panel de proyectos de Funcio",
        caption: "Consulta roles, estado de integraciones y accesos rápidos para cada proyecto.",
      },
      projectDetail: {
        title: "Espacio de trabajo del proyecto",
        description: "Supervisa integraciones, métricas y requerimientos recientes sin cambiar de vista.",
        alt: "Vista detallada de un proyecto en Funcio",
        caption: "Conoce la salud del proyecto y los últimos cambios desde un solo lugar.",
      },
      requirementDetail: {
        title: "Colaboración en requerimientos",
        description: "Refina descripciones, captura criterios de aceptación y vincula issues de JIRA relacionados.",
        alt: "Vista de detalle de un requerimiento en Funcio",
        caption: "El equipo revisa historial, propone cambios y conecta el trabajo de entrega con claridad.",
      },
    },
    screenshotPlaceholderTitle: "Vista previa",
    screenshotPlaceholderText: "Arrastra capturas de pantalla para mostrar el panel del proyecto o flujo de trabajo aquí.",
    screenshotInstructions: "Coloca imágenes en /public/images y refiérelas aquí (ej. /images/home-screenshot-1.png).",
    howItWorksTitle: "Cómo funciona",
    howItWorksDescription: "Crea un proyecto, añade requisitos, invita colaboradores e integra opcionalmente con JIRA. Usa el tablero para organizar y priorizar trabajo.",
    steps: [
      { title: "Crear proyecto", description: "Inicia un espacio para tu iniciativa y define un objetivo claro." },
      { title: "Agregar requerimientos", description: "Captura necesidades con descripciones, prioridad y criterios de aceptación." },
      { title: "Colaborar y entregar", description: "Asigna roles, revisa cambios y vincula con tus herramientas de entrega." }
    ],
    footerNote: "Gratis para equipos pequeños  mas características de IA en planes Premium."
  },
};

export default dictionary;
