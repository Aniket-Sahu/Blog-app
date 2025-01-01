import mongoose, { Document, Schema, Types } from "mongoose";

export interface IComment extends Document {
  userId: Types.ObjectId;
  postId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema<IComment> = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    postId: { type: mongoose.Schema.ObjectId, ref: "Post", required: true },
    content: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: true }
);

const Comment =
  (mongoose.models.Comment as mongoose.Model<IComment>) ||
  mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;
