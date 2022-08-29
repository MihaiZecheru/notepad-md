import { getCookie } from "./cookies.mjs";
import getDate from "../modules/date.mjs";

const cookie = getCookie("nmd-validation");
if (!window.sessionStorage.getItem("already-updated") && cookie) {
  window.sessionStorage.setItem("already-updated", "1");
  const email = JSON.parse(cookie).email.replace(/\./g, ",");
  const today = getDate();
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email}/last_active.json`, {
    method: 'PUT',
    headers: {
      "Access-Control-Allow-Origin": "http, https",
      "Access-Control-Allow-Methods": "PUT, GET, POST, DELETE, OPTONS",
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    },
    body: JSON.stringify(today)
  });
}