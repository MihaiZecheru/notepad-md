import { getCookie } from "/modules/cookies.mjs";

let email, password;

if (!getCookie("nmd-validation")) window.location.href = "/account/login/";
else {
  const cookie = JSON.parse(getCookie("nmd-validation"));
  email = cookie.email.replace(/,/g, ".");
  password = cookie.password;
}

document.getElementById("header-text").innerText = email;