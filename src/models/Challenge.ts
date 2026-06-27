import { Schema, model, Document } from "mongoose";

export interface IChallenge extends Document {
  description: string;
  scheduled_date: string;
  is_weekend_special: boolean;
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    description: { type: String, required: true },
    scheduled_date: { type: String, required: true, unique: true },
    is_weekend_special: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model<IChallenge>("Challenge", ChallengeSchema);
