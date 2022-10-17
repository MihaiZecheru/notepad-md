import { getCookie, setCookie } from "./cookies.mjs";
import getDate from "../modules/date.mjs";

const cookie = JSON.parse(getCookie("nmd-validation"));
if (cookie) {
  const today = getDate();
  const last_active = cookie.last_active;
  if (today !== last_active) {
    const email = cookie.email.replace(/\./g, ",");
    setCookie("nmd-validation", JSON.stringify({ ...cookie, last_active: today }));
    fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email}/last_active.json`, {
      method: 'PUT',
      body: JSON.stringify(today)
    });
  }
}