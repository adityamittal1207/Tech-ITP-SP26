import {
  getAnalyticsPage,
  getClientsPage,
  getCommunicationsPage,
  getHomePage,
  getSettingsPage,
  getStudioMeta,
} from "../services/studioViewService.js";

export async function getStudio(_req, res, next) {
  try {
    res.json(await getStudioMeta());
  } catch (error) {
    next(error);
  }
}

export async function getHome(_req, res, next) {
  try {
    res.json(await getHomePage());
  } catch (error) {
    next(error);
  }
}

export async function getClientsPageHandler(_req, res, next) {
  try {
    res.json(await getClientsPage());
  } catch (error) {
    next(error);
  }
}

export async function getAnalyticsPageHandler(_req, res, next) {
  try {
    res.json(await getAnalyticsPage());
  } catch (error) {
    next(error);
  }
}

export async function getCommunicationsPageHandler(_req, res, next) {
  try {
    res.json(await getCommunicationsPage());
  } catch (error) {
    next(error);
  }
}

export async function getSettingsPageHandler(_req, res, next) {
  try {
    res.json(await getSettingsPage());
  } catch (error) {
    next(error);
  }
}
