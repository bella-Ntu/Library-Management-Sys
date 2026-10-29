import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["Student", "Librarian"], required: true },
}, { timestamps: true });

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  year: { type: String, required: true, trim: true },
  genre: { type: String, required: true, trim: true },
  isbn: { type: String, default: "" },
  copies: { type: Number, min: 0, default: 1 },
  description: { type: String, default: "" },
  cover: { type: String, default: "" },
  fullTextUrl: { type: String, default: "" },
  downloadUrl: { type: String, default: "" },
  featured: { type: Boolean, default: false },
}, { timestamps: true });

const loanSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  borrower: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  due: { type: Date, required: true },
  status: { type: String, enum: ["Borrowed", "Returned"], default: "Borrowed" },
}, { timestamps: true });

const recommendationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  note: { type: String, default: "" },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["New", "Read", "Approved", "Archived"], default: "New" },
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
export const Book = mongoose.model("Book", bookSchema);
export const Loan = mongoose.model("Loan", loanSchema);
export const Recommendation = mongoose.model("Recommendation", recommendationSchema);
