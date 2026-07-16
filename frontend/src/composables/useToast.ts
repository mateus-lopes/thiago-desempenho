import { ref } from "vue";

const toastMsg = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;

export function useToast() {
  function showToast(msg: string, ms = 2200) {
    toastMsg.value = msg;
    clearTimeout(timer);
    timer = setTimeout(() => {
      toastMsg.value = "";
    }, ms);
  }

  return { toastMsg, showToast };
}
