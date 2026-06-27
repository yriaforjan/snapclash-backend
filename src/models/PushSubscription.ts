import { Schema, model, Document, Types } from "mongoose";

export interface IPushSubscription extends Document {
  user_id: Types.ObjectId;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true, unique: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  { timestamps: true }
);

export default model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
