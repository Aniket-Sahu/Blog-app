import mongoose, { Schema, Document, Types } from "mongoose";

export interface IFriendRequsest extends Document {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date; 
  updatedAt: Date;
}

const FriendRequestSchema: Schema<IFriendRequsest> = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const FriendRequest =
  (mongoose.models.FriendRequest as mongoose.Model<IFriendRequsest>) ||
  mongoose.model<IFriendRequsest>("FriendRequest", FriendRequestSchema);

export default FriendRequest;
