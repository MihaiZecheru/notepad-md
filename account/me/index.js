import { getCookie } from "/modules/cookies.mjs";

if (!getCookie("nmd-validation")) window.location.href = "/account/login/?redirect=me";

const email = JSON.parse(getCookie("nmd-validation")).email;
document.getElementById("header-text").innerText = email.replace(/,/g, ".");;