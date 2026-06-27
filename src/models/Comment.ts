import { Schema, model, Document, Types, PopulatedDoc } from "mongoose";
import { IUser } from "./User";

export interface IComment extends Document {
  submission_id: Types.ObjectId;
  group_id: Types.ObjectId;
  user_id: PopulatedDoc<IUser & Document>;
  parent_id: Types.ObjectId | null;
  text: string;
}

const CommentSchema = new Schema<IComment>(
  {
    submission_id: { type: Schema.Types.ObjectId, ref: "Submission", required: true },
    group_id: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

CommentSchema.index({ submission_id: 1, group_id: 1 });

export default model<IComment>("Comment", CommentSchema);
