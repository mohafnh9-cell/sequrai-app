import type { AppLocale, MessageNamespace, Messages } from "./types";
import { mergeMessages } from "./translate";

import enCommon from "@/messages/en/common.json";
import enNavigation from "@/messages/en/navigation.json";
import enAuth from "@/messages/en/auth.json";
import enOnboarding from "@/messages/en/onboarding.json";
import enDashboard from "@/messages/en/dashboard.json";
import enProjects from "@/messages/en/projects.json";
import enVerdict from "@/messages/en/verdict.json";
import enSettings from "@/messages/en/settings.json";
import enErrors from "@/messages/en/errors.json";
import enIntegrations from "@/messages/en/integrations.json";
import enTechnicalDetails from "@/messages/en/technicalDetails.json";

import esCommon from "@/messages/es/common.json";
import esNavigation from "@/messages/es/navigation.json";
import esAuth from "@/messages/es/auth.json";
import esOnboarding from "@/messages/es/onboarding.json";
import esDashboard from "@/messages/es/dashboard.json";
import esProjects from "@/messages/es/projects.json";
import esVerdict from "@/messages/es/verdict.json";
import esSettings from "@/messages/es/settings.json";
import esErrors from "@/messages/es/errors.json";
import esIntegrations from "@/messages/es/integrations.json";
import esTechnicalDetails from "@/messages/es/technicalDetails.json";

const PACKAGES: Record<AppLocale, Record<MessageNamespace, Messages>> = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    auth: enAuth,
    onboarding: enOnboarding,
    dashboard: enDashboard,
    projects: enProjects,
    verdict: enVerdict,
    productionJourney: enProjects,
    integrations: enIntegrations,
    settings: enSettings,
    errors: enErrors,
    notifications: enCommon,
    technicalDetails: enTechnicalDetails,
  },
  es: {
    common: esCommon,
    navigation: esNavigation,
    auth: esAuth,
    onboarding: esOnboarding,
    dashboard: esDashboard,
    projects: esProjects,
    verdict: esVerdict,
    productionJourney: esProjects,
    integrations: esIntegrations,
    settings: esSettings,
    errors: esErrors,
    notifications: esCommon,
    technicalDetails: esTechnicalDetails,
  },
};

export function loadNamespace(locale: AppLocale, namespace: MessageNamespace): Messages {
  return PACKAGES[locale][namespace] ?? {};
}

export function loadAllMessages(locale: AppLocale): Messages {
  return mergeMessages(
    { common: PACKAGES[locale].common },
    { navigation: PACKAGES[locale].navigation },
    { auth: PACKAGES[locale].auth },
    { onboarding: PACKAGES[locale].onboarding },
    { dashboard: PACKAGES[locale].dashboard },
    { projects: PACKAGES[locale].projects },
    { verdict: PACKAGES[locale].verdict },
    { settings: PACKAGES[locale].settings },
    { errors: PACKAGES[locale].errors },
    { integrations: PACKAGES[locale].integrations },
    { technicalDetails: PACKAGES[locale].technicalDetails }
  );
}
