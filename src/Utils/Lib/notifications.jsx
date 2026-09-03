import { toast } from "react-toastify";
import { Toast } from "@/Components/Common/Toast";

function show(type, message, options) {
  return toast(<Toast type={type} message={message} title={options?.title} />, {
    icon: false,
    ...options,
  });
}

export const notifications = {
  success: (message, options) => show("success", message, options),
  error: (message, options) => show("error", message, options),
  warning: (message, options) => show("warning", message, options),
  info: (message, options) => show("info", message, options),
};
