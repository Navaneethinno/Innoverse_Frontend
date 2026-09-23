import { CssBaseline, ThemeProvider } from "@mui/material";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { ToastProvider } from "@/Components/Common/CompactPulseToast";
import { I18nProvider } from "@/Hooks/Providers/I18nProvider";
import { ColorModeProvider } from "@/Hooks/Providers/ColorModeProvider";
import { BrandThemeProvider } from "@/Hooks/Providers/BrandThemeProvider";
import { LoadingScreen } from "@/Pages/Loading/LoadingScreen";
import { appRouter } from "@/Router/Router";
import store from "@/Redux/Store";
import theme from "./theme";
import { useEffect } from "react";
import { setSession } from "@/Redux/AuthToken";
import { getAccessToken, getRefreshToken, readAuthUser } from "@/Services/api/authStorage";
function AuthSessionInitializer() {
  useEffect(() => {
    const accessToken = getAccessToken();
    if (accessToken) {
      store.dispatch(
        setSession({
          token: accessToken,
          refreshToken: getRefreshToken(),
          user: readAuthUser(),
        }),
      );
    }
  }, []);
  return null;
}
export function App() {
  return (
    <Provider store={store}>
      <AuthSessionInitializer />
      <ColorModeProvider>
        <BrandThemeProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ToastProvider>
              <div className="App">
                <LoadingScreen>
                  <I18nProvider>
                    <RouterProvider router={appRouter} />
                  </I18nProvider>
                </LoadingScreen>
              </div>
            </ToastProvider>
          </ThemeProvider>
        </BrandThemeProvider>
      </ColorModeProvider>
    </Provider>
  );
}
export default App;
