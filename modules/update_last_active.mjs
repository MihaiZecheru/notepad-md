import { getCookie } from "./cookies.mjs";
import getDate from "../modules/date.mjs";

const cookie = getCookie("nmd-validation");
if (!window.sessionStorage.getItem("already-updated") && cookie) {
  window.sessionStorage.setItem("already-updated", "1");
  const email = JSON.parse(cookie).email.replace(/\./g, ",");
  const today = getDate();
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email}/last_active.json`, {
    method: 'PUT',
    body: JSON.stringify(today)
  });
}