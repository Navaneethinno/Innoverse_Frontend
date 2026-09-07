// Ported verbatim (logic-for-logic) from payseFrontend
// src/Pages/Sidebar/menuSearchUtils.js — the senior sidebar search behavior
// this phase must replicate exactly: a match on a menu keeps its whole
// branch (ancestors expanded, descendants shown), sorted by backend priority.
const normalizeMenuSearch = (value) => String(value ?? "").trim().toLowerCase();

// The backend is not guaranteed to send menu_id/parent_menu_id as numbers
// (some responses have carried them as numeric strings). MenuList used to
// compare `parent_menu_id === 0` with strict equality, so a root sent as the
// string "0" would silently match nothing there — while this file's own
// search-path fallback coerced via `?? 0` and additionally treated anything
// whose parent wasn't found in the current item set as a root, so it "found"
// those same items anyway. That type-vs-type mismatch was the actual root
// cause of the search-only-reveals-the-sidebar bug: only the search codepath
// tolerated the type drift. Normalizing every id through this function
// before comparing removes that discrepancy so both paths agree.
//
// Deliberately NOT included here: promoting an item to a root just because
// its declared parent_menu_id doesn't exist anywhere in the list. That was
// tried and reverted — it would silently hide a genuinely malformed
// menu_array (a dangling parent reference) behind what looks like working
// navigation. A dangling parent is a backend data problem to surface and
// fix, not a frontend hierarchy to invent. See findOrphanedMenuItems below.
const toId = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
};

const getMenuId = (item) => toId(item?.menu_id);

const getParentMenuId = (item) => toId(item?.parent_menu_id ?? 0);

const sortByPriority = (items) =>
  [...items].sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0));

// Shared root-detection used both for the unfiltered tree (MenuList) and as
// the starting point for search (below): a menu is a root strictly when its
// (type-normalized) parent_menu_id is 0. Nothing else qualifies.
export const getRootMenuItems = (menuItems) =>
  sortByPriority((menuItems || []).filter((item) => getParentMenuId(item) === 0));

// Diagnostic only — never used to decide what renders. Returns menu items
// whose parent_menu_id is neither 0 nor the id of another item in the same
// list: a dangling reference, meaning the backend's menu_array is malformed
// for this user/module. DynamicSidebar logs these (console.warn) so a
// broken payload is visible during development instead of silently
// producing an incomplete or misleading tree.
export const findOrphanedMenuItems = (menuItems) => {
  const items = menuItems || [];
  const idSet = new Set(items.map(getMenuId));
  return items.filter((item) => {
    const parentId = getParentMenuId(item);
    return parentId !== 0 && !idSet.has(parentId);
  });
};

export const getChildMenuItems = (menuItems, parentMenuId) => {
  const parentId = toId(parentMenuId);
  return sortByPriority((menuItems || []).filter((item) => getParentMenuId(item) === parentId));
};

const collectDescendants = (menuId, childrenByParent, output, expandedIds) => {
  const children = sortByPriority(childrenByParent.get(menuId) || []);

  if (children.length > 0) {
    expandedIds.add(menuId);
  }

  children.forEach((child) => {
    output.push(child);
    collectDescendants(getMenuId(child), childrenByParent, output, expandedIds);
  });
};

export const filterSidebarMenus = (menuItems, searchValue) => {
  const query = normalizeMenuSearch(searchValue);

  if (!query) {
    return {
      filteredItems: menuItems || [],
      expandedMenuIds: new Set(),
      isSearching: false,
    };
  }

  const childrenByParent = new Map();

  (menuItems || []).forEach((item) => {
    const parentId = getParentMenuId(item);

    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }

    childrenByParent.get(parentId).push(item);
  });

  const filteredItems = [];
  const expandedMenuIds = new Set();

  const filterItem = (item) => {
    const children = sortByPriority(childrenByParent.get(getMenuId(item)) || []);
    const menuName = normalizeMenuSearch(item?.menu_name);
    const isMatch = menuName.includes(query);

    if (isMatch) {
      const branchItems = [item];
      collectDescendants(getMenuId(item), childrenByParent, branchItems, expandedMenuIds);

      return {
        hasMatch: true,
        items: branchItems,
      };
    }

    const childItems = [];

    children.forEach((child) => {
      const childResult = filterItem(child);

      if (childResult.hasMatch) {
        childItems.push(...childResult.items);
      }
    });

    if (childItems.length > 0) {
      expandedMenuIds.add(getMenuId(item));

      return {
        hasMatch: true,
        items: [item, ...childItems],
      };
    }

    return {
      hasMatch: false,
      items: [],
    };
  };

  // Use the same root-detection as the unfiltered tree (getRootMenuItems)
  // so search can never find branches the plain render wouldn't also find.
  const roots = getRootMenuItems(menuItems);

  roots.forEach((root) => {
    const result = filterItem(root);

    if (result.hasMatch) {
      filteredItems.push(...result.items);
    }
  });

  return {
    filteredItems,
    expandedMenuIds,
    isSearching: true,
  };
};
