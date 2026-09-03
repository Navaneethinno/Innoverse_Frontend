import { createSlice } from "@reduxjs/toolkit";
const initialState = { token: null, refreshToken: null, user: null, isAuthenticated: false };
const authTokenSlice = createSlice({
  name: "token",
  initialState,
  reducers: {
    setToken: (state, action) => {
      state.token = action.payload;
      state.isAuthenticated = Boolean(action.payload);
    },
    setSession: (state, action) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken ?? null;
      state.user = action.payload.user;
      state.isAuthenticated = Boolean(action.payload.token);
    },
    clearToken: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});
export const { setToken, setSession, clearToken } = authTokenSlice.actions;
export default authTokenSlice.reducer;
