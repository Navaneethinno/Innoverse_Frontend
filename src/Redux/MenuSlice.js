import { createSlice } from "@reduxjs/toolkit";

// Mirrors payse's UserManagement slice responsibility split:
//  - menuArray:      the authenticated user's permission/navigation dataset,
//                     taken verbatim from the login response's data.menu_array
//                     (menu_id, parent_menu_id, module_id, menu_name, priority,
//                     status, actions[]). This is WHAT the user is allowed to see.
//  - masterModules:   system/reference module definitions from the official
//                     Master (Reference Data) endpoint POST /master/module/list.
//                     This is the full catalogue of modules that exist in the
//                     system, independent of any one user's permissions.
// The sidebar combines the two: masterModules filtered down to the module_id
// values present in menuArray gives the modules this user may see.
const initialState = {
  menuArray: [],
  masterModules: [],
  // /config/setup/state: each menu's LOCKED / TODO / DONE, its needs and
  // parts, and the setup guides (flows). null until loaded.
  setup: null,
};

const menuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {
    setMenuArray: (state, action) => {
      state.menuArray = Array.isArray(action.payload) ? action.payload : [];
    },
    setMasterModules: (state, action) => {
      state.masterModules = Array.isArray(action.payload) ? action.payload : [];
    },
    setSetupState: (state, action) => {
      state.setup = action.payload ?? null;
    },
    clearMenuState: (state) => {
      state.setup = null;
      state.menuArray = [];
      state.masterModules = [];
    },
  },
});

export const { setMenuArray, setMasterModules, setSetupState, clearMenuState } = menuSlice.actions;
export default menuSlice.reducer;
