import "dotenv/config";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Book, Loan, Recommendation, User } from "./models.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const sessionCookie = "shelf_session";
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

const starterBooks = [
  ["1984", "George Orwell", "1949", "Dystopian", "9780451524935", 4, "A haunting vision of a totalitarian future, George Orwell's masterwork introduced the world to Big Brother and the ever-watchful Thought Police.", true],
  ["Pride and Prejudice", "Jane Austen", "1813", "Classic", "9780141439518", 3, "Elizabeth Bennet navigates questions of manners, upbringing, morality, and marriage in Jane Austen's beloved comedy of errors.", true],
  ["The Great Gatsby", "F. Scott Fitzgerald", "1925", "Classic", "9780743273565", 2, "A portrait of the Jazz Age in all its decadence and excess, and of Jay Gatsby's impossible dream.", true],
  ["To Kill a Mockingbird", "Harper Lee", "1960", "Fiction", "9780061120084", 3, "Through the eyes of Scout Finch, a small Alabama town confronts injustice, compassion, and the loss of innocence.", false],
  ["Dune", "Frank Herbert", "1965", "Science fiction", "9780441172719", 2, "On the desert planet Arrakis, Paul Atreides is drawn into a political and ecological struggle that will change the universe.", true],
  ["The Hobbit", "J.R.R. Tolkien", "1937", "Fantasy", "9780547928227", 5, "Bilbo Baggins leaves his comfortable home for a remarkable adventure with a company of dwarves and a wizard.", false],
  ["Atomic Habits", "James Clear", "2018", "Personal growth", "9780735211292", 2, "A practical guide to building good habits, breaking bad ones, and making small changes that lead to remarkable results.", false],
  ["Educated", "Tara Westover", "2018", "Memoir", "9780399590504", 1, "Tara Westover's memoir traces her journey from an isolated childhood in rural Idaho to a life shaped by education.", false],
  ["The Book Thief", "Markus Zusak", "2005", "Historical fiction", "9780375842207", 2, "In Nazi Germany, young Liesel finds solace in stealing books and sharing their stories amid a world at war.", false],
  ["The Silent Patient", "Alex Michaelides", "2019", "Mystery", "9781250301697", 3, "Alicia Berenson's life is seemingly perfect until one evening she shoots her husband and never speaks again.", false],
].map(([title, author, year, genre, isbn, copies, description, featured]) => ({
  title, author, year, genre, isbn, copies, description, featured,
}));

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role };
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function authenticate(req, res, next) {
  const token = req.cookies[sessionCookie];
  if (!token) return sendError(res, 401, "Please sign in.");
  try {
    req.sessionUser = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    res.clearCookie(sessionCookie);
    return sendError(res, 401, "Your session has expired. Please sign in again.");
  }
}

function requireLibrarian(req, res, next) {
  if (req.sessionUser.role !== "Librarian") return sendError(res, 403, "Librarian access is required.");
  return next();
}

function requireStudent(req, res, next) {
  if (req.sessionUser.role !== "Student") return sendError(res, 403, "Student access is required.");
  return next();
}

function toBook(book) {
  return { ...book.toObject(), id: book.id };
}

function toLoan(loan) {
  return {
    id: loan.id,
    bookId: loan.book.id,
    borrower: loan.borrower.username,
    due: loan.due.toISOString().slice(0, 10),
    status: loan.status,
  };
}

function toRecommendation(item) {
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    note: item.note,
    requester: item.requester.id,
    date: item.createdAt.toISOString().slice(0, 10),
    status: item.status,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.post("/api/auth/register", async (req, res) => {
  const username = String(req.body.username || "").trim().toLowerCase();
  const surname = String(req.body.surname || "").trim();
  const password = String(req.body.password || "");
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || !surname || password.length < 8) {
    return sendError(res, 400, "Use a 3–32 character username, surname, and password with at least 8 characters.");
  }
  if (await User.exists({ username })) return sendError(res, 409, "That username is already taken.");
  const user = await User.create({ username, surname, passwordHash: await bcrypt.hash(password, 12), role: "Student" });
  res.status(201).json({ user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const username = String(req.body.username || "").trim().toLowerCase();
  const surname = String(req.body.surname || "").trim();
  const password = String(req.body.password || "");
  const user = await User.findOne({ username }).select("+surname +passwordHash");
  if (!user || user.surname.toLowerCase() !== surname.toLowerCase() || !(await bcrypt.compare(password, user.passwordHash))) {
    return sendError(res, 401, "The sign-in details did not match.");
  }
  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionLifetimeMs,
    path: "/",
  });
  return res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(sessionCookie, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/" });
  res.json({ ok: true });
});

app.get("/api/auth/me", authenticate, async (req, res) => {
  const user = await User.findById(req.sessionUser.sub);
  if (!user) return sendError(res, 401, "Account no longer exists.");
  return res.json({ user: publicUser(user) });
});

app.post("/api/auth/change-password", authenticate, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (newPassword.length < 8) return sendError(res, 400, "New password must be at least 8 characters.");
  const user = await User.findById(req.sessionUser.sub).select("+passwordHash");
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return sendError(res, 401, "Current password is incorrect.");
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  return res.json({ ok: true });
});

app.get("/api/books", async (_req, res) => {
  const books = await Book.find().sort({ title: 1 });
  return res.json({ books: books.map(toBook) });
});

app.post("/api/books", authenticate, requireLibrarian, async (req, res) => {
  const book = await Book.create(req.body);
  return res.status(201).json({ book: toBook(book) });
});

app.patch("/api/books/:id", authenticate, requireLibrarian, async (req, res) => {
  const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!book) return sendError(res, 404, "Book not found.");
  return res.json({ book: toBook(book) });
});

app.delete("/api/books/:id", authenticate, requireLibrarian, async (req, res) => {
  if (await Loan.exists({ book: req.params.id, status: "Borrowed" })) return sendError(res, 409, "A book with active loans cannot be removed.");
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) return sendError(res, 404, "Book not found.");
  return res.json({ ok: true });
});

app.get("/api/loans", authenticate, async (req, res) => {
  const filter = req.sessionUser.role === "Librarian" ? {} : { borrower: req.sessionUser.sub };
  const loans = await Loan.find(filter).populate("book").populate("borrower").sort({ createdAt: -1 });
  return res.json({ loans: loans.filter((loan) => loan.book && loan.borrower).map(toLoan) });
});

app.post("/api/loans", authenticate, requireStudent, async (req, res) => {
  const book = await Book.findOneAndUpdate(
    { _id: req.body.bookId, copies: { $gt: 0 } },
    { $inc: { copies: -1 } },
    { new: true },
  );
  if (!book) return sendError(res, 409, "This book is not currently available.");
  const existingLoan = await Loan.exists({ book: book.id, borrower: req.sessionUser.sub, status: "Borrowed" });
  if (existingLoan) {
    await Book.updateOne({ _id: book.id }, { $inc: { copies: 1 } });
    return sendError(res, 409, "You already have this book on loan.");
  }
  try {
    const due = new Date();
    due.setDate(due.getDate() + 21);
    const loan = await Loan.create({ book: book.id, borrower: req.sessionUser.sub, due });
    const populated = await loan.populate(["book", "borrower"]);
    return res.status(201).json({ loan: toLoan(populated), book: toBook(book) });
  } catch (error) {
    await Book.updateOne({ _id: book.id }, { $inc: { copies: 1 } });
    throw error;
  }
});

app.patch("/api/loans/:id/return", authenticate, async (req, res) => {
  const filter = { _id: req.params.id, status: "Borrowed" };
  if (req.sessionUser.role !== "Librarian") filter.borrower = req.sessionUser.sub;
  const loan = await Loan.findOneAndUpdate(filter, { status: "Returned" }, { new: true }).populate(["book", "borrower"]);
  if (!loan) return sendError(res, 404, "Active loan not found.");
  if (loan.book) await Book.updateOne({ _id: loan.book.id }, { $inc: { copies: 1 } });
  return res.json({ loan: toLoan(loan), book: loan.book ? toBook(loan.book) : null });
});

app.get("/api/recommendations", authenticate, async (req, res) => {
  const filter = req.sessionUser.role === "Librarian" ? {} : { requester: req.sessionUser.sub };
  const recommendations = await Recommendation.find(filter).populate("requester", "username").sort({ createdAt: -1 });
  return res.json({ recommendations: recommendations.map(toRecommendation) });
});

app.post("/api/recommendations", authenticate, requireStudent, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const author = String(req.body.author || "").trim();
  if (!title || !author) return sendError(res, 400, "Book title and author are required.");
  const recommendation = await Recommendation.create({
    title,
    author,
    note: String(req.body.note || "").trim(),
    requester: req.sessionUser.sub,
  });
  await recommendation.populate("requester", "username");
  return res.status(201).json({ recommendation: toRecommendation(recommendation) });
});

app.patch("/api/recommendations/:id", authenticate, requireLibrarian, async (req, res) => {
  if (!["Read", "Approved", "Archived"].includes(req.body.status)) return sendError(res, 400, "Invalid recommendation status.");
  const recommendation = await Recommendation.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
    .populate("requester", "username");
  if (!recommendation) return sendError(res, 404, "Recommendation not found.");
  return res.json({ recommendation: toRecommendation(recommendation) });
});

app.get("/api/librarians/count", authenticate, requireLibrarian, async (_req, res) => {
  return res.json({ count: await User.countDocuments({ role: "Librarian" }) });
});

app.post("/api/librarians", authenticate, requireLibrarian, async (req, res) => {
  const username = String(req.body.username || "").trim().toLowerCase();
  const surname = String(req.body.surname || "").trim();
  const password = String(req.body.password || "");
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || !surname || password.length < 8) {
    return sendError(res, 400, "Use a 3–32 character username, surname, and password with at least 8 characters.");
  }
  if (await User.exists({ username })) return sendError(res, 409, "That username is already taken.");
  const user = await User.create({ username, surname, passwordHash: await bcrypt.hash(password, 12), role: "Librarian" });
  return res.status(201).json({ user: publicUser(user), count: await User.countDocuments({ role: "Librarian" }) });
});

app.use((error, _req, res, _next) => {
  if (error instanceof mongoose.Error.CastError) return sendError(res, 400, "Invalid record ID.");
  if (error instanceof mongoose.Error.ValidationError) return sendError(res, 400, error.message);
  if (error?.code === 11000) return sendError(res, 409, "A record with that unique value already exists.");
  console.error("API request failed:", error);
  return sendError(res, 500, "The request could not be completed.");
});

async function start() {
  const required = ["MONGODB_URI", "JWT_SECRET", "BOOTSTRAP_LIBRARIAN_USERNAME", "BOOTSTRAP_LIBRARIAN_SURNAME", "BOOTSTRAP_LIBRARIAN_PASSWORD"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  if (process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters.");
  if (process.env.BOOTSTRAP_LIBRARIAN_PASSWORD.length < 8) throw new Error("Bootstrap librarian password must be at least 8 characters.");

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const username = process.env.BOOTSTRAP_LIBRARIAN_USERNAME.trim().toLowerCase();
  const existingLibrarian = await User.findOne({ role: "Librarian" });
  if (!existingLibrarian) {
    await User.create({
      username,
      surname: process.env.BOOTSTRAP_LIBRARIAN_SURNAME.trim(),
      passwordHash: await bcrypt.hash(process.env.BOOTSTRAP_LIBRARIAN_PASSWORD, 12),
      role: "Librarian",
    });
  }

  if (await Book.countDocuments() === 0) await Book.insertMany(starterBooks);
  app.listen(port, () => console.log(`Shelf API listening on port ${port}`));
}

start().catch((error) => {
  console.error("Could not start Shelf API:", error.message);
  process.exitCode = 1;
});
