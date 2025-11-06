import type { Dictionary } from "../types";

const dictionary: Dictionary = {
  common: {
    languageLabel: "Idioma",
    locales: {
      en: "English",
      es: "Espanol",
    },
  },
  inviteMemberForm: {
    emailLabel: "Correo de la persona colaboradora",
    roleLabel: "Rol",
    submit: "Enviar invitacion",
    submitting: "Enviando...",
    hint:
      "Por seguridad solo puedes invitar cuentas existentes. El servidor valida el correo y los permisos.",
    success: "Invitacion enviada correctamente.",
    errors: {
      "user-not-found":
        "No pudimos invitar a esa persona. Pedile que se registre y volve a intentarlo.",
      "duplicate-member": "Esa persona ya forma parte del proyecto.",
      timeout: "La solicitud tardo demasiado. Intenta nuevamente.",
      network: "Error de red. Revisá la conexion e intenta otra vez.",
      generic: "No pudimos enviar la invitacion.",
    },
  },
  projectMembersCard: {
    title: "Integrantes del proyecto",
    description: "Gestiona colaboradores y el estado de sus invitaciones.",
    empty: "Todavia no hay colaboradores. Invita personas para comenzar.",
    inviteOnlyNote: "Solo admins pueden invitar nuevas personas.",
    anonymousMember: "Persona invitada",
    statuses: {
      active: "Activa",
      invited: "Invitacion pendiente",
    },
    roles: {
      admin: "Admin",
      analyst: "Analista",
      collaborator: "Colaborador",
    },
    addedOn: "Agregado el {date}",
  },
  projectPage: {
    defaultDescription: "Captura y refina los requerimientos del proyecto.",
    backToProjectsLabel: "Volver a proyectos",
    header: {
      roleLabel: "Rol",
      updatedLabel: "Actualizado {value}",
      jiraStatusLabel: "Estado de JIRA",
      credentialsLabel: "Credenciales",
      sourceLabel: "Origen",
      sources: {
        project: "Configuracion del proyecto",
        environment: "Variable de entorno",
        missing: "Faltante",
      },
      connectionStates: {
        connected: "Conectado",
        expired: "Expirado",
        invalid: "Invalido",
      },
      lastValidatedLabel: "Ultima validacion {value}",
    },
    actions: {
      newRequirement: "Nuevo requerimiento",
      inviteMember: "Invitar integrante",
      manageIntegrations: "Gestionar integraciones",
    },
    board: {
      title: "Tablero de requerimientos",
      empty: "Todavia no hay requerimientos. Crea el primero.",
      columnEmpty: "No hay requerimientos en esta columna.",
      addRequirement: "Agregar",
      unassignedTitle: "Sin asignar",
      openRequirement: "Ver requerimiento",
    },
    drawer: {
      createTitle: "Nuevo requerimiento",
      editTitle: "Editar requerimiento",
    },
    metrics: {
      title: "Metricas del proyecto",
    },
    menu: {
      edit: "Editar proyecto",
      delete: "Eliminar proyecto",
      editTitle: "Detalles del proyecto",
      editDescription:
        "Actualiza el nombre y la descripcion. Los cambios se guardan al instante.",
      nameLabel: "Nombre",
      descriptionLabel: "Descripcion",
      save: "Guardar cambios",
      saving: "Guardando...",
      cancel: "Cancelar",
      deleteConfirm:
        "Estas seguro de eliminar este proyecto? Esta accion no se puede deshacer.",
      deleteAction: "Eliminar proyecto",
      deleteBusy: "Eliminando...",
    },
  },
  requirementForm: {
    fields: {
      titleLabel: "Titulo",
      titlePlaceholder: "La persona usuaria puede restablecer su contrasena",
      descriptionLabel: "Descripcion",
      descriptionPlaceholder: "Inclui contexto y detalles del requerimiento",
      typeLabel: "Tipo",
      priorityLabel: "Prioridad",
      statusLabel: "Estado",
      changeNoteLabel: "Nota del cambio (opcional)",
      changeNotePlaceholder: "Explica por que se actualizo este requerimiento",
      userStoryLabel: "Historia de usuario",
      userStoryPlaceholder: "Escribi la historia con el formato habitual",
      acceptanceCriteriaLabel: "Criterios de aceptacion",
      acceptanceCriteriaPlaceholder: "Un criterio por linea",
      issuesLabel: "Observaciones",
      issuesPlaceholder: "Una observacion por linea",
    },
    ai: {
      sectionLabel: "Asistente de IA (opcional)",
      languageLabel: "Idioma",
      improveButton: "Mejorar descripcion",
      improvingButton: "Consultando a la IA...",
      applySuggestion: "Aplicar sugerencia",
      errors: {
        descriptionTooShort:
          "Escribe al menos una descripcion corta antes de pedir ayuda a la IA.",
        generic: "La IA no pudo procesar la solicitud.",
      },
      result: {
        improvedTitle: "Requerimiento mejorado",
        userStoryTitle: "Historia de usuario",
        acceptanceTitle: "Criterios de aceptacion",
        issuesTitle: "Observaciones",
        noIssues: "Sin observaciones.",
        confidence: "Confianza {value}",
        provider: "Proveedor: {value}",
        tokens: "Tokens usados: {value}",
      },
    },
    typeSuggestionCard: {
      title: "Revision de tipo sugerida por IA",
      reasonLabel: "Motivo",
      confidenceLabel: "Confianza",
      changeNoteLabel: "Nota sugerida",
      applyButton: "Usar tipo sugerido",
      appliedLabel: "El tipo sugerido ya esta seleccionado",
      reminder:
        "Agrega una nota cuando cambies el tipo para mantener el historial claro.",
    },
    create: {
      submit: "Crear requerimiento",
      submitting: "Guardando...",
      disabledHint: "Solo analistas o admins pueden crear requerimientos.",
      error: "No pudimos crear el requerimiento.",
    },
    edit: {
      submit: "Guardar cambios",
      submitting: "Actualizando...",
      disabledHint: "Solo analistas o admins pueden editar requerimientos.",
      success: "Requerimiento actualizado correctamente.",
      error: "No pudimos actualizar el requerimiento.",
      typeChangeReasonRequired:
        "Agrega una nota para explicar por que se cambia el tipo del requerimiento.",
      delete: "Eliminar requerimiento",
      deleting: "Eliminando...",
      deleteConfirm:
        "Estas seguro de eliminar este requerimiento? Esta accion no se puede deshacer.",
      deleteError: "No pudimos eliminar el requerimiento.",
      deleteHint:
        "Eliminar quita el requerimiento del proyecto de forma permanente.",
    },
    requirementTypes: {
      functional: "Funcional",
      "non-functional": "No funcional",
      performance: "Rendimiento",
      security: "Seguridad",
      usability: "Usabilidad",
      compliance: "Cumplimiento",
      integration: "Integracion",
      data: "Datos",
      other: "Otro",
    },
    requirementStatuses: {
      analysis: "Analisis",
      discovery: "Descubrimiento",
      ready: "Listo para dev",
      "in-progress": "En progreso",
      blocked: "Bloqueado",
      done: "Finalizado",
    },
  },
  projectForm: {
    fields: {
      nameLabel: "Nombre del proyecto",
      namePlaceholder: "Onboarding de clientes",
      descriptionLabel: "Descripcion",
      descriptionPlaceholder: "Resumen corto para dar contexto",
    },
    submit: "Crear proyecto",
    submitting: "Creando...",
    error: "No pudimos crear el proyecto.",
  },
  settingsPage: {
    headerTitle: "Configuracion de la cuenta",
    headerDescription:
      "Revisa la seguridad de la sesion, tus roles y los datos de contacto.",
    profileCard: {
      title: "Perfil",
      email: "Correo",
      emailStatus: "Estado del correo",
      confirmed: "Confirmado",
      pending: "Pendiente de confirmar",
      pendingHint:
        "Revisa tu casilla para confirmar el correo en Supabase. Hasta entonces no podras usar funciones protegidas.",
    },
    rolesCard: {
      title: "Roles en proyectos",
      empty:
        "Todavia no participas en proyectos. Crea uno o pedile a un admin que te invite.",
      hint:
        "Los roles controlan el acceso a las acciones de IA y a las actualizaciones del proyecto.",
      roleLabel: "Rol",
    },
  },
  auth: {
    signOut: {
      default: "Cerrar sesion",
      loading: "Cerrando sesion...",
    },
  },
  homePage: {
    brand: "Funcio",
    navLogin: "Ingresar",
    navSignup: "Crear cuenta",
    navContact: "Contacto",
    contactEmail: "felipeg3110@gmail.com",
    headerTitle: "Captura requerimientos, colaboralos, entregalos",
    headerSubtitle:
      "Un espacio liviano para analistas que facilita recopilar, refinar y dar seguimiento a requerimientos.",
    getStarted: "Comenzar gratis",
    signIn: "Entrar",
    heroHighlights: [
      {
        title: "Estructura requerimientos rapido",
        description:
          "Captura lo esencial con prioridad, criterios y ayuda opcional de IA.",
      },
      {
        title: "Deja que la IA mejore tus textos",
        description:
          "Recibi sugerencias, detecta ambiguedades y elevá la calidad de cada especificacion.",
      },
      {
        title: "Mira la salud del proyecto al instante",
        description:
          "Los tableros muestran metricas, roles y actualizaciones recientes en un solo lugar.",
      },
      {
        title: "Conecta con tu flujo de delivery",
        description:
          "Sincroniza con JIRA para que la documentacion y la ejecucion avancen juntas.",
      },
    ],
    featuresTitle: "Todo organizado para tu equipo de analisis",
    featuresDescription:
      "Pasá de documentos dispersos a una unica fuente de verdad con decisiones e integraciones.",
    features: [
      {
        title: "Espacio colaborativo",
        description:
          "Invita al equipo, defini roles y revisen cambios en un flujo seguro.",
      },
      {
        title: "Integraciones trazables",
        description:
          "Vincula requerimientos con JIRA y conserva el historial en contexto.",
      },
      {
        title: "Tablero visual",
        description:
          "Seguimiento de descubrimiento, analisis y entrega con columnas pensadas para analistas.",
      },
      {
        title: "Refinamiento asistido por IA",
        description:
          "Genera historias, criterios e issues potenciales cuando lo necesites.",
      },
    ],
    overviewHero: {
      title: "Proyectos a simple vista",
      description:
        "Revisa estado, integraciones y proximos pasos desde un dashboard limpio.",
    },
    images: {
      projects: {
        alt: "Vista general de proyectos en Funcio",
        caption:
          "Ve roles, estado de conexion y acciones rapidas de cada proyecto en un solo lugar.",
      },
      projectDetail: {
        title: "Espacio de proyecto",
        description:
          "Seguimiento de integraciones, metricas y requerimientos recientes sin cambiar de pagina.",
        alt: "Detalle de proyecto en Funcio",
        caption:
          "Entende la salud del proyecto y revisa los ultimos cambios al instante.",
      },
      requirementDetail: {
        title: "Colaboracion sobre requerimientos",
        description:
          "Refina descripciones, captura criterios y vincula issues de JIRA relacionados.",
        alt: "Detalle de requerimiento en Funcio",
        caption:
          "El equipo puede revisar historial, proponer cambios y vincular el trabajo de delivery.",
      },
    },
    screenshotPlaceholderTitle: "Previsualizacion",
    screenshotPlaceholderText:
      "Coloca capturas de pantalla del dashboard o del flujo aqui.",
    screenshotInstructions:
      "Guarda tus imagenes en /public/images y referencialas aqui (por ejemplo /images/home-screenshot-1.png).",
    howItWorksTitle: "Como funciona",
    howItWorksDescription:
      "Crea un proyecto, agrega requerimientos, invita colaboradores y conecta JIRA. Usa el tablero para organizar el trabajo.",
    steps: [
      {
        title: "Crea un proyecto",
        description:
          "Inicia un espacio de trabajo y define el objetivo de la iniciativa.",
      },
      {
        title: "Agrega requerimientos",
        description:
          "Captura necesidades con descripcion, prioridad y criterios de aceptacion.",
      },
      {
        title: "Colabora y entrega",
        description:
          "Asigna roles, revisa cambios y vincula tus herramientas de delivery.",
      },
    ],
    footerNote:
      "Gratis para equipos chicos. Los planes premium incluyen mas funciones de IA.",
  },
  appShell: {
    brand: "Funcio",
    nav: {
      projects: "Proyectos",
      settings: "Configuracion",
    },
    accountLabel: "Cuenta",
  },
  projectsPage: {
    headerTitle: "Proyectos",
    headerDescription:
      "Sigue el trabajo de analisis funcional por proyecto, administra miembros y revisa el progreso de requerimientos.",
    emptyState: "Sin proyectos aun. Crea uno para comenzar.",
    projectRoleLabel: "Rol",
    card: {
      titleFallback: "Proyecto sin titulo",
      descriptionFallback: "Sin descripcion.",
    },
    sidebar: {
      title: "Proyectos",
      searchPlaceholder: "Buscar proyectos...",
      newProject: "Nuevo proyecto",
      empty: "Todavia no formas parte de ningun proyecto.",
      countLabel: {
        singular: "proyecto",
        plural: "proyectos",
      },
    },
    newProjectCard: {
      title: "Nuevo Proyecto",
      description:
        "Se te asignara como admin del proyecto. Podras invitar colaboradores despues de crearlo.",
    },
    overview: {
      noProjectTitle: "Selecciona un proyecto",
      noProjectDescription:
        "Elige un proyecto en la barra lateral para revisar integraciones, requerimientos y acciones rapidas.",
      roleLabel: "Rol",
      updatedLabel: "Actualizado {value}",
      descriptionFallback: "Sin descripcion.",
      credentialsLabel: "Credenciales",
      credentialSources: {
        project: "Sobrescritura del proyecto",
        environment: "Environment",
        missing: "Faltante",
      },
      connectionStates: {
        connected: "Conectado",
        expired: "Expirado",
        invalid: "Invalido",
      },
      lastValidatedLabel: "Ultimo validado: {value}",
      metricsTitle: "Metricas de requerimientos",
      statusBreakdownTitle: "Desglose de estado",
      metricsEmpty: "Sin requerimientos aun. Crea uno para comenzar.",
      recentRequirementsTitle: "Requerimientos recientes",
      recentRequirementsEmpty:
        "No hay requerimientos recientes para este proyecto todavia.",
      actions: {
        newRequirement: "Nuevo requerimiento",
        openProject: "Abrir espacio del proyecto",
        viewAllRequirements: "Ver todos los requerimientos",
      },
    },
  },
};

export default dictionary;
