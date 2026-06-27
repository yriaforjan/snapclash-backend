import Challenge from "../models/Challenge";
import { getActiveChallengeDate } from "./date";

export async function getActiveChallenge() {
  return Challenge.findOne({ scheduled_date: getActiveChallengeDate() });
}
