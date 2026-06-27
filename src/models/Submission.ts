import { Schema, model, Document, PopulatedDoc } from "mongoose";
import { IUser } from "./User";
import { IChallenge } from "./Challenge";

export interface ISubmission extends Document {
  user_id: PopulatedDoc<IUser & Document>;
  challenge_id: PopulatedDoc<IChallenge & Document>;
  started_at: Date;
  submitted_at: Date | null;
  photo_url: string | null;
  speed_score: number;
  similarity_score: number;
  originality_score: number;
  ai_justification: string | null;
  ai_status: "pending" | "completed" | "failed";
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    challenge_id: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    started_at: { type: Date, required: true },
    submitted_at: { type: Date, default: null },
    photo_url: { type: String, default: null },
    speed_score: { type: Number, default: 0 },
    similarity_score: { type: Number, default: 0 },
    originality_score: { type: Number, default: 0 },
    ai_justification: { type: String, default: null },
    ai_status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  },
  { timestamps: true }
);

SubmissionSchema.index({ user_id: 1, challenge_id: 1 }, { unique: true });

export default model<ISubmission>("Submission", SubmissionSchema);
