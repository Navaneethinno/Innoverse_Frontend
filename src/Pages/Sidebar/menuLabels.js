// Menu and module names as shown: the backend's label in the user's
// language (menu_label, module_label, master module `label`), else the
// English name. Pages are routed by the name, never the label.
export const menuLabel = (menu) => menu?.menu_label || menu?.menu_name;
export const moduleLabel = (module) => module?.module_label || module?.label || module?.module_name;
export const parentMenuLabel = (menu) => menu?.parent_menu_label || menu?.parent_menu_name;
