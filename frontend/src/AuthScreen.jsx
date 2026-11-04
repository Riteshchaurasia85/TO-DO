import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Sparkles } from "lucide-react";
import { loginAccount, registerAccount } from "./services/authService.js";

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === "signup";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const account = isSignup
        ? await registerAccount({ name: name.trim(), email: email.trim(), password })
        : await loginAccount({ email: email.trim(), password });
      localStorage.setItem("taskflow_token", account.token);
      onAuthenticated(account.user);
    } catch (requestError) {
      const firstValidationError = requestError.response?.data?.errors?.[0]?.message;
      setError(firstValidationError || requestError.response?.data?.message || "We couldn't complete that request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-hero">
          <a className="auth-brand" href="/" aria-label="TaskFlow home">
            <span className="brand-mark"><Check size={19} strokeWidth={3} /></span>
            <span>taskflow<span className="brand-period">.</span></span>
          </a>
          <div className="auth-pattern auth-pattern-one" />
          <div className="auth-pattern auth-pattern-two" />
          <div className="auth-hero-copy">
            <span className="auth-sparkle"><Sparkles size={16} /> YOUR SPACE TO DO</span>
            <h1>Manage what<br />matters to you.</h1>
            <p>A little more focus. A little less noise. Let’s make today count.</p>
          </div>
          <div className="auth-hero-dots"><span /><span /><span /></div>
        </div>
        <section className="auth-form-panel" aria-labelledby="auth-title">
          <div className="auth-form-heading">
            <span className="auth-welcome">{isSignup ? "YOUR NEXT CHAPTER STARTS HERE" : "GOOD TO HAVE YOU BACK"}</span>
            <h2 id="auth-title">{isSignup ? "Create your account" : "Welcome back"}</h2>
            <p>{isSignup ? "Make a little room for what matters." : "Sign in and pick up right where you left off."}</p>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button type="button" role="tab" aria-selected={isSignup} className={isSignup ? "selected" : ""} onClick={() => changeMode("signup")}>Sign up</button>
            <button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? "selected" : ""} onClick={() => changeMode("login")}>Log in</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {isSignup && (
              <label className="auth-field">Your name
                <input autoComplete="name" name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we call you?" maxLength={80} required />
              </label>
            )}
            <label className="auth-field">Email address
              <input autoComplete="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" maxLength={254} required />
            </label>
            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <span className="password-input-wrap">
                <input id="auth-password" autoComplete={isSignup ? "new-password" : "current-password"} name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? "At least 8 characters" : "Enter your password"} minLength={isSignup ? 8 : undefined} maxLength={128} required />
                <button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? "One moment..." : isSignup ? "Create my account" : "Log in to TaskFlow"} {!submitting && <ArrowRight size={17} />}
            </button>
          </form>
          <p className="auth-switch">
            {isSignup ? "Already have an account?" : "New to TaskFlow?"}{" "}
            <button type="button" onClick={() => changeMode(isSignup ? "login" : "signup")}>{isSignup ? "Log in" : "Create an account"}</button>
          </p>
          <p className="auth-note">Your account is private. Your tasks stay yours.</p>
        </section>
      </section>
    </main>
  );
}

export default AuthScreen;
