import mongoose, { Schema, Document, Types, mongo } from "mongoose";

export interface IPost extends Document {
  userId: Types.ObjectId;
  title: string;
  content: string;
  privacy: "public" | "private";
  likes: Types.ObjectId[];
  createdAt: Date; 
  updatedAt: Date;
}

const postSchema: Schema<IPost> = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, maxLength: 20 },
    content: { type: String, required: true, maxlength: 2500 },
    privacy: { type: String, enum: ["public", "private"], default: "public" },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

const Post =
  (mongoose.models.Post as mongoose.Model<IPost>) ||
  mongoose.model<IPost>("Post", postSchema);

export default Post;
