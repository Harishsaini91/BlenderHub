const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

// User Reference Schema (embedded display info)
const UserInfoSchema = new Schema({
  name: { type: String, required: true },
  image: { type: String },
  links: {
    github: { type: String },
    instagram: { type: String },
    other: { type: String }
  }
}, { _id: false });

// Collaborator sub-schema
const CollaboratorSchema = new Schema({
  _id: { type: Types.ObjectId, ref: "User", required: true },
  name: String,
  image: String,
  role: String,
  links: {
    github: String,
    instagram: String,
    other: String
  }
}, { _id: false });

// Media sub-schema with individual likes
const MediaSchema = new Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ["image", "video", "other"], default: "image" },
  format: { type: String },
  priority: { type: Number, default: 0 },
  likes: { type: [Types.ObjectId], ref: "User", default: [] }
});

// Reply inside Comment
const ReplySchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true },
  name: String,
  image: String,
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

// Comment with replies
const CommentSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  image: { type: String },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  replies: { type: [ReplySchema], default: [] }
});

const ProjectSchema = new Schema({
  owner: { type: Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true }, // owner's name (redundant for display)
  
  projects: [
    {
      title: { type: String, required: true },
      description: { type: String },
      keywords: { type: [String], default: [] },

      media: { type: [MediaSchema], default: [] },
      likes: { type: [Types.ObjectId], ref: "User", default: [] },
      comments: { type: [CommentSchema], default: [] },

      category: { type: [String], default: [] },
      status: { type: String, enum: ["draft", "published"], default: "published" },
      visibility: { type: String, enum: ["public", "private", "unlisted"], default: "public" },

      isFeatured: { type: Boolean, default: false },
      isTrending: { type: Boolean, default: false },

      collaborators: { type: [CollaboratorSchema], default: [] },
      user: { type: UserInfoSchema, required: true } // for quick access on frontend

    }
  ]
}, { timestamps: true });

module.exports = model("Project", ProjectSchema);
