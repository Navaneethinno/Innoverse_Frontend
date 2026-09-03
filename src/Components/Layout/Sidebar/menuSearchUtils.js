// Ported verbatim (logic-for-logic) from payseFrontend
// src/Pages/Sidebar/menuSearchUtils.js — the senior sidebar search behavior
// this phase must replicate exactly: a match on a menu keeps its whole
// branch (ancestors expanded, descendants shown), sorted by backend priority.
const normalizeMenuSearch = (value) => String(value ?? "").trim().toLowerCase();

const getMenuId = (item) => item?.menu_id;

const getParentMenuId = (item) => item?.parent_menu_id ?? 0;

const sortByPriority = (items) =>
  [...items].sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0));

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
  const itemById = new Map();

  (menuItems || []).forEach((item) => {
    const itemId = getMenuId(item);
    const parentId = getParentMenuId(item);

    itemById.set(itemId, item);

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

  const roots = sortByPriority(childrenByParent.get(0) || []);
  const rootIds = new Set(roots.map(getMenuId));

  roots.forEach((root) => {
    const result = filterItem(root);

    if (result.hasMatch) {
      filteredItems.push(...result.items);
    }
  });

  itemById.forEach((item, itemId) => {
    const parentId = getParentMenuId(item);

    if (parentId !== 0 && !itemById.has(parentId) && !rootIds.has(itemId)) {
      const result = filterItem(item);

      if (result.hasMatch) {
        filteredItems.push(...result.items);
      }
    }
  });

  return {
    filteredItems,
    expandedMenuIds,
    isSearching: true,
  };
};
