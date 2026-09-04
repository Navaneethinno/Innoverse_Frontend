import { useDispatch, useSelector } from "react-redux";
import {
  changePassword as changePasswordRequest,
  loginRequest,
  refreshTokenRequest,
} from "@/Services/Auth/auth.service";
import { clearAuthSession, persistAuthSession, readAuthUser } from "@/Services/api/authStorage";
import { clearToken, setSession } from "@/Redux/AuthToken";
import { setMenuArray, clearMenuState } from "@/Redux/MenuSlice";
export function useAuth(selector) {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.token);
  const login = async ({ username, password }) => {
    try {
      const response = await loginRequest(username, password);
      persistAuthSession(response.user, response.access_token, response.refresh_token);
      dispatch(
        setSession({
          token: response.access_token,
          refreshToken: response.refresh_token,
          user: response.user,
        }),
      );
      // The authenticated user's permission/navigation dataset, persisted
      // separately from Master reference data (see Redux/MenuSlice.js).
      dispatch(setMenuArray(response.menu_array));
      return true;
    } catch (error) {
      // Previously this swallowed every failure into a bare `false`, so the
      // UI always showed "Invalid credentials" — even for a config error
      // (e.g. missing VITE_AUTH_BASIC_PASSWORD, which throws before any
      // network request is made), a CORS failure, or a timeout. Logging the
      // real error keeps the login UX simple while making the actual cause
      // visible in the console instead of being indistinguishable from a
      // genuine wrong-password rejection.
      console.error("Login failed:", error);
      return false;
    }
  };
  const refresh = async () => {
    try {
      const response = await refreshTokenRequest();
      const user = response.user ?? readAuthUser();
      persistAuthSession(user, response.access_token, response.refresh_token);
      dispatch(
        setSession({
          token: response.access_token,
          refreshToken: response.refresh_token,
          user,
        }),
      );
      // The refresh_token endpoint does not re-send menu_array; keep the
      // menu_array already persisted from login instead of clobbering it
      // with an empty list.
      if (Array.isArray(response.menu_array) && response.menu_array.length > 0) {
        dispatch(setMenuArray(response.menu_array));
      }
      return true;
    } catch {
      clearAuthSession();
      dispatch(clearToken());
      dispatch(clearMenuState());
      return false;
    }
  };
  const changePassword = (oldPassword, newPassword) =>
    changePasswordRequest(oldPassword, newPassword);
  const logout = () => {
    clearAuthSession();
    dispatch(clearToken());
    dispatch(clearMenuState());
  };
  return selector({ ...auth, login, refresh, changePassword, logout });
}
