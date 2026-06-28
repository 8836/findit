import toast from "react-hot-toast";

// ✅ Success toast
export const notifySuccess = (message: string, id?: string) => {
  toast.success(message, {
    id,
    style: {
      background: "#16a34a", // brand green
      color: "#fff",
    },
  });
};

// ✅ Error toast
export const notifyError = (message: string, id?: string) => {
  toast.error(message, {
    id,
    style: {
      background: "#dc2626", // brand red
      color: "#fff",
    },
  });
};

// ✅ Info toast
export const notifyInfo = (message: string, id?: string) => {
  toast(message, {
    id,
    style: {
      background: "#1e3a8a", // brand blue
      color: "#fff",
    },
  });
};

// ✅ Loading toast
export const notifyLoading = (message: string) => {
  return toast.loading(message, {
    style: {
      background: "#1e40af", // darker brand blue
      color: "#fff",
    },
  });
};

// ✅ Dismiss toast (optional)
export const notifyDismiss = (id: string) => {
  toast.dismiss(id);
};
