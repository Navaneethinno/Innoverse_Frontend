import { useDispatch, useSelector } from "react-redux";
import {
  changePassword as changePasswordRequest,
  loginRequest,
  logoutRequest,
} from "@/Services/Auth/auth.service";
import { clearAuthSession, persistAuthSession } from "@/Services/api/authStorage";
import { clearToken, setSession } from "@/Redux/AuthToken";
import { setMenuArray, clearMenuState } from "@/Redux/MenuSlice";
import { useBrandTheme } from "@/Hooks/Providers/BrandThemeProvider";
export function useAuth(selector) {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.token);
  const { setBrandTheme, clearBrandTheme } = useBrandTheme();
  // `code`: { mfa_token, mfa_code } on the second call of a sign-in that
  // asked a code. A reply asking one returns { mfa } instead of a session.
  const login = async ({ institutionCode, username, password, code }) => {
    try {
      const response = await loginRequest(institutionCode, username, password, code);
      if (response.mfa) return { success: false, mfa: response.mfa, message: response.message };
      // The institution code signed in with, kept on the user (the reply
      // names the institution, not its code).
      const user = response.user && { ...response.user, institution_code: String(institutionCode ?? "").trim().toUpperCase() };
      persistAuthSession(user, response.access_token, response.refresh_token);
      dispatch(
        setSession({
          token: response.access_token,
          refreshToken: response.refresh_token,
          user,
        }),
      );
      // The authenticated user's permission/navigation dataset, persisted
      // separately from Master reference data (see Redux/MenuSlice.js).
      dispatch(setMenuArray(response.menu_array));
      // The institution's branding from the login response (theme.css's
      // fixed palette when there is none). The code lets the login page
      // show this institution's background next time.
      setBrandTheme(response.branding && { ...response.branding, institutionCode: institutionCode?.trim() });
      // Returns the backend's own message (e.g. "Login Successful") rather
      // than a bare boolean, so the UI can show it instead of a hardcoded
      // string — see LoginPage.jsx's use of apiMessage().
      return { success: true, message: response.message };
    } catch (error) {
      // Previously this swallowed every failure into a bare `false`, so the
      // UI always showed "Invalid credentials" — even for a config error
      // (e.g. missing VITE_AUTH_BASIC_PASSWORD, which throws before any
      // network request is made), a CORS failure, or a timeout. Logging the
      // real error keeps the login UX simple while making the actual cause
      // visible in the console instead of being indistinguishable from a
      // genuine wrong-password rejection.
      console.error("Login failed:", error);
      return { success: false, message: error instanceof Error ? error.message : undefined, status: error?.status, retryAfter: error?.retryAfter };
    }
  };
  // A forced change (is_force_pwd, first sign-in) is done once this succeeds:
  // the stored user no longer carries the flag, so the app opens up.
  const changePassword = async (oldPassword, newPassword) => {
    const result = await changePasswordRequest(oldPassword, newPassword);
    if (auth.user?.is_force_pwd) {
      const user = { ...auth.user, is_force_pwd: 0 };
      persistAuthSession(user, auth.token, auth.refreshToken);
      dispatch(setSession({ token: auth.token, refreshToken: auth.refreshToken, user }));
    }
    return result;
  };
  // Ends the session on the server too (every device), then clears this
  // browser. A failed call (network, a session already ended) still signs
  // out here.
  const logout = async () => {
    await logoutRequest().catch(() => {});
    clearAuthSession();
    dispatch(clearToken());
    dispatch(clearMenuState());
    clearBrandTheme();
  };
  return selector({ ...auth, login, changePassword, logout });
}
