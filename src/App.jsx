import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

function Icon({ name, size = 18, strokeWidth = 1.7 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h7" /></>,
    bookmark: <><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z" /></>,
    inbox: <><path d="M4 4h16l2 11v5H2v-5z" /><path d="M2 15h6l2 3h4l2-3h6M8 9h8" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-1a7 7 0 0 1 14 0v1z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2zM19 14l1.2 2.3L22 17l-1.8.7L19 20l-.8-2.3L16 17l2.2-.7z" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    moon: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.6 8.6 0 1 0 11 11z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function BookCover({ book, className = "" }) {
  const [failed, setFailed] = useState(false);
  const cover = book.cover || `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`;
  return (
    <div className={`book-cover ${className}`}>
      {!failed && book.isbn ? (
        <img src={cover} alt={`Cover of ${book.title}`} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="cover-placeholder">
          <span className="cover-small-label">SHELF EDITIONS</span>
          <span className="cover-placeholder-title">{book.title}</span>
          <span className="cover-placeholder-author">{book.author}</span>
        </div>
      )}
    </div>
  );
}

function App() {
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("Overview");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All books");
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  const [showBookForm, setShowBookForm] = useState(false);
  const [showRecommendationForm, setShowRecommendationForm] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [toast, setToast] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ username: "", password: "" });
  const [librarianForm, setLibrarianForm] = useState({ username: "", password: "" });
  const [librarianCount, setLibrarianCount] = useState(0);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [apiError, setApiError] = useState("");
  const [darkTheme, setDarkTheme] = useState(() => window.localStorage.getItem("shelf-theme") === "dark");

  useEffect(() => {
    let active = true;
    async function loadLibrary() {
      try {
        await api.health();
        const [bookData, sessionData] = await Promise.all([api.books(), api.me().catch(() => null)]);
        if (!active) return;
        setBooks(bookData.books);
        const user = sessionData?.user || null;
        setSession(user);
        if (user) {
          const [loanData, recommendationData] = await Promise.all([
            api.loans(),
            api.recommendations(),
          ]);
          if (!active) return;
          setLoans(loanData.loans);
          setRecommendations(recommendationData.recommendations);
          if (user.role === "Librarian") {
            const count = await api.librarianCount();
            if (active) setLibrarianCount(count.count);
          }
        }
        if (active) {
          setApiError("");
        }
      } catch (error) {
        if (active) setApiError(error.message);
      }
    }
    loadLibrary();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    async function refreshPrivateData() {
      try {
        const [loanData, recommendationData] = await Promise.all([api.loans(), api.recommendations()]);
        if (active) {
          setLoans(loanData.loans);
          setRecommendations(recommendationData.recommendations);
        }
        if (session.role === "Librarian") {
          const count = await api.librarianCount();
          if (active) setLibrarianCount(count.count);
        }
      } catch (error) {
        if (active) notify(error.message);
      }
    }
    refreshPrivateData();
    return () => { active = false; };
  }, [session]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    window.localStorage.setItem("shelf-theme", darkTheme ? "dark" : "light");
  }, [darkTheme]);

  const role = session?.role || "Student";
  const isAdmin = role === "Librarian";
  const genres = useMemo(() => ["All books", ...new Set(books.map((book) => book.genre).filter(Boolean))], [books]);
  const filteredBooks = useMemo(() => books.filter((book) => {
    const matchesGenre = genre === "All books" || book.genre === genre;
    const term = query.trim().toLowerCase();
    const matchesQuery = !term || `${book.title} ${book.author} ${book.genre}`.toLowerCase().includes(term);
    return matchesGenre && matchesQuery;
  }), [books, genre, query]);
  const myLoans = loans.filter((loan) => loan.borrower === session?.username && loan.status === "Borrowed");
  const unreadRecommendations = recommendations.filter((item) => item.status === "New").length;
  const unreadMessages = isAdmin ? unreadRecommendations : 0;
  const pageTitle = page === "Overview" ? "A little more well-read." : page;

  function notify(message) {
    setToast(message);
  }

  function logout() {
    setSession(null);
    setPage("Overview");
    setLoginForm({ username: "", password: "" });
    setShowLoginForm(false);
    api.logout().catch((error) => notify(error.message));
  }

  async function handleLogin(event) {
    event.preventDefault();
    try {
      const { user } = await api.login(loginForm);
      setSession(user);
      setPage("Overview");
      setShowLoginForm(false);
      setAuthMode("login");
      setLoginForm({ username: "", password: "" });
      notify("Signed in successfully.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function handleRegistration(event) {
    event.preventDefault();
    try {
      await api.register(registerForm);
      const { user } = await api.login(registerForm);
      setSession(user);
      setPage("Overview");
      setShowLoginForm(false);
      setAuthMode("login");
      setRegisterForm({ username: "", password: "" });
      notify("Student account created.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setShowLoginForm(false);
      notify("Password updated successfully.");
    } catch (error) {
      notify(error.message);
    }
  }

  function openPage(nextPage) {
    if (["My loans", "Recommendations", "Profile"].includes(nextPage) && !session) {
      notify("Please sign in to access your library account.");
      setShowLoginForm(true);
      return;
    }
    if (["Collection", "All loans", "Inbox", "Librarians"].includes(nextPage) && !isAdmin) {
      notify("This page is available to librarians only.");
      return;
    }
    setPage(nextPage);
    setMobileNavOpen(false);
  }

  async function borrowBook(book) {
    if (!session) {
      setSelectedBook(null);
      setShowLoginForm(true);
      notify("Sign in to borrow books.");
      return;
    }
    if (role !== "Student") {
      notify("Only student accounts can borrow books.");
      return;
    }
    if (loans.some((loan) => loan.bookId === book.id && loan.borrower === session.username && loan.status === "Borrowed")) {
      notify("You already have this book on loan.");
      return;
    }
    if (book.copies < 1) {
      notify("This title is currently checked out.");
      return;
    }
    try {
      const result = await api.borrow(book.id);
      setBooks((current) => current.map((item) => item.id === book.id ? result.book : item));
      setLoans((current) => [result.loan, ...current]);
      setSelectedBook(null);
      notify(`“${book.title}” is yours for the next 21 days.`);
    } catch (error) {
      notify(error.message);
    }
  }

  async function returnBook(loan) {
    try {
      const result = await api.returnLoan(loan.id);
      setLoans((current) => current.map((item) => item.id === loan.id ? result.loan : item));
      if (result.book) setBooks((current) => current.map((item) => item.id === result.book.id ? result.book : item));
      notify("Book returned. Thank you!");
    } catch (error) {
      notify(error.message);
    }
  }

  async function saveBook(event) {
    event.preventDefault();
    if (!isAdmin) {
      notify("Only librarians can manage the collection.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const title = data.get("title").trim();
    const author = data.get("author").trim();
    const isbn = data.get("isbn").trim();
    const book = {
      id: editingBook?.id || `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      title,
      author,
      isbn,
      year: data.get("year").trim(),
      genre: data.get("genre").trim(),
      copies: Math.max(0, Number(data.get("copies")) || 0),
      description: data.get("description").trim() || "A new addition to the library collection.",
      cover: data.get("cover").trim(),
      fullTextUrl: data.get("fullTextUrl").trim(),
      downloadUrl: data.get("downloadUrl").trim(),
    };
    try {
      if (editingBook) {
        const { book: updatedBook } = await api.updateBook(editingBook.id, book);
        setBooks((current) => current.map((item) => item.id === editingBook.id ? updatedBook : item));
        notify("Book details updated.");
      } else {
        const { book: addedBook } = await api.createBook(book);
        setBooks((current) => [addedBook, ...current]);
        notify("Book added to the collection.");
      }
      setShowBookForm(false);
      setEditingBook(null);
    } catch (error) {
      notify(error.message);
    }
  }

  async function deleteBook(book) {
    if (!isAdmin) {
      notify("Only librarians can manage the collection.");
      return;
    }
    if (!window.confirm(`Remove “${book.title}” from the library?`)) return;
    try {
      await api.deleteBook(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
      setSelectedBook(null);
      notify("Book removed from the collection.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function submitRecommendation(event) {
    event.preventDefault();
    if (!session || role !== "Student") {
      notify("Sign in as a student to send a recommendation.");
      setShowRecommendationForm(false);
      setShowLoginForm(true);
      return;
    }
    const data = new FormData(event.currentTarget);
    try {
      const { recommendation } = await api.createRecommendation({
        title: data.get("title").trim(),
        author: data.get("author").trim(),
        note: data.get("note").trim(),
      });
      setRecommendations((current) => [recommendation, ...current]);
      setShowRecommendationForm(false);
      setPage("Recommendations");
      notify("Your recommendation was sent to the library team.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function updateRecommendation(id, status) {
    if (!isAdmin) {
      notify("Only librarians can manage reader recommendations.");
      return;
    }
    try {
      const { recommendation } = await api.updateRecommendation(id, status);
      setRecommendations((current) => current.map((item) => item.id === id ? recommendation : item));
      notify(status === "Approved" ? "Recommendation approved." : "Recommendation archived.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function addLibrarian(event) {
    event.preventDefault();
    if (!isAdmin) {
      notify("Only librarians can create librarian accounts.");
      return;
    }
    const username = librarianForm.username.trim();
    const password = librarianForm.password.trim();
    if (!username || password.length < 8) {
      notify("Enter a username and password with at least 8 characters.");
      return;
    }
    try {
      const result = await api.createLibrarian({ username, password });
      setLibrarianCount(result.count);
      setLibrarianForm({ username: "", password: "" });
      notify("Librarian account created.");
    } catch (error) {
      notify(error.message);
    }
  }

  const navigation = isAdmin
    ? [
      { label: "Overview", icon: "grid" },
      { label: "Collection", icon: "book" },
      { label: "All loans", icon: "bookmark" },
      { label: "Inbox", icon: "inbox", count: unreadMessages },
      { label: "Librarians", icon: "user" },
      { label: "Profile", icon: "user" },
    ]
    : session
      ? [
      { label: "Overview", icon: "grid" },
      { label: "Browse books", icon: "book" },
      { label: "My loans", icon: "bookmark", count: myLoans.length },
      { label: "Recommendations", icon: "inbox" },
      { label: "Profile", icon: "user" },
      ]
      : [
        { label: "Overview", icon: "grid" },
        { label: "Browse books", icon: "book" },
      ];

  function renderBookCard(book) {
    const available = book.copies > 0;
    return (
      <article className="book-card" key={book.id}>
        <button className="cover-button" onClick={() => setSelectedBook(book)} aria-label={`View ${book.title}`}>
          <BookCover book={book} />
          {book.featured && <span className="book-ribbon">Staff pick</span>}
        </button>
        <div className="book-card-copy">
          <span className="book-genre">{book.genre}</span>
          <button className="book-title-button" onClick={() => setSelectedBook(book)}>{book.title}</button>
          <span className="book-author">{book.author} <span>·</span> {book.year}</span>
          <div className="book-card-bottom">
            <span className={`availability ${available ? "" : "unavailable"}`}>
              <span className="availability-dot" />{available ? `${book.copies} available` : "All borrowed"}
            </span>
            {isAdmin && (
              <button className="icon-button card-edit" onClick={() => { setEditingBook(book); setShowBookForm(true); }} aria-label={`Edit ${book.title}`}>
                <Icon name="edit" size={16} />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  function renderCatalog() {
    return (
      <>
        <section className="collection-intro">
          <div>
            <div className="eyebrow">THE LIBRARY COLLECTION</div>
            <h2>Find your next <em>favorite.</em></h2>
            <p>A few good stories go a long way. Take a look around.</p>
          </div>
          {isAdmin && <button className="button button-dark" onClick={() => { setEditingBook(null); setShowBookForm(true); }}><Icon name="plus" size={17} /> Add a book</button>}
        </section>
        <div className="catalog-tools">
          <label className="search-field"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, author, or genre" /></label>
          <div className="genre-list" aria-label="Filter by genre">
            {genres.map((item) => <button key={item} className={`genre-chip ${genre === item ? "active" : ""}`} onClick={() => setGenre(item)}>{item}</button>)}
          </div>
        </div>
        <div className="results-caption"><span>{query || genre !== "All books" ? "SEARCH RESULTS" : "THE WHOLE COLLECTION"}</span><span>{filteredBooks.length} titles</span></div>
        {filteredBooks.length ? <div className="book-grid">{filteredBooks.map(renderBookCard)}</div> : (
          <div className="empty-state"><span className="empty-icon"><Icon name="search" size={22} /></span><h3>No books found</h3><p>Try a different title, author, or genre.</p></div>
        )}
      </>
    );
  }

  function renderOverview() {
    const featuredBooks = books.filter((book) => book.featured).slice(0, 4);
    return (
      <>
        <section className="welcome-banner">
          <div className="welcome-copy">
            <span className="welcome-kicker"><Icon name="spark" size={14} /> YOUR LITTLE CORNER OF THE LIBRARY</span>
            <h2>Good books.<br />Better <em>company.</em></h2>
            <p>A quiet place to discover your next favorite story.</p>
            <button className="button button-cream" onClick={() => openPage(isAdmin ? "Collection" : "Browse books")}>Explore the collection <Icon name="arrow" size={16} /></button>
          </div>
          <div className="banner-still-life" aria-hidden="true">
            <div className="still-life-circle" />
            <div className="still-life-book book-one"><span>THE<br />QUIET<br />HOURS</span></div>
            <div className="still-life-book book-two"><span>READ<br />A LITTLE<br />MORE</span></div>
            <div className="still-life-vase"><i /></div>
            <span className="still-life-sparkle sparkle-one">✳</span><span className="still-life-sparkle sparkle-two">✳</span>
          </div>
          <span className="banner-index">EST. WITH A GOOD STORY — 2024</span>
        </section>
        <div className="stats-row">
          <div className="stat-card"><span className="stat-label">IN THE COLLECTION</span><strong>{books.length}</strong><span>thoughtfully chosen titles</span></div>
          <div className="stat-card"><span className="stat-label">{isAdmin ? "ON LOAN" : "ON YOUR NIGHTSTAND"}</span><strong>{isAdmin ? loans.filter((loan) => loan.status === "Borrowed").length : myLoans.length}</strong><span>{isAdmin ? "books with readers" : "books out for a read"}</span></div>
          <div className="stat-card"><span className="stat-label">{isAdmin ? "TO YOUR INBOX" : "READY WHEN YOU ARE"}</span><strong>{isAdmin ? unreadRecommendations : books.filter((book) => book.copies > 0).length}</strong><span>{isAdmin ? "new book suggestions" : "books waiting to be borrowed"}</span></div>
        </div>
        {!isAdmin && myLoans.length > 0 && (
          <section className="section-block">
            <div className="section-heading"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>On your <em>nightstand.</em></h2></div><button className="text-link" onClick={() => openPage("My loans")}>All my loans <Icon name="arrow" size={15} /></button></div>
            <div className="loan-strip">{myLoans.slice(0, 2).map((loan) => {
              const book = books.find((item) => item.id === loan.bookId);
              if (!book) return null;
              return <button className="loan-mini" key={loan.id} onClick={() => setSelectedBook(book)}><BookCover book={book} /><span><b>{book.title}</b><small>Due {formatDate(loan.due)}</small></span><Icon name="chevron" size={17} /></button>;
            })}</div>
          </section>
        )}
        <section className="section-block featured-section">
          <div className="section-heading"><div><div className="eyebrow">A GOOD PLACE TO START</div><h2>Little staff <em>favorites.</em></h2></div><button className="text-link" onClick={() => openPage(isAdmin ? "Collection" : "Browse books")}>See every book <Icon name="arrow" size={15} /></button></div>
          {featuredBooks.length ? (
            <div className="book-grid">{featuredBooks.map(renderBookCard)}</div>
          ) : (
            <div className="featured-empty">
              <span className="featured-empty-icon"><Icon name="spark" size={20} /></span>
              <div>
                <h3>{apiError ? "We’ll save you a place." : "A good story is on its way."}</h3>
                <p>{apiError ? "Staff favorites will appear when the library reconnects." : "Staff favorites will show up here once they’re added to the collection."}</p>
              </div>
              <button className="text-link" onClick={() => openPage(isAdmin ? "Collection" : "Browse books")}>Browse the collection <Icon name="arrow" size={15} /></button>
            </div>
          )}
        </section>
        {isAdmin && (
          <section className="section-block admin-requests">
            <div className="section-heading"><div><div className="eyebrow">FROM YOUR READERS</div><h2>A few good <em>ideas.</em></h2></div><button className="text-link" onClick={() => openPage("Inbox")}>Open inbox <Icon name="arrow" size={15} /></button></div>
            {recommendations.length ? <div className="recommendation-preview">{recommendations.slice(0, 2).map((item) => <div className="recommendation-card" key={item.id}><div className="recommendation-mark">“</div><div><h3>{item.title}</h3><p>by {item.author}</p><small>Reader suggestion · {formatDate(item.date)}</small></div><span className={`request-status ${item.status.toLowerCase()}`}>{item.status}</span></div>)}</div> : <p className="quiet-note">No recommendations yet. They’ll show up here.</p>}
          </section>
        )}
      </>
    );
  }

  function renderLoans() {
    const rows = isAdmin ? loans.filter((loan) => loan.status === "Borrowed") : myLoans;
    return (
      <section className="page-section">
        <div className="collection-intro"><div><div className="eyebrow">{isAdmin ? "THE READING ROOM" : "YOUR READING ROOM"}</div><h2>{isAdmin ? "Books out in the <em>world.</em>" : "Your reading <em>list.</em>"}</h2><p>{isAdmin ? "A little look at what your readers are enjoying." : "Keep an eye on your returns, and enjoy every chapter."}</p></div></div>
        {rows.length ? <div className="loan-list">{rows.map((loan) => {
          const book = books.find((item) => item.id === loan.bookId);
          if (!book) return null;
          return <div className="loan-row" key={loan.id}>
            {isAdmin ? (
              <button className="loan-book-trigger" onClick={() => setSelectedLoan(loan)} aria-label={`View loan details for ${book.title}`}>
                <BookCover book={book} />
                <div className="loan-row-copy"><span className="book-genre">BORROWED BY A READER</span><h3>{book.title}</h3><p>{book.author} · {book.year}</p></div>
              </button>
            ) : (
              <><BookCover book={book} /><div className="loan-row-copy"><span className="book-genre">CURRENTLY READING</span><h3>{book.title}</h3><p>{book.author} · {book.year}</p></div></>
            )}
            <div className="loan-due"><span>DUE BACK</span><strong>{formatDate(loan.due)}</strong></div>
            {isAdmin ? <span className="request-status borrowed">On loan</span> : <button className="button button-outline" onClick={() => returnBook(loan)}>Return book</button>}
          </div>;
        })}</div> : <div className="empty-state"><span className="empty-icon"><Icon name="book" size={22} /></span><h3>Your next chapter is waiting</h3><p>Browse the collection and borrow a book to see it here.</p><button className="button button-dark" onClick={() => openPage("Browse books")}>Browse books <Icon name="arrow" size={15} /></button></div>}
      </section>
    );
  }

  function renderRecommendations() {
    if (!isAdmin) {
      const mine = recommendations.filter((item) => item.requester === session?.id);
      return <section className="page-section"><div className="collection-intro"><div><div className="eyebrow">A NOTE TO YOUR LIBRARIAN</div><h2>What's missing from the <em>shelf?</em></h2><p>Have a book in mind? Send a little note to the library team.</p></div><button className="button button-dark" onClick={() => setShowRecommendationForm(true)}><Icon name="plus" size={17} /> Recommend a book</button></div>{mine.length ? <div className="recommendation-preview">{mine.map((item) => <div className="recommendation-card" key={item.id}><div className="recommendation-mark">“</div><div><h3>{item.title}</h3><p>by {item.author}</p><small>{item.note || "No note added"} · Sent {formatDate(item.date)}</small></div><span className={`request-status ${item.status.toLowerCase()}`}>{item.status}</span></div>)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name="inbox" size={22} /></span><h3>Your suggestions will live here</h3><p>Help us make the collection a little more yours.</p><button className="button button-dark" onClick={() => setShowRecommendationForm(true)}>Recommend a book <Icon name="arrow" size={15} /></button></div>}</section>;
    }
    return <section className="page-section"><div className="collection-intro"><div><div className="eyebrow">READER SUGGESTIONS</div><h2>Your next great <em>addition?</em></h2><p>Good ideas come from good readers. Here’s what they have in mind.</p></div></div>{recommendations.length ? <div className="recommendation-preview">{recommendations.map((item) => <div className="recommendation-card inbox-card" key={item.id}><div className="recommendation-mark">“</div><div className="recommendation-body"><h3>{item.title}</h3><p>by {item.author}</p><blockquote>{item.note || "No note included."}</blockquote><small>Reader suggestion · {formatDate(item.date)}</small></div><div className="recommendation-actions"><span className={`request-status ${item.status.toLowerCase()}`}>{item.status}</span>{item.status !== "Approved" && <button className="button button-outline small-button" onClick={() => updateRecommendation(item.id, "Approved")}><Icon name="check" size={15} /> Approve</button>}{item.status !== "Archived" && <button className="icon-button" title="Archive suggestion" onClick={() => updateRecommendation(item.id, "Archived")}><Icon name="close" size={17} /></button>}</div></div>)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name="inbox" size={22} /></span><h3>No recommendations yet</h3><p>When readers send ideas, you’ll find them here.</p></div>}</section>;
  }

  function renderLibrarians() {
    return (
      <section className="page-section">
        <div className="collection-intro">
          <div>
            <div className="eyebrow">LIBRARY TEAM</div>
            <h2>Invite another <em>librarian.</em></h2>
            <p>Create a staff account to help manage the collection and reader requests.</p>
          </div>
          <span className="request-status approved">{librarianCount} staff accounts</span>
        </div>
        <div className="staff-invite-card">
          <div className="staff-invite-copy">
            <span className="empty-icon"><Icon name="user" size={22} /></span>
            <h3>Good work is better together.</h3>
            <p>New librarians receive the same collection and inbox permissions as you.</p>
          </div>
          <form className="book-form staff-form" onSubmit={addLibrarian}>
            <label>Username<input value={librarianForm.username} onChange={(event) => setLibrarianForm((current) => ({ ...current, username: event.target.value }))} required /></label>
            <label>Temporary password<input type="password" minLength="8" value={librarianForm.password} onChange={(event) => setLibrarianForm((current) => ({ ...current, password: event.target.value }))} required /></label>
            <button type="submit" className="button button-dark"><Icon name="plus" size={16} /> Create librarian account</button>
          </form>
        </div>
      </section>
    );
  }

  function renderProfile() {
    return (
      <section className="page-section">
        <div className="collection-intro">
          <div>
            <div className="eyebrow">YOUR ACCOUNT</div>
            <h2>Make yourself <em>at home.</em></h2>
            <p>Manage your sign-in details.</p>
          </div>
        </div>
        <div className="profile-settings-grid">
          <section className="profile-settings-card">
            <div className="profile-settings-heading">
              <span className="empty-icon"><Icon name="user" size={22} /></span>
              <div><h3>Account details</h3><p>Your library sign-in</p></div>
            </div>
            <dl className="profile-details">
              <div><dt>Username</dt><dd>{session.username}</dd></div>
              <div><dt>Account type</dt><dd>{session.role}</dd></div>
            </dl>
            <form className="book-form profile-password-form" onSubmit={handlePasswordChange}>
              <h4>Change password</h4>
              <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
              <label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" minLength="8" required /></label>
              <button className="button button-dark" type="submit">Update password</button>
            </form>
          </section>
        </div>
      </section>
    );
  }

  function renderLogin() {
    const isRegister = authMode === "register";
    const isHelp = authMode === "help";
    return (
      <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLoginForm(false); }}>
        <section className="form-modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <div className="form-modal-header">
            <div>
              <div className="eyebrow">{isRegister ? "NEW STUDENT ACCOUNT" : isHelp ? "PASSWORD RECOVERY" : "YOUR LIBRARY ACCOUNT"}</div>
              <h2 id="auth-title">{isRegister ? <>Join the <em>library.</em></> : isHelp ? <>Need a hand?</> : <>Welcome <em>back.</em></>}</h2>
              <p>{isRegister ? "Create a student account to borrow and keep track of books." : isHelp ? "For a forgotten password, contact your librarian to reset your account." : "Sign in to borrow books and access your account."}</p>
            </div>
            <button className="icon-button" onClick={() => setShowLoginForm(false)} aria-label="Close"><Icon name="close" /></button>
          </div>
          {isRegister ? (
            <form className="book-form" onSubmit={handleRegistration}>
              <label>Username<input autoComplete="username" value={registerForm.username} onChange={(event) => setRegisterForm((current) => ({ ...current, username: event.target.value }))} minLength="3" maxLength="32" required /></label>
              <label>Password<input type="password" autoComplete="new-password" value={registerForm.password} onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))} minLength="8" required /></label>
              <div className="form-actions">
                <button type="button" className="text-link" onClick={() => setAuthMode("login")}>Already have an account? Sign in</button>
                <button className="button button-dark" type="submit">Create account</button>
              </div>
            </form>
          ) : isHelp ? (
            <div className="form-actions">
              <button type="button" className="button button-outline" onClick={() => setAuthMode("login")}>Back to sign in</button>
              <button type="button" className="button button-dark" onClick={() => setShowLoginForm(false)}>Close</button>
            </div>
          ) : (
            <form className="book-form" onSubmit={handleLogin}>
              <label>Username<input autoComplete="username" value={loginForm.username} onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))} required /></label>
              <label>Password<input type="password" autoComplete="current-password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} required /></label>
              <div className="form-actions">
                <button type="button" className="text-link" onClick={() => setAuthMode("help")}>Forgot password?</button>
                <button className="button button-dark" type="submit">Sign in <Icon name="arrow" size={16} /></button>
              </div>
              <button type="button" className="text-link auth-register-link" onClick={() => setAuthMode("register")}>New student? Create an account</button>
            </form>
          )}
        </section>
      </div>
    );
  }

  function renderPage() {
    if (page === "Collection" || page === "Browse books") return renderCatalog();
    if (page === "My loans" || page === "All loans") return renderLoans();
    if (page === "Inbox" || page === "Recommendations") return renderRecommendations();
    if (page === "Librarians" && isAdmin) return renderLibrarians();
    if (page === "Profile" && session) return renderProfile();
    return renderOverview();
  }

  function accessDigitalBook(book, format) {
    if (!session) {
      setShowLoginForm(true);
      setSelectedBook(null);
      notify(`Sign in to ${format === "read" ? "read" : "download"} books.`);
      return;
    }
    const url = format === "read" ? book.fullTextUrl : book.downloadUrl;
    if (!url) {
      notify("A digital copy of this title is not available in the library yet.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="app-shell" data-theme={darkTheme ? "dark" : "light"}>
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <button className="brand" onClick={() => openPage("Overview")} aria-label="Shelf home"><span className="brand-mark"><span /><span /><span /></span><span className="brand-word">shelf<span>.</span></span></button>
        <div className="sidebar-label">YOUR LIBRARY</div>
        <nav className="sidebar-nav">
          {navigation.map((item) => <button key={item.label} className={`nav-item ${page === item.label ? "selected" : ""}`} onClick={() => openPage(item.label)}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.count > 0 && <span className="nav-count">{item.count}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="note-icon"><Icon name="spark" size={16} /></span><p>In a world full of noise, find a little <em>quiet.</em></p><span>— your friendly librarian</span></div>
          <div className="profile-card">
            <div className="avatar"><Icon name="user" size={16} /></div>
            <div className="profile-copy"><strong>{session ? "Account signed in" : "Browsing as a guest"}</strong><span>{session ? (isAdmin ? "Librarian" : "Student") : "Browse the collection"}</span></div>
            {session
              ? <button className="profile-action" onClick={logout}>Log out</button>
              : <button className="profile-action" onClick={() => setShowLoginForm(true)}>Sign in</button>}
          </div>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Icon name="menu" size={21} /></button>
          <div className="breadcrumb"><span>THE LIBRARY</span><Icon name="chevron" size={14} /><strong>{page}</strong></div>
          <div className="topbar-right">
            <button className="icon-button theme-toggle" type="button" aria-label={`Switch to ${darkTheme ? "light" : "dark"} theme`} aria-pressed={darkTheme} title={`Switch to ${darkTheme ? "light" : "dark"} theme`} onClick={() => setDarkTheme((current) => !current)}>
              <Icon name={darkTheme ? "moon" : "sun"} size={19} />
            </button>
            <span className="account-status">{session ? (isAdmin ? "Librarian" : "Student") : "Guest"}</span>
            {session
              ? <>
                <button className="logout-button" onClick={logout}>Log out</button>
              </>
              : <button className="button button-dark sign-in-button" onClick={() => setShowLoginForm(true)}>Sign in</button>}
          </div>
          </header>
        <div className="page-content">
          {apiError && <div className="api-notice" role="alert"><strong>Library server unavailable</strong><span>{apiError}</span><button className="text-link" onClick={() => window.location.reload()}>Retry</button></div>}
          <div className="page-heading"><div><div className="eyebrow">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase()}</div><h1>{pageTitle}</h1></div>{page === "Overview" && <span className="heading-note">A good day to turn a page <span>✳</span></span>}</div>
          {renderPage()}
          <footer className="page-footer"><span>MADE FOR PEOPLE WHO LOVE A GOOD STORY</span><span>SHELF <i>·</i> THE LITTLE LIBRARY</span></footer>
        </div>
      </main>
      {selectedBook && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBook(null); }}>
        <section className="book-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button className="modal-close icon-button" onClick={() => setSelectedBook(null)} aria-label="Close"><Icon name="close" /></button>
          <BookCover book={selectedBook} className="modal-cover" />
          <div className="modal-copy">
            <span className="book-genre">{selectedBook.genre} · {selectedBook.year}</span>
            <h2 id="modal-title">{selectedBook.title}</h2>
            <p className="modal-author">by {selectedBook.author}</p>
            <div className="modal-divider" />
            <p className="modal-description">{selectedBook.description}</p>
            <div className="modal-meta"><span>PUBLICATION YEAR</span><strong>{selectedBook.year}</strong><span>ISBN</span><strong>{selectedBook.isbn || "Not listed"}</strong><span>AVAILABILITY</span><strong>{selectedBook.copies > 0 ? `${selectedBook.copies} copies available` : "Currently on loan"}</strong></div>
            <div className="modal-actions">
              {isAdmin ? <>
                <button className="button button-dark" onClick={() => { setEditingBook(selectedBook); setSelectedBook(null); setShowBookForm(true); }}><Icon name="edit" size={16} /> Edit book details</button>
                <button className="button button-danger" onClick={() => deleteBook(selectedBook)}><Icon name="trash" size={16} /> Remove</button>
              </> : <>
                <button className="button button-dark" disabled={selectedBook.copies < 1} onClick={() => borrowBook(selectedBook)}>{selectedBook.copies > 0 ? <>Borrow this book <Icon name="arrow" size={16} /></> : "All copies are on loan"}</button>
                <button className="button button-outline" onClick={() => accessDigitalBook(selectedBook, "read")}>Read full book</button>
                <button className="button button-outline" onClick={() => accessDigitalBook(selectedBook, "download")}>Download</button>
                {!session && <span className="login-hint">Sign in is required to borrow, read, or download.</span>}
              </>}
            </div>
          </div>
        </section>
      </div>}
      {selectedLoan && isAdmin && (() => {
        const book = books.find((item) => item.id === selectedLoan.bookId);
        if (!book) return null;
        return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLoan(null); }}>
          <section className="form-modal loan-details-modal" role="dialog" aria-modal="true" aria-labelledby="loan-details-title">
            <div className="form-modal-header">
              <div><div className="eyebrow">ACTIVE BORROWING</div><h2 id="loan-details-title">{book.title}</h2><p>by {book.author}</p></div>
              <button className="icon-button" onClick={() => setSelectedLoan(null)} aria-label="Close loan details"><Icon name="close" /></button>
            </div>
            <dl className="loan-details-list">
              <div><dt>Borrowed by</dt><dd>{selectedLoan.borrower}</dd></div>
              <div><dt>Checked out</dt><dd>{formatDateTime(selectedLoan.borrowedAt)}</dd></div>
              <div><dt>Borrowing period ends</dt><dd>{formatDateTime(selectedLoan.due)}</dd></div>
            </dl>
          </section>
        </div>;
      })()}
      {showBookForm && isAdmin && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowBookForm(false); setEditingBook(null); } }}><section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="book-form-title"><div className="form-modal-header"><div><div className="eyebrow">{editingBook ? "A FEW LITTLE CHANGES" : "A NEW ADDITION"}</div><h2 id="book-form-title">{editingBook ? "Edit this <em>book.</em>" : "Add a new <em>story.</em>"}</h2></div><button className="icon-button" onClick={() => { setShowBookForm(false); setEditingBook(null); }} aria-label="Close"><Icon name="close" /></button></div><form className="book-form" onSubmit={saveBook}><label>Book title<input name="title" defaultValue={editingBook?.title || ""} required placeholder="e.g. The Midnight Library" /></label><div className="form-two-col"><label>Author<input name="author" defaultValue={editingBook?.author || ""} required placeholder="Author name" /></label><label>Publication year<input name="year" type="number" min="1000" max="2100" defaultValue={editingBook?.year || ""} required placeholder="2024" /></label></div><div className="form-two-col"><label>Genre<input name="genre" defaultValue={editingBook?.genre || ""} required placeholder="e.g. Fiction" /></label><label>Available copies<input name="copies" type="number" min="0" defaultValue={editingBook?.copies ?? 1} required /></label></div><label>ISBN <span className="optional-label">optional · used to find the cover</span><input name="isbn" defaultValue={editingBook?.isbn || ""} placeholder="978..." /></label><label>Cover image URL <span className="optional-label">optional</span><input name="cover" type="url" defaultValue={editingBook?.cover || ""} placeholder="https://…" /></label><label>Full book URL <span className="optional-label">optional · for read access</span><input name="fullTextUrl" type="url" defaultValue={editingBook?.fullTextUrl || ""} placeholder="https://…" /></label><label>Download URL <span className="optional-label">optional</span><input name="downloadUrl" type="url" defaultValue={editingBook?.downloadUrl || ""} placeholder="https://…" /></label><label>A little about the book <span className="optional-label">optional</span><textarea name="description" rows="3" defaultValue={editingBook?.description || ""} placeholder="What might a reader want to know?" /></label><div className="form-actions"><button type="button" className="button button-outline" onClick={() => { setShowBookForm(false); setEditingBook(null); }}>Cancel</button><button className="button button-dark" type="submit">{editingBook ? "Save changes" : "Add to collection"} <Icon name="arrow" size={16} /></button></div></form></section></div>}
      {showRecommendationForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowRecommendationForm(false); }}><section className="form-modal recommendation-modal" role="dialog" aria-modal="true" aria-labelledby="recommend-form-title"><div className="form-modal-header"><div><div className="eyebrow">A LITTLE NOTE FOR THE LIBRARIAN</div><h2 id="recommend-form-title">Put it on our <em>radar.</em></h2><p>Tell us about the book you would love to see on the shelf.</p></div><button className="icon-button" onClick={() => setShowRecommendationForm(false)} aria-label="Close"><Icon name="close" /></button></div><form className="book-form" onSubmit={submitRecommendation}><label>Book title<input name="title" required placeholder="Which book should we look for?" /></label><label>Author<input name="author" required placeholder="Who wrote it?" /></label><label>Why this book? <span className="optional-label">optional</span><textarea name="note" rows="3" placeholder="A little note to your librarian…" /></label><div className="form-actions"><button type="button" className="button button-outline" onClick={() => setShowRecommendationForm(false)}>Cancel</button><button className="button button-dark" type="submit">Send recommendation <Icon name="arrow" size={16} /></button></div></form></section></div>}
      {showLoginForm && renderLogin()}
      {toast && <div className="toast-message"><span className="toast-check"><Icon name="check" size={15} /></span>{toast}</div>}
    </div>
  );
}

function formatDate(value) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export default App;
