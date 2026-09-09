import { createTheme } from "@mui/material/styles";
const theme = createTheme({
  typography: {
    fontFamily: "var(--font-sans)",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        },
      },
    },
  },
});
export default theme;
