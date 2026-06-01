import {
  getRoster,
  getWeekSchedule,
  getWeekStartKey,
  localDateKey,
} from "../services/bookingService.js";
import { getOwnerUid } from "../utils/tenant.js";

export async function getSchedule(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const week = req.query.week ? String(req.query.week) : getWeekStartKey(localDateKey());
    const schedule = await getWeekSchedule(ownerUid, week);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
}

export async function getScheduleRoster(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const { classId } = req.params;
    const date = req.query.date ? String(req.query.date) : localDateKey();
    const roster = await getRoster(ownerUid, classId, date);
    res.json(roster);
  } catch (error) {
    next(error);
  }
}
