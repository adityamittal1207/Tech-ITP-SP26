import { getOwnerUid } from "../utils/tenant.js";
import {
  getAnalyticsPage,
  getClientsPage,
  getCommunicationsPage,
  getHomePage,
  getSettingsPage,
  getStudioMeta,
} from "../services/studioViewService.js";

export async function getStudio(req, res, next) {
  try {
    res.json(await getStudioMeta(getOwnerUid(req)));
  } catch (error) {
    next(error);
  }
}

export async function getHome(req, res, next) {
  try {
    res.json(await getHomePage(getOwnerUid(req)));
  } catch (error) {
    next(error);
  }
}

export async function getClientsPageHandler(req, res, next) {
  try {
    res.json(await getClientsPage(getOwnerUid(req)));
  } catch (error) {
    next(error);
  }
}

export async function getAnalyticsPageHandler(req, res, next) {
  try {
    res.json(await getAnalyticsPage(getOwnerUid(req)));
  } catch (error) {
    next(error);
  }
}

export async function getCommunicationsPageHandler(req, res, next) {
  try {
    res.json(await getCommunicationsPage(getOwnerUid(req)));
  } catch (error) {
    next(error);
  }
}

export async function getSettingsPageHandler(req, res, next) {
  try {
    res.json(await getSettingsPage(getOwnerUid(req)));
  } catch (error) {
    next(error);
  }
}
