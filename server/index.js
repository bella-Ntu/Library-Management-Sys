import "dotenv/config";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import { setServers } from "node:dns/promises";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Book, Loan, Recommendation, User } from "./models.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const sessionCookie = "shelf_session";
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

const starterBooks = [
  ["Calculus: Early Transcendentals", "James Stewart", "2015", "Mathematics", "9781285741550", 4, "A comprehensive calculus text covering limits, derivatives, integrals, and infinite series with applied examples.", true],
  ["Linear Algebra and Its Applications", "David C. Lay, Steven R. Lay, and Judi J. McDonald", "2015", "Mathematics", "9780321982384", 3, "An introduction to linear algebra, including matrices, vector spaces, eigenvalues, and practical applications.", true],
  ["Discrete Mathematics and Its Applications", "Kenneth H. Rosen", "2018", "Computer Science", "9781259676512", 3, "Core discrete mathematics concepts for computing, including logic, proofs, algorithms, graphs, and counting.", false],
  ["Introduction to Algorithms", "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, and Clifford Stein", "2022", "Computer Science", "9780262046305", 3, "A detailed reference to algorithm design and analysis, data structures, sorting, graph algorithms, and optimization.", true],
  ["Python Crash Course", "Eric Matthes", "2023", "Computer Science", "9781718502703", 4, "A hands-on introduction to Python programming, from fundamentals to projects in data visualization and web development.", true],
  ["Clean Code", "Robert C. Martin", "2008", "Software Engineering", "9780132350884", 2, "Principles and examples for writing readable, maintainable software and improving code through refactoring.", false],
  ["Computer Networking: A Top-Down Approach", "James F. Kurose and Keith W. Ross", "2021", "Computer Science", "9780136681557", 2, "An application-focused introduction to network protocols, the Internet, transport, routing, and network security.", false],
  ["Database System Concepts", "Abraham Silberschatz, Henry F. Korth, and S. Sudarshan", "2019", "Computer Science", "9781260084504", 2, "Foundations of relational databases, SQL, database design, transactions, storage, and distributed data.", false],
  ["Operating System Concepts", "Abraham Silberschatz, Peter B. Galvin, and Greg Gagne", "2018", "Computer Science", "9781119800361", 2, "A study of operating-system structures, processes, memory, storage, security, and distributed systems.", false],
  ["Campbell Biology", "Lisa A. Urry, Michael L. Cain, Steven A. Wasserman, Peter V. Minorsky, and Rebecca B. Orr", "2020", "Biology", "9780135188743", 4, "A broad introduction to biology, covering evolution, cells, genetics, ecology, and the diversity of life.", true],
  ["Molecular Biology of the Cell", "Bruce Alberts, Rebecca Heald, Alexander Johnson, David Morgan, Martin Raff, Keith Roberts, and Peter Walter", "2022", "Biology", "9780393884821", 2, "A detailed textbook on cell structure, molecular processes, genetics, signaling, and experimental methods.", false],
  ["Anatomy and Physiology", "J. Gordon Betts, Kelly A. Young, James A. Wise, et al.", "2017", "Health Sciences", "9781938168130", 3, "An introduction to human body systems, anatomy, physiology, and the relationships between structure and function.", false],
  ["Chemistry: The Central Science", "Theodore E. Brown, H. Eugene LeMay, Bruce E. Bursten, et al.", "2017", "Chemistry", "9780134414232", 3, "A general chemistry text covering atoms, bonding, reactions, thermodynamics, and chemical equilibrium.", true],
  ["Organic Chemistry", "Jonathan Clayden, Nick Greeves, and Stuart Warren", "2012", "Chemistry", "9780199270293", 2, "A concept-driven introduction to organic structures, mechanisms, synthesis, and chemical reactivity.", false],
  ["University Physics with Modern Physics", "Hugh D. Young and Roger A. Freedman", "2019", "Physics", "9780135159552", 3, "A calculus-based physics course covering mechanics, waves, thermodynamics, electromagnetism, and modern physics.", true],
  ["Fundamentals of Physics", "David Halliday, Robert Resnick, and Jearl Walker", "2018", "Physics", "9781119320647", 2, "A foundational treatment of physics concepts and problem-solving across mechanics, waves, electricity, and optics.", false],
  ["Principles of Economics", "N. Gregory Mankiw", "2020", "Economics", "9780357722718", 3, "An accessible introduction to microeconomics, macroeconomics, markets, public policy, and economic growth.", true],
  ["Financial Accounting", "Robert Libby, Patricia A. Libby, and Daniel G. Short", "2022", "Accounting", "9781260247787", 2, "An introduction to financial statements, accounting concepts, and how financial information supports decisions.", false],
  ["Marketing Management", "Philip Kotler, Kevin Lane Keller, and Alexander Chernev", "2021", "Business", "9780135887158", 2, "A guide to marketing strategy, customer value, market research, branding, and developing effective campaigns.", false],
  ["Organizational Behavior", "Stephen P. Robbins and Timothy A. Judge", "2019", "Business", "9780134729329", 2, "Research-based coverage of individual behavior, teams, leadership, organizational culture, and workplace dynamics.", false],
  ["Psychology", "Rose M. Spielman, William J. Jenkins, and Marilyn D. Lovett", "2020", "Psychology", "9781951693237", 3, "An introduction to psychological science, including behavior, cognition, development, mental health, and research.", true],
  ["Introduction to Sociology", "Tanya Maria Golash-Boza", "2021", "Sociology", "9781951693510", 2, "An overview of sociological perspectives, culture, socialization, inequality, institutions, and social change.", false],
  ["Research Methods in Psychology", "Beth Morling", "2020", "Psychology", "9780393536263", 2, "A practical guide to designing studies, evaluating evidence, understanding statistics, and interpreting research.", false],
  ["Environmental Science", "G. Tyler Miller and Scott E. Spoolman", "2018", "Environmental Science", "9781337569613", 2, "An introduction to ecosystems, natural resources, pollution, climate, and sustainable solutions.", false],
  ["Engineering Mechanics: Statics", "R. C. Hibbeler", "2015", "Engineering", "9780133918922", 2, "Core statics concepts for engineering, including force systems, equilibrium, structures, and friction.", false],
  ["Principles of Geology", "Charles C. Plummer, Diane H. Carlson, and Lisa Hammersley", "2015", "Geology", "9780078096105", 2, "An introduction to Earth's materials, plate tectonics, geologic time, surface processes, and natural hazards.", false],
].map(([title, author, year, genre, isbn, copies, description, featured]) => ({
  title, author, year, genre, isbn, copies, description, featured,
}));

const legacyStarterBooks = new Map([
  ["9780451524935", "1984"],
  ["9780141439518", "Pride and Prejudice"],
  ["9780743273565", "The Great Gatsby"],
  ["9780061120084", "To Kill a Mockingbird"],
  ["9780441172719", "Dune"],
  ["9780547928227", "The Hobbit"],
  ["9780735211292", "Atomic Habits"],
  ["9780399590504", "Educated"],
  ["9780375842207", "The Book Thief"],
  ["9781250301697", "The Silent Patient"],
]);

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
    borrowedAt: loan.createdAt.toISOString(),
    due: loan.due.toISOString(),
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
  const password = String(req.body.password || "");
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || password.length < 8) {
    return sendError(res, 400, "Use a 3–32 character username and a password with at least 8 characters.");
  }
  if (await User.exists({ username })) return sendError(res, 409, "That username is already taken.");
  const user = await User.create({ username, passwordHash: await bcrypt.hash(password, 12), role: "Student" });
  res.status(201).json({ user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const username = String(req.body.username || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = await User.findOne({ username }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
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
  const password = String(req.body.password || "");
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || password.length < 8) {
    return sendError(res, 400, "Use a 3–32 character username and a password with at least 8 characters.");
  }
  if (await User.exists({ username })) return sendError(res, 409, "That username is already taken.");
  const user = await User.create({ username, passwordHash: await bcrypt.hash(password, 12), role: "Librarian" });
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
  const required = ["MONGODB_URI", "JWT_SECRET", "BOOTSTRAP_LIBRARIAN_USERNAME", "BOOTSTRAP_LIBRARIAN_PASSWORD"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  if (process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters.");
  if (process.env.BOOTSTRAP_LIBRARIAN_PASSWORD.length < 8) throw new Error("Bootstrap librarian password must be at least 8 characters.");

  const dnsServers = process.env.MONGODB_DNS_SERVERS?.split(",").map((server) => server.trim()).filter(Boolean);
  if (dnsServers?.length) setServers(dnsServers);

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const username = process.env.BOOTSTRAP_LIBRARIAN_USERNAME.trim().toLowerCase();
  const existingLibrarian = await User.findOne({ role: "Librarian" });
  if (!existingLibrarian) {
    await User.create({
      username,
      passwordHash: await bcrypt.hash(process.env.BOOTSTRAP_LIBRARIAN_PASSWORD, 12),
      role: "Librarian",
    });
  }

  const oldStarterRecords = await Book.find({ isbn: { $in: [...legacyStarterBooks.keys()] } }).select("_id isbn title");
  const untouchedOldStarters = oldStarterRecords.filter((book) => legacyStarterBooks.get(book.isbn) === book.title);
  if (untouchedOldStarters.length) {
    const oldIds = untouchedOldStarters.map((book) => book._id);
    const booksWithLoanHistory = await Loan.distinct("book", { book: { $in: oldIds } });
    const idsToRemove = oldIds.filter((id) => !booksWithLoanHistory.some((loanBookId) => loanBookId.equals(id)));
    if (idsToRemove.length) await Book.deleteMany({ _id: { $in: idsToRemove } });
  }

  await Book.bulkWrite(starterBooks.map((book) => ({
    updateOne: {
      filter: { isbn: book.isbn },
      update: { $setOnInsert: book },
      upsert: true,
    },
  })));
  app.listen(port, () => console.log(`Shelf API listening on port ${port}`));
}

start().catch((error) => {
  console.error("Could not start Shelf API:", error.message);
  process.exitCode = 1;
});
