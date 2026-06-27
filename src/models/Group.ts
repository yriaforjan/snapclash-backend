import { Schema, model, Document, Types } from "mongoose";

export interface IGroup extends Document {
  name: string;
  invite_code: string;
  created_by: Types.ObjectId;
  members: Types.ObjectId[];
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    invite_code: { type: String, required: true, unique: true, uppercase: true },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

GroupSchema.index({ members: 1 });

export default model<IGroup>("Group", GroupSchema);
