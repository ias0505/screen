import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

// Check if Replit Auth is disabled (for external hosting like Contabo)
const isReplitAuthDisabled = process.env.REPLIT_AUTH_DISABLED === "true";

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const getOidcConfig = memoize(
  async () => {
    // Skip OIDC config when Replit Auth is disabled
    if (isReplitAuthDisabled) {
      return null;
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  const isProduction = process.env.NODE_ENV === "production";
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true only when using HTTPS
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // If Replit Auth is disabled, only setup session - skip OpenID Connect
  if (isReplitAuthDisabled) {
    console.log("Replit Auth disabled via REPLIT_AUTH_DISABLED=true");
    
    // Simple user serialization for local auth
    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));
    
    // Setup Google OAuth if credentials are available
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
      console.log("Google OAuth enabled");
      
      const baseUrl = process.env.APP_URL || "https://meror.net";
      
      passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${baseUrl}/api/auth/google/callback`,
        scope: ["profile", "email"],
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          // Get or create user from Google profile
          const email = profile.emails?.[0]?.value;
          
          // Require email for Google login
          if (!email) {
            return done(null, false, { message: "البريد الإلكتروني مطلوب لتسجيل الدخول" });
          }
          
          const firstName = profile.name?.givenName || profile.displayName || "";
          const lastName = profile.name?.familyName || "";
          const profileImageUrl = profile.photos?.[0]?.value || null;
          
          // Check if user exists with this email
          let user = await authStorage.getUserByEmail(email);
          
          if (user) {
            // Update existing user with Google profile info if needed
            await authStorage.upsertUser({
              id: user.id,
              email,
              firstName: user.firstName || firstName,
              lastName: user.lastName || lastName,
              profileImageUrl: user.profileImageUrl || profileImageUrl,
            });
          } else {
            // Create new user with Google profile
            const googleUserId = `google_${profile.id}`;
            await authStorage.upsertUser({
              id: googleUserId,
              email,
              firstName,
              lastName,
              profileImageUrl,
            });
            user = await authStorage.getUserByEmail(email);
          }
          
          // Return session object matching local auth format
          const userSession = {
            id: user!.id,
            claims: { sub: user!.id },
            authProvider: "google",
          };
          
          done(null, userSession);
        } catch (error) {
          done(error as Error);
        }
      }));
      
      // Google OAuth routes
      app.get("/api/auth/google", passport.authenticate("google", {
        scope: ["profile", "email"],
      }));
      
      app.get("/api/auth/google/callback", passport.authenticate("google", {
        failureRedirect: "/login?error=google_auth_failed",
      }), (req, res) => {
        // Successful authentication - redirect to dashboard
        res.redirect("/dashboard");
      });
    } else {
      console.log("Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)");
    }
    
    // Provide stub routes that redirect to local login (when Google OAuth not available)
    app.get("/api/login", (req, res) => {
      if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
        // Redirect to Google OAuth
        res.redirect("/api/auth/google");
      } else {
        res.redirect("/login");
      }
    });

    app.get("/api/callback", (req, res) => {
      res.redirect("/");
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/login");
      });
    });
    
    return;
  }

  const config = await getOidcConfig();
  
  if (!config) {
    console.log("OIDC config not available, skipping Replit Auth setup");
    return;
  }

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // For local auth (when Replit Auth is disabled), just check if user is authenticated
  if (isReplitAuthDisabled) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return next();
  }

  // Replit Auth flow with token refresh
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    if (!config) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
